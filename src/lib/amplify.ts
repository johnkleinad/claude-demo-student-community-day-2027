import { Amplify } from 'aws-amplify'

// The sandbox generates this file. The frontend also runs before deployment.
const outputs = import.meta.glob<{ default: Parameters<typeof Amplify.configure>[0] }>(
  '/amplify_outputs.json',
  { eager: true },
)

let configured = false

export function configureAmplify() {
  const config = outputs['/amplify_outputs.json']?.default
  if (config && !configured) {
    Amplify.configure(config)
    configured = true
  }
}

export function isAmplifyConfigured() {
  return configured
}
