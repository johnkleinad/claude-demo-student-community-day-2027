import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { buildSync } from 'esbuild'
import { AssetHashType, DockerImage, Duration, Names, RemovalPolicy, Stack } from 'aws-cdk-lib'
import { CfnRuntime, CfnRuntimeEndpoint } from 'aws-cdk-lib/aws-bedrockagentcore'
import { AttributeType, BillingMode, Table, type ITable } from 'aws-cdk-lib/aws-dynamodb'
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { type IFunction, StartingPosition, FilterCriteria, FilterRule } from 'aws-cdk-lib/aws-lambda'
import { DynamoEventSource, SqsDlq } from 'aws-cdk-lib/aws-lambda-event-sources'
import { Key } from 'aws-cdk-lib/aws-kms'
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs'
import { Queue, QueueEncryption } from 'aws-cdk-lib/aws-sqs'
import { Asset } from 'aws-cdk-lib/aws-s3-assets'
import type { IBucket } from 'aws-cdk-lib/aws-s3'
import type { Construct } from 'constructs'

type GenerationFunction = { resources: { lambda: IFunction }; addEnvironment: (key: string, value: string) => void }

export function configureGeneration(scope: Construct, resources: {
  request: GenerationFunction; worker: GenerationFunction; tables: Record<string, ITable>; bucket: IBucket
  userPoolId: string; identityPoolId: string
}) {
  const stack = Stack.of(scope)
  const runtimeName = `study_cards_${Names.uniqueId(scope).replace(/[^a-zA-Z0-9]/g, '').slice(-24)}`
  const control = new Table(scope, 'GenerationControl', { partitionKey: { name: 'id', type: AttributeType.STRING },
    timeToLiveAttribute: 'expiresAt', billingMode: BillingMode.PAY_PER_REQUEST,
    removalPolicy: RemovalPolicy.RETAIN })
  const source = fileURLToPath(new URL('../../agent', import.meta.url))
  const code = new Asset(scope, 'StudyAgentCode', { path: source, assetHashType: AssetHashType.OUTPUT, bundling: {
    image: DockerImage.fromRegistry('public.ecr.aws/docker/library/node:22'),
    local: { tryBundle(outputDir) {
      mkdirSync(outputDir, { recursive: true })
      buildSync({ entryPoints: [join(source, 'runtime.ts')], bundle: true, platform: 'node', target: 'node22',
        format: 'cjs', outfile: join(outputDir, 'index.js'), logLevel: 'warning', sourcemap: false })
      writeFileSync(join(outputDir, 'package.json'), JSON.stringify({ type: 'commonjs', engines: { node: '22' } }))
      return true
    } },
  } })
  const role = new Role(scope, 'StudyAgentRole', { assumedBy: new ServicePrincipal('bedrock-agentcore.amazonaws.com', {
    conditions: { StringEquals: { 'aws:SourceAccount': stack.account }, ArnLike: {
      'aws:SourceArn': stack.formatArn({ service: 'bedrock-agentcore', resource: 'runtime', resourceName: `${runtimeName}*` }),
    } },
  }) })
  code.grantRead(role)
  resources.bucket.grantRead(role, 'materials/*')
  const baseModel = 'anthropic.claude-haiku-4-5-20251001-v1:0'
  const modelId = `us.${baseModel}`
  role.addToPolicy(new PolicyStatement({ actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'], resources: [
    stack.formatArn({ service: 'bedrock', resource: 'inference-profile', resourceName: modelId }),
    ...['us-east-1', 'us-east-2', 'us-west-2'].map((region) => stack.formatArn({ service: 'bedrock', region, account: '', resource: 'foundation-model', resourceName: baseModel })),
  ] }))
  const logPrefix = stack.formatArn({ service: 'logs', resource: 'log-group', resourceName: `/aws/bedrock-agentcore/runtimes/${runtimeName}*` })
  role.addToPolicy(new PolicyStatement({ actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents', 'logs:DescribeLogStreams'], resources: [logPrefix] }))
  // AgentCore requires this for its workload identity. Scope to its default directory.
  role.addToPolicy(new PolicyStatement({ actions: ['bedrock-agentcore:GetWorkloadAccessToken'], resources: [
    stack.formatArn({ service: 'bedrock-agentcore', resource: 'workload-identity-directory', resourceName: 'default' }),
    stack.formatArn({ service: 'bedrock-agentcore', resource: 'workload-identity-directory', resourceName: 'default/workload-identity/*' }),
  ] }))
  const runtime = new CfnRuntime(scope, 'StudyAgentRuntime', { agentRuntimeName: runtimeName, roleArn: role.roleArn,
    agentRuntimeArtifact: { codeConfiguration: { code: { s3: { bucket: code.s3BucketName, prefix: code.s3ObjectKey } }, runtime: 'NODE_22', entryPoint: ['index.js'] } },
    protocolConfiguration: 'HTTP', networkConfiguration: { networkMode: 'PUBLIC' },
    lifecycleConfiguration: { idleRuntimeSessionTimeout: 60, maxLifetime: 600 },
    environmentVariables: { MATERIAL_BUCKET: resources.bucket.bucketName, BEDROCK_MODEL_ID: modelId },
  })
  const endpoint = new CfnRuntimeEndpoint(scope, 'StudyAgentEndpoint', { agentRuntimeId: runtime.attrAgentRuntimeId,
    agentRuntimeVersion: runtime.attrAgentRuntimeVersion, name: 'demo', description: 'Study card generation' })
  const logKey = new Key(scope, 'StudyAgentLogKey', { enableKeyRotation: true, removalPolicy: RemovalPolicy.RETAIN })
  logKey.addToResourcePolicy(new PolicyStatement({ principals: [new ServicePrincipal(`logs.${stack.region}.amazonaws.com`)],
    actions: ['kms:Encrypt', 'kms:Decrypt', 'kms:ReEncrypt*', 'kms:GenerateDataKey*', 'kms:DescribeKey'], resources: ['*'],
    conditions: { ArnLike: { 'kms:EncryptionContext:aws:logs:arn': logPrefix } } }))
  new LogGroup(scope, 'StudyAgentLogs', { logGroupName: `/aws/bedrock-agentcore/runtimes/${runtime.attrAgentRuntimeId}-demo`,
    retention: RetentionDays.TWO_WEEKS, encryptionKey: logKey, removalPolicy: RemovalPolicy.RETAIN })

  const tables = resources.tables
  for (const fn of [resources.request, resources.worker]) {
    fn.addEnvironment('DECK_TABLE', tables.Deck.tableName)
    fn.addEnvironment('MATERIAL_TABLE', tables.Material.tableName)
    fn.addEnvironment('JOB_TABLE', tables.GenerationJob.tableName)
    fn.addEnvironment('CONTROL_TABLE', control.tableName)
    tables.Deck.grant(fn.resources.lambda, 'dynamodb:GetItem')
    tables.Material.grant(fn.resources.lambda, 'dynamodb:GetItem')
    tables.GenerationJob.grant(fn.resources.lambda, 'dynamodb:GetItem')
  }
  resources.request.addEnvironment('USER_POOL_ID', resources.userPoolId)
  resources.request.addEnvironment('IDENTITY_POOL_ID', resources.identityPoolId)
  tables.GenerationJob.grant(resources.request.resources.lambda, 'dynamodb:PutItem')
  control.grant(resources.request.resources.lambda, 'dynamodb:PutItem')
  tables.GenerationJob.grant(resources.worker.resources.lambda, 'dynamodb:UpdateItem')
  tables.Flashcard.grant(resources.worker.resources.lambda, 'dynamodb:PutItem')
  control.grant(resources.worker.resources.lambda, 'dynamodb:GetItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem')
  resources.worker.addEnvironment('CARD_TABLE', tables.Flashcard.tableName)
  resources.worker.addEnvironment('MATERIAL_BUCKET', resources.bucket.bucketName)
  resources.worker.addEnvironment('AGENT_RUNTIME_ARN', runtime.attrAgentRuntimeArn)
  resources.bucket.grantRead(resources.worker.resources.lambda, 'materials/*')
  resources.worker.resources.lambda.addToRolePolicy(new PolicyStatement({ actions: ['bedrock-agentcore:InvokeAgentRuntime'],
    resources: [runtime.attrAgentRuntimeArn, endpoint.attrAgentRuntimeEndpointArn] }))
  const failures = new Queue(scope, 'GenerationFailures', { encryption: QueueEncryption.SQS_MANAGED, retentionPeriod: Duration.days(14) })
  resources.worker.resources.lambda.addEventSource(new DynamoEventSource(tables.GenerationJob, { startingPosition: StartingPosition.TRIM_HORIZON,
    batchSize: 1, retryAttempts: 20, maxRecordAge: Duration.hours(4), onFailure: new SqsDlq(failures),
    filters: [FilterCriteria.filter({ eventName: FilterRule.isEqual('INSERT') })],
  }))
  return { runtimeArn: runtime.attrAgentRuntimeArn, endpointArn: endpoint.attrAgentRuntimeEndpointArn }
}
