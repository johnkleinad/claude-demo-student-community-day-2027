import { a } from '@aws-amplify/backend'

export const Flashcard = a.model({
  deckId: a.id().required(),
  deck: a.belongsTo('Deck', 'deckId'),
  question: a.string().required(),
  answer: a.string().required(),
  explanation: a.string(),
  sources: a.ref('SourceReference').required().array().required(),
  generationJobId: a.id(),
  owner: a.string().authorization((allow) => [
    allow.owner().identityClaim('sub').to(['read', 'delete']),
  ]),
}).secondaryIndexes((index) => [index('deckId')])
  .authorization((allow) => [allow.owner().identityClaim('sub')])
