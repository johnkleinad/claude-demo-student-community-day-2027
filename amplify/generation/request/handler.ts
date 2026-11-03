import { CognitoIdentityClient, GetIdCommand } from '@aws-sdk/client-cognito-identity'
import { GenerationError, requestGeneration } from '../service'
import { getJob, getDeck, getMaterial, reserve, setting } from '../store'

const identityClient = new CognitoIdentityClient({ region: process.env.AWS_REGION })
export async function handler(event: { arguments: { request: unknown }; identity?: { sub?: string }; request?: { headers?: Record<string, string> } }) {
  const owner = event.identity?.sub
  const headers = event.request?.headers ?? {}
  const token = (headers.authorization ?? headers.Authorization ?? '').replace(/^Bearer\s+/i, '')
  if (!owner || !token) throw new Error('Necesitas iniciar sesión para generar tarjetas.')
  try {
    const payload = typeof event.arguments.request === 'string' ? JSON.parse(event.arguments.request) : event.arguments.request
    return await requestGeneration(payload, owner, token, { getJob, getDeck, getMaterial, reserve,
      async identity(jwt) {
        const provider = `cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${setting('USER_POOL_ID')}`
        const result = await identityClient.send(new GetIdCommand({ IdentityPoolId: setting('IDENTITY_POOL_ID'), Logins: { [provider]: jwt } }))
        if (!result.IdentityId) throw new Error('Identity resolution failed')
        return result.IdentityId
      },
    })
  } catch (cause) {
    if (cause instanceof GenerationError) throw cause
    throw new Error('No pudimos iniciar la generación. Revisa tu sesión e inténtalo otra vez.')
  }
}
