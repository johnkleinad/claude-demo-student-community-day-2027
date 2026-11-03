import { useState } from 'react'
import { z } from 'zod'

export const DECKS_STORAGE_KEY = 'community-study.layout-decks.v1'

const deckSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(200),
  createdAt: z.string().datetime(),
  color: z.enum(['violet', 'magenta', 'cyan', 'orange']),
})

export type PreviewDeck = z.infer<typeof deckSchema>
const colors: PreviewDeck['color'][] = ['violet', 'magenta', 'cyan', 'orange']

function createDeckId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // randomUUID requires HTTPS; getRandomValues also works over local-network HTTP.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function readDecks(): { decks: PreviewDeck[]; error: string | null } {
  try {
    const saved = localStorage.getItem(DECKS_STORAGE_KEY)
    return { decks: saved ? z.array(deckSchema).parse(JSON.parse(saved)) : [], error: null }
  } catch {
    return { decks: [], error: 'No se pudieron leer los decks guardados en este dispositivo.' }
  }
}

/** Layout preview storage. Amplify persistence belongs to the next stage. */
export function useDecks() {
  const [state, setState] = useState(readDecks)

  function createDeck(title: string, description: string) {
    const deck = deckSchema.parse({
      id: createDeckId(),
      title,
      description,
      createdAt: new Date().toISOString(),
      color: colors[state.decks.length % colors.length],
    })
    const decks = [...state.decks, deck]
    try {
      localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(decks))
    } catch {
      throw new Error('No pudimos guardar el deck. Revisa el almacenamiento del navegador e inténtalo otra vez.')
    }
    setState({ decks, error: null })
    return deck
  }

  return { ...state, createDeck }
}
