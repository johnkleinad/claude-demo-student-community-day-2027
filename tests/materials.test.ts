import assert from 'node:assert/strict'
import test from 'node:test'
import { createMaterialPath, inspectMaterialFile, MAX_MATERIAL_BYTES, validateMaterialFile } from '../shared/materials.ts'

const input = {
  identityId: 'us-east-1:24d88426-bd98-4e87-b198-64e801bd2998',
  deckId: 'deck-1',
  materialId: 'material-1',
  contentType: 'application/pdf',
}

test('genera rutas privadas con identidad, deck e identificador de material', () => {
  assert.equal(createMaterialPath(input), `materials/${input.identityId}/deck-1/material-1.pdf`)
  assert.notEqual(createMaterialPath(input), createMaterialPath({ ...input, identityId: 'us-east-1:538ee8c6-bbd6-4391-8ded-40a8931a5317' }))
})

test('detecta formatos por contenido cuando el navegador omite el MIME', async () => {
  for (const [bytes, type] of [
    [[0xff, 0xd8, 0xff, 0x00], 'image/jpeg'],
    [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'image/png'],
    [[0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50], 'image/webp'],
    [[0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37], 'application/pdf'],
  ] as const) {
    const file = new File([new Uint8Array(bytes)], 'material', { type: '' })
    assert.equal(await inspectMaterialFile(file), type)
  }
})

test('rechaza archivos con MIME falso, SVG o contenido no reconocido', async () => {
  await assert.rejects(() => inspectMaterialFile(new File(['<html>not an image</html>'], 'fake.jpg', { type: 'image/jpeg' })))
  await assert.rejects(() => inspectMaterialFile(new File(['<svg/>'], 'diagram.svg', { type: 'image/svg+xml' })))
  await assert.rejects(() => inspectMaterialFile(new File(['%PDF-1.7'], 'fake.jpg', { type: 'image/jpeg' })))
})

test('rechaza traversal, identidades inválidas y tipos no admitidos', () => {
  assert.throws(() => createMaterialPath({ ...input, deckId: '../another-user' }))
  assert.throws(() => createMaterialPath({ ...input, materialId: 'folder/id' }))
  assert.throws(() => createMaterialPath({ ...input, identityId: 'user-pool-sub' }))
  assert.throws(() => createMaterialPath({ ...input, contentType: 'text/html' }))
})

test('admite imágenes y PDF dentro del límite; rechaza archivos vacíos, grandes o tipos ejecutables', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']) {
    assert.doesNotThrow(() => validateMaterialFile({ type, size: MAX_MATERIAL_BYTES }))
  }
  assert.throws(() => validateMaterialFile({ type: 'image/png', size: 0 }))
  assert.throws(() => validateMaterialFile({ type: 'image/png', size: MAX_MATERIAL_BYTES + 1 }))
  assert.throws(() => validateMaterialFile({ type: 'text/html', size: 100 }))
})
