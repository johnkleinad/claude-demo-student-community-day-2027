import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Amplify } from 'aws-amplify'
import {
  autoSignIn, confirmResetPassword, confirmSignIn, confirmSignUp,
  resendSignUpCode, resetPassword, signIn, signUp, type SignInOutput,
} from 'aws-amplify/auth'
import { ArrowRight, LoaderCircle, LockKeyhole, Sparkles } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SessionStatus } from './auth-boundary'
import { useAuth } from './auth-context'
import { authErrorMessage, safeReturnTo } from './auth-errors'

const screens = {
  'sign-in': { title: 'Qué bueno verte.', description: 'Entra para seguir con tus decks.', action: 'Iniciar sesión' },
  'sign-up': { title: 'Tu próximo nivel.', description: 'Crea tu cuenta y reúne todo lo que quieres aprender.', action: 'Crear cuenta' },
  confirm: { title: 'Revisa tu correo.', description: 'Escribe el código de seis dígitos que recibiste para activar tu cuenta.', action: 'Confirmar correo' },
  reset: { title: 'Volvamos a entrar.', description: 'Te enviaremos un código para recuperar el acceso.', action: 'Enviar código' },
  'new-password': { title: 'Una nueva clave.', description: 'Usa el código de tu correo y elige una nueva contraseña.', action: 'Guardar contraseña' },
  'set-password': { title: 'Hazla tuya.', description: 'Reemplaza tu contraseña temporal para continuar.', action: 'Guardar y entrar' },
} as const
type AuthMode = keyof typeof screens
type FlowState = { email?: string; returnTo?: string; notice?: string }

