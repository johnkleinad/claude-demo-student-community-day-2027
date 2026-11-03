import assert from 'node:assert/strict'
import test from 'node:test'
import type { PostConfirmationTriggerEvent } from 'aws-lambda'
import { createPostConfirmationHandler, type ProfileStore, type UserProfileInput } from '../amplify/auth/post-confirmation/provision-user.ts'

const userId = '11111111-1111-4111-8111-111111111111'
function event(source: PostConfirmationTriggerEvent['triggerSource'] = 'PostConfirmation_ConfirmSignUp'): PostConfirmationTriggerEvent {
  return {
    version: '1', region: 'us-east-1', userPoolId: 'us-east-1_test', userName: userId,
    callerContext: { awsSdkVersion: 'test', clientId: 'test' }, triggerSource: source,
    request: {
      userAttributes: { sub: userId, email: 'student@example.invalid', email_verified: 'true', name: 'Student' },
      clientMetadata: { owner: 'someone-else', email: 'untrusted@example.invalid' },
    },
    response: {},
  }
}

test('la confirmación crea un perfil con ID y propietario de Cognito, ignorando clientMetadata', async () => {
  let saved: UserProfileInput | undefined
  const handler = createPostConfirmationHandler(async () => ({ get: async () => null, create: async (input) => { saved = input } }))
  const input = event()
  assert.equal(await handler(input), input)
  assert.deepEqual(saved, { id: userId, owner: userId, email: 'student@example.invalid', name: 'Student', emailVerified: true })
})

test('una confirmación repetida no vuelve a crear ni sobrescribe el perfil', async () => {
  let created = 0
  let profile: UserProfileInput | null = null
  const handler = createPostConfirmationHandler(async () => ({
    get: async () => profile,
    create: async (input) => { created++; profile = input },
  }))
  await handler(event())
  const retry = event()
  retry.request.userAttributes.name = 'Changed name'
  await handler(retry)
  assert.equal(created, 1)
  assert.equal((profile as UserProfileInput | null)?.name, 'Student')
})

test('el restablecimiento de contraseña no crea perfiles ni abre el cliente de datos', async () => {
  let initialized = false
  const handler = createPostConfirmationHandler(async () => {
    initialized = true
    throw new Error('Should not initialize')
  })
  const input = event('PostConfirmation_ConfirmForgotPassword')
  assert.equal(await handler(input), input)
  assert.equal(initialized, false)
})

test('una escritura concurrente o de resultado incierto solo se acepta al encontrar el perfil correcto', async () => {
  let reads = 0
  const store: ProfileStore = {
    get: async () => ++reads === 1 ? null : { id: userId, owner: userId },
    create: async () => { throw new Error('Conditional failure or network timeout') },
  }
  const input = event()
  assert.equal(await createPostConfirmationHandler(async () => store)(input), input)
  assert.equal(reads, 2)
})

test('un fallo real no se devuelve como aprovisionamiento exitoso', async () => {
  const handler = createPostConfirmationHandler(async () => ({
    get: async () => null, create: async () => { throw new Error('Write unavailable') },
  }))
  await assert.rejects(() => handler(event()), /could not be provisioned/)
  const foreign = createPostConfirmationHandler(async () => ({
    get: async () => ({ id: userId, owner: 'foreign-owner' }), create: async () => {},
  }))
  await assert.rejects(() => foreign(event()), /does not match/)
})

test('no asume que el correo esté verificado ni acepta atributos requeridos ausentes', async () => {
  let saved: UserProfileInput | undefined
  const handler = createPostConfirmationHandler(async () => ({ get: async () => null, create: async (input) => { saved = input } }))
  const input = event()
  input.request.userAttributes.email_verified = 'false'
  input.request.userAttributes.name = '  Student  '
  await handler(input)
  assert.equal(saved?.emailVerified, false)
  assert.equal(saved?.name, 'Student')
  delete input.request.userAttributes.sub
  await assert.rejects(() => handler(input), /missing required/)
})

test('exige un nombre de usuario válido antes de crear un perfil nuevo', async () => {
  let writes = 0
  const handler = createPostConfirmationHandler(async () => ({ get: async () => null, create: async () => { writes++ } }))
  for (const name of ['', '   ', 'a'.repeat(81)]) {
    const input = event()
    input.request.userAttributes.name = name
    await assert.rejects(() => handler(input), /valid profile name/)
  }
  const missing = event()
  delete missing.request.userAttributes.name
  await assert.rejects(() => handler(missing), /valid profile name/)
  assert.equal(writes, 0)
})
