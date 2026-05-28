// AuthContext — a React Context that exposes the current user + auth actions to the whole app.
//
// Why Context: many components need to know "is someone logged in?"
// (Navbar shows the avatar, /favorites redirects if not logged in, etc.).
// Without Context we'd have to drill `user` through every prop. Context lets any
// descendant read it directly via the useAuth() hook.

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

// 1) Create the context object. The default value (null) is only used if a component
//    uses useAuth() OUTSIDE the provider — which we'll guard against.
const AuthContext = createContext(null)

// 2) The Provider component. Wrap your app in this so its children can read auth state.
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true) // true until we know whether a session exists

  useEffect(() => {
    // (a) Get the current session synchronously from local storage.
    //     If the user logged in last time, Supabase remembers them.
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    // (b) Subscribe to auth state changes (sign in / sign out / token refresh).
    //     The callback fires whenever the auth state changes.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    // (c) Cleanup: unsubscribe when this component unmounts.
    return () => subscription.subscription.unsubscribe()
  }, [])

  // Action: trigger Google OAuth flow.
  // Supabase redirects the user to Google, then back to our app.
  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin, // come back to this app after auth
      },
    })
    if (error) console.error('Sign-in error:', error)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  // Everything inside `value` is what children can read via useAuth().
  const value = { user, loading, signInWithGoogle, signOut }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// 3) Custom hook so components can read auth state with one line:
//    const { user, signInWithGoogle } = useAuth()
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
