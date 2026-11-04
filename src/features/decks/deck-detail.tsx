import { Layers3 } from 'lucide-react'
import type { StudyDeck } from './deck-repository'
import { MaterialsPanel } from '@/features/materials/materials-panel'
import { useMaterials } from '@/features/materials/use-materials'
import { useGeneration } from '@/features/generation/use-generation'
import { GenerationPanel } from '@/features/generation/generation-panel'
import { GeneratedCards } from '@/features/generation/generated-cards'

export function DeckDetail({ deck }: { deck: StudyDeck }) {
  const materials = useMaterials(deck.id)
  const generation = useGeneration(deck.id)
  return (
    <div className="deck-detail" data-color={deck.color}>
      <header className="deck-detail-heading">
        <p className="eyebrow">Tu deck de estudio</p>
        <h1>{deck.title}</h1>
        {deck.description && <p className="deck-description">{deck.description}</p>}
        <p className="deck-detail-meta"><Layers3 aria-hidden="true" /> {generation.loading ? 'Cargando tarjetas…' : generation.error ? 'Tarjetas sin actualizar' : `${generation.cards.length} ${generation.cards.length === 1 ? 'tarjeta' : 'tarjetas'}`} <span aria-hidden="true">·</span> 0 sesiones</p>
      </header>
      <MaterialsPanel state={materials} />
      <GenerationPanel state={generation} materials={materials.materials} uploading={materials.busy || materials.loading || !!materials.error} />
      <GeneratedCards cards={generation.cards} materials={materials.materials} />
    </div>
  )
}
