import { z } from 'zod'

const id = z.string().trim().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/)

// Requests contain IDs only. The backend resolves ownership and S3 paths.
export const generationRequestSchema = z.object({
  deckId: id,
  materialIds: z.array(id).min(1).max(10).refine(
    (values) => new Set(values).size === values.length,
    'No se puede incluir un material más de una vez.',
  ),
  requestId: z.string().uuid(),
  preferences: z.object({
    language: z.enum(['es', 'en']).default('es'),
    cardCount: z.number().int().min(1).max(50).default(10),
    focus: z.string().trim().max(500).optional(),
  }).strict(),
}).strict()

export const generationResultSchema = z.object({
  cards: z.array(z.object({
    question: z.string().trim().min(1).max(500),
    answer: z.string().trim().min(1).max(4000),
    explanation: z.string().trim().max(4000).optional(),
    sources: z.array(z.object({
      materialId: id,
      page: z.number().int().positive().optional(),
      excerpt: z.string().trim().max(1000).optional(),
    }).strict()).min(1).max(10),
  }).strict()).min(1).max(50),
}).strict()

export type GenerationRequest = z.infer<typeof generationRequestSchema>
export type GenerationResult = z.infer<typeof generationResultSchema>

type AuthorizedMaterial = {
  id: string
  contentType: string
  pageCount?: number
}

/** Shape/reference checks; semantic grounding still requires the agent's verifier. */
export function validateGenerationResult(
  payload: unknown,
  context: { materials: AuthorizedMaterial[]; maxCards: number },
): GenerationResult {
  const result = generationResultSchema.parse(payload)
  if (result.cards.length > context.maxCards) {
    throw new Error('El agente devolvió más tarjetas de las solicitadas.')
  }
  const materials = new Map(context.materials.map((material) => [material.id, material]))
  const questions = new Set<string>()

  for (const card of result.cards) {
    const question = card.question.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ')
    if (questions.has(question)) throw new Error('El resultado contiene preguntas duplicadas.')
    questions.add(question)
    for (const source of card.sources) {
      const material = materials.get(source.materialId)
      if (!material) throw new Error('La tarjeta cita un material fuera de la solicitud autorizada.')
      if (material.contentType === 'application/pdf') {
        if (!source.page || (material.pageCount && source.page > material.pageCount)) {
          throw new Error('La referencia al PDF debe incluir una página válida.')
        }
      } else if (source.page !== undefined) {
        throw new Error('Una imagen no debe incluir un número de página.')
      }
    }
  }
  return result
}
