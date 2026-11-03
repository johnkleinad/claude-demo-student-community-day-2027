import { useState } from 'react'
import { LogOut, LoaderCircle } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useAuth } from './auth-context'
import { authErrorMessage } from './auth-errors'

export function AccountControls() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const label = user?.signInDetails?.loginId ?? 'Cuenta conectada'

  async function handleSignOut() {
    setPending(true)
    setError(null)
    try {
      await logout()
      navigate('/auth/sign-in', { replace: true })
    } catch (cause) {
      setError(authErrorMessage(cause))
      setPending(false)
    }
  }

  return (
    <div className="account-controls">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="account-row">
        <span className="account-email" title={label}>{label}</span>
        <Button type="button" variant="ghost" size="icon-lg" className="min-h-11 min-w-11" aria-label="Cerrar sesión" disabled={pending} onClick={() => { void handleSignOut() }}>
          {pending ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : <LogOut data-icon="inline-start" />}
        </Button>
      </div>
    </div>
  )
}
