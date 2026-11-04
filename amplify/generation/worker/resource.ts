import { defineFunction } from '@aws-amplify/backend'
export const generationWorker = defineFunction({ name: 'generation-worker', resourceGroupName: 'data', runtime: 22,
  timeoutSeconds: 600, memoryMB: 1024, logging: { format: 'json', retention: '2 weeks' } })
