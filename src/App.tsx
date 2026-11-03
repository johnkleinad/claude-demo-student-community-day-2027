import { Link, Route, Routes } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { DeckWorkspace } from '@/features/decks/deck-workspace'

function App() {
  return (
    <Routes>
      <Route path="/" element={<DeckWorkspace />} />
      <Route path="/decks/:deckId" element={<DeckWorkspace />} />
      <Route path="*" element={
        <main className="not-found-page">
          <p className="eyebrow">404</p>
          <h1>Esta página se nos perdió.</h1>
          <Link to="/" className={buttonVariants({ variant: 'outline' })}>Volver a mis decks</Link>
        </main>
      } />
    </Routes>
  )
}

export default App
