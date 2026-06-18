import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null) // { id, role, school_id, full_name }
  const [school, setSchool]   = useState(null) // { id, name, tier, primary_color, ... }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    async function load() {
      if (!session?.user) { setProfile(null); setSchool(null); setLoading(false); return }
      const { data: p } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(p)
      if (p?.school_id) {
        const { data: s } = await supabase
          .from('schools').select('*').eq('id', p.school_id).single()
        setSchool(s)
        // Apply the school's own brand colours at runtime.
        if (s?.primary_color)   document.documentElement.style.setProperty('--brand', s.primary_color)
        if (s?.secondary_color) document.documentElement.style.setProperty('--accent', s.secondary_color)
      }
      setLoading(false)
    }
    load()
  }, [session])

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthCtx.Provider value={{ session, profile, school, role: profile?.role, loading, signOut }}>
      {children}
    </AuthCtx.Provider>
  )
}
