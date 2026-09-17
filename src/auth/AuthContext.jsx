import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, getSession, onUnauthorized } from '../api/apiClient.js'

// Mirrors the exact role strings the API stores in the roles table — e.g. "ROLE_PLANNER".
// Keeping the ROLE_ prefix here (rather than stripping it) means these compare directly
// against what the API sends back, with no risk of a silent naming mismatch.
export const ROLES = {
  PLANNER: 'ROLE_PLANNER',
  TECHNICIAN: 'ROLE_TECHNICIAN',
  CUSTOMER_VIEWER: 'ROLE_CUSTOMER_VIEWER',
  ADMIN: 'ROLE_ADMIN',
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getSession())

  // If any API call anywhere in the app gets a 401 (expired/invalid token), apiClient
  // already cleared localStorage — this just syncs React state so the UI reacts
  // immediately (redirect to /login) instead of on the next unrelated re-render.
  useEffect(() => onUnauthorized(() => setSession(null)), [])

  const login = useCallback(async (email, password) => {
    const response = await api.login(email, password)
    setSession({ token: response.token, email: response.email, roles: response.roles || [] })
    return response
  }, [])

  const logout = useCallback(() => {
    api.logout()
    setSession(null)
  }, [])

  const hasRole = useCallback(
    (...roles) => !!session && roles.some((role) => session.roles?.includes(role)),
    [session],
  )

  const value = useMemo(() => ({
    user: session ? { email: session.email, roles: session.roles || [] } : null,
    isAuthenticated: !!session,
    login,
    logout,
    hasRole,
  }), [session, login, logout, hasRole])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}