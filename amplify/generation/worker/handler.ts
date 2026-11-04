import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { BedrockAgentCoreClient, InvokeAgentRuntimeCommand } from '@aws-sdk/client-bedrock-agentcore'
import { processGeneration, GenerationError } from '../service'
import { claim, getDeck, getMaterial, finish, setting } from '../store'
import { inspectGenerationBytes } from '../files'

const s3 = new S3Client({ region: process.env.AWS_REGION })
const agent = new BedrockAgentCoreClient({ region: process.env.AWS_REGION, maxAttempts: 2,
  requestHandler: { requestTimeout: 540_000 } })

export async function handler(event: { Records: Array<{ eventName?: string; dynamodb?: { Keys?: { id?: { S?: string } } } }> }) {
  for (const record of event.Records) {
    if (record.eventName !== 'INSERT' || !record.dynamodb?.Keys?.id?.S) continue
    await processGeneration(record.dynamodb.Keys.id.S, { claim, getDeck, getMaterial,
      async prepare(material) {
        if (!Number.isSafeInteger(material.sizeBytes) || material.sizeBytes <= 0 || material.sizeBytes > 4.5 * 1024 * 1024) {
          throw new GenerationError('Para generar, usa imágenes de hasta 3.75 MB y PDF de hasta 4.5 MB.')
        }
        const object = await s3.send(new GetObjectCommand({ Bucket: setting('MATERIAL_BUCKET'), Key: material.storagePath }))
        if (!object.Body) throw new GenerationError('No encontramos uno de los archivos. Vuelve a subirlo.')
        if (object.ContentLength !== material.sizeBytes || object.ContentType !== material.contentType || !object.ETag) {
          if ('destroy' in object.Body) object.Body.destroy()
          throw new GenerationError('Un archivo cambió después de guardarse. Vuelve a subirlo antes de generar.')
        }
        const bytes = await object.Body.transformToByteArray()
        if (bytes.length !== material.sizeBytes) throw new GenerationError('No se pudo verificar uno de los archivos.')
        return { id: material.id, storagePath: material.storagePath, contentType: material.contentType, sizeBytes: bytes.length,
          etag: object.ETag, ...await inspectGenerationBytes(bytes, material.contentType) }
      },
      async invoke(payload) {
        const response = await agent.send(new InvokeAgentRuntimeCommand({ agentRuntimeArn: setting('AGENT_RUNTIME_ARN'),
          qualifier: 'demo', runtimeSessionId: `${payload.request.requestId}-${Date.now()}`,
          contentType: 'application/json', accept: 'application/json', payload: Buffer.from(JSON.stringify(payload)) }))
        if (!response.response) throw new Error('Agent response missing')
        const text = await response.response.transformToString()
        if (text.length > 1_000_000) throw new Error('Agent response too large')
        const result: unknown = JSON.parse(text)
        if (result && typeof result === 'object' && 'error' in result) throw new GenerationError('El agente no pudo interpretar suficiente contenido. Prueba con materiales más claros.')
        return result
      },
      complete: (job, result, leaseToken) => finish(job, leaseToken, result),
      fail: (job, message, leaseToken) => finish(job, leaseToken, undefined, message),
    })
  }
}
