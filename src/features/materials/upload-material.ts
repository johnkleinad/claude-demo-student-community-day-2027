import { createMaterialPath, inspectMaterialFile } from '../../../shared/materials'
import type { MaterialUploadDependencies, StudyMaterial, UploadPhase } from './material-types'

function checkAbort(signal: AbortSignal) {
  if (signal.aborted) throw new Error('Se canceló la subida. Puedes seleccionar el archivo de nuevo para reintentar.')
}

export async function uploadMaterial(input: {
  /** Existing record to resume. New records get their ID from AppSync, never from the client. */
  materialId?: string
  deckId: string
  userId: string
  file: File
  signal: AbortSignal
  onPhase: (phase: UploadPhase) => void
  onProgress: (percent: number) => void
  onRecord?: (materialId: string) => void
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
    const pathFor = (materialId: string) => createMaterialPath({ identityId: identity.identityId, deckId: input.deckId, materialId, contentType })
    // A record without a path was created but not finalized; it is only valid before the path is assigned.
    const assertRecord = (material: StudyMaterial, allowMissingPath = false) => {
      if ((input.materialId && material.id !== input.materialId) || material.deckId !== input.deckId || material.owner !== input.userId ||
          !(material.storagePath === pathFor(material.id) || (allowMissingPath && material.storagePath === '')) ||
          material.contentType !== contentType || material.sizeBytes !== input.file.size || material.filename !== input.file.name) {
        throw new Error('Selecciona el archivo original para reintentar este material.')
      }
    }
    checkAbort(input.signal)
    if (input.materialId) {
      record = await api.get(input.materialId)
      if (!record) throw new Error('Este material ya no existe. Vuelve a seleccionar el archivo.')
    } else {
      // Field-level owner auth makes AppSync reject a client-supplied ID on create.
      try {
        record = await api.create({ deckId: input.deckId, filename: input.file.name,
          storagePath: '', contentType, sizeBytes: input.file.size, uploadStatus: 'PENDING' })
      } catch {
        throw new Error('No pudimos registrar el material. Inténtalo otra vez.')
      }
      input.onRecord?.(record.id)
    }
    assertRecord(record, true)
    const storagePath = pathFor(record.id)
    if (record.storagePath !== storagePath) {
      checkAbort(input.signal)
      record = await api.setPath(record.id, storagePath)
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
