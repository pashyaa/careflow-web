import { screen, waitFor } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl, db } from '../test/msw/data.js'
import { problem } from '../test/msw/handlers.js'
import { server } from '../test/msw/server.js'
import { renderApp } from '../test/renderApp.jsx'

async function fillValidForm(user) {
  await user.selectOptions(await screen.findByLabelText(/service site/i), 'site-1')
  await screen.findByRole('option', { name: 'CHL-01 · Chiller 1' })
  await waitFor(() => expect(screen.getByLabelText(/affected asset/i)).toBeEnabled())
  await user.selectOptions(screen.getByLabelText(/affected asset/i), 'asset-1')
  await user.type(screen.getByLabelText(/work order title/i), 'Compressor trips on start')
  await user.type(screen.getByLabelText(/description/i), 'Trips within ten seconds of every cold start.')
}

describe('Create work order (MSW)', () => {
  it('loads assets and the SLA preview, creates the order, and opens its detail page', async () => {
    const { user } = renderApp('/work-orders/new')
    await fillValidForm(user)

    expect(await screen.findByText('Standard business hours')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(/priority/i), 'CRITICAL')
    expect(await screen.findByText('Critical 24x7')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create work order' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Compressor trips on start' })).toBeInTheDocument()
    expect(screen.getByText('WO-1013')).toBeInTheDocument()
    expect(db.workOrders.at(-1)).toMatchObject({
      title: 'Compressor trips on start',
      priority: 'CRITICAL',
      site: expect.objectContaining({ id: 'site-1' }),
    })
  })

  it('keeps the form and shows the API message when creation is rejected', async () => {
    server.use(http.post(apiUrl('/work-orders'), () => problem(400, 'One or more request fields are invalid.')))

    const { user } = renderApp('/work-orders/new')
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Create work order' }))

    expect(await screen.findByText('Work order was not created.')).toBeInTheDocument()
    expect(screen.getByText('One or more request fields are invalid.')).toBeInTheDocument()
    expect(screen.getByLabelText(/work order title/i)).toHaveValue('Compressor trips on start')
    expect(screen.getByRole('button', { name: 'Create work order' })).toBeEnabled()
  })

  it('shows the error state when sites cannot be loaded, then recovers on retry', async () => {
    server.use(http.get(apiUrl('/reference/sites'), () => problem(500, 'Reference data is unavailable.'), { once: true }))

    const { user } = renderApp('/work-orders/new')
    expect(await screen.findByText('Reference data is unavailable.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByLabelText(/service site/i)).toBeInTheDocument()
  })

  it('sends technicians back to the work-order list', async () => {
    renderApp('/work-orders/new', { role: 'technician' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Work orders' })).toBeInTheDocument()
  })
})