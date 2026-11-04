import assert from 'node:assert/strict'
import test from 'node:test'
import { authErrorMessage, isAnonymousError, safeReturnTo } from '../src/features/auth/auth-errors.ts'

test('el regreso después del login solo admite rutas internas de la app', () => {
  for (const path of ['/', '/decks/new', '/decks/abc-123']) assert.equal(safeReturnTo(path), path)
  for (const path of ['https://outside.example', '//outside.example', '/\\outside.example', '/auth/sign-in', '/decks/../../outside', undefined, {}]) assert.equal(safeReturnTo(path), '/')
})

test('los errores de acceso no revelan la existencia de un usuario ni mensajes internos', () => {
  const error = (name: string) => Object.assign(new Error('Internal data, token, or service message'), { name })
  assert.equal(authErrorMessage(error('NotAuthorizedException')), authErrorMessage(error('UserNotFoundException')))
  assert.ok(!authErrorMessage(error('UnknownError')).includes('token'))
  assert.ok(authErrorMessage(error('ExpiredCodeException')).includes('venció'))
  assert.equal(isAnonymousError(error('UserUnAuthenticatedException')), true)
  assert.equal(isAnonymousError(error('NetworkError')), false)
})
