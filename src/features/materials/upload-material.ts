import { createMaterialPath, inspectMaterialFile } from '../../../shared/materials'
import type { MaterialUploadDependencies, StudyMaterial, UploadPhase } from './material-types'

function checkAbort(signal: AbortSignal) {
  if (signal.aborted) throw new Error('Se canceló la subida. Puedes seleccionar el archivo de nuevo para reintentar.')
}

export async function uploadMaterial(input: {
  id: string
  deckId: string
  userId: string
  file: File
  signal: AbortSignal
  onPhase: (phase: UploadPhase) => void
  onProgress: (percent: number) => void
}, api: MaterialUploadDependencies): Promise<StudyMaterial> {
  let record: StudyMaterial | null = null
  let uploaded = false
  let uploadStarted = false
  try {
    checkAbort(input.signal)
    input.onPhase('preparing')
    const contentType = await inspectMaterialFile(input.file)
    checkAbort(input.signal)
    const identity = await api.identity()
    if (identity.userId !== input.userId) throw new Error('La sesión cambió. Vuelve a iniciar sesión antes de subir archivos.')
    const deck = await api.getDeck(input.deckId)
    if (!deck || deck.id !== input.deckId || deck.owner !== input.userId || deck.archived) {
      throw new Error('No se puede añadir material a este deck.')
    }
    const storagePath = createMaterialPath({ identityId: identity.identityId, deckId: input.deckId, materialId: input.id, contentType })
    const assertRecord = (material: StudyMaterial) => {
      if (material.id !== input.id || material.deckId !== input.deckId || material.owner !== input.userId ||
          material.storagePath !== storagePath || material.contentType !== contentType ||
          material.sizeBytes !== input.file.size || material.filename !== input.file.name) {
        throw new Error('Selecciona el archivo original para reintentar este material.')
      }
    }
    checkAbort(input.signal)
    record = await api.get(input.id)
    if (record) assertRecord(record)
    else {
      try {
        record = await api.create({ id: input.id, deckId: input.deckId, filename: input.file.name,
          storagePath, contentType, sizeBytes: input.file.size, uploadStatus: 'PENDING' })
      } catch {
        // The create may have committed before a network timeout. Reuse the same ID.
        record = await api.get(input.id)
        if (!record) throw new Error('No pudimos registrar el material. Inténtalo otra vez.')
      }
      assertRecord(record)
    }
    if (record.uploadStatus === 'UPLOADED') return record
    checkAbort(input.signal)

    // A previous attempt may have uploaded the bytes but failed to finalize Data.
    const object = await api.object(storagePath)
    if (object) {
      if (object.size !== input.file.size || object.contentType?.split(';')[0] !== contentType) {
        throw new Error('El archivo guardado no coincide con el material. No se sobrescribió.')
      }
      uploaded = true
    } else {
      if (record.uploadStatus !== 'PENDING') record = await api.status(record.id, 'PENDING')
      checkAbort(input.signal)
      input.onPhase('uploading')
      uploadStarted = true
      await api.upload({ path: storagePath, file: input.file, contentType, signal: input.signal, onProgress: input.onProgress })
      uploaded = true
    }
    checkAbort(input.signal)
    input.onProgress(100)
    input.onPhase('saving')
    const complete = await api.status(record.id, 'UPLOADED')
    assertRecord(complete)
    if (complete.uploadStatus !== 'UPLOADED') throw new Error('No se pudo confirmar el estado del material.')
    return complete
  } catch (cause) {
    if (record && uploadStarted && !uploaded) {
      try { await api.status(record.id, 'FAILED') } catch { /* Preserve PENDING if Data is unavailable. */ }
    }
    if (uploaded) throw new Error('El archivo ya está en el almacenamiento, pero falta confirmar su registro. Reintenta para terminar el guardado.')
    throw cause instanceof Error ? cause : new Error('No pudimos subir el archivo. Inténtalo otra vez.')
  }
}
