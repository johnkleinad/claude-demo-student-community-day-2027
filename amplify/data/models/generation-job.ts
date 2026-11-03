import { a } from '@aws-amplify/backend'

// Jobs will be created/updated by the future generation backend, never by the browser.
export const GenerationJob = a.model({
  requestId: a.string().required(),
  deckId: a.id().required(),
  deck: a.belongsTo('Deck', 'deckId'),
  materialIds: a.id().required().array().required(),
  status: a.enum(['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED']),
  language: a.string().required(),
  cardCount: a.integer().required(),
  focus: a.string(),
  errorMessage: a.string(),
  completedAt: a.datetime(),
  owner: a.string(),
}).secondaryIndexes((index) => [index('deckId')])
  .authorization((allow) => [allow.owner().identityClaim('sub').to(['read'])])
