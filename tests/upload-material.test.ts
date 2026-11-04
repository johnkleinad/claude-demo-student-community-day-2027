import assert from 'node:assert/strict'
import test from 'node:test'
import { uploadMaterial } from '../src/features/materials/upload-material.ts'
import type { MaterialInput, MaterialUploadDependencies, MaterialStatus, StudyMaterial, UploadPhase } from '../src/features/materials/material-types.ts'

const identityId = 'us-east-1:24d88426-bd98-4e87-b198-64e801bd2998'
const userId = '11111111-1111-4111-8111-111111111111'
const file = () => new File(['%PDF-1.7\nStudy notes'], 'serverless.pdf', { type: 'application/pdf' })

function fixture() {
  const records = new Map<string, StudyMaterial>()
  let object: { size: number; contentType: string } | null = null
  let uploads = 0
  let creates = 0
  const phases: UploadPhase[] = []
  const statuses: MaterialStatus[] = []
  const api: MaterialUploadDependencies = {
    identity: async () => ({ userId, identityId }),
    getDeck: async () => ({ id: 'deck-1', owner: userId, archived: false }),
    get: async (id) => records.get(id) ?? null,
    create: async (input: MaterialInput) => {
      assert.ok(!('id' in input), 'AppSync rejects client-supplied IDs under field-level owner auth')
      creates++
      const record = { ...input, id: `material-${creates}`, owner: userId, createdAt: new Date().toISOString() }
      records.set(record.id, record)
      return record
    },
    status: async (id, status) => {
      statuses.push(status)
      const record = records.get(id)
      assert.ok(record)
      const next = { ...record, uploadStatus: status }
      records.set(id, next)
      return next
    },
    setPath: async (id, storagePath) => {
      const record = records.get(id)
      assert.ok(record)
      const next = { ...record, storagePath }
      records.set(id, next)
      return next
    },
    object: async () => object,
    upload: async ({ file, contentType, onProgress }) => {
      assert.equal(records.get('material-1')?.uploadStatus, 'PENDING', 'Register before uploading any bytes')
      assert.equal(records.get('material-1')?.storagePath, `materials/${identityId}/deck-1/material-1.pdf`, 'Assign the path before uploading')
      uploads++
      onProgress(50)
      object = { size: file.size, contentType }
    },
  }
  const input = (materialId?: string) => ({ materialId, deckId: 'deck-1', userId, file: file(), signal: new AbortController().signal,
    onPhase: (phase: UploadPhase) => phases.push(phase), onProgress: (_percent: number) => {} })
  return { api, records, phases, statuses, input, uploads: () => uploads, creates: () => creates }
}

test('registra primero y confirma UPLOADED solo después de guardar los bytes', async () => {
  const f = fixture()
  const material = await uploadMaterial(f.input(), f.api)
  assert.equal(material.uploadStatus, 'UPLOADED')
  assert.equal(material.storagePath, `materials/${identityId}/deck-1/material-1.pdf`)
  assert.deepEqual(f.phases, ['preparing', 'uploading', 'saving'])
  assert.equal(f.uploads(), 1)
})

test('un fallo de registro no sube objetos huérfanos', async () => {
  const f = fixture()
  f.api.create = async () => { throw new Error('Data unavailable') }
  await assert.rejects(() => uploadMaterial(f.input(), f.api), /registrar el material/)
  assert.equal(f.uploads(), 0)
})

test('no envía un ID propio y comunica el ID asignado por AppSync', async () => {
  const f = fixture()
  const ids: string[] = []
  await uploadMaterial({ ...f.input(), onRecord: (id) => ids.push(id) }, f.api)
  assert.deepEqual(ids, ['material-1'])
})

test('reanuda un registro sin ruta asignada tras un fallo intermedio', async () => {
  const f = fixture()
  f.api.setPath = async () => { throw new Error('Data unavailable') }
  await assert.rejects(() => uploadMaterial(f.input(), f.api))
  assert.equal(f.records.get('material-1')?.storagePath, '')
  assert.equal(f.uploads(), 0)
  const retry = fixture()
  retry.records.set('material-1', f.records.get('material-1')!)
  assert.equal((await uploadMaterial(retry.input('material-1'), retry.api)).uploadStatus, 'UPLOADED')
  assert.equal(retry.creates(), 0)
})

test('reintentar un fallo de finalización reutiliza el objeto y no duplica la subida', async () => {
  const f = fixture()
  const original = f.api.status
  let failed = false
  f.api.status = async (id, status) => {
    if (status === 'UPLOADED' && !failed) { failed = true; throw new Error('Finalization unavailable') }
    return original(id, status)
  }
  await assert.rejects(() => uploadMaterial(f.input(), f.api), /ya está en el almacenamiento/)
  assert.equal(f.records.get('material-1')?.uploadStatus, 'PENDING')
  assert.equal((await uploadMaterial(f.input('material-1'), f.api)).uploadStatus, 'UPLOADED')
  assert.equal(f.uploads(), 1)
  assert.equal(f.creates(), 1)
})

test('un fallo de subida deja el registro reintentable y nunca lo marca completo', async () => {
  const f = fixture()
  f.api.upload = async () => { throw new Error('S3 upload failed') }
  await assert.rejects(() => uploadMaterial(f.input(), f.api))
  assert.equal(f.records.get('material-1')?.uploadStatus, 'FAILED')
  assert.ok(!f.statuses.includes('UPLOADED'))
})

test('rechaza otra identidad o un deck ajeno antes de crear o subir material', async () => {
  const f = fixture()
  f.api.identity = async () => ({ userId: 'foreign', identityId })
  await assert.rejects(() => uploadMaterial(f.input(), f.api), /sesión cambió/)
  assert.equal(f.creates(), 0)
  f.api.identity = async () => ({ userId, identityId })
  f.api.getDeck = async () => ({ id: 'deck-1', owner: 'foreign' })
  await assert.rejects(() => uploadMaterial(f.input(), f.api), /no se puede añadir/i)
  assert.equal(f.uploads(), 0)
})

test('reintentar con otro archivo no altera un material ya guardado', async () => {
  const f = fixture()
  await uploadMaterial(f.input(), f.api)
  const attempts = f.statuses.length
  const wrong = { ...f.input('material-1'), file: new File([file()], 'different.pdf', { type: 'application/pdf' }) }
  await assert.rejects(() => uploadMaterial(wrong, f.api), /archivo original/)
  assert.equal(f.records.get('material-1')?.uploadStatus, 'UPLOADED')
  assert.equal(f.statuses.length, attempts)
})

test('no sobrescribe un objeto de tamaño o tipo diferente', async () => {
  const f = fixture()
  f.api.object = async () => ({ size: 999, contentType: 'image/jpeg' })
  await assert.rejects(() => uploadMaterial(f.input(), f.api), /no coincide/)
  assert.equal(f.uploads(), 0)
  assert.ok(!f.statuses.includes('UPLOADED'))
})

test('una operación cancelada no inicia solicitudes de registro o subida', async () => {
  const f = fixture()
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(() => uploadMaterial({ ...f.input(), signal: controller.signal }, f.api), /canceló/)
  assert.equal(f.creates(), 0)
  assert.equal(f.uploads(), 0)
})
