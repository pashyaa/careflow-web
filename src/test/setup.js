import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { clearDashboardCache } from '../api/dashboardCache.js'
import { resetDb } from './msw/data.js'
import { server } from './msw/server.js'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

beforeEach(() => {
  resetDb()
  clearDashboardCache() // the dashboard snapshot is module state: never let it leak between tests
  window.localStorage.clear()
})

afterEach(() => server.resetHandlers())

afterAll(() => server.close())