import { a, defineData, type ClientSchema } from '@aws-amplify/backend'
import {
  SourceReference,
  StudyAnswer,
  Deck,
  Material,
  Flashcard,
  StudySession,
  GenerationJob,
} from './models'

const schema = a.schema({
  SourceReference,
  StudyAnswer,
  Deck,
  Material,
  Flashcard,
  StudySession,
  GenerationJob,
})

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: { defaultAuthorizationMode: 'userPool' },
})
