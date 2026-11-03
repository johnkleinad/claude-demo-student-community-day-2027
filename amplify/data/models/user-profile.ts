import { a } from '@aws-amplify/backend'

export const UserProfile = a.model({
  // One record per Cognito identity; assigned by postConfirmation.
  id: a.id().required(),
  owner: a.string().required(),
  email: a.email().required(),
  name: a.string().required(),
  emailVerified: a.boolean().required(),
}).authorization((allow) => [allow.owner().identityClaim('sub').to(['read'])])
