import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { App } from 'aws-cdk-lib'

// Offline synthesis only. No credentials, lookups or deployment are performed.
const outputDirectory = resolve('.amplify/synth-check')
await mkdir(outputDirectory, { recursive: true })
process.env.CDK_OUTDIR = outputDirectory
process.env.CDK_DEFAULT_ACCOUNT = '111111111111'
process.env.CDK_DEFAULT_REGION = 'us-east-1'
process.env.CDK_CONTEXT_JSON = JSON.stringify({
  'amplify-backend-namespace': 'study-demo',
  'amplify-backend-name': 'validation',
  'amplify-backend-type': 'sandbox',
})

const { backend } = await import('../amplify/backend.ts')
const app = backend.stack.node.root as App
const assembly = app.synth()
console.log(`Backend sintetizado localmente en ${assembly.directory}. No se desplegaron recursos.`)
