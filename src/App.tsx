import { Link, Route, Routes } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function Home() {
  return (
    <section className="flex flex-col gap-5">
      <p className="text-sm font-medium text-muted-foreground">Student Community Day 2027</p>
      <h1 className="text-4xl font-semibold tracking-tight">Todo empieza con una idea.</h1>
      <p className="max-w-prose text-muted-foreground">
        La base de la demo está lista. El siguiente paso es elegir qué vamos a construir.
      </p>
      <Link className={cn(buttonVariants(), 'w-fit')} to="/acerca">
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
      <Link className="w-fit text-sm font-medium underline underline-offset-4" to="/">
        Volver al inicio
      </Link>
    </section>
  )
}

function App() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <nav aria-label="Navegación principal" className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <Link to="/" className="font-semibold tracking-tight">Community Demo</Link>
          <Link to="/acerca" className="text-sm text-muted-foreground underline-offset-4 hover:underline">Acerca del proyecto</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/acerca" element={<About />} />
          <Route path="*" element={
            <section className="flex flex-col gap-4">
              <h1 className="text-3xl font-semibold">Página no encontrada</h1>
              <Link to="/" className="underline underline-offset-4">Volver al inicio</Link>
            </section>
          } />
        </Routes>
      </main>
    </div>
  )
}

export default App
