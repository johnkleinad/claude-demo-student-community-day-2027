import assert from 'node:assert/strict'
import test from 'node:test'
import { requestGeneration, processGeneration, jobId, GenerationError } from '../amplify/generation/service.ts'
import type { Job, Material, RequestDependencies, WorkerDependencies } from '../amplify/generation/types.ts'

const owner = 'student-a'
const identityId = 'us-east-1:24d88426-bd98-4e87-b198-64e801bd2998'
const request = { deckId: 'deck-1', materialIds: ['image-1'], requestId: 'a21b5268-1403-43e8-9546-f989e4e50d53', preferences: { cardCount: 3 } }
const image: Material = { id: 'image-1', deckId: request.deckId, owner, uploadStatus: 'UPLOADED', contentType: 'image/png',
  storagePath: `materials/${identityId}/deck-1/image-1.png`, sizeBytes: 120, filename: 'architecture.png' }
const result = { cards: [{ question: '¿Qué hace Lambda?', answer: 'Ejecuta funciones.', sources: [{ materialId: 'image-1' }] }] }

function fixture() {
  const jobs = new Map<string, Job>()
  let invokes = 0
  let completed = 0
  const errors: string[] = []
  const requestApi: RequestDependencies = {
    getJob: async (id) => jobs.get(id), getDeck: async () => ({ id: request.deckId, owner, archived: false }),
    getMaterial: async () => image, identity: async (jwt) => { assert.equal(jwt, 'validated-appsync-jwt'); return identityId },
    reserve: async (job) => { jobs.set(job.id, job) },
  }
  const workerApi: WorkerDependencies = {
    getDeck: requestApi.getDeck, getMaterial: requestApi.getMaterial,
    claim: async (id) => { const job = jobs.get(id); if (!job || job.status !== 'QUEUED') return undefined; job.status = 'PROCESSING'; return job },
    prepare: async (material) => ({ ...material, etag: 'etag-1' }),
    invoke: async () => { invokes++; return result },
    complete: async (job) => { completed++; job.status = 'COMPLETED' },
    fail: async (job, message) => { job.status = 'FAILED'; errors.push(message) },
  }
  const reserve = () => requestGeneration(request, owner, 'validated-appsync-jwt', requestApi)
  return { jobs, requestApi, workerApi, reserve, invokes: () => invokes, completed: () => completed, errors }
}

test('el backend asigna propietario e identidad y reutiliza la solicitud sin duplicados', async () => {
  const f = fixture()
  const id = await f.reserve()
  assert.equal(id, jobId(owner, request.requestId))
  assert.notEqual(id, jobId('student-b', request.requestId))
  assert.equal(f.jobs.get(id)?.identityId, identityId)
  assert.equal(f.jobs.get(id)?.owner, owner)
  assert.equal(await f.reserve(), id)
  assert.equal(f.jobs.size, 1)
  await assert.rejects(() => requestGeneration({ ...request, preferences: { cardCount: 4 } }, owner, 'validated-appsync-jwt', f.requestApi), /otras preferencias/)
})

test('rechaza IDs, propietarios y rutas suministrados por el cliente', async () => {
  const f = fixture()
  await assert.rejects(() => requestGeneration({ ...request, owner: 'student-b' }, owner, 'validated-appsync-jwt', f.requestApi))
  await assert.rejects(() => requestGeneration({ ...request, storagePath: image.storagePath }, owner, 'validated-appsync-jwt', f.requestApi))
  assert.equal(f.jobs.size, 0)
})

test('rechaza decks ajenos o archivados y materiales de otro deck, sin subir trabajos', async () => {
  for (const deck of [{ id: request.deckId, owner: 'student-b' }, { id: request.deckId, owner, archived: true }, undefined]) {
    const f = fixture(); f.requestApi.getDeck = async () => deck
    await assert.rejects(f.reserve); assert.equal(f.jobs.size, 0)
  }
  for (const material of [{ ...image, deckId: 'foreign' }, { ...image, owner: 'student-b' }, { ...image, uploadStatus: 'PENDING' },
    { ...image, storagePath: image.storagePath.replace(identityId, 'other-identity') }]) {
    const f = fixture(); f.requestApi.getMaterial = async () => material
    await assert.rejects(f.reserve); assert.equal(f.jobs.size, 0)
  }
})

test('recupera una reserva que se confirmó antes de perder su respuesta', async () => {
  const f = fixture(); const original = f.requestApi.reserve
  f.requestApi.reserve = async (job) => { await original(job); throw new Error('Ambiguous timeout') }
  assert.equal(await f.reserve(), jobId(owner, request.requestId))
  assert.equal(f.jobs.size, 1)
})

test('una reserva rechazada por otra generación no crea una solicitud falsa', async () => {
  const f = fixture(); f.requestApi.reserve = async () => { throw new GenerationError('Ya hay una generación en curso.') }
  await assert.rejects(f.reserve, /en curso/); assert.equal(f.jobs.size, 0)
})

test('procesa una vez y no vuelve a invocar trabajos completados', async () => {
  const f = fixture(); const id = await f.reserve()
  await processGeneration(id, f.workerApi); await processGeneration(id, f.workerApi)
  assert.equal(f.invokes(), 1); assert.equal(f.completed(), 1); assert.equal(f.jobs.get(id)?.status, 'COMPLETED')
})

test('el worker vuelve a comprobar los permisos y no invoca material alterado', async () => {
  const f = fixture(); const id = await f.reserve()
  f.workerApi.getMaterial = async () => ({ ...image, owner: 'student-b' })
  await processGeneration(id, f.workerApi)
  assert.equal(f.invokes(), 0); assert.equal(f.completed(), 0); assert.equal(f.jobs.get(id)?.status, 'FAILED')
})

test('rechaza fuentes ajenas, duplicados y exceso de tarjetas sin completar el trabajo', async () => {
  const invalid = [
    { cards: [{ ...result.cards[0], sources: [{ materialId: 'foreign' }] }] },
    { cards: [result.cards[0], result.cards[0]] },
    { cards: Array.from({ length: 4 }, (_, n) => ({ ...result.cards[0], question: `Pregunta ${n}` })) },
  ]
  for (const payload of invalid) {
    const f = fixture(); const id = await f.reserve(); f.workerApi.invoke = async () => payload
    await processGeneration(id, f.workerApi)
    assert.equal(f.completed(), 0); assert.equal(f.jobs.get(id)?.status, 'FAILED')
  }
})

test('los fallos del proveedor no exponen detalles internos ni producen tarjetas de relleno', async () => {
  const f = fixture(); const id = await f.reserve()
  f.workerApi.invoke = async () => { throw new Error('Secret provider payload and document text') }
  await processGeneration(id, f.workerApi)
  assert.equal(f.completed(), 0); assert.equal(f.jobs.get(id)?.status, 'FAILED')
  assert.equal(f.errors[0].includes('Secret'), false)
})

test('si falla el guardado final y también el estado de error, el evento se reintenta', async () => {
  const f = fixture(); const id = await f.reserve()
  f.workerApi.complete = async () => { throw new Error('Data unavailable') }
  f.workerApi.fail = async () => { throw new Error('Data still unavailable') }
  await assert.rejects(() => processGeneration(id, f.workerApi), /Data still unavailable/)
})
