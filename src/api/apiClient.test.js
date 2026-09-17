import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api, getSession, onUnauthorized } from './apiClient.js'

beforeEach(() => window.localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('api client', () => {
  it('omits empty filters and serializes populated filters', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ content: [] }) }))

    await api.workOrders({ status: 'NEW', query: '', page: 0 })

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/work-orders?status=NEW&page=0'),
      expect.any(Object),
    )
    expect(fetch.mock.calls[0][0]).not.toContain('query=')
  })

  it('turns Problem Details responses into ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ title: 'Business rule violation', detail: 'Transition is not allowed.' }),
    }))

    await expect(api.transitionWorkOrder('123', { status: 'RESOLVED' }))
      .rejects.toEqual(expect.objectContaining({ name: 'ApiError', status: 409, message: 'Transition is not allowed.' }))
    await expect(Promise.reject(new ApiError('sample', 400))).rejects.toBeInstanceOf(ApiError)
  })
})

describe('session handling', () => {
  it('login stores token/email/roles and attaches the token to later requests', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ token: 'fake.jwt', email: 'planner.pat@careflow.local', roles: ['ROLE_PLANNER'] }),
    }))

    await api.login('planner.pat@careflow.local', 'Planner#2026')

    expect(getSession()).toEqual({ token: 'fake.jwt', email: 'planner.pat@careflow.local', roles: ['ROLE_PLANNER'] })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }))
    await api.dashboard()
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer fake.jwt')
  })

  it('logout clears the stored session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ token: 'fake.jwt', email: 'a@b.com', roles: [] }),
    }))
    await api.login('a@b.com', 'pw')
    expect(getSession()).not.toBeNull()

    api.logout()
    expect(getSession()).toBeNull()
  })

  it('a 401 on a protected endpoint clears the session and notifies listeners', async () => {
    window.localStorage.setItem('careflow.session', JSON.stringify({ token: 'stale', email: 'a@b.com', roles: [] }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 401,
      json: async () => ({ title: 'Unauthorized', detail: 'Authentication is required to access this resource.' }),
    }))

    const handler = vi.fn()
    const unsubscribe = onUnauthorized(handler)

    await expect(api.dashboard()).rejects.toMatchObject({ status: 401 })

    expect(getSession()).toBeNull()
    expect(handler).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('a 401 on login itself (wrong password) does not clear sessions or fire the unauthorized event', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 401,
      json: async () => ({ title: 'Unauthorized', detail: 'Invalid email or password.' }),
    }))

    const handler = vi.fn()
    const unsubscribe = onUnauthorized(handler)

    await expect(api.login('someone@careflow.local', 'wrong-password'))
      .rejects.toMatchObject({ status: 401 })

    expect(handler).not.toHaveBeenCalled()
    unsubscribe()
  })
})