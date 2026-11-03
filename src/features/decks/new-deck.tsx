import { useState, type FormEvent } from 'react'
import { ArrowRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { PreviewDeck } from './use-decks'

export function NewDeck({ onCreate }: { onCreate: (title: string, description: string) => PreviewDeck }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) {
      setError('Escribe un nombre para tu deck.')
      return
    }
    try {
      onCreate(title.trim(), description.trim())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear el deck.')
    }
  }

  return (
    <div className="deck-editor">
      <span className="editor-symbol" aria-hidden="true"><Plus /></span>
      <p className="eyebrow">Tu próximo concepto, más claro</p>
      <h1>Nuevo deck</h1>
      <p className="editor-intro">Organiza lo que aprendes sobre cloud, desarrollo e inteligencia artificial.</p>
      <form onSubmit={handleSubmit} className="new-deck-form">
        <FieldGroup>
          <Field data-invalid={!!error || undefined}>
            <FieldLabel htmlFor="deck-title">Nombre del deck</FieldLabel>
            <Input
              id="deck-title"
              autoFocus
              autoComplete="off"
              placeholder="Ej. AWS · Serverless"
              maxLength={80}
              required
              value={title}
              onChange={(event) => { setTitle(event.target.value); setError(null) }}
              aria-invalid={!!error || undefined}
              aria-describedby={error ? 'deck-error' : undefined}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="deck-description">Descripción <span className="optional-label">(opcional)</span></FieldLabel>
            <Input
              id="deck-description"
              placeholder="Ej. Lambda, eventos y DynamoDB"
              maxLength={200}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <FieldDescription>Reúne notas, diagramas y diapositivas sobre el mismo tema.</FieldDescription>
          </Field>
          {error && <FieldError id="deck-error">{error}</FieldError>}
        </FieldGroup>
        <Button type="submit" size="lg" className="min-h-12 w-full" disabled={!title.trim()}>
          Crear deck <ArrowRight data-icon="inline-end" />
        </Button>
      </form>
    </div>
  )
}
