import { act, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DASHBOARD_MAX_AGE_MS } from '../api/dashboardCache.js'
import { db } from '../test/msw/data.js'
import { server } from '../test/msw/server.js'
import { renderApp } from '../test/renderApp.jsx'

const metric = (label) => within(screen.getByText(label).closest('article'))
const overview = () => screen.findByRole('heading', { level: 1, name: 'Operations overview' })
const goTo = (user, name) => user.click(screen.getByRole('link', { name }))
const order = (id) => db.workOrders.find((o) => o.id === id)

// Counts how many times the app asked the API for the dashboard summary.
function countDashboardRequests() {
  let count = 0
  server.events.on('request:start', ({ request }) => {
    if (new URL(request.url).pathname.endsWith('/dashboard/summary')) count += 1
  })
  return () => count
}

// Pretend `ms` have passed (only Date.now moves, so user-event and waitFor keep their real timers).
function advanceClock(ms) {
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + ms)
}

afterEach(() => {
  server.events.removeAllListeners()
  vi.restoreAllMocks()
})

describe('Dashboard refresh (BUG-302)', () => {
  it('shows updated overdue/open metrics when you return after resolving an overdue order', async () => {
    // The seeded overdue order (WO-1002) is NEW, which can only be cancelled; put it in progress so it can be resolved.
    order('wo-2').status = 'IN_PROGRESS'
    const dashboardRequests = countDashboardRequests()

    const { user } = renderApp('/dashboard')
    await overview()
    expect(metric('Open work orders').getByText('4')).toBeInTheDocument()
    expect(metric('Overdue SLA').getByText('1')).toBeInTheDocument()
    expect(dashboardRequests()).toBe(1)

    // Open the overdue order and resolve it.
    await goTo(user, 'WO-1002')
    await screen.findByRole('heading', { level: 1, name: 'Generator fails load test' })
    await user.selectOptions(screen.getByLabelText('Next status'), 'RESOLVED')
    await screen.findByRole('option', { name: 'Fault repaired' })
    await user.selectOptions(screen.getByLabelText(/resolution reason/i), 'FIXED')
    await user.type(screen.getByLabelText(/resolution note/i), 'Replaced the failed load bank.')
    await user.click(screen.getByRole('button', { name: 'Apply status' }))
    expect(await screen.findByText(/work order status updated/i)).toBeInTheDocument()

    // Go back to the dashboard without a hard refresh.
    await goTo(user, /operations overview/i)

    await waitFor(() => expect(metric('Overdue SLA').getByText('0')).toBeInTheDocument())
    expect(metric('Open work orders').getByText('3')).toBeInTheDocument()
    expect(dashboardRequests()).toBe(2) // the snapshot was invalidated, so it really refetched
  })

  it('shows an in-window snapshot instantly, then refetches once it is older than the max age', async () => {
    const dashboardRequests = countDashboardRequests()

    const { user } = renderApp('/dashboard')
    await overview()
    expect(dashboardRequests()).toBe(1)

    // Still inside the max age: the cached numbers appear immediately and nothing is requested.
    await goTo(user, 'Work orders')
    await screen.findByRole('heading', { level: 1, name: 'Work orders' })
    await goTo(user, /operations overview/i)
    await overview()
    expect(dashboardRequests()).toBe(1)

    // Time passes and the data changes elsewhere (another user / another tab).
    advanceClock(DASHBOARD_MAX_AGE_MS + 1_000)
    order('wo-2').status = 'CANCELLED'

    await goTo(user, 'Work orders')
    await screen.findByRole('heading', { level: 1, name: 'Work orders' })
    await goTo(user, /operations overview/i)

    await waitFor(() => expect(metric('Overdue SLA').getByText('0')).toBeInTheDocument())
    expect(dashboardRequests()).toBe(2)
  })

  it.each([
    ['the tab becomes visible again', () => document.dispatchEvent(new Event('visibilitychange'))],
    ['the page is restored from the back/forward cache', () => window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }))],
  ])('refetches an aged snapshot while mounted when %s', async (_label, fire) => {
    renderApp('/dashboard')
    await overview()
    expect(metric('Overdue SLA').getByText('1')).toBeInTheDocument()

    advanceClock(DASHBOARD_MAX_AGE_MS + 1_000)
    order('wo-2').status = 'CANCELLED'
    act(() => { fire() })

    await waitFor(() => expect(metric('Overdue SLA').getByText('0')).toBeInTheDocument())
  })
})