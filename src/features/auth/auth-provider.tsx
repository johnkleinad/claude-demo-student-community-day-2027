import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { fetchAuthSession, getCurrentUser, signOut } from 'aws-amplify/auth'
import { Hub } from 'aws-amplify/utils'
import { isAmplifyConfigured } from '@/lib/amplify'
import { AuthContext, type AuthState } from './auth-context'
import { authErrorMessage, isAnonymousError } from './auth-errors'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null, error: null })
  const requests = useRef({ version: 0 })

  const refreshSession = useCallback(async () => {
    const request = ++requests.current.version
    if (!isAmplifyConfigured()) {
      setState({ status: 'unconfigured', user: null, error: null })
      return false
    }
    setState({ status: 'loading', user: null, error: null })
    try {
      const user = await getCurrentUser()
      const session = await fetchAuthSession()
      if (!session.tokens?.accessToken) {
        if (request === requests.current.version) setState({ status: 'anonymous', user: null, error: null })
        return false
      }
      if (request !== requests.current.version) return false
      setState({ status: 'authenticated', user, error: null })
      return true
    } catch (cause) {
      if (request === requests.current.version) {
        const anonymous = isAnonymousError(cause)
        setState({ status: anonymous ? 'anonymous' : 'error', user: null, error: anonymous ? null : authErrorMessage(cause) })
      }
      return false
    }
  }, [])

  useEffect(() => {
    const lifecycle = requests.current
    let active = true
    queueMicrotask(() => { if (active) void refreshSession() })
    let storageTimer: ReturnType<typeof setTimeout> | undefined
    const stop = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn') void refreshSession()
      if (payload.event === 'signedOut' || payload.event === 'tokenRefresh_failure') {
        ++requests.current.version
        setState({ status: 'anonymous', user: null, error: payload.event === 'tokenRefresh_failure' ? 'Tu sesión venció. Vuelve a iniciar sesión.' : null })
      }
    })
    function onStorage(event: StorageEvent) {
      if (event.key === null || event.key.startsWith('CognitoIdentityServiceProvider.')) {
        ++requests.current.version
        setState({ status: 'loading', user: null, error: null })
        clearTimeout(storageTimer)
        storageTimer = setTimeout(() => { void refreshSession() }, 200)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      active = false
      ++lifecycle.version
      stop()
      clearTimeout(storageTimer)
      window.removeEventListener('storage', onStorage)
    }
  }, [refreshSession])

  const logout = useCallback(async () => {
    await signOut()
    ++requests.current.version
    setState({ status: 'anonymous', user: null, error: null })
  }, [])

  const value = useMemo(() => ({ ...state, refreshSession, logout }), [state, refreshSession, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
