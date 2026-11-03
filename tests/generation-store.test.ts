import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { claim, finish, reserve } from '../amplify/generation/store.ts'
import type { Job } from '../amplify/generation/types.ts'

process.env.JOB_TABLE = 'jobs-test'
process.env.CONTROL_TABLE = 'controls-test'
process.env.CARD_TABLE = 'cards-test'
const job: Job = { id: 'job-1', owner: 'student-a', deckId: 'deck-1', requestId: 'request-1', materialIds: ['image-1'],
  status: 'QUEUED', language: 'es', cardCount: 10, identityId: 'identity-1', fingerprint: 'fingerprint-1',
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
const result = { cards: [{ question: '¿Qué es un evento?', answer: 'Una señal de cambio.', sources: [{ materialId: 'image-1' }] }] }

test('reserva trabajo y exclusión por deck en una misma transacción condicional', async () => {
  const calls: unknown[] = []
  const stub = mock.method(DynamoDBDocumentClient.prototype, 'send', async (command: unknown) => { calls.push(command); return {} })
  try {
    await reserve(job)
    const command = calls[0] as TransactWriteCommand
    assert.ok(command instanceof TransactWriteCommand)
    assert.equal(command.input.TransactItems?.length, 2)
    assert.equal(command.input.TransactItems?.[0].Put?.ConditionExpression, 'attribute_not_exists(id)')
    assert.equal(command.input.TransactItems?.[1].Put?.Item?.id, 'student-a:deck-1')
    assert.ok(command.input.TransactItems?.[1].Put?.ConditionExpression?.includes('expiresAt < :now'))
  } finally { stub.mock.restore() }
})

test('tarjetas, estado final y liberación del deck se guardan atómicamente bajo el mismo lease', async () => {
  const calls: unknown[] = []
  const stub = mock.method(DynamoDBDocumentClient.prototype, 'send', async (command: unknown) => { calls.push(command); return {} })
  try {
    await finish(job, 'lease-1', result)
    const items = (calls[0] as TransactWriteCommand).input.TransactItems!
    assert.equal(items.length, 3)
    assert.equal(items[0].Put?.Item?.id, 'job-1-0')
    assert.equal(items[0].Put?.Item?.owner, job.owner)
    assert.equal(items[0].Put?.Item?.generationJobId, job.id)
    assert.ok(items[1].Update?.ConditionExpression?.includes('leaseToken = :token'))
    assert.equal(items[1].Update?.ExpressionAttributeValues?.[':token'], 'lease-1')
    assert.equal(items[1].Update?.ExpressionAttributeValues?.[':status'], 'COMPLETED')
    assert.equal(items[2].Delete?.ExpressionAttributeValues?.[':job'], job.id)
  } finally { stub.mock.restore() }
})

test('un lease vigente impide invocaciones concurrentes; un trabajo terminado no se vuelve a ejecutar', async () => {
  let stored = { ...job, status: 'PROCESSING', leaseUntil: Math.floor(Date.now() / 1000) + 600 }
  const stub = mock.method(DynamoDBDocumentClient.prototype, 'send', async (command: unknown) => {
    assert.ok(command instanceof GetCommand); return { Item: stored }
  })
  try {
    await assert.rejects(() => claim(job.id, 'other-lease'), /still active/)
    stored = { ...stored, status: 'COMPLETED' }
    assert.equal(await claim(job.id, 'other-lease'), undefined)
  } finally { stub.mock.restore() }
})

test('tomar un trabajo renueva también la exclusión del deck de forma atómica', async () => {
  const calls: unknown[] = []
  const stub = mock.method(DynamoDBDocumentClient.prototype, 'send', async (command: unknown) => {
    calls.push(command); return command instanceof GetCommand ? { Item: job } : {}
  })
  try {
    const claimed = await claim(job.id, 'lease-1')
    assert.equal(claimed?.status, 'PROCESSING')
    const items = (calls[1] as TransactWriteCommand).input.TransactItems!
    assert.equal(items[0].Update?.ExpressionAttributeValues?.[':token'], 'lease-1')
    assert.equal(items[1].Update?.ExpressionAttributeValues?.[':job'], job.id)
    assert.ok(items[1].Update?.ConditionExpression?.includes('expiresAt >= :now'))
  } finally { stub.mock.restore() }
})

test('un evento atrasado no vuelve a ejecutar un trabajo cuyo deck ya tiene otra solicitud', async () => {
  const calls: unknown[] = []
  const stub = mock.method(DynamoDBDocumentClient.prototype, 'send', async (command: unknown) => {
    calls.push(command)
    if (command instanceof GetCommand) return { Item: command.input.TableName === 'jobs-test' ? job : { jobId: 'newer-job', expiresAt: Math.floor(Date.now() / 1000) + 1200 } }
    if (command instanceof TransactWriteCommand) throw Object.assign(new Error('Lock replaced'), { name: 'TransactionCanceledException' })
    assert.ok(command instanceof UpdateCommand)
    assert.equal(command.input.ExpressionAttributeValues?.[':failed'], 'FAILED')
    return {}
  })
  try {
    assert.equal(await claim(job.id, 'lease-1'), undefined)
    assert.equal(calls.filter((command) => command instanceof TransactWriteCommand).length, 1)
  } finally { stub.mock.restore() }
})
