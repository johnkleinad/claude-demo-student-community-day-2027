import { PDFDocument } from 'pdf-lib'
import { imageSize } from 'image-size'
import { inspectMaterialFile } from '../../shared/materials'
import { GenerationError } from './service'

export async function inspectGenerationBytes(bytes: Uint8Array, contentType: string) {
  const type = await inspectMaterialFile(new Blob([Uint8Array.from(bytes)], { type: contentType }))
  if (type === 'application/pdf') {
    if (bytes.length > 4.5 * 1024 * 1024) throw new GenerationError('Para generar tarjetas, cada PDF debe pesar hasta 4.5 MB. Divide el documento y vuelve a subirlo.')
    try {
      const pdf = await PDFDocument.load(bytes, { updateMetadata: false, throwOnInvalidObject: true })
      const pageCount = pdf.getPageCount()
      if (!pageCount || pageCount > 100) throw new Error('pages')
      return { pageCount }
    } catch { throw new GenerationError('El PDF debe ser válido, sin contraseña y tener entre 1 y 100 páginas.') }
  }
  if (bytes.length > 3.75 * 1024 * 1024) throw new GenerationError('Para generar tarjetas, cada imagen debe pesar hasta 3.75 MB. Sube una versión más ligera.')
  try {
    const dimensions = imageSize(bytes)
    if (!dimensions.width || !dimensions.height || dimensions.width > 8000 || dimensions.height > 8000) throw new Error('dimensions')
  } catch { throw new GenerationError('Una imagen no es válida o supera los 8000 píxeles de ancho o alto.') }
  return {}
}
