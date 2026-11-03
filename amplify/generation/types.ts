import type { GenerationRequest, GenerationResult } from '../../shared/generation'

export type Job = {
  id: string; owner: string; requestId: string; deckId: string; materialIds: string[]
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  language: 'es' | 'en'; cardCount: number; focus?: string; identityId: string
  fingerprint: string; createdAt: string; updatedAt: string
  leaseToken?: string; leaseUntil?: number; errorMessage?: string
}
export type Material = {
  id: string; deckId: string; owner?: string; storagePath: string; contentType: string
  sizeBytes: number; uploadStatus?: string; filename: string
}
export type Deck = { id: string; owner?: string; archived?: boolean }
export type Manifest = { id: string; storagePath: string; contentType: string; sizeBytes: number; etag: string; pageCount?: number }
export type RuntimeInput = { request: GenerationRequest; identityId: string; materials: Manifest[] }
export type RequestDependencies = {
  getJob: (id: string) => Promise<Job | undefined>
  getDeck: (id: string) => Promise<Deck | undefined>
  getMaterial: (id: string) => Promise<Material | undefined>
  identity: (token: string) => Promise<string>
  reserve: (job: Job) => Promise<void>
}
export type WorkerDependencies = {
  claim: (id: string, leaseToken: string) => Promise<Job | undefined>
  getDeck: (id: string) => Promise<Deck | undefined>
  getMaterial: (id: string) => Promise<Material | undefined>
  prepare: (material: Material) => Promise<Manifest>
  invoke: (payload: RuntimeInput) => Promise<unknown>
  complete: (job: Job, result: GenerationResult, leaseToken: string) => Promise<void>
  fail: (job: Job, message: string, leaseToken: string) => Promise<void>
}
