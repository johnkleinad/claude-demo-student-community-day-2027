import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'
import { DeckCover } from './deck-cover'
import type { StudyDeck } from './deck-repository'

export function DeckGrid({ decks, activeId }: { decks: StudyDeck[]; activeId?: string }) {
  return (
    <div className="deck-grid" aria-label="Tus decks">
      {decks.map((deck) => (
        <Link
          key={deck.id}
          to={`/decks/${deck.id}`}
          className="deck-tile"
          data-color={deck.color}
          aria-current={activeId === deck.id ? 'page' : undefined}
          aria-label={`Abrir ${deck.title}`}
        >
          <span className="deck-tile-top">
            <DeckCover />
            <ArrowUpRight className="deck-open-icon" aria-hidden="true" />
          </span>
          <span className="deck-tile-info">
            <span className="deck-tile-title">{deck.title}</span>
            <span className="deck-tile-meta">Abrir materiales y tarjetas</span>
          </span>
        </Link>
      ))}
    </div>
  )
}
