import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { accounts, accountsEnabled, ACCOUNTS_MODE } from '../lib/accounts.js'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: accountsEnabled, session: null, profile: null, summary: null })

  const load = useCallback(async () => {
    if (!accountsEnabled) return setState({ loading: false, session: null, profile: null, summary: null })
    try {
      const session = await accounts.getSession()
      if (!session) return setState({ loading: false, session: null, profile: null, summary: null })
      try {
        const [profile, summary] = await Promise.all([accounts.getProfile(), accounts.creditSummary().catch(() => null)])
        setState({ loading: false, session, profile, summary, error: profile ? '' : 'missing-profile' })
      } catch (e) {
        // Logged in, but the account database isn't reachable or set up yet
        setState({ loading: false, session, profile: null, summary: null, error: e.message || 'setup' })
      }
    } catch {
      setState({ loading: false, session: null, profile: null, summary: null })
    }
  }, [])

  // Load the login only in the browser (pre-rendered pages start logged out)
  useEffect(() => {
    load()
  }, [load])

  const value = {
    ...state,
    mode: ACCOUNTS_MODE,
    enabled: accountsEnabled,
    user: state.session?.user || null,
    isAdmin: state.profile?.role === 'admin',
    isApproved: state.profile?.status === 'approved',
    refresh: load,
    async signIn(email, password) {
      await accounts.signIn(email, password)
      await load()
    },
    async signUp(email, password, meta) {
      const r = await accounts.signUp(email, password, meta)
      await load()
      return r
    },
    async signOut() {
      await accounts.signOut()
      await load()
    },
    async updateProfile(patch) {
      await accounts.updateProfile(patch)
      await load()
    },
  }
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  return useContext(AuthCtx)
}
