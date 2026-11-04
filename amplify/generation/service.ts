import { createHash, randomUUID } from 'node:crypto'
import { generationRequestSchema, validateGenerationResult } from '../../shared/generation'
import { createMaterialPath, MAX_GENERATION_TOTAL_BYTES } from '../../shared/materials'
import type { Job, Material, RequestDependencies, WorkerDependencies } from './types'

export class GenerationError extends Error {}
export function jobId(owner: string, requestId: string) {
  return createHash('sha256').update(`${owner}:${requestId}`).digest('hex')
}
export function assertMaterial(material: Material | undefined, context: { owner: string; deckId: string; identityId: string }) {
  if (!material || material.owner !== context.owner || material.deckId !== context.deckId || material.uploadStatus !== 'UPLOADED') {
    throw new GenerationError('Selecciona únicamente materiales guardados en este deck.')
  }
  const expected = createMaterialPath({ identityId: context.identityId, deckId: context.deckId, materialId: material.id, contentType: material.contentType })
  if (material.storagePath !== expected) throw new GenerationError('No se pudo validar el acceso a uno de los materiales.')
  return material
}
export async function requestGeneration(payload: unknown, owner: string, token: string, api: RequestDependencies) {
  const parsed = generationRequestSchema.safeParse(payload)
  if (!parsed.success) throw new GenerationError('Revisa los materiales y las preferencias de generación.')
  const request = parsed.data
  const id = jobId(owner, request.requestId)
  const fingerprint = createHash('sha256').update(JSON.stringify({ ...request, materialIds: [...request.materialIds].sort() })).digest('hex')
  const existing = await api.getJob(id)
  if (existing) {
    if (existing.owner !== owner || existing.fingerprint !== fingerprint) throw new GenerationError('Esta solicitud ya se utilizó con otras preferencias.')
    return existing.id
  }
  const deck = await api.getDeck(request.deckId)
  if (!deck || deck.owner !== owner || deck.archived) throw new GenerationError('No se puede generar contenido para este deck.')
  const identityId = await api.identity(token)
  for (const id of request.materialIds) assertMaterial(await api.getMaterial(id), { owner, deckId: deck.id, identityId })
  const now = new Date().toISOString()
  const job: Job = { id, owner, requestId: request.requestId, deckId: request.deckId, materialIds: request.materialIds,
    status: 'QUEUED', ...request.preferences, identityId, fingerprint, createdAt: now, updatedAt: now }
  try { await api.reserve(job) }
  catch (cause) {
    const concurrent = await api.getJob(id)
    if (concurrent?.owner === owner && concurrent.fingerprint === fingerprint) return concurrent.id
    throw cause
  }
  return id
}

export async function processGeneration(id: string, api: WorkerDependencies) {
  const leaseToken = randomUUID()
  const job = await api.claim(id, leaseToken)
  if (!job) return
  try {
    const deck = await api.getDeck(job.deckId)
    if (!deck || deck.owner !== job.owner || deck.archived) throw new GenerationError('El deck ya no está disponible para generar tarjetas.')
    const materials = []
    const authorized = []
    for (const id of job.materialIds) {
      const material = assertMaterial(await api.getMaterial(id), job)
      authorized.push(material)
    }
    if (authorized.filter((item) => item.contentType.startsWith('image/')).length > 5) throw new GenerationError('Genera tarjetas con un máximo de 5 imágenes a la vez.')
    if (authorized.filter((item) => item.contentType === 'application/pdf').length > 5) throw new GenerationError('Genera tarjetas con un máximo de 5 PDF a la vez.')
    for (const material of authorized) materials.push(await api.prepare(material))
    if (materials.reduce((sum, item) => sum + item.sizeBytes, 0) > MAX_GENERATION_TOTAL_BYTES) throw new GenerationError('Selecciona materiales que sumen hasta 100 MB para esta generación.')
    const request = generationRequestSchema.parse({ deckId: job.deckId, materialIds: job.materialIds, requestId: job.requestId,
      preferences: { language: job.language, cardCount: job.cardCount, ...(job.focus ? { focus: job.focus } : {}) } })
    const result = validateGenerationResult(await api.invoke({ request, identityId: job.identityId, materials }), { materials, maxCards: job.cardCount })
    await api.complete(job, result, leaseToken)
  } catch (cause) {
    const message = cause instanceof GenerationError ? cause.message : 'No pudimos completar la generación. Inténtalo otra vez en unos minutos.'
    // Do not expose provider errors, material contents or prompts to users/logs.
    console.error(JSON.stringify({ event: 'generation_failed', jobId: job.id, errorType: cause instanceof Error ? cause.name : 'Unknown' }))
    await api.fail(job, message, leaseToken)
  }
}
