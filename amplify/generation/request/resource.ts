import { defineFunction } from '@aws-amplify/backend'
export const generateCards = defineFunction({ name: 'generate-cards', resourceGroupName: 'data', runtime: 22,
  timeoutSeconds: 25, memoryMB: 256, logging: { format: 'json', retention: '2 weeks' } })
