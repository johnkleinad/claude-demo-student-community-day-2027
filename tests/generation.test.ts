import assert from 'node:assert/strict'
import test from 'node:test'
import { generationRequestSchema, validateGenerationResult } from '../shared/generation.ts'

const request = {
  deckId: 'deck-1',
  materialIds: ['material-1'],
  requestId: 'a21b5268-1403-43e8-9546-f989e4e50d53',
  preferences: {},
}
const card = {
  question: '¿Qué es la mitosis?',
  answer: 'Un proceso de división celular.',
  sources: [{ materialId: 'material-1' }],
}
const context = { materials: [{ id: 'material-1', contentType: 'image/jpeg' }], maxCards: 10 }

test('la solicitud aplica preferencias y rechaza material repetido o identidad suministrada por el cliente', () => {
  assert.equal(generationRequestSchema.parse(request).preferences.cardCount, 10)
  assert.equal(generationRequestSchema.safeParse({ ...request, owner: 'another-user' }).success, false)
  assert.equal(generationRequestSchema.safeParse({ ...request, materialIds: ['material-1', 'material-1'] }).success, false)
  assert.equal(generationRequestSchema.safeParse({ ...request, storagePath: 'other-user/file.jpg' }).success, false)
})

test('valida tarjetas con referencias autorizadas y rechaza fuentes ajenas', () => {
  assert.equal(validateGenerationResult({ cards: [card] }, context).cards.length, 1)
  assert.throws(() => validateGenerationResult({ cards: [{ ...card, sources: [{ materialId: 'foreign' }] }] }, context))
  assert.throws(() => validateGenerationResult({ cards: [{ ...card, sources: [] }] }, context))
})

test('rechaza preguntas duplicadas y cantidades superiores a las solicitadas', () => {
  assert.throws(() => validateGenerationResult({ cards: [card, { ...card, question: ' ¿QUÉ ES LA MITOSIS? ' }] }, context))
  assert.throws(() => validateGenerationResult({ cards: [card] }, { ...context, maxCards: 0 }))
})

test('exige páginas válidas para PDF y omite páginas para imágenes', () => {
  const pdfContext = { materials: [{ id: 'material-1', contentType: 'application/pdf', pageCount: 3 }], maxCards: 10 }
  assert.throws(() => validateGenerationResult({ cards: [card] }, pdfContext))
  const pdfCard = { ...card, sources: [{ materialId: 'material-1', page: 2 }] }
  assert.equal(validateGenerationResult({ cards: [pdfCard] }, pdfContext).cards.length, 1)
  assert.throws(() => validateGenerationResult({ cards: [{ ...card, sources: [{ materialId: 'material-1', page: 4 }] }] }, pdfContext))
  assert.throws(() => validateGenerationResult({ cards: [pdfCard] }, context))
})
