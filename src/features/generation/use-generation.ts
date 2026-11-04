import { useEffect, useRef, useState } from 'react'
import { createId } from '@/lib/create-id'
import type { GenerationRequest } from '../../../shared/generation'
import { generationSnapshot, jobIsActive, submitGeneration, type GenerationJob, type StudyCard } from './generation-api'

export function useGeneration(deckId: string) {
  const [jobs, setJobs] = useState<GenerationJob[]>([])
  const [cards, setCards] = useState<StudyCard[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const lifecycle = useRef({ active: false, submitting: false, pending: undefined as { fingerprint: string; requestId: string } | undefined })
  useEffect(() => {
    const ref = lifecycle.current
    ref.active = true
    let active = true
    let pendingReads = 3
    let timer: ReturnType<typeof setTimeout>
    async function tick() {
      try {
        const snapshot = await generationSnapshot(deckId)
        if (!active) return
        setJobs(snapshot.jobs); setCards(snapshot.cards); setError(null)
        if (ref.pending && snapshot.jobs.some((job) => job.requestId === ref.pending?.requestId)) {
          ref.pending = undefined
          setSubmitError(null)
        }
        const expectedCards = snapshot.jobs.filter((job) => job.status === 'COMPLETED').reduce((sum, job) => sum + (job.generatedCount ?? 0), 0)
        if (snapshot.jobs.some(jobIsActive) || snapshot.cards.length < expectedCards || (ref.pending && pendingReads-- > 0)) timer = setTimeout(() => { void tick() }, 4000)
      } catch {
        if (active) setError('No pudimos actualizar tus tarjetas. Revisa tu conexión y vuelve a intentarlo.')
      } finally { if (active) setLoading(false) }
    }
    queueMicrotask(() => { if (active) void tick() })
    return () => { active = false; ref.active = false; clearTimeout(timer) }
  }, [deckId, revision])

  async function generate(materialIds: string[], preferences: GenerationRequest['preferences']) {
    const ref = lifecycle.current
    if (ref.submitting || jobs.some(jobIsActive)) return
    const fingerprint = JSON.stringify({ deckId, materialIds: [...materialIds].sort(), preferences })
    if (ref.pending?.fingerprint !== fingerprint) ref.pending = { fingerprint, requestId: createId() }
    ref.submitting = true
    setStarting(true); setSubmitError(null)
    try {
      await submitGeneration({ deckId, materialIds, preferences, requestId: ref.pending.requestId })
      ref.pending = undefined
    } catch (cause) {
      if (ref.active) setSubmitError(cause instanceof Error ? cause.message : 'No pudimos iniciar la generación.')
    } finally {
      ref.submitting = false
      if (ref.active) { setStarting(false); setRevision((value) => value + 1) }
    }
  }
  return { jobs, cards, loading, error, submitError, starting, generate, reload: () => setRevision((value) => value + 1) }
}
