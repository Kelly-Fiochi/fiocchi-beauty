import { createContext, useContext } from 'react'

import type { UserProfile } from '../types'

export interface AuthContextValue {
  user: UserProfile | null
  isLoading: boolean
  isDemoMode: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
