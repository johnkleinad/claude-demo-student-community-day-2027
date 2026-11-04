import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb'
import type { GenerationResult } from '../../shared/generation'
import type { Deck, Job, Material } from './types'
import { GenerationError } from './service'

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }), { marshallOptions: { removeUndefinedValues: true } })
export function setting(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing configuration: ${name}`)
  return value
}
async function get<T>(table: string, id: string): Promise<T | undefined> {
  return (await client.send(new GetCommand({ TableName: setting(table), Key: { id }, ConsistentRead: true }))).Item as T | undefined
}
export const getJob = (id: string) => get<Job>('JOB_TABLE', id)
export const getDeck = (id: string) => get<Deck>('DECK_TABLE', id)
export const getMaterial = (id: string) => get<Material>('MATERIAL_TABLE', id)
const lockId = (job: Job) => `${job.owner}:${job.deckId}`

export async function reserve(job: Job) {
  const now = Math.floor(Date.now() / 1000)
  try {
    await client.send(new TransactWriteCommand({ TransactItems: [
      { Put: { TableName: setting('JOB_TABLE'), Item: { ...job, __typename: 'GenerationJob' }, ConditionExpression: 'attribute_not_exists(id)' } },
      { Put: { TableName: setting('CONTROL_TABLE'), Item: { id: lockId(job), jobId: job.id, expiresAt: now + 1200 },
        ConditionExpression: 'attribute_not_exists(id) OR expiresAt < :now', ExpressionAttributeValues: { ':now': now } } },
    ] }))
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'TransactionCanceledException') throw new GenerationError('Ya hay una generación en curso en este deck. Espera a que termine.')
    throw cause
  }
}
export async function claim(id: string, leaseToken: string): Promise<Job | undefined> {
  const now = Math.floor(Date.now() / 1000)
  const job = await getJob(id)
  if (!job || job.status === 'COMPLETED' || job.status === 'FAILED') return undefined
  if (job.status === 'PROCESSING' && (job.leaseUntil ?? 0) >= now) throw new Error('Generation lease is still active; retry the stream record later.')
  try {
    const updatedAt = new Date().toISOString()
    await client.send(new TransactWriteCommand({ TransactItems: [{ Update: { TableName: setting('JOB_TABLE'), Key: { id },
      UpdateExpression: 'SET #status = :processing, leaseToken = :token, leaseUntil = :until, updatedAt = :updated',
      ConditionExpression: '#status = :queued OR (#status = :processing AND leaseUntil < :now)',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':processing': 'PROCESSING', ':queued': 'QUEUED', ':token': leaseToken, ':until': now + 660, ':now': now, ':updated': updatedAt } } },
      { Update: { TableName: setting('CONTROL_TABLE'), Key: { id: lockId(job) },
        UpdateExpression: 'SET expiresAt = :until', ConditionExpression: 'jobId = :job AND expiresAt >= :now',
        ExpressionAttributeValues: { ':until': now + 1200, ':job': id, ':now': now } } },
    ] }))
    return { ...job, status: 'PROCESSING', leaseToken, leaseUntil: now + 660, updatedAt }
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'TransactionCanceledException') {
      const lock = await get<{ jobId: string; expiresAt: number }>('CONTROL_TABLE', lockId(job))
      if (!lock || lock.jobId !== id || lock.expiresAt < now) {
        try {
          await client.send(new UpdateCommand({ TableName: setting('JOB_TABLE'), Key: { id },
            UpdateExpression: 'SET #status = :failed, errorMessage = :message, updatedAt = :updated, completedAt = :updated REMOVE leaseToken, leaseUntil',
            ConditionExpression: '#status = :queued OR (#status = :processing AND leaseUntil < :now)',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':failed': 'FAILED', ':queued': 'QUEUED', ':processing': 'PROCESSING', ':now': now,
              ':message': 'La solicitud venció antes de completarse. Puedes iniciar una nueva generación.', ':updated': new Date().toISOString() } }))
        } catch (error) { if (!(error instanceof Error) || error.name !== 'ConditionalCheckFailedException') throw error }
        return undefined
      }
      throw new Error('Concurrent generation claim; retry later.')
    }
    throw cause
  }
}
export async function finish(job: Job, leaseToken: string, result?: GenerationResult, errorMessage?: string) {
  const now = new Date().toISOString()
  const status = result ? 'COMPLETED' : 'FAILED'
  await client.send(new TransactWriteCommand({ TransactItems: [
    ...(result?.cards.map((card, index) => ({ Put: { TableName: setting('CARD_TABLE'), Item: {
      ...card, id: `${job.id}-${index}`, deckId: job.deckId, generationJobId: job.id, owner: job.owner,
      createdAt: now, updatedAt: now, __typename: 'Flashcard',
    }, ConditionExpression: 'attribute_not_exists(id)' } })) ?? []),
    { Update: { TableName: setting('JOB_TABLE'), Key: { id: job.id },
      UpdateExpression: 'SET #status = :status, completedAt = :now, updatedAt = :now, generatedCount = :count, errorMessage = :error REMOVE leaseToken, leaseUntil',
      ConditionExpression: '#status = :processing AND leaseToken = :token', ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': status, ':now': now, ':count': result?.cards.length ?? 0, ':error': errorMessage ?? null, ':token': leaseToken, ':processing': 'PROCESSING' } } },
    { Delete: { TableName: setting('CONTROL_TABLE'), Key: { id: lockId(job) }, ConditionExpression: 'jobId = :job', ExpressionAttributeValues: { ':job': job.id } } },
  ] }))
}
