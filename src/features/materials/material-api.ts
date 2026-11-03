import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth'
import { getProperties, getUrl, uploadData } from 'aws-amplify/storage'
import { getDataClient } from '@/lib/data'
import { createMaterialPath } from '../../../shared/materials'
import type { Schema } from '../../../amplify/data/resource'
import type { MaterialUploadDependencies, StudyMaterial } from './material-types'

type RawMaterial = Schema['Material']['type']
function present(material: RawMaterial): StudyMaterial {
  return { id: material.id, deckId: material.deckId, owner: material.owner ?? '', filename: material.filename,
    storagePath: material.storagePath, contentType: material.contentType, sizeBytes: material.sizeBytes,
    uploadStatus: material.uploadStatus ?? 'PENDING', createdAt: material.createdAt }
}

export async function storageIdentity() {
  const user = await getCurrentUser()
  const session = await fetchAuthSession()
  if (!session.identityId || session.tokens?.idToken?.payload.sub !== user.userId) {
    throw new Error('No pudimos validar tu acceso al almacenamiento. Vuelve a iniciar sesión.')
  }
  return { userId: user.userId, identityId: session.identityId }
}

export async function listMaterials(deckId: string) {
  const materials = new Map<string, StudyMaterial>()
  const tokens = new Set<string>()
  let nextToken: string | null | undefined
  do {
    const page = await getDataClient().models.Material.listMaterialByDeckId({ deckId }, { limit: 100, nextToken })
    if (page.errors?.length) throw new Error('No pudimos cargar los materiales. Inténtalo otra vez.')
    for (const material of page.data) materials.set(material.id, present(material))
    nextToken = page.nextToken
    if (nextToken && tokens.has(nextToken)) throw new Error('No se pudo completar la consulta de materiales.')
    if (nextToken) tokens.add(nextToken)
  } while (nextToken)
  return [...materials.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
}

export const materialApi: MaterialUploadDependencies = {
  identity: storageIdentity,
  async getDeck(id) {
    const { data, errors } = await getDataClient().models.Deck.get({ id })
    if (errors?.length) throw new Error('No pudimos validar el deck. Reintenta en un momento.')
    return data
  },
  async get(id) {
    const { data, errors } = await getDataClient().models.Material.get({ id })
    if (errors?.length) throw new Error('No pudimos consultar el registro del material.')
    return data ? present(data) : null
  },
  async create(input) {
    const { data, errors } = await getDataClient().models.Material.create(input)
    if (errors?.length || !data) throw new Error('No pudimos crear el registro del material.')
    return present(data)
  },
  async status(id, uploadStatus) {
    const { data, errors } = await getDataClient().models.Material.update({ id, uploadStatus })
    if (errors?.length || !data) throw new Error('No pudimos guardar el estado del material.')
    return present(data)
  },
  async object(path) {
    try {
      const object = await getProperties({ path })
      if (typeof object.size !== 'number') throw new Error('No pudimos verificar el tamaño del archivo.')
      return { size: object.size, contentType: object.contentType }
    } catch (cause) {
      const error = cause as { name?: string; $metadata?: { httpStatusCode?: number } }
      if (error.$metadata?.httpStatusCode === 404 || error.name === 'NotFound' || error.name === 'NoSuchKey') return null
      throw new Error('No pudimos verificar el archivo en el almacenamiento. Inténtalo otra vez.')
    }
  },
  async upload({ path, file, contentType, signal, onProgress }) {
    if (signal.aborted) throw new Error('Se canceló la subida.')
    const task = uploadData({ path, data: file, options: {
      contentType, preventOverwrite: true,
      onProgress: ({ transferredBytes, totalBytes }) => {
        if (totalBytes) onProgress(Math.min(100, Math.round(transferredBytes / totalBytes * 100)))
      },
    } })
    const cancel = () => { task.cancel() }
    signal.addEventListener('abort', cancel, { once: true })
    try { await task.result }
    catch { throw new Error(signal.aborted ? 'Se canceló la subida. Puedes reintentar cuando quieras.' : 'No pudimos subir el archivo. Revisa tu conexión e inténtalo otra vez.') }
    finally { signal.removeEventListener('abort', cancel) }
  },
}

export async function materialUrl(material: StudyMaterial) {
  const identity = await storageIdentity()
  const expected = createMaterialPath({ identityId: identity.identityId, deckId: material.deckId, materialId: material.id, contentType: material.contentType })
  if (material.owner !== identity.userId || material.storagePath !== expected || material.uploadStatus !== 'UPLOADED') {
    throw new Error('No se puede abrir este material.')
  }
  return getUrl({ path: expected, options: { expiresIn: 900, validateObjectExistence: true } })
}
