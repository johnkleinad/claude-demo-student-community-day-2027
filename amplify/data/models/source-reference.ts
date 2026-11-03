import { a } from '@aws-amplify/backend'

export const SourceReference = a.customType({
  materialId: a.id().required(),
  page: a.integer(),
  excerpt: a.string(),
})
