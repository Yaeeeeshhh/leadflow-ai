import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthValue {
  session: Session | null
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthValue>({ session: null, user: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let alive = true
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (alive) {
        setSession(nextSession)
        setLoading(false)
      }
    })

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return
      if (error) console.error('Unable to restore Supabase session:', error.message)
      setSession(data.session)
      setLoading(false)
    })

    return () => {
      alive = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, loading }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
