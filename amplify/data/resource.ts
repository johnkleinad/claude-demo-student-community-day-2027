import { a, defineData, type ClientSchema } from '@aws-amplify/backend'

const schema = a.schema({
  SourceReference: a.customType({
    materialId: a.id().required(),
    page: a.integer(),
    excerpt: a.string(),
  }),
  StudyAnswer: a.customType({
    cardId: a.id().required(),
    rating: a.enum(['AGAIN', 'KNOWN']),
    answeredAt: a.datetime().required(),
  }),
  Deck: a.model({
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
  }).authorization((allow) => [allow.owner().identityClaim('sub')]),

  Material: a.model({
    deckId: a.id().required(),
    deck: a.belongsTo('Deck', 'deckId'),
    filename: a.string().required(),
    storagePath: a.string().required(),
    contentType: a.string().required(),
    sizeBytes: a.integer().required(),
    pageCount: a.integer(),
    uploadStatus: a.enum(['PENDING', 'UPLOADED', 'FAILED']),
    owner: a.string().authorization((allow) => [
      allow.owner().identityClaim('sub').to(['read', 'delete']),
    ]),
  }).secondaryIndexes((index) => [index('deckId')])
    .authorization((allow) => [allow.owner().identityClaim('sub')]),

  Flashcard: a.model({
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
    .authorization((allow) => [allow.owner().identityClaim('sub')]),

  StudySession: a.model({
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
    .authorization((allow) => [allow.owner().identityClaim('sub')]),

  // Jobs will be created/updated by the future generation backend, never by the browser.
  GenerationJob: a.model({
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
    .authorization((allow) => [allow.owner().identityClaim('sub').to(['read'])]),
})

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: { defaultAuthorizationMode: 'userPool' },
})
