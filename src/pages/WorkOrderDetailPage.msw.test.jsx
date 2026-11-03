import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl, db } from '../test/msw/data.js'
import { problem } from '../test/msw/handlers.js'
import { server } from '../test/msw/server.js'
import { renderApp } from '../test/renderApp.jsx'

async function openOrder(id = 'wo-1', role = 'planner') {
  const utils = renderApp(`/work-orders/${id}`, { role })
  const { title } = db.workOrders.find((o) => o.id === id)
  await screen.findByRole('heading', { level: 1, name: title })
  return utils
}

const assignForm = () => screen.getByRole('heading', { name: 'Technician assignment' }).closest('form')
const chooseStatus = (user, value) => user.selectOptions(screen.getByLabelText('Next status'), value)
const applyStatus = (user) => user.click(screen.getByRole('button', { name: 'Apply status' }))

describe('Work order detail (MSW)', () => {
  describe('loading and errors', () => {
    it('shows a loading state, then the work order', async () => {
      let release
      const gate = new Promise((resolve) => { release = resolve })
      server.use(http.get(apiUrl('/work-orders/:id'), async ({ params }) => {
        await gate
        return HttpResponse.json(db.workOrders.find((o) => o.id === params.id))
      }))

      renderApp('/work-orders/wo-1')
      expect(await screen.findByText('Loading work order…')).toBeInTheDocument()

      release()
      expect(await screen.findByRole('heading', { level: 1, name: 'Chiller pressure alarm' })).toBeInTheDocument()
      expect(screen.queryByText('Loading work order…')).not.toBeInTheDocument()
    })

    it('renders the work order, SLA panel and audit timeline', async () => {
      await openOrder()

      expect(screen.getByText('WO-1001')).toBeInTheDocument()
      expect(screen.getByText('Acme Health · Pune DC')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'SLA commitments' })).toBeInTheDocument()

      const timeline = within(screen.getByRole('heading', { name: 'Status timeline' }).closest('article'))
      expect(timeline.getAllByRole('listitem')).toHaveLength(1)
      expect(timeline.getByText('Work order created')).toBeInTheDocument()
    })

    it('shows the API message for an unknown work order', async () => {
      renderApp('/work-orders/does-not-exist')
      expect(await screen.findByText('We could not load this view.')).toBeInTheDocument()
      expect(screen.getByText('Work order not found.')).toBeInTheDocument()
    })
  })

  describe('permissions', () => {
    it('lets a technician change status but not assign', async () => {
      await openOrder('wo-1', 'technician')
      expect(screen.getByRole('heading', { name: 'Change status' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Technician assignment' })).not.toBeInTheDocument()
    })

    it('is read-only for customer viewers', async () => {
      await openOrder('wo-1', 'viewer')
      expect(screen.getByText('Your account has read-only access to work orders.')).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Change status' })).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Technician assignment' })).not.toBeInTheDocument()
    })

    it('shows no transition form for a work order in a terminal state', async () => {
      await openOrder('wo-5')
      expect(screen.getByText(/this work order is in a terminal state/i)).toBeInTheDocument()
      expect(screen.queryByLabelText('Next status')).not.toBeInTheDocument()
    })
  })

  describe('assignment', () => {
    it('reassigns a technician and refreshes the page', async () => {
      const { user } = await openOrder()
      const form = within(assignForm())
      expect(form.getByText('Jamie Fernandes')).toBeInTheDocument()
      expect(form.getByRole('button', { name: 'Update assignment' })).toBeDisabled()

      await user.selectOptions(form.getByLabelText('Select technician'), 'tech-2')
      await user.click(form.getByRole('button', { name: 'Update assignment' }))

      expect(await screen.findByText(/technician assignment updated/i)).toBeInTheDocument()
      expect(await within(assignForm()).findByText('Ananya Rao')).toBeInTheDocument()
      expect(db.workOrders.find((o) => o.id === 'wo-1').assignedTechnician.id).toBe('tech-2')
    })

    it('assigning a NEW work order moves it to Assigned and records history', async () => {
      const { user } = await openOrder('wo-2')
      await user.selectOptions(within(assignForm()).getByLabelText('Select technician'), 'tech-1')
      await user.click(screen.getByRole('button', { name: 'Update assignment' }))

      expect(await screen.findByText('New → Assigned')).toBeInTheDocument()
    })

    it('shows a recoverable conflict banner when the order changed since it was loaded', async () => {
      const { user } = await openOrder()
      db.workOrders.find((o) => o.id === 'wo-1').version += 1 // someone else saved first

      await user.selectOptions(within(assignForm()).getByLabelText('Select technician'), 'tech-2')
      await user.click(screen.getByRole('button', { name: 'Update assignment' }))

      const banner = await screen.findByRole('alert')
      expect(banner).toHaveTextContent('This work order was updated by someone else.')
      expect(within(assignForm()).getByText('Jamie Fernandes')).toBeInTheDocument()
      expect(db.workOrders.find((o) => o.id === 'wo-1').assignedTechnician.id).toBe('tech-1')
    })
  })

  describe('status transitions', () => {
    it('applies a non-terminal transition without asking for a reason', async () => {
      const { user } = await openOrder()
      await chooseStatus(user, 'IN_PROGRESS')
      expect(screen.queryByLabelText(/reason/i)).not.toBeInTheDocument()
      await user.type(screen.getByLabelText('Transition note'), 'On site, starting diagnostics.')
      await applyStatus(user)

      expect(await screen.findByText(/work order status updated/i)).toBeInTheDocument()
      expect(await screen.findByText('Assigned → In Progress')).toBeInTheDocument()
      expect(screen.getByText('On site, starting diagnostics.')).toBeInTheDocument()
    })

    it('cancels with a reason code and a note, then locks the work order', async () => {
      const { user } = await openOrder()
      await chooseStatus(user, 'CANCELLED')
      await screen.findByRole('option', { name: 'Duplicate work order' })
      await user.selectOptions(screen.getByLabelText(/cancellation reason/i), 'DUPLICATE')
      await user.type(screen.getByLabelText(/cancellation note/i), 'Duplicate of WO-1234')
      await applyStatus(user)

      expect(await screen.findByText(/work order status updated/i)).toBeInTheDocument()
      expect(await screen.findByText(/this work order is in a terminal state/i)).toBeInTheDocument()
      expect(screen.getByText('Reason: Duplicate work order')).toBeInTheDocument()
    })

    it('blocks an incomplete cancellation in the browser without calling the API', async () => {
      let patchCalls = 0
      server.use(http.patch(apiUrl('/work-orders/:id/status'), () => { patchCalls += 1; return HttpResponse.json({}) }))

      const { user } = await openOrder()
      await chooseStatus(user, 'CANCELLED')
      await screen.findByRole('option', { name: 'Duplicate work order' })
      await applyStatus(user)

      expect(await screen.findAllByRole('alert')).toHaveLength(2)
      expect(screen.getByText('Select a cancellation reason code.')).toBeInTheDocument()
      const note = screen.getByLabelText(/cancellation note/i)
      expect(note).toHaveAttribute('aria-invalid', 'true')
      expect(note).toHaveAccessibleDescription('Enter a cancellation note.')
      expect(patchCalls).toBe(0)
    })

    it('shows field errors returned by the API next to the inputs', async () => {
      server.use(http.patch(apiUrl('/work-orders/:id/status'), () =>
        problem(400, 'One or more request fields are invalid.', { errors: { note: 'The cancellation note is not acceptable.' } })))

      const { user } = await openOrder()
      await chooseStatus(user, 'CANCELLED')
      await screen.findByRole('option', { name: 'Duplicate work order' })
      await user.selectOptions(screen.getByLabelText(/cancellation reason/i), 'DUPLICATE')
      await user.type(screen.getByLabelText(/cancellation note/i), 'Duplicate of WO-1234')
      await applyStatus(user)

      expect(await screen.findByText('The cancellation note is not acceptable.')).toBeInTheDocument()
      expect(screen.queryByText('Update failed.')).not.toBeInTheDocument()
    })

    it('shows a generic failure for a 500 and not the conflict banner', async () => {
      server.use(http.patch(apiUrl('/work-orders/:id/status'), () => problem(500, 'Unexpected server error.')))

      const { user } = await openOrder()
      await chooseStatus(user, 'ON_HOLD')
      await applyStatus(user)

      expect(await screen.findByText('Update failed.')).toBeInTheDocument()
      expect(screen.getByText('Unexpected server error.')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('recovers from an optimistic-lock conflict: refresh, then re-apply the change', async () => {
      const { user } = await openOrder()
      expect(within(assignForm()).getByText('Jamie Fernandes')).toBeInTheDocument()

      // Someone else reassigns the order and saves while this page is open.
      const other = db.workOrders.find((o) => o.id === 'wo-1')
      other.assignedTechnician = { id: 'tech-2', name: 'Ananya Rao' }
      other.version += 1

      await chooseStatus(user, 'ON_HOLD')
      await applyStatus(user)

      const banner = await screen.findByRole('alert')
      expect(banner).toHaveTextContent('This work order was updated by someone else.')

      await user.click(within(banner).getByRole('button', { name: 'Refresh' }))
      // Waiting for the new assignee guarantees the refetch (and the new version) has landed.
      expect(await within(assignForm()).findByText('Ananya Rao')).toBeInTheDocument()
      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())

      await chooseStatus(user, 'ON_HOLD')
      await applyStatus(user)

      expect(await screen.findByText(/work order status updated/i)).toBeInTheDocument()
      expect(await screen.findByText('Assigned → On Hold')).toBeInTheDocument()
    })
  })
})