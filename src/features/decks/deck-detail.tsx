import { Layers3 } from 'lucide-react'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { DeckCover } from './deck-cover'
import type { PreviewDeck } from './use-decks'

export function DeckDetail({ deck }: { deck: PreviewDeck }) {
  return (
    <div className="deck-detail" data-color={deck.color}>
      <header className="deck-detail-heading">
        <p className="eyebrow">Tu deck de estudio</p>
        <h1>{deck.title}</h1>
        {deck.description && <p className="deck-description">{deck.description}</p>}
        <p className="deck-detail-meta"><Layers3 aria-hidden="true" /> 0 tarjetas <span aria-hidden="true">·</span> 0 sesiones</p>
      </header>
      <Empty className="deck-detail-empty">
        <EmptyMedia><DeckCover large /></EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>Un deck para tu próximo reto técnico.</EmptyTitle>
          <EmptyDescription>
            Todavía no hay tarjetas. Tus notas técnicas, diagramas de arquitectura y diapositivas serán el punto de partida.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
