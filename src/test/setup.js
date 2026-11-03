import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { resetDb } from './msw/data.js'
import { server } from './msw/server.js'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

beforeEach(() => {
  resetDb()
  window.localStorage.clear()
})

afterEach(() => server.resetHandlers())

afterAll(() => server.close())