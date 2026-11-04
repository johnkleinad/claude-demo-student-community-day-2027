import { defineBackend } from '@aws-amplify/backend'
import { auth } from './auth/resource'
import { data } from './data/resource'
import { storage } from './storage/resource'
import { postConfirmation } from './auth/post-confirmation/resource'
import { generateCards } from './generation/request/resource'
import { generationWorker } from './generation/worker/resource'
import { configureGeneration } from './generation/infrastructure'
import { Stack } from 'aws-cdk-lib'

export const backend = defineBackend({ auth, data, storage, postConfirmation, generateCards, generationWorker })

const generation = configureGeneration(Stack.of(backend.data.resources.graphqlApi), {
  request: backend.generateCards,
  worker: backend.generationWorker,
  tables: backend.data.resources.tables,
  bucket: backend.storage.resources.bucket,
  userPoolId: backend.auth.resources.userPool.userPoolId,
  identityPoolId: backend.auth.resources.cfnResources.cfnIdentityPool.ref,
})

backend.addOutput({ custom: { generation: { ...generation, endpointName: 'demo' } } })
