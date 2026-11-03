export const MAX_MATERIAL_BYTES = 20 * 1024 * 1024

const extensions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
} as const

export function validateMaterialFile(file: { type: string; size: number }) {
  if (!Object.hasOwn(extensions, file.type)) {
    throw new Error('Selecciona una imagen JPG, PNG, WebP o un PDF.')
  }
  if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > MAX_MATERIAL_BYTES) {
    throw new Error('El archivo debe tener contenido y pesar como máximo 20 MB.')
  }
}

export function createMaterialPath(input: {
  identityId: string
  deckId: string
  materialId: string
  contentType: string
}) {
  if (!/^[a-z0-9-]+:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input.identityId)) {
    throw new Error('Se requiere una identidad de almacenamiento válida.')
  }
  for (const value of [input.deckId, input.materialId]) {
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(value)) throw new Error('Identificador de material o deck inválido.')
  }
  if (!Object.hasOwn(extensions, input.contentType)) throw new Error('Tipo de archivo no admitido.')
  const extension = extensions[input.contentType as keyof typeof extensions]
  return `materials/${input.identityId}/${input.deckId}/${input.materialId}.${extension}`
}
