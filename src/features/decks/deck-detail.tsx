import { Layers3 } from 'lucide-react'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import type { StudyDeck } from './deck-repository'
import { MaterialsPanel } from '@/features/materials/materials-panel'

export function DeckDetail({ deck }: { deck: StudyDeck }) {
  return (
    <div className="deck-detail" data-color={deck.color}>
      <header className="deck-detail-heading">
        <p className="eyebrow">Tu deck de estudio</p>
        <h1>{deck.title}</h1>
        {deck.description && <p className="deck-description">{deck.description}</p>}
        <p className="deck-detail-meta"><Layers3 aria-hidden="true" /> 0 tarjetas <span aria-hidden="true">·</span> 0 sesiones</p>
      </header>
      <MaterialsPanel key={deck.id} deckId={deck.id} />
      <Empty className="deck-cards-empty">
        <EmptyHeader>
          <EmptyTitle>Tus tarjetas aparecerán aquí.</EmptyTitle>
          <EmptyDescription>
            Reúne los materiales que quieres repasar. Serán el punto de partida para las preguntas de este deck.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
