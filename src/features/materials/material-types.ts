export type MaterialStatus = 'PENDING' | 'UPLOADED' | 'FAILED'

export type StudyMaterial = {
  id: string
  deckId: string
  owner: string
  filename: string
  storagePath: string
  contentType: string
  sizeBytes: number
  uploadStatus: MaterialStatus
  createdAt: string
}

export type MaterialInput = Omit<StudyMaterial, 'id' | 'owner' | 'createdAt'>
export type UploadPhase = 'preparing' | 'uploading' | 'saving'

export type UploadJob = {
  /** Local queue ID. */
  id: string
  /** Server-assigned Material ID once the record exists. */
  materialId?: string
  file: File
  contentType: string
  previewUrl?: string
  status: 'checking' | 'ready' | UploadPhase | 'failed' | 'invalid'
  progress: number
  error?: string
}

export type MaterialUploadDependencies = {
  identity: () => Promise<{ userId: string; identityId: string }>
  getDeck: (id: string) => Promise<{ id: string; owner?: string | null; archived?: boolean | null } | null>
  get: (id: string) => Promise<StudyMaterial | null>
  create: (input: MaterialInput) => Promise<StudyMaterial>
  status: (id: string, status: MaterialStatus) => Promise<StudyMaterial>
  setPath: (id: string, storagePath: string) => Promise<StudyMaterial>
  object: (path: string) => Promise<{ size: number; contentType?: string } | null>
  upload: (input: { path: string; file: File; contentType: string; signal: AbortSignal; onProgress: (percent: number) => void }) => Promise<void>
}
