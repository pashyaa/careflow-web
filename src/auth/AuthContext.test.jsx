import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext.jsx'

beforeEach(() => window.localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('AuthContext', () => {
  it('starts signed out when there is no stored session', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('login updates isAuthenticated, user, and roles', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ token: 'fake.jwt', email: 'planner.pat@careflow.local', roles: ['ROLE_PLANNER'] }),
    }))

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

    await act(async () => {
      await result.current.login('planner.pat@careflow.local', 'Planner#2026')
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual({ email: 'planner.pat@careflow.local', roles: ['ROLE_PLANNER'] })
  })

  it('hasRole reflects the roles from the current session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ token: 'fake.jwt', email: 'viewer.morgan@careflow.local', roles: ['ROLE_CUSTOMER_VIEWER'] }),
    }))

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

    await act(async () => {
      await result.current.login('viewer.morgan@careflow.local', 'Viewer#2026')
    })

    expect(result.current.hasRole('ROLE_CUSTOMER_VIEWER')).toBe(true)
    expect(result.current.hasRole('ROLE_PLANNER', 'ROLE_ADMIN')).toBe(false)
  })

  it('logout clears isAuthenticated and user', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ token: 'fake.jwt', email: 'admin.riley@careflow.local', roles: ['ROLE_ADMIN'] }),
    }))

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await act(async () => { await result.current.login('admin.riley@careflow.local', 'Administrator#2026') })

    act(() => result.current.logout())

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })
})