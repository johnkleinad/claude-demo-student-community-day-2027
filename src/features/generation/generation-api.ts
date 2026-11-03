import { getDataClient } from '@/lib/data'
import { fetchAuthSession } from 'aws-amplify/auth'
import type { Schema } from '../../../amplify/data/resource'
import { generationRequestSchema, type GenerationRequest } from '../../../shared/generation'

export type GenerationJob = Pick<Schema['GenerationJob']['type'], 'id' | 'requestId' | 'deckId' | 'status' | 'createdAt' | 'updatedAt' | 'errorMessage' | 'cardCount' | 'generatedCount'>
export type StudyCard = Pick<Schema['Flashcard']['type'], 'id' | 'question' | 'answer' | 'explanation' | 'sources' | 'generationJobId' | 'createdAt'>

async function pages<T>(read: (nextToken?: string | null) => Promise<{ data: T[]; nextToken?: string | null; errors?: unknown[] }>) {
  const values: T[] = []
  const seen = new Set<string>()
  let token: string | null | undefined
  do {
    const page = await read(token)
    if (page.errors?.length) throw new Error('No pudimos consultar las tarjetas y sus trabajos.')
    values.push(...page.data)
    token = page.nextToken
    if (token && seen.has(token)) throw new Error('No se pudo completar la consulta.')
    if (token) seen.add(token)
  } while (token)
  return values
}

export function jobIsActive(job: GenerationJob) {
  return (job.status === 'QUEUED' || job.status === 'PROCESSING') && Date.now() - Date.parse(job.updatedAt) < 20 * 60_000
}
export async function generationSnapshot(deckId: string) {
  const client = getDataClient()
  const [jobs, cards] = await Promise.all([
    pages<GenerationJob>((nextToken) => client.models.GenerationJob.listGenerationJobByDeckId({ deckId }, { limit: 100, nextToken })),
    pages<StudyCard>((nextToken) => client.models.Flashcard.listFlashcardByDeckId({ deckId }, { limit: 100, nextToken })),
  ])
  const completed = new Set(jobs.filter((job) => job.status === 'COMPLETED').map((job) => job.id))
  return { jobs: jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    cards: cards.filter((card) => card.generationJobId && completed.has(card.generationJobId))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)) }
}
export async function submitGeneration(request: GenerationRequest) {
  const client = getDataClient()
  if (typeof client.mutations?.generateCards !== 'function') throw new Error('Actualiza el sandbox y los outputs para habilitar la generación de tarjetas.')
  const input = generationRequestSchema.parse(request)
  // Identity Pool GetId needs an ID token; Amplify Data otherwise sends an access token.
  // AppSync validates this same token before providing identity.sub to the Lambda.
  const idToken = (await fetchAuthSession()).tokens?.idToken?.toString()
  if (!idToken) throw new Error('Necesitas iniciar sesión para generar tarjetas.')
  const { data, errors } = await client.mutations.generateCards({ request: JSON.stringify(input) }, { authToken: idToken })
  if (errors?.length || !data) {
    const message = errors?.map((error) => error.message).find((value) => value && /^(Ya hay|Selecciona|No se puede|Esta solicitud|Revisa|Necesitas|No pudimos iniciar)/.test(value))
    throw new Error(message ?? 'No pudimos iniciar la generación. Reintenta con las mismas preferencias para consultar la misma solicitud.')
  }
  return data
}
