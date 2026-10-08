import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { UserProfile } from '../types'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
  const [user, setUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let isMounted = true

    async function loadSession() {
      const { data } = await supabase.auth.getSession()
      if (isMounted && data.session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, full_name, role')
          .eq('id', data.session.user.id)
          .maybeSingle()

        setUser({
          id: data.session.user.id,
          email: data.session.user.email ?? '',
          name: profile?.full_name ?? data.session.user.user_metadata.full_name ?? 'Usuário',
          role: profile?.role ?? 'VIEWER',
          permissions: profile?.role === 'ADMIN' ? ['read', 'write', 'delete'] : ['read'],
        })
      }
      if (isMounted) setIsLoading(false)
    }

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void loadSession()
    })

    void loadSession()

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(() => ({
    user,
    isLoading,
    isDemoMode: false,
    async signIn(email: string, password: string) {
      if (!email || !password) {
        throw new Error('E-mail e senha são obrigatórios.')
      }

      if (!isSupabaseConfigured) throw new Error('Configure o Supabase para entrar no sistema.')
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
    },
    async signOut() {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.signOut()
        if (error) throw new Error(error.message)
      }
      setUser(null)
      window.location.href = '/login'
    },
  }), [isLoading, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
