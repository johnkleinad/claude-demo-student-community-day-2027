import { useState, type FormEvent } from 'react'
import { Check, LoaderCircle, RotateCcw, Sparkles } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import type { StudyMaterial } from '@/features/materials/material-types'
import type { useGeneration } from './use-generation'
import { jobIsActive } from './generation-api'

export function GenerationPanel({ state, materials, uploading }: {
  state: ReturnType<typeof useGeneration>; materials: StudyMaterial[]; uploading: boolean
}) {
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [language, setLanguage] = useState<'es' | 'en'>('es')
  const ready = materials.filter((material) => material.uploadStatus === 'UPLOADED')
  const selected = ready.filter((material) => !excluded.has(material.id))
  const active = state.jobs.find(jobIsActive)
  const latest = state.jobs[0]
  const busy = state.starting || !!active
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await state.generate(selected.map((material) => material.id), {
      language, cardCount: Number(form.get('cardCount')), focus: String(form.get('focus') ?? '').trim() || undefined,
    })
  }
  return (
    <section className="generation-panel" aria-labelledby="generation-title" aria-busy={busy}>
      <header><p className="eyebrow">De material a conocimiento</p><h2 id="generation-title">Crea tus tarjetas.</h2><p className="generation-intro">Elige qué quieres repasar. Cada respuesta tendrá una referencia a tus materiales.</p></header>
      {state.loading ? <div role="status" aria-label="Cargando tarjetas"><Skeleton className="h-20 w-full" /></div>
        : state.error ? <Alert variant="destructive"><AlertTitle>No pudimos actualizar el deck</AlertTitle><AlertDescription>{state.error}<Button type="button" variant="outline" className="min-h-11" onClick={state.reload}>Actualizar tarjetas</Button></AlertDescription></Alert>
        : <form onSubmit={(event) => { void submit(event) }} className="generation-form">
          <FieldGroup>
            <Field>
              <FieldLabel>Materiales para esta generación <Badge variant="outline">{selected.length}</Badge></FieldLabel>
              {ready.length ? <div className="generation-materials" role="group" aria-label="Materiales para generar tarjetas">
                {ready.map((material) => <label key={material.id} className="generation-material-option">
                  <Checkbox checked={!excluded.has(material.id)} disabled={busy || uploading} onCheckedChange={(checked) => setExcluded((current) => {
                    const next = new Set(current); if (checked) next.delete(material.id); else next.add(material.id); return next
                  })} aria-label={`Incluir ${material.filename}`} />
                  <span>{material.filename}</span><span className="generation-file-kind">{material.contentType === 'application/pdf' ? 'PDF' : 'IMG'}</span>
                </label>)}
              </div> : <p className="generation-intro">Sube tu primer material para empezar.</p>}
              <FieldDescription>Hasta 10 materiales: imágenes de 3.75 MB o PDF de 4.5 MB. Máximo 5 PDF y 20 MB en total.</FieldDescription>
            </Field>
            <div className="generation-preferences">
              <Field><FieldLabel htmlFor="card-count">Número de tarjetas</FieldLabel><Input id="card-count" name="cardCount" type="number" inputMode="numeric" min={1} max={50} defaultValue={10} required disabled={busy} /></Field>
              <Field><FieldLabel htmlFor="card-language">Idioma</FieldLabel><NativeSelect id="card-language" value={language} onChange={(event) => setLanguage(event.target.value as 'es' | 'en')} disabled={busy}><NativeSelectOption value="es">Español</NativeSelectOption><NativeSelectOption value="en">English</NativeSelectOption></NativeSelect></Field>
            </div>
            <Field><FieldLabel htmlFor="card-focus">¿En qué quieres enfocarte? <span className="generation-optional">Opcional</span></FieldLabel><Input id="card-focus" name="focus" maxLength={500} placeholder="Ej. servicios de AWS y sus diferencias" disabled={busy} /><FieldDescription>Generaremos menos tarjetas si el material no alcanza para la cantidad solicitada.</FieldDescription></Field>
          </FieldGroup>
          <Button type="submit" className="min-h-12" disabled={busy || uploading || !selected.length || selected.length > 10}><Sparkles data-icon="inline-start" />{state.starting ? 'Iniciando…' : active ? 'Generación en curso' : 'Generar tarjetas'}</Button>
        </form>}
      {state.submitError && <Alert variant="destructive"><AlertDescription>{state.submitError}</AlertDescription></Alert>}
      {active && <div className="generation-status" role="status" aria-live="polite"><LoaderCircle className="animate-spin" aria-hidden="true" /><div><p>{active.status === 'QUEUED' ? 'Tus materiales están en la fila.' : 'Estamos conectando los conceptos.'}</p><span>Puedes salir de este deck y volver más tarde.</span></div></div>}
      {!active && latest?.status === 'COMPLETED' && <p className="generation-complete" role="status"><Check aria-hidden="true" />Tu generación está lista para repasar.</p>}
      {!active && latest?.status === 'FAILED' && <Alert variant="destructive"><AlertTitle>No se completó la generación</AlertTitle><AlertDescription>{latest.errorMessage ?? 'Puedes volver a generar con estos materiales.'}</AlertDescription></Alert>}
      {!active && latest && (latest.status === 'QUEUED' || latest.status === 'PROCESSING') && <Alert><AlertTitle>La generación tardó más de lo esperado</AlertTitle><AlertDescription>Actualiza para consultar el resultado. Si no cambia, puedes iniciar una nueva generación.<Button type="button" variant="outline" className="min-h-11" onClick={state.reload}><RotateCcw data-icon="inline-start" />Actualizar</Button></AlertDescription></Alert>}
    </section>
  )
}
