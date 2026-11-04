import { a } from '@aws-amplify/backend'

export const Material = a.model({
  // Declared explicitly: owner field rules omit 'create', so implicit id would be denied on client-supplied IDs.
  id: a.id().required(),
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
  .authorization((allow) => [allow.owner().identityClaim('sub')])
