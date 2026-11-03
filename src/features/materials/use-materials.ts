import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/auth-context'
import { createId } from '@/lib/create-id'
import { inspectMaterialFile, MAX_FILES_PER_BATCH } from '../../../shared/materials'
import { listMaterials, materialApi } from './material-api'
import type { StudyMaterial, UploadJob } from './material-types'
import { uploadMaterial } from './upload-material'

export function useMaterials(deckId: string) {
  const { user } = useAuth()
  const [materials, setMaterials] = useState<StudyMaterial[]>([])
  const [jobs, setJobs] = useState<UploadJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const lifecycleRef = useRef({ active: false, version: 0, running: false, selecting: false,
    jobs: [] as UploadJob[], urls: new Set<string>(), controllers: new Map<string, AbortController>() })

  function changeJobs(update: (current: UploadJob[]) => UploadJob[]) {
    const lifecycle = lifecycleRef.current
    lifecycle.jobs = update(lifecycle.jobs)
    if (lifecycle.active) setJobs(lifecycle.jobs)
  }
  function patchJob(id: string, patch: Partial<UploadJob>) {
    changeJobs((current) => current.map((job) => job.id === id ? { ...job, ...patch } : job))
  }
  function revoke(url?: string) {
    if (url) { URL.revokeObjectURL(url); lifecycleRef.current.urls.delete(url) }
  }

  const reload = useCallback(async () => {
    const lifecycle = lifecycleRef.current
    const request = ++lifecycle.version
    setLoading(true)
    setError(null)
    try {
      const result = await listMaterials(deckId)
      if (lifecycle.active && request === lifecycle.version) setMaterials(result)
    } catch {
      if (lifecycle.active && request === lifecycle.version) setError('No pudimos cargar los materiales de este deck. Revisa tu conexión e inténtalo otra vez.')
    } finally {
      if (lifecycle.active && request === lifecycle.version) setLoading(false)
    }
  }, [deckId])

  useEffect(() => {
    const lifecycle = lifecycleRef.current
    lifecycle.active = true
    let active = true
    queueMicrotask(() => { if (active) void reload() })
    return () => {
      active = false
      lifecycle.active = false
      ++lifecycle.version
      for (const controller of lifecycle.controllers.values()) controller.abort()
      for (const url of lifecycle.urls) URL.revokeObjectURL(url)
      lifecycle.urls.clear()
    }
  }, [reload])

  async function select(files: File[], resume?: StudyMaterial) {
    const lifecycle = lifecycleRef.current
    if (lifecycle.running || lifecycle.selecting || loading || error) return
    setSelectionError(null)
    setNotice('')
    if (files.length + lifecycle.jobs.length > MAX_FILES_PER_BATCH || (resume && files.length !== 1)) {
      setSelectionError(`Selecciona hasta ${MAX_FILES_PER_BATCH} archivos por carga.`)
      return
    }
    lifecycle.selecting = true
    try {
      for (const file of files) {
        if (!lifecycle.active) break
        if (lifecycle.jobs.some((job) => job.id === resume?.id ||
            (job.file.name === file.name && job.file.size === file.size && job.file.lastModified === file.lastModified))) continue
        const id = resume?.id ?? createId()
        changeJobs((current) => [...current, { id, file, contentType: '', status: 'checking', progress: 0 }])
        try {
          const contentType = await inspectMaterialFile(file)
          if (!lifecycle.active) break
          if (resume && (resume.filename !== file.name || resume.sizeBytes !== file.size || resume.contentType !== contentType)) {
            throw new Error(`Selecciona el archivo original «${resume.filename}» con el mismo tamaño y formato.`)
          }
          const previewUrl = contentType.startsWith('image/') ? URL.createObjectURL(new Blob([file], { type: contentType })) : undefined
          if (previewUrl) lifecycle.urls.add(previewUrl)
          patchJob(id, { contentType, previewUrl, status: 'ready' })
        } catch (cause) {
          if (lifecycle.active) patchJob(id, { status: 'invalid', error: cause instanceof Error ? cause.message : 'No pudimos leer el archivo.' })
        }
      }
    } finally { lifecycle.selecting = false }
  }

  async function start(onlyId?: string) {
    const lifecycle = lifecycleRef.current
    if (lifecycle.running || lifecycle.selecting || !user) return
    const queue = lifecycle.jobs.filter((job) => (job.status === 'ready' || job.status === 'failed') && (!onlyId || job.id === onlyId))
    if (!queue.length) return
    lifecycle.running = true
    setBusy(true)
    setNotice('')
    let completed = 0
    try {
      for (const item of queue) {
        if (!lifecycle.active) break
        const job = lifecycle.jobs.find((current) => current.id === item.id)
        if (!job) continue
        const controller = new AbortController()
        lifecycle.controllers.set(job.id, controller)
        patchJob(job.id, { status: 'preparing', progress: 0, error: undefined })
        try {
          const material = await uploadMaterial({ id: job.id, deckId, userId: user.userId, file: job.file,
            signal: controller.signal,
            onPhase: (status) => { if (lifecycle.active) patchJob(job.id, { status }) },
            onProgress: (progress) => { if (lifecycle.active) patchJob(job.id, { progress }) },
          }, materialApi)
          if (!lifecycle.active) break
          setMaterials((current) => [...current.filter((value) => value.id !== material.id), material]
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
          changeJobs((current) => current.filter((value) => value.id !== job.id))
          revoke(job.previewUrl)
          completed++
        } catch (cause) {
          if (lifecycle.active) patchJob(job.id, { status: 'failed', error: cause instanceof Error ? cause.message : 'No pudimos subir el archivo. Inténtalo otra vez.' })
        } finally { lifecycle.controllers.delete(job.id) }
      }
    } finally {
      lifecycle.running = false
      if (lifecycle.active) {
        setBusy(false)
        if (completed) setNotice(`${completed} ${completed === 1 ? 'material guardado' : 'materiales guardados'} en tu deck.`)
      }
    }
  }

  function remove(id: string) {
    const lifecycle = lifecycleRef.current
    const active = lifecycle.controllers.get(id)
    if (active) { active.abort(); return }
    const job = lifecycle.jobs.find((item) => item.id === id)
    revoke(job?.previewUrl)
    changeJobs((current) => current.filter((item) => item.id !== id))
  }

  return { materials, jobs, loading, error, selectionError, notice, busy, reload, select, start, remove }
}
