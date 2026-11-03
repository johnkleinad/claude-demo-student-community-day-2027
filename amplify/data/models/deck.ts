import { a } from '@aws-amplify/backend'

export const Deck = a.model({
  title: a.string().required(),
  description: a.string(),
  archived: a.boolean().default(false),
  owner: a.string().authorization((allow) => [
    allow.owner().identityClaim('sub').to(['read', 'delete']),
  ]),
  materials: a.hasMany('Material', 'deckId'),
  cards: a.hasMany('Flashcard', 'deckId'),
  sessions: a.hasMany('StudySession', 'deckId'),
  generationJobs: a.hasMany('GenerationJob', 'deckId'),
}).authorization((allow) => [allow.owner().identityClaim('sub')])
