import { Navigate, Outlet, useLocation } from 'react-router'
import { CircleAlert, Sparkles } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from './auth-context'

export function SessionStatus() {
  const { status, error, refreshSession } = useAuth()
  return (
    <main className="auth-page">
      <section className="auth-panel" aria-label="Estado de la sesión">
        <p className="app-signature"><Sparkles aria-hidden="true" />Community Study</p>
        {status === 'loading' ? (
          <div className="session-loading" role="status" aria-label="Comprobando tu sesión">
            <Skeleton className="h-12 w-52" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <span className="sr-only">Comprobando tu sesión…</span>
          </div>
        ) : (
          <Alert variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>No pudimos abrir tu espacio de estudio</AlertTitle>
            <AlertDescription>{status === 'unconfigured' ? 'Falta conectar esta demo con su servicio de acceso.' : error}</AlertDescription>
          </Alert>
        )}
        {status === 'error' && <Button onClick={() => { void refreshSession() }} className="min-h-11">Reintentar</Button>}
      </section>
    </main>
  )
}

export function AuthBoundary() {
  const { status, user } = useAuth()
  const location = useLocation()
  if (status === 'loading' || status === 'error' || status === 'unconfigured') return <SessionStatus />
  if (status !== 'authenticated') return <Navigate to="/auth/sign-in" replace state={{ returnTo: location.pathname }} />
  return <Outlet key={user?.userId} />
}
