import { lazy, Suspense } from 'react'
import { Link, Route, Routes } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AuthProvider } from '@/features/auth/auth-provider'
import { AuthBoundary } from '@/features/auth/auth-boundary'

const DeckWorkspace = lazy(() => import('@/features/decks/deck-workspace').then((module) => ({ default: module.DeckWorkspace })))
const AuthPage = lazy(() => import('@/features/auth/auth-page').then((module) => ({ default: module.AuthPage })))

function PageLoading() {
  return (
    <main className="auth-page" role="status" aria-label="Cargando tu espacio de estudio">
      <div className="auth-panel"><Skeleton className="h-12 w-52" /><Skeleton className="h-5 w-full" /><span className="sr-only">Cargando tu espacio de estudio…</span></div>
    </main>
  )
}

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/auth/:mode" element={<AuthPage />} />
          <Route element={<AuthBoundary />}>
            <Route path="/" element={<DeckWorkspace />} />
            <Route path="/decks/:deckId" element={<DeckWorkspace />} />
          </Route>
          <Route path="*" element={
            <main className="not-found-page">
              <p className="eyebrow">404</p>
              <h1>Esta página se nos perdió.</h1>
              <Link to="/" className={buttonVariants({ variant: 'outline' })}>Volver a mis decks</Link>
            </main>
          } />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}

export default App
