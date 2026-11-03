import { Link, Route, Routes } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function Home() {
  return (
    <section className="flex flex-col gap-5">
      <p className="text-sm font-medium text-highlight">Student Community Day 2027</p>
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">Tus apuntes, listos para estudiar.</h1>
      <p className="max-w-prose text-muted-foreground">
        Convierte fotos del pizarrón, diapositivas y PDF en tarjetas de estudio.
        Organiza tus materiales en decks y practica a tu ritmo.
      </p>
      <Link className={cn(buttonVariants(), 'min-h-11 w-fit px-5')} to="/acerca">
        Ver el proyecto
      </Link>
    </section>
  )
}

function About() {
  return (
    <section className="flex flex-col gap-5">
      <h1 className="text-3xl font-semibold tracking-tight">Una demo sencilla, bien hecha.</h1>
      <p className="max-w-prose text-muted-foreground">
        React y TypeScript, componentes con shadcn/ui, estilos con Tailwind CSS,
        navegación con React Router y un backend con AWS Amplify Gen 2.
      </p>
      <Link className="w-fit text-sm font-medium text-link underline underline-offset-4" to="/">
        Volver al inicio
      </Link>
    </section>
  )
}

function App() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b bg-card">
        <nav aria-label="Navegación principal" className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-5">
          <Link to="/" className="font-heading text-2xl font-semibold tracking-tight">Community Demo</Link>
          <Link to="/acerca" className="inline-flex min-h-11 items-center text-sm text-link underline-offset-4 hover:underline">Acerca del proyecto</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/acerca" element={<About />} />
          <Route path="*" element={
            <section className="flex flex-col gap-4">
              <h1 className="text-3xl font-semibold">Página no encontrada</h1>
              <Link to="/" className="text-link underline underline-offset-4">Volver al inicio</Link>
            </section>
          } />
        </Routes>
      </main>
    </div>
  )
}

export default App
