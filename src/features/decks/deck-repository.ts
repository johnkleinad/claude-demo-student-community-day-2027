import { z } from 'zod'
import type { Schema } from '../../../amplify/data/resource'

export type StoredDeck = Pick<Schema['Deck']['type'], 'id' | 'title' | 'description' | 'createdAt' | 'archived'>
export type StudyDeck = {
  id: string
  title: string
  description: string
  createdAt: string
  color: 'violet' | 'magenta' | 'cyan' | 'orange'
}

type ApiErrors = { message: string }[]
export type DeckApi = {
  list: (input: {
    filter: { archived: { ne: boolean } }
    limit: number
    nextToken?: string | null
  }) => Promise<{ data: StoredDeck[]; nextToken?: string | null; errors?: ApiErrors }>
  create: (input: { title: string; description?: string; archived: boolean }) => Promise<{ data: StoredDeck | null; errors?: ApiErrors }>
}

const deckInput = z.object({ title: z.string().trim().min(1).max(80), description: z.string().trim().max(200) })
const colors: StudyDeck['color'][] = ['violet', 'magenta', 'cyan', 'orange']

function presentDeck(deck: StoredDeck): StudyDeck {
  const hash = Array.from(deck.id).reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 0)
  return { id: deck.id, title: deck.title, description: deck.description ?? '', createdAt: deck.createdAt, color: colors[hash % colors.length] }
}

export function createDeckRepository(api: DeckApi) {
  return {
    async list(): Promise<StudyDeck[]> {
      const decks = new Map<string, StudyDeck>()
      const seenTokens = new Set<string>()
      let nextToken: string | null | undefined
      do {
        const page = await api.list({ filter: { archived: { ne: true } }, limit: 100, nextToken })
        if (page.errors?.length) throw new Error('No pudimos cargar tus decks. Inténtalo otra vez.')
        for (const deck of page.data) {
          if (!deck.archived) decks.set(deck.id, presentDeck(deck))
        }
        nextToken = page.nextToken
        if (nextToken && seenTokens.has(nextToken)) throw new Error('La consulta no pudo completarse. Inténtalo otra vez.')
        if (nextToken) seenTokens.add(nextToken)
      } while (nextToken)
      return [...decks.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    },
    async create(title: string, description: string): Promise<StudyDeck> {
      const input = deckInput.parse({ title, description })
      // Never send owner from a form. Cognito/AppSync assign it from the authenticated sub.
      const result = await api.create({ title: input.title, description: input.description || undefined, archived: false })
      if (result.errors?.length || !result.data) throw new Error('No pudimos guardar tu deck. Inténtalo otra vez.')
      return presentDeck(result.data)
    },
  }
}
