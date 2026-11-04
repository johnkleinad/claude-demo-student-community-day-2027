import { a, defineData, type ClientSchema } from '@aws-amplify/backend'
import { postConfirmation } from '../auth/post-confirmation/resource'
import { generateCards } from '../generation/request/resource'
import {
  SourceReference,
  StudyAnswer,
  Deck,
  Material,
  Flashcard,
  StudySession,
  GenerationJob,
  UserProfile,
} from './models'

const schema = a.schema({
  generateCards: a.mutation()
    .arguments({ request: a.json().required() })
    .returns(a.string().required())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(generateCards)),
  SourceReference,
  StudyAnswer,
  Deck,
  Material,
  Flashcard,
  StudySession,
  GenerationJob,
  UserProfile,
}).authorization((allow) => [allow.resource(postConfirmation).to(['query', 'mutate'])])

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: { defaultAuthorizationMode: 'userPool' },
})
