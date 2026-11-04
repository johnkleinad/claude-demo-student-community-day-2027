// No product upload limit. Material.sizeBytes is a GraphQL Int (32-bit), so that is the only ceiling.
// Generation applies its own per-file limits (Bedrock) in amplify/generation/files.ts.
export const MAX_MATERIAL_BYTES = 2 ** 31 - 1
export const MAX_FILES_PER_BATCH = 10
export const MATERIAL_FILE_ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf'

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
    throw new Error('El archivo está vacío o es demasiado grande para registrarlo.')
  }
}

export async function inspectMaterialFile(file: {
  type: string
  size: number
  slice: (start: number, end: number) => { arrayBuffer: () => Promise<ArrayBuffer> }
}) {
  // Some mobile browsers omit MIME types. Inspect bytes rather than trusting a filename.
  if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > MAX_MATERIAL_BYTES) {
    throw new Error('El archivo está vacío o es demasiado grande para registrarlo.')
  }
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const starts = (signature: number[]) => signature.every((value, index) => bytes[index] === value)
  let type = ''
  if (starts([0xff, 0xd8, 0xff])) type = 'image/jpeg'
  else if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) type = 'image/png'
  else if (starts([0x52, 0x49, 0x46, 0x46]) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) type = 'image/webp'
  else if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) type = 'application/pdf'
  if (!type) throw new Error('No reconocimos el archivo. Selecciona una imagen JPG, PNG, WebP o un PDF válido.')
  const declared = file.type.toLowerCase().split(';')[0].trim().replace('image/jpg', 'image/jpeg')
  if (declared && declared !== 'application/octet-stream' && declared !== type) {
    throw new Error('El contenido no coincide con el tipo del archivo seleccionado.')
  }
  validateMaterialFile({ type, size: file.size })
  return type
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
