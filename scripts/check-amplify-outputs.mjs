import { readFile } from 'node:fs/promises'

try {
  const outputs = JSON.parse(await readFile(new URL('../amplify_outputs.json', import.meta.url), 'utf8'))
  if (!outputs.auth?.user_pool_id || !outputs.auth?.identity_pool_id ||
      !outputs.data?.url || !outputs.storage?.bucket_name) {
    throw new Error('Faltan recursos Auth, Data o Storage en amplify_outputs.json.')
  }
  console.log('Configuración de Auth, Data y Storage disponible para Hosting.')
} catch (error) {
  console.error(`No se puede compilar para Hosting: ${error.message}`)
  process.exitCode = 1
}
