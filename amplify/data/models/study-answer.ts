import { a } from '@aws-amplify/backend'

export const StudyAnswer = a.customType({
  cardId: a.id().required(),
  rating: a.enum(['AGAIN', 'KNOWN']),
  answeredAt: a.datetime().required(),
})
