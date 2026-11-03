import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl, queryWorkOrders } from '../test/msw/data.js'
import { problem } from '../test/msw/handlers.js'
import { server } from '../test/msw/server.js'
import { renderApp } from '../test/renderApp.jsx'

function bodyRows() {
  const [, ...rows] = within(screen.getByRole('table')).getAllByRole('row')
  return rows
}

describe('Work orders list (MSW)', () => {
  it('shows a loading state, then the first page', async () => {
    let release
    const gate = new Promise((resolve) => { release = resolve })
    server.use(http.get(apiUrl('/work-orders'), async ({ request }) => {
      await gate // response is held until the test releases it: no timers, fully deterministic
      return HttpResponse.json(queryWorkOrders(new URL(request.url).searchParams))
    }))

    renderApp('/work-orders')
    expect(await screen.findByText('Loading operational data…')).toBeInTheDocument()

    release()
    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.queryByText('Loading operational data…')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '12 work orders' })).toBeInTheDocument()
    expect(bodyRows()).toHaveLength(10)
    expect(screen.getByRole('link', { name: 'WO-1001' })).toHaveAttribute('href', '/work-orders/wo-1')
  })

  it('sends the chosen filters to the API and shows only matching rows', async () => {
    const seen = []
    server.use(http.get(apiUrl('/work-orders'), ({ request }) => {
      const params = new URL(request.url).searchParams
      seen.push(Object.fromEntries(params))
      return HttpResponse.json(queryWorkOrders(params))
    }))

    const { user } = renderApp('/work-orders')
    await screen.findByRole('table')

    await user.type(screen.getByPlaceholderText(/search reference/i), 'generator')
    await user.selectOptions(screen.getByLabelText('Status'), 'NEW')
    await user.selectOptions(screen.getByLabelText('Priority'), 'CRITICAL')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(await screen.findByRole('heading', { name: '1 work orders' })).toBeInTheDocument()
    expect(bodyRows()).toHaveLength(1)
    expect(within(bodyRows()[0]).getByText('Generator fails load test')).toBeInTheDocument()
    expect(seen.at(-1)).toMatchObject({ query: 'generator', status: 'NEW', priority: 'CRITICAL', page: '0' })
  })

  it('clears the filters and restores the full list', async () => {
    const { user } = renderApp('/work-orders')
    await screen.findByRole('table')

    await user.selectOptions(screen.getByLabelText('Priority'), 'CRITICAL')
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    await screen.findByRole('heading', { name: '1 work orders' })

    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(await screen.findByRole('heading', { name: '12 work orders' })).toBeInTheDocument()
    expect(screen.getByLabelText('Priority')).toHaveValue('')
  })

  it('shows the empty state when nothing matches', async () => {
    const { user } = renderApp('/work-orders')
    await screen.findByRole('table')

    await user.type(screen.getByPlaceholderText(/search reference/i), 'no such work order')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(await screen.findByText('No matching work orders')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('pages forwards and backwards', async () => {
    const { user } = renderApp('/work-orders')
    await screen.findByText('Page 1 of 2')
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument()
    expect(bodyRows()).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument()
  })

  it('shows the API error and recovers when the user retries', async () => {
    server.use(http.get(apiUrl('/work-orders'), () => problem(500, 'The database is unavailable.'), { once: true }))

    const { user } = renderApp('/work-orders')
    expect(await screen.findByText('We could not load this view.')).toBeInTheDocument()
    expect(screen.getByText('The database is unavailable.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.queryByText('We could not load this view.')).not.toBeInTheDocument()
  })

  it('shows the error state when the network fails', async () => {
    server.use(http.get(apiUrl('/work-orders'), () => HttpResponse.error()))

    renderApp('/work-orders')
    expect(await screen.findByText('We could not load this view.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('offers "Raise work order" to planners but not to technicians or viewers', async () => {
    const planner = renderApp('/work-orders', { role: 'planner' })
    await screen.findByRole('table')
    expect(screen.getByRole('link', { name: /raise work order/i })).toHaveAttribute('href', '/work-orders/new')
    planner.unmount()

    for (const role of ['technician', 'viewer']) {
      const view = renderApp('/work-orders', { role })
      await screen.findByRole('table')
      expect(screen.queryByRole('link', { name: /raise work order/i })).not.toBeInTheDocument()
      view.unmount()
    }
  })
})