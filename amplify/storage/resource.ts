import { defineStorage } from '@aws-amplify/backend'

export const storage = defineStorage({
  name: 'studyMaterials',
  access: (allow) => ({
    // entity_id is the Cognito Identity Pool ID, not the User Pool sub.
    'materials/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
  }),
})
