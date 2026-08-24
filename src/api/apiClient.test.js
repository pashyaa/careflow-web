import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from './apiClient.js'

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

