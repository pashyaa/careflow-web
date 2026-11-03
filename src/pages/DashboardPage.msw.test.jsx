import { screen, within } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl } from '../test/msw/data.js'
import { problem } from '../test/msw/handlers.js'
import { server } from '../test/msw/server.js'
import { renderApp } from '../test/renderApp.jsx'

const metric = (label) => within(screen.getByText(label).closest('article'))

describe('Dashboard (MSW)', () => {
  it('shows live metrics, the recent queue and the status mix', async () => {
    renderApp('/dashboard')
    expect(await screen.findByRole('heading', { level: 1, name: 'Operations overview' })).toBeInTheDocument()

    expect(metric('Open work orders').getByText('4')).toBeInTheDocument()
    expect(metric('Overdue SLA').getByText('1')).toBeInTheDocument()
    expect(metric('Unassigned').getByText('1')).toBeInTheDocument()
    expect(metric('Critical priority').getByText('1')).toBeInTheDocument()
    expect(metric('SLA at risk').getByText('1')).toBeInTheDocument()
    expect(metric('SLA breached').getByText('1')).toBeInTheDocument()

    const recent = within(screen.getByRole('heading', { name: 'Recent work orders' }).closest('article'))
    expect(recent.getAllByRole('row')).toHaveLength(7) // header + 6 newest
    expect(recent.getByRole('link', { name: 'WO-1001' })).toBeInTheDocument()

    const mix = within(screen.getByRole('heading', { name: 'Status mix' }).closest('article'))
    expect(within(mix.getByText('Resolved').closest('div')).getByText('8')).toBeInTheDocument()
    expect(mix.getByText(/snapshot generated/i)).toBeInTheDocument()
  })

  it('shows an error and recovers on retry', async () => {
    server.use(http.get(apiUrl('/dashboard/summary'), () => problem(503, 'Dashboard is warming up.'), { once: true }))

    const { user } = renderApp('/dashboard')
    expect(await screen.findByText('Dashboard is warming up.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Operations overview' })).toBeInTheDocument()
  })
})