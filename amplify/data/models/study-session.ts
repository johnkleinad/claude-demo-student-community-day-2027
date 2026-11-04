import { a } from '@aws-amplify/backend'

export const StudySession = a.model({
  // Declared explicitly: owner field rules omit 'create', so implicit id would be denied on client-supplied IDs.
  id: a.id().required(),
  deckId: a.id().required(),
  deck: a.belongsTo('Deck', 'deckId'),
  status: a.enum(['ACTIVE', 'COMPLETED']),
  startedAt: a.datetime().required(),
  completedAt: a.datetime(),
  cardIds: a.id().required().array().required(),
  answers: a.ref('StudyAnswer').required().array().required(),
  owner: a.string().authorization((allow) => [
    allow.owner().identityClaim('sub').to(['read', 'delete']),
  ]),
}).secondaryIndexes((index) => [index('deckId').sortKeys(['startedAt'])])
  .authorization((allow) => [allow.owner().identityClaim('sub')])
