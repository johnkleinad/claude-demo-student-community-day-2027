import { useEffect, useRef } from 'react'
import { ArrowLeft, Plus, Sparkles } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { AccountControls } from '@/features/auth/account-controls'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { cn } from '@/lib/utils'
import { DeckCover } from './deck-cover'
import { DeckDetail } from './deck-detail'
import { DeckGrid } from './deck-grid'
import { NewDeck } from './new-deck'
import { useDecks } from './use-decks'

export function DeckWorkspace() {
  const { deckId } = useParams()
  const navigate = useNavigate()
  const { decks, loading, error, reload, createDeck } = useDecks()
  const detailRef = useRef<HTMLElement>(null)
  const isCreating = deckId === 'new'
  const selectedDeck = deckId ? decks.find((deck) => deck.id === deckId) : decks[0]
  const isEmpty = decks.length === 0 && !deckId && !loading && !error

  useEffect(() => {
    document.title = `${isCreating ? 'Nuevo deck' : selectedDeck?.title ?? 'Mis decks'} · Community Study`
    if (deckId && window.matchMedia('(max-width: 1023px)').matches) {
      window.scrollTo({ top: 0 })
      detailRef.current?.focus({ preventScroll: true })
    }
  }, [deckId, isCreating, selectedDeck?.title])

  return (
    <div className="study-app">
      <a href={deckId ? '#deck-detail' : '#deck-library'} className="skip-link">Saltar al contenido</a>
      <main className="workspace" data-detail={!!deckId || undefined} data-empty={isEmpty || undefined}>
        <section id="deck-library" className="library-panel" aria-labelledby="library-title">
          <header className="library-header">
            <Link to="/" className="app-signature" aria-label="Community Study, mis decks">
              <Sparkles aria-hidden="true" /> <span>Community Study</span>
            </Link>
            <div className="library-title-row">
              <h1 id="library-title">Mis decks<span className="title-dot">.</span></h1>
              {decks.length > 0 && (
                <Link to="/decks/new" className={cn(buttonVariants({ variant: 'ghost', size: 'icon-lg' }), 'new-deck-button')} aria-label="Crear nuevo deck">
                  <Plus aria-hidden="true" />
                </Link>
              )}
            </div>
            <p className="library-subtitle">{loading ? 'Cargando tus decks…' : decks.length === 0 ? 'Cloud, código e IA. A tu ritmo.' : `${decks.length} ${decks.length === 1 ? 'deck para tu próximo reto técnico.' : 'decks para tus próximos retos técnicos.'}`}</p>
          </header>

          {loading ? (
            <div className="deck-grid" role="status" aria-label="Cargando decks">
              {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="deck-loading-tile" />)}
              <span className="sr-only">Cargando tus decks…</span>
            </div>
          ) : error ? (
            <div className="deck-load-error">
              <Alert variant="destructive"><AlertTitle>No pudimos cargar tu colección</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
              <Button variant="outline" className="min-h-11" onClick={() => { void reload() }}>Reintentar</Button>
            </div>
          ) : decks.length === 0 ? (
            <Empty className="library-empty">
              <EmptyMedia><DeckCover large /></EmptyMedia>
              <EmptyContent>
                <Link to="/decks/new" className={cn(buttonVariants({ size: 'lg' }), 'create-first-deck')}>
                  <Plus aria-hidden="true" data-icon="inline-start" /> Crear mi primer deck
                </Link>
              </EmptyContent>
              <EmptyHeader>
                <EmptyTitle>Tu primer concepto, más claro.</EmptyTitle>
                <EmptyDescription>Convierte tus notas de cloud, código e IA en tarjetas de estudio.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : <DeckGrid decks={decks} activeId={selectedDeck?.id} />}

          <footer className="library-footer">
            <AccountControls />
            <p><span className="status-dot" aria-hidden="true" /> {loading ? 'Sincronizando tus decks…' : error ? 'Colección sin actualizar' : 'Guardado en tu cuenta'}</p>
            <span className="event-signature">Student Community Day México</span>
          </footer>
        </section>

        {!isEmpty && (
          <section id="deck-detail" className="detail-panel" ref={detailRef} tabIndex={-1} aria-label="Detalle del deck">
            <nav className="detail-toolbar" aria-label="Navegación del deck">
              <Link to="/" className="back-to-library"><ArrowLeft aria-hidden="true" /> Mis decks</Link>
              <span className="detail-caption"><Sparkles aria-hidden="true" /> Un poco más cerca de entenderlo.</span>
            </nav>
            {loading ? (
              <div className="detail-loading" role="status" aria-label="Cargando el deck"><Skeleton className="h-12 w-3/4" /><Skeleton className="h-5 w-1/2" /><span className="sr-only">Cargando el deck…</span></div>
            ) : error ? (
              <div className="deck-load-error"><Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert><Button variant="outline" className="min-h-11" onClick={() => { void reload() }}>Reintentar</Button></div>
            ) : isCreating ? (
              <NewDeck onCreate={async (title, description) => {
                const deck = await createDeck(title, description)
                navigate(`/decks/${deck.id}`, { replace: true })
                return deck
              }} />
            ) : selectedDeck ? <DeckDetail key={selectedDeck.id} deck={selectedDeck} /> : (
              <Empty className="missing-deck">
                <EmptyHeader>
                  <EmptyTitle>No encontramos este deck.</EmptyTitle>
                  <EmptyDescription>Vuelve a tu colección para elegir otro.</EmptyDescription>
                </EmptyHeader>
                <Link to="/" className={buttonVariants({ variant: 'outline' })}>Volver a mis decks</Link>
              </Empty>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
