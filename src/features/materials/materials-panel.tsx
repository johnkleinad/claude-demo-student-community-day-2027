import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { CloudUpload, LoaderCircle, Plus, Upload } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { MATERIAL_FILE_ACCEPT } from '../../../shared/materials'
import type { StudyMaterial } from './material-types'
import { MaterialRow, UploadRow } from './material-row'
import type { useMaterials } from './use-materials'

export function MaterialsPanel({ state }: { state: ReturnType<typeof useMaterials> }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const resume = useRef<StudyMaterial | undefined>(undefined)
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)
  const ready = state.jobs.filter((job) => job.status === 'ready' || job.status === 'failed').length
  const checking = state.jobs.some((job) => job.status === 'checking')
  const visibleMaterials = state.materials.filter((material) => !state.jobs.some((job) => job.id === material.id))
  const disabled = state.loading || !!state.error || state.busy || checking

  function pick(material?: StudyMaterial) {
    resume.current = material
    if (fileInput.current) {
      fileInput.current.multiple = !material
      fileInput.current.click()
    }
  }
  function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    const retry = resume.current
    resume.current = undefined
    event.target.value = ''
    void state.select(files, retry)
  }
  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    if (!disabled) void state.select(Array.from(event.dataTransfer.files))
  }

  return (
    <section className="materials-panel" aria-labelledby="materials-title" data-dragging={dragging || undefined}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = disabled ? 'none' : 'copy' }}
      onDragEnter={(event) => { event.preventDefault(); if (!disabled && event.dataTransfer.types.includes('Files')) { dragDepth.current++; setDragging(true) } }}
      onDragLeave={(event) => { event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false) }}
      onDrop={onDrop}>
      <header className="materials-heading">
        <div><p className="eyebrow">El punto de partida</p><h2 id="materials-title">Tus materiales <Badge variant="outline">{state.materials.length}</Badge></h2></div>
        <Button type="button" variant="outline" className="min-h-11" disabled={disabled} onClick={() => pick()}><Plus data-icon="inline-start" /> Agregar material</Button>
      </header>
      <input ref={fileInput} className="sr-only" tabIndex={-1} type="file" accept={MATERIAL_FILE_ACCEPT} multiple onChange={onFiles} disabled={disabled} aria-label="Seleccionar imágenes o PDF" />
      <p className="materials-hint">JPG, PNG, WebP o PDF · Hasta 20 MB por archivo · 10 por carga</p>

      {state.error ? <div className="materials-load-error"><Alert variant="destructive"><AlertTitle>No pudimos cargar tus materiales</AlertTitle><AlertDescription>{state.error}</AlertDescription></Alert><Button type="button" variant="outline" className="min-h-11" onClick={() => { void state.reload() }}>Reintentar materiales</Button></div>
        : state.loading ? <div className="materials-loading" role="status" aria-label="Cargando materiales"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><span className="sr-only">Cargando materiales…</span></div>
        : !state.materials.length && !state.jobs.length ? <Empty className="material-upload-empty">
          <EmptyMedia variant="icon"><CloudUpload /></EmptyMedia>
          <EmptyHeader><EmptyTitle>Dale contexto a lo que quieres aprender.</EmptyTitle><EmptyDescription>Sube fotos del pizarrón, diagramas de arquitectura o diapositivas de tu próxima certificación.</EmptyDescription></EmptyHeader>
          <EmptyContent><Button type="button" variant="secondary" className="min-h-11" onClick={() => pick()}><Plus data-icon="inline-start" /> Seleccionar archivos</Button><p className="drop-hint">También puedes arrastrarlos aquí.</p></EmptyContent>
        </Empty> : (
          <ul className="material-list" aria-label="Materiales del deck">
            {visibleMaterials.map((material) => <MaterialRow key={material.id} material={material} busy={disabled} onRetry={() => pick(material)} />)}
            {state.jobs.map((job) => <UploadRow key={job.id} job={job} busy={state.busy} onRemove={() => state.remove(job.id)} onRetry={() => { void state.start(job.id) }} />)}
          </ul>
        )}
      {state.selectionError && <Alert variant="destructive"><AlertDescription>{state.selectionError}</AlertDescription></Alert>}
      {(ready > 0 || state.busy) && <div className="upload-actions"><p>Tu material queda privado en este deck.</p><Button type="button" className="min-h-12" disabled={state.busy || checking} onClick={() => { void state.start() }}>{state.busy ? <><LoaderCircle data-icon="inline-start" className="animate-spin" /> Subiendo materiales…</> : <><Upload data-icon="inline-start" /> Subir {ready} {ready === 1 ? 'archivo' : 'archivos'}</>}</Button></div>}
      <p className="material-result" role="status" aria-live="polite">{state.notice}</p>
    </section>
  )
}
