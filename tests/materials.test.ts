import assert from 'node:assert/strict'
import test from 'node:test'
import { createMaterialPath, MAX_MATERIAL_BYTES, validateMaterialFile } from '../shared/materials.ts'

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
