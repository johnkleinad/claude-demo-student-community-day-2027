import assert from 'node:assert/strict'
import test from 'node:test'
import { PDFDocument } from 'pdf-lib'
import { inspectGenerationBytes } from '../amplify/generation/files.ts'

test('valida el PDF real y obtiene el número de páginas sin confiar en metadatos del cliente', async () => {
  const pdf = await PDFDocument.create(); pdf.addPage(); pdf.addPage()
  assert.equal((await inspectGenerationBytes(await pdf.save(), 'application/pdf')).pageCount, 2)
  await assert.rejects(() => inspectGenerationBytes(new TextEncoder().encode('%PDF-fake'), 'application/pdf'), /PDF debe ser válido/)
})

test('rechaza PDFs demasiado extensos, imágenes falsas y contenido con MIME incorrecto', async () => {
  const pdf = await PDFDocument.create(); for (let i = 0; i < 101; i++) pdf.addPage()
  const longPdf = await pdf.save()
  await assert.rejects(() => inspectGenerationBytes(longPdf, 'application/pdf'))
  await assert.rejects(() => inspectGenerationBytes(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png'))
  const bytes = await (await PDFDocument.create()).save()
  await assert.rejects(() => inspectGenerationBytes(bytes, 'image/png'))
})

test('acepta imágenes reales y comprueba los límites antes de invocar el modelo', async () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGZkAAAAASUVORK5CYII=', 'base64')
  assert.deepEqual(await inspectGenerationBytes(png, 'image/png'), {})
  const large = new Uint8Array(10 * 1024 * 1024); large.set(png)
  assert.deepEqual(await inspectGenerationBytes(large, 'image/png'), {})
  const tooLarge = new Uint8Array(20 * 1024 * 1024 + 1); tooLarge.set(png)
  await assert.rejects(() => inspectGenerationBytes(tooLarge, 'image/png'), /20 MB/)
})
