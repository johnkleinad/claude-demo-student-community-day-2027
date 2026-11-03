import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'
import { isAmplifyConfigured } from './amplify'

let client: ReturnType<typeof generateClient<Schema>> | undefined

export function getDataClient() {
  if (!isAmplifyConfigured()) {
    throw new Error('Amplify no está configurado. Genera amplify_outputs.json antes de conectar los datos.')
  }
  client ??= generateClient<Schema>({ authMode: 'userPool' })
  return client
}