function AuthForm({ mode }: { mode: AuthMode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuth()
  const flow: FlowState = location.state && typeof location.state === 'object' ? location.state : {}
  const returnTo = safeReturnTo(flow.returnTo)
  const [email, setEmail] = useState(typeof flow.email === 'string' ? flow.email : '')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState(typeof flow.notice === 'string' ? flow.notice : '')
  const [pending, setPending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const emailRef = useRef<HTMLInputElement>(null)
  const submitting = useRef(false)
  const screen = screens[mode]
  const hasPassword = ['sign-in', 'sign-up', 'new-password', 'set-password'].includes(mode)
  const newPassword = ['sign-up', 'new-password', 'set-password'].includes(mode)
  const hasCode = mode === 'confirm' || mode === 'new-password'
  const policy = Amplify.getConfig().Auth?.Cognito?.passwordFormat
  const requirements = [
    `Al menos ${policy?.minLength ?? 8} caracteres`,
    policy?.requireUppercase && 'mayúscula', policy?.requireLowercase && 'minúscula',
    policy?.requireNumbers && 'número', policy?.requireSpecialCharacters && 'símbolo',
  ].filter(Boolean).join(', ') + '.'

  useEffect(() => { document.title = `${screen.action} · Community Study` }, [screen.action])
  useEffect(() => {
    if (!cooldown) return
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  function go(next: AuthMode, message?: string) {
    navigate(`/auth/${next}`, { state: { email: email.trim().toLowerCase(), returnTo, notice: message } })
  }

  async function finishSignIn(output: SignInOutput) {
    switch (output.nextStep.signInStep) {
      case 'DONE':
        if (await auth.refreshSession()) navigate(returnTo, { replace: true })
        break
      case 'CONFIRM_SIGN_UP': go('confirm'); break
      case 'RESET_PASSWORD': go('reset'); break
      case 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED': go('set-password'); break
      default: setError('Esta cuenta necesita una verificación adicional que todavía no está habilitada en la demo.')
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    if (mode === 'sign-up' && !name.trim()) {
      setError('Escribe tu nombre de usuario.')
      return
    }
    if (newPassword && password !== confirmation) {
      setError('Las contraseñas no coinciden.')
      return
    }
    submitting.current = true
    setPending(true)
    setError(null)
    setNotice('')
    const username = email.trim().toLowerCase()
    try {
      if (mode === 'sign-in') {
        await finishSignIn(await signIn({ username, password }))
      } else if (mode === 'sign-up') {
        const result = await signUp({ username, password, options: { userAttributes: { email: username, name: name.trim() } } })
        if (result.nextStep.signUpStep === 'CONFIRM_SIGN_UP') go('confirm')
        else if (result.nextStep.signUpStep === 'COMPLETE_AUTO_SIGN_IN') await finishSignIn(await autoSignIn())
        else go('sign-in', 'Tu cuenta está lista. Ya puedes iniciar sesión.')
      } else if (mode === 'confirm') {
        const result = await confirmSignUp({ username, confirmationCode: code.trim() })
        if (result.nextStep.signUpStep === 'COMPLETE_AUTO_SIGN_IN') await finishSignIn(await autoSignIn())
        else if (result.isSignUpComplete) go('sign-in', 'Correo confirmado. Ya puedes iniciar sesión.')
        else setError('La cuenta aún necesita confirmación. Solicita un nuevo código.')
      } else if (mode === 'reset') {
        const result = await resetPassword({ username })
        if (result.nextStep.resetPasswordStep === 'CONFIRM_RESET_PASSWORD_WITH_CODE') go('new-password')
        else go('sign-in', 'Ya puedes iniciar sesión con tu contraseña.')
      } else if (mode === 'new-password') {
        await confirmResetPassword({ username, confirmationCode: code.trim(), newPassword: password })
        go('sign-in', 'Contraseña actualizada. Ya puedes iniciar sesión.')
      } else {
        await finishSignIn(await confirmSignIn({ challengeResponse: password }))
      }
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'UserNotConfirmedException') go('confirm')
      else if (cause instanceof Error && cause.name === 'PasswordResetRequiredException') go('reset')
      else if (cause instanceof Error && cause.name === 'UserAlreadyAuthenticatedException') {
        if (await auth.refreshSession()) navigate(returnTo, { replace: true })
      } else setError(authErrorMessage(cause))
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  async function resendCode() {
    if (pending || cooldown || !emailRef.current?.reportValidity()) return
    setPending(true)
    setError(null)
    try {
      if (mode === 'confirm') await resendSignUpCode({ username: email.trim().toLowerCase() })
      else await resetPassword({ username: email.trim().toLowerCase() })
      setNotice('Te enviamos un nuevo código. Revisa también la carpeta de spam.')
      setCooldown(60)
    } catch (cause) { setError(authErrorMessage(cause)) }
    finally { setPending(false) }
  }

  const authLinkState = { email: email.trim(), returnTo }
  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="auth-title">
        <Link className="app-signature" to="/auth/sign-in" state={authLinkState}><Sparkles aria-hidden="true" />Community Study</Link>
        <header className="auth-heading">
          <span className="editor-symbol" aria-hidden="true"><LockKeyhole /></span>
          <p className="eyebrow">Un espacio para tu conocimiento</p>
          <h1 id="auth-title">{screen.title}</h1>
          <p>{screen.description}</p>
        </header>
        {notice && <Alert role="status"><AlertDescription>{notice}</AlertDescription></Alert>}
        {auth.error && !error && <Alert variant="destructive"><AlertDescription>{auth.error}</AlertDescription></Alert>}
        <form onSubmit={submit} className="auth-form" aria-busy={pending}>
          <FieldGroup>
            {mode === 'sign-up' && <Field data-disabled={pending || undefined}>
              <FieldLabel htmlFor="auth-name">Nombre de usuario</FieldLabel>
              <Input id="auth-name" name="userName" autoComplete="nickname" placeholder="Ej. alex.cloud" required maxLength={80} value={name} onChange={(event) => { setName(event.target.value); setError(null) }} disabled={pending} />
            </Field>}
            {mode !== 'set-password' && <Field data-disabled={pending || undefined}>
              <FieldLabel htmlFor="auth-email">Correo electrónico</FieldLabel>
              <Input id="auth-email" ref={emailRef} type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="tu@correo.com" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} disabled={pending} />
            </Field>}
            {hasCode && <Field data-disabled={pending || undefined}>
              <FieldLabel htmlFor="auth-code">Código de verificación</FieldLabel>
              <Input id="auth-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} disabled={pending} />
            </Field>}
            {hasPassword && <Field data-disabled={pending || undefined}>
              <FieldLabel htmlFor="auth-password">{newPassword ? 'Nueva contraseña' : 'Contraseña'}</FieldLabel>
              <Input id="auth-password" type="password" autoComplete={newPassword ? 'new-password' : 'current-password'} minLength={newPassword ? policy?.minLength ?? 8 : undefined} maxLength={256} required value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending} aria-describedby={newPassword ? 'password-requirements' : undefined} />
              {newPassword && <FieldDescription id="password-requirements">{requirements}</FieldDescription>}
            </Field>}
            {newPassword && <Field data-invalid={!!error && password !== confirmation || undefined} data-disabled={pending || undefined}>
              <FieldLabel htmlFor="auth-confirmation">Repite la contraseña</FieldLabel>
              <Input id="auth-confirmation" type="password" autoComplete="new-password" maxLength={256} required value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setError(null) }} disabled={pending} aria-invalid={!!error && password !== confirmation || undefined} aria-describedby={error ? 'auth-error' : undefined} />
            </Field>}
            {error && <FieldError id="auth-error">{error}</FieldError>}
          </FieldGroup>
          <Button type="submit" size="lg" className="min-h-12 w-full" disabled={pending}>
            {pending ? <><LoaderCircle data-icon="inline-start" className="animate-spin" /> Un momento…</> : <>{screen.action}<ArrowRight data-icon="inline-end" /></>}
          </Button>
        </form>
        <nav className="auth-links" aria-label="Opciones de acceso">
          {mode === 'sign-in' && <>
            <Link to="/auth/sign-up" state={authLinkState}>Crear una cuenta</Link>
            <Link to="/auth/reset" state={authLinkState}>Olvidé mi contraseña</Link>
            <Link to="/auth/confirm" state={authLinkState}>Ya tengo un código de confirmación</Link>
          </>}
          {hasCode && <Button type="button" variant="link" className="min-h-11" disabled={pending || cooldown > 0} onClick={() => { void resendCode() }}>{cooldown ? `Reenviar en ${cooldown} s` : 'Reenviar código'}</Button>}
          {mode !== 'sign-in' && <Link to="/auth/sign-in" state={authLinkState}>Volver a iniciar sesión</Link>}
        </nav>
        <p className="auth-footnote">Tus decks y materiales son privados para tu cuenta.</p>
      </section>
    </main>
  )
}

export function AuthPage() {
  const { mode = 'sign-in' } = useParams()
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading' || status === 'error' || status === 'unconfigured') return <SessionStatus />
  if (status === 'authenticated') return <Navigate to={safeReturnTo(location.state?.returnTo)} replace />
  if (!Object.hasOwn(screens, mode)) return <Navigate to="/auth/sign-in" replace />
  return <AuthForm mode={mode as AuthMode} key={mode} />
}
