import { Sparkles } from 'lucide-react'

export function DeckCover({ large = false }: { large?: boolean }) {
  return (
    <div className="deck-cover" data-large={large || undefined} aria-hidden="true">
      <span className="cover-back" />
      <span className="cover-middle" />
      <span className="cover-front">
        <Sparkles />
        <span className="cover-rule" />
        <span className="cover-rule cover-rule-short" />
      </span>
    </div>
  )
}
