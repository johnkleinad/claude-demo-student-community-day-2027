import { useEffect, useState } from 'react'
import { Check, ExternalLink, FileImage, FileText, LoaderCircle, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { StudyMaterial, UploadJob } from './material-types'
import { materialUrl } from './material-api'

function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.ceil(bytes / 1024))} KB`
}

function FileThumbnail({ type, url, name }: { type: string; url?: string; name: string }) {
  const [failedUrl, setFailedUrl] = useState<string | undefined>()
  return (
    <div className="material-thumbnail" data-type={type === 'application/pdf' ? 'pdf' : 'image'}>
      {url && type.startsWith('image/') && failedUrl !== url
        ? <img src={url} alt={`Vista previa de ${name}`} loading="lazy" decoding="async" onError={() => setFailedUrl(url)} />
        : type === 'application/pdf' ? <FileText aria-hidden="true" /> : <FileImage aria-hidden="true" />}
    </div>
  )
}

export function UploadRow({ job, busy, onRemove, onRetry }: { job: UploadJob; busy: boolean; onRemove: () => void; onRetry: () => void }) {
  const active = ['preparing', 'uploading', 'saving'].includes(job.status)
  const failed = job.status === 'failed' || job.status === 'invalid'
  const label = { checking: 'Revisando archivo…', ready: 'Listo para subir', preparing: 'Preparando…', uploading: `Subiendo · ${job.progress}%`, saving: 'Confirmando guardado…', failed: 'No se pudo completar', invalid: 'Archivo no admitido' }[job.status]
  return (
    <li className="material-row" data-state={failed ? 'error' : active ? 'uploading' : 'ready'}>
      <FileThumbnail type={job.contentType} url={job.previewUrl} name={job.file.name} />
      <div className="material-info">
        <p className="material-filename" title={job.file.name}>{job.file.name}</p>
        <p className="material-file-meta">{formatBytes(job.file.size)}{job.contentType && ` · ${job.contentType === 'application/pdf' ? 'PDF' : job.contentType.split('/')[1].toUpperCase()}`}</p>
        <span className="material-status">{active || job.status === 'checking' ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}{label}</span>
        {active && <Progress value={job.status === 'uploading' ? job.progress : job.status === 'saving' ? 100 : 0} aria-label={`Progreso de ${job.file.name}`} />}
        {job.error && <p className="material-error" role="alert">{job.error}</p>}
      </div>
      <div className="material-row-actions">
        {job.status === 'failed' && <Button type="button" variant="ghost" size="icon-lg" className="min-h-11 min-w-11" onClick={onRetry} disabled={busy} aria-label={`Reintentar ${job.file.name}`}><RotateCcw data-icon="inline-start" /></Button>}
        <Button type="button" variant="ghost" size="icon-lg" className="min-h-11 min-w-11" onClick={onRemove} disabled={job.status === 'saving' || job.status === 'checking'} aria-label={`${active ? 'Cancelar subida de' : 'Quitar'} ${job.file.name}`}><X data-icon="inline-start" /></Button>
      </div>
    </li>
  )
}

export function MaterialRow({ material, busy, onRetry }: { material: StudyMaterial; busy: boolean; onRetry: () => void }) {
  const [link, setLink] = useState<string | undefined>()
  const [linkError, setLinkError] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (material.uploadStatus !== 'UPLOADED') return
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    async function load() {
      try {
        const result = await materialUrl(material)
        if (!active) return
        setLink(result.url.toString())
        setLinkError(false)
        timer = setTimeout(() => { void load() }, Math.max(30_000, result.expiresAt.getTime() - Date.now() - 60_000))
      } catch {
        if (active) { setLink(undefined); setLinkError(true) }
      }
    }
    void load()
    return () => { active = false; clearTimeout(timer) }
  }, [material, revision])

  return (
    <li className="material-row" data-state={material.uploadStatus === 'UPLOADED' ? 'complete' : 'incomplete'}>
      <FileThumbnail type={material.contentType} url={link} name={material.filename} />
      <div className="material-info">
        <p className="material-filename" title={material.filename}>{material.filename}</p>
        <p className="material-file-meta">{material.contentType === 'application/pdf' ? 'PDF' : material.contentType.split('/')[1]?.toUpperCase()} · {formatBytes(material.sizeBytes)}</p>
        <Badge variant={material.uploadStatus === 'UPLOADED' ? 'secondary' : 'outline'}>
          {material.uploadStatus === 'UPLOADED' ? <><Check data-icon="inline-start" /> Guardado</> : 'Subida incompleta'}
        </Badge>
        {linkError && <p className="material-error">No pudimos abrir la vista previa.</p>}
      </div>
      <div className="material-row-actions">
        {material.uploadStatus !== 'UPLOADED'
          ? <Button type="button" variant="ghost" size="icon-lg" className="min-h-11 min-w-11" onClick={onRetry} disabled={busy} aria-label={`Reintentar ${material.filename}`}><RotateCcw data-icon="inline-start" /></Button>
          : link ? <a href={link} target="_blank" rel="noopener noreferrer" className="material-open" aria-label={`Abrir ${material.filename}`}><ExternalLink aria-hidden="true" /></a>
          : linkError ? <Button type="button" variant="ghost" size="icon-lg" className="min-h-11 min-w-11" onClick={() => setRevision((value) => value + 1)} aria-label={`Reintentar vista previa de ${material.filename}`}><RotateCcw data-icon="inline-start" /></Button> : null}
      </div>
    </li>
  )
}
