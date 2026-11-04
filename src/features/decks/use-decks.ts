import { useCallback, useEffect, useRef, useState } from 'react'
import { getDataClient } from '@/lib/data'
import { useAuth } from '@/features/auth/auth-context'
import { createDeckRepository, type StudyDeck } from './deck-repository'

export function useDecks() {
  const { user } = useAuth()
  const [decks, setDecks] = useState<StudyDeck[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lifecycleRef = useRef({ version: 0, mounted: false })

  const reload = useCallback(async () => {
    const request = ++lifecycleRef.current.version
    setLoading(true)
    setError(null)
    try {
      const result = await createDeckRepository(getDataClient().models.Deck).list()
      if (lifecycleRef.current.mounted && request === lifecycleRef.current.version) setDecks(result)
    } catch {
      if (lifecycleRef.current.mounted && request === lifecycleRef.current.version) {
        setDecks([])
        setError('No pudimos cargar tus decks. Revisa tu conexión e inténtalo otra vez.')
      }
    } finally {
      if (lifecycleRef.current.mounted && request === lifecycleRef.current.version) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const lifecycle = lifecycleRef.current
    lifecycle.mounted = true
    let active = true
    queueMicrotask(() => { if (active) void reload() })
    return () => { active = false; lifecycle.mounted = false; ++lifecycle.version }
  }, [user?.userId, reload])

  async function createDeck(title: string, description: string) {
    try {
      const deck = await createDeckRepository(getDataClient().models.Deck).create(title, description)
      if (!lifecycleRef.current.mounted) throw new Error('La sesión cambió. Vuelve a intentarlo.')
      setDecks((current) => [...current.filter((item) => item.id !== deck.id), deck])
      return deck
    } catch {
      throw new Error('No pudimos guardar tu deck. Revisa tu conexión e inténtalo otra vez.')
    }
  }

  return { decks, loading, error, reload, createDeck }
}
