import { defineFunction } from '@aws-amplify/backend'

export const postConfirmation = defineFunction({
  name: 'post-confirmation',
  resourceGroupName: 'auth',
  runtime: 22,
  timeoutSeconds: 5,
  logging: { format: 'json', retention: '2 weeks' },
})
