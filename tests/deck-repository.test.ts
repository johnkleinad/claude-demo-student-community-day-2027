import assert from 'node:assert/strict'
import test from 'node:test'
import { createDeckRepository, type DeckApi, type StoredDeck } from '../src/features/decks/deck-repository.ts'

const first: StoredDeck = { id: 'deck-1', title: 'AWS · Serverless', description: null, archived: false, createdAt: '2026-11-03T12:00:00.000Z' }
const second: StoredDeck = { ...first, id: 'deck-2', title: 'Agentes de IA', createdAt: '2026-11-03T13:00:00.000Z' }
const api = (overrides: Partial<DeckApi> = {}): DeckApi => ({
  list: async () => ({ data: [] }),
  create: async () => ({ data: first }),
  ...overrides,
})

test('recorre todas las páginas y excluye archivados sin publicar duplicados', async () => {
  const tokens: Array<string | null | undefined> = []
  const repository = createDeckRepository(api({ list: async (input) => {
    tokens.push(input.nextToken)
    return input.nextToken
      ? { data: [first, second, { ...first, id: 'archived', archived: true }], nextToken: null }
      : { data: [first], nextToken: 'page-2' }
  } }))
  const result = await repository.list()
  assert.deepEqual(result.map((deck) => deck.id), ['deck-1', 'deck-2'])
  assert.deepEqual(tokens, [undefined, 'page-2'])
  assert.equal(result[0].description, '')
})

test('un error de GraphQL no se confunde con una lista vacía o una escritura exitosa', async () => {
  const repository = createDeckRepository(api({
    list: async () => ({ data: [first], errors: [{ message: 'Unauthorized' }] }),
    create: async () => ({ data: first, errors: [{ message: 'Unauthorized' }] }),
  }))
  await assert.rejects(() => repository.list())
  await assert.rejects(() => repository.create('AWS', ''))
  await assert.rejects(() => createDeckRepository(api({ create: async () => ({ data: null }) })).create('AWS', ''))
})

test('la paginación rechaza un cursor repetido en lugar de entrar en un bucle', async () => {
  let calls = 0
  const repository = createDeckRepository(api({ list: async () => {
    calls++
    return { data: [first], nextToken: 'same-token' }
  } }))
  await assert.rejects(() => repository.list())
  assert.equal(calls, 2)
})

test('crear un deck valida el contenido y deja que el backend asigne ID y propietario', async () => {
  let sent: Parameters<DeckApi['create']>[0] | undefined
  const repository = createDeckRepository(api({ create: async (input) => { sent = input; return { data: first } } }))
  const deck = await repository.create('  AWS · Serverless  ', '  Lambda y eventos  ')
  assert.equal(deck.id, 'deck-1')
  assert.deepEqual(sent, { title: 'AWS · Serverless', description: 'Lambda y eventos', archived: false })
  await assert.rejects(() => repository.create('   ', ''))
  await assert.rejects(() => repository.create('a'.repeat(81), ''))
  await assert.rejects(() => repository.create('AWS', 'a'.repeat(201)))
})

test('el color de un deck se mantiene al recargar o cambiar el orden de la colección', async () => {
  const a = await createDeckRepository(api({ list: async () => ({ data: [first, second] }) })).list()
  const b = await createDeckRepository(api({ list: async () => ({ data: [second, first] }) })).list()
  assert.deepEqual(a, b)
})
