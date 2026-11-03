import { BookOpen } from 'lucide-react'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import type { StudyMaterial } from '@/features/materials/material-types'
import type { StudyCard } from './generation-api'

export function GeneratedCards({ cards, materials }: { cards: StudyCard[]; materials: StudyMaterial[] }) {
  const names = new Map(materials.map((material) => [material.id, material.filename]))
  if (!cards.length) return <Empty className="deck-cards-empty"><EmptyHeader><EmptyTitle>Tus tarjetas aparecerán aquí.</EmptyTitle><EmptyDescription>Genera tu primera colección con los materiales que acabas de subir.</EmptyDescription></EmptyHeader></Empty>
  return <section className="generated-cards" aria-labelledby="cards-title"><header><p className="eyebrow">Tu colección de conceptos</p><h2 id="cards-title">{cards.length} {cards.length === 1 ? 'tarjeta' : 'tarjetas'} para entenderlo.</h2><p>Toca una pregunta para ver su respuesta.</p></header>
    <div className="generated-card-list">{cards.map((card, index) => <details key={card.id} className="generated-card"><summary><span className="generated-card-number">{String(index + 1).padStart(2, '0')}</span><h3>{card.question}</h3><span className="generated-card-toggle" aria-hidden="true">+</span></summary><div className="generated-card-answer"><p>{card.answer}</p>{card.explanation && <p className="generated-card-explanation">{card.explanation}</p>}<ul className="generated-card-sources" aria-label="Fuentes de la tarjeta">{card.sources.map((source, index) => <li key={index}><BookOpen aria-hidden="true" /><div><p>{names.get(source.materialId) ?? 'Material del deck'}{source.page ? ` · pág. ${source.page}` : ''}</p>{source.excerpt && <blockquote>{source.excerpt}</blockquote>}</div></li>)}</ul></div></details>)}</div>
  </section>
}
