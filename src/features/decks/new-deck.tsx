import { useRef, useState, type FormEvent } from 'react'
import { ArrowRight, LoaderCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { StudyDeck } from './deck-repository'

export function NewDeck({ onCreate }: { onCreate: (title: string, description: string) => Promise<StudyDeck> }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const submitting = useRef(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    if (!title.trim()) {
      setError('Escribe un nombre para tu deck.')
      return
    }
    submitting.current = true
    setPending(true)
    setError(null)
    try {
      await onCreate(title.trim(), description.trim())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear el deck.')
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  return (
    <div className="deck-editor">
      <span className="editor-symbol" aria-hidden="true"><Plus /></span>
      <p className="eyebrow">Tu próximo concepto, más claro</p>
      <h1>Nuevo deck</h1>
      <p className="editor-intro">Organiza lo que aprendes sobre cloud, desarrollo e inteligencia artificial.</p>
      <form onSubmit={handleSubmit} className="new-deck-form" aria-busy={pending}>
        <FieldGroup>
          <Field data-invalid={!!error || undefined} data-disabled={pending || undefined}>
            <FieldLabel htmlFor="deck-title">Nombre del deck</FieldLabel>
            <Input
              id="deck-title"
              autoFocus
              autoComplete="off"
              placeholder="Ej. AWS · Serverless"
              maxLength={80}
              required
              disabled={pending}
              value={title}
              onChange={(event) => { setTitle(event.target.value); setError(null) }}
              aria-invalid={!!error || undefined}
              aria-describedby={error ? 'deck-error' : undefined}
            />
          </Field>
          <Field data-disabled={pending || undefined}>
            <FieldLabel htmlFor="deck-description">Descripción <span className="optional-label">(opcional)</span></FieldLabel>
            <Input
              id="deck-description"
              placeholder="Ej. Lambda, eventos y DynamoDB"
              maxLength={200}
              disabled={pending}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <FieldDescription>Reúne notas, diagramas y diapositivas sobre el mismo tema.</FieldDescription>
          </Field>
          {error && <FieldError id="deck-error">{error}</FieldError>}
        </FieldGroup>
        <Button type="submit" size="lg" className="min-h-12 w-full" disabled={pending || !title.trim()}>
          {pending ? <><LoaderCircle data-icon="inline-start" className="animate-spin" /> Guardando…</> : <>Crear deck <ArrowRight data-icon="inline-end" /></>}
        </Button>
      </form>
    </div>
  )
}
