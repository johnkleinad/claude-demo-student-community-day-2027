import { createContext, useContext } from 'react'
import type { AuthUser } from 'aws-amplify/auth'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'error' | 'unconfigured'
export type AuthState = { status: AuthStatus; user: AuthUser | null; error: string | null }
export type AuthContextValue = AuthState & {
  refreshSession: () => Promise<boolean>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider is required.')
  return context
}
