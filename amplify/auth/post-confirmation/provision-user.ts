import type { PostConfirmationTriggerEvent } from 'aws-lambda'

export type UserProfileInput = {
  id: string
  owner: string
  email: string
  name: string
  emailVerified: boolean
}

export type ProfileStore = {
  get: (id: string) => Promise<{ id: string; owner: string } | null>
  create: (input: UserProfileInput) => Promise<void>
}

function ownsProfile(profile: { id: string; owner: string }, userId: string) {
  if (profile.id !== userId || profile.owner !== userId) {
    throw new Error('User profile identity does not match the confirmed user.')
  }
}

export function createPostConfirmationHandler(getStore: () => Promise<ProfileStore>) {
  return async (event: PostConfirmationTriggerEvent): Promise<PostConfirmationTriggerEvent> => {
    if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') return event

    const attributes = event.request.userAttributes
    const userId = attributes.sub
    const email = attributes.email
    if (!userId || !email) throw new Error('Confirmed user is missing required profile attributes.')

    const store = await getStore()
    const existing = await store.get(userId)
    if (existing) {
      ownsProfile(existing, userId)
      return event
    }

    const name = attributes.name?.trim()
    if (!name || name.length > 80) throw new Error('Confirmed user is missing a valid profile name.')

    try {
      await store.create({
        id: userId,
        owner: userId,
        email,
        name,
        emailVerified: attributes.email_verified === 'true',
      })
    } catch {
      // A concurrent/retried invocation may already have committed this ID.
      // A write error is only treated as success if the expected record exists.
      const committed = await store.get(userId)
      if (!committed) throw new Error('User profile could not be provisioned. Retry provisioning for the confirmed user.')
      ownsProfile(committed, userId)
    }
    return event
  }
}
