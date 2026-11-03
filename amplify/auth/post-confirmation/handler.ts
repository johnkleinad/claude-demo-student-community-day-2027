import process from 'node:process'
import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/data'
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime'
import type { Schema } from '../../data/resource'
import { createPostConfirmationHandler, type ProfileStore } from './provision-user'

let storePromise: Promise<ProfileStore> | undefined

function requiredEnvironment(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Required runtime configuration is missing: ${name}`)
  return value
}

async function initializeStore(): Promise<ProfileStore> {
  const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig({
    ...process.env,
    AWS_ACCESS_KEY_ID: requiredEnvironment('AWS_ACCESS_KEY_ID'),
    AWS_SECRET_ACCESS_KEY: requiredEnvironment('AWS_SECRET_ACCESS_KEY'),
    AWS_SESSION_TOKEN: requiredEnvironment('AWS_SESSION_TOKEN'),
    AWS_REGION: requiredEnvironment('AWS_REGION'),
    AMPLIFY_DATA_DEFAULT_NAME: requiredEnvironment('AMPLIFY_DATA_DEFAULT_NAME'),
  })
  Amplify.configure(resourceConfig, libraryOptions)
  const client = generateClient<Schema>({ authMode: 'iam' })
  return {
    async get(id) {
      const { data, errors } = await client.models.UserProfile.get({ id })
      if (errors?.length) throw new Error('User profile lookup failed.')
      return data
    },
    async create(input) {
      const { data, errors } = await client.models.UserProfile.create(input)
      if (errors?.length || !data) throw new Error('User profile creation failed.')
    },
  }
}

function getStore() {
  storePromise ??= initializeStore().catch((error: unknown) => {
    storePromise = undefined
    throw error
  })
  return storePromise
}

export const handler = createPostConfirmationHandler(getStore)
