import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '../api/apiClient.js'
import WorkOrderDetailPage from './WorkOrderDetailPage.jsx'

vi.mock('../api/apiClient.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    api: {
      workOrder: vi.fn(),
      workOrderHistory: vi.fn(),
      technicians: vi.fn(),
      reasonCodes: vi.fn(),
      transitionWorkOrder: vi.fn(),
      assignTechnician: vi.fn(),
    },
  }
})

vi.mock('../auth/AuthContext.jsx', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useAuth: () => ({ hasRole: () => true }) }
})

const baseWorkOrder = {
  id: 'wo-1',
  referenceNumber: 'WO-1',
  title: 'Chiller alarm',
  description: 'Pressure telemetry crossed the high threshold.',
  priority: 'HIGH',
  status: 'ASSIGNED',
  site: { name: 'Pune DC', code: 'PUN', city: 'Pune', customerName: 'Acme Health' },
  asset: null,
  assignedTechnician: { name: 'Jamie Fernandes' },
  targetResolutionAt: '2026-10-30T10:00:00Z',
  createdAt: '2026-10-28T08:00:00Z',
  updatedAt: '2026-10-28T09:00:00Z',
  version: 3,
  sla: null,
}

const createdEntry = {
  id: 'h1', fromStatus: null, toStatus: 'NEW', note: null, reasonCode: null, reasonLabel: null,
  changedByDisplayName: 'Pat Iyer', changedAt: '2026-10-28T08:00:00Z',
}

const cancellationCodes = [
  { id: 'c1', code: 'DUPLICATE', label: 'Duplicate work order' },
  { id: 'c2', code: 'RAISED_IN_ERROR', label: 'Raised in error' },
]
const resolutionCodes = [
  { id: 'r1', code: 'FIXED', label: 'Fault repaired' },
  { id: 'r2', code: 'PART_REPLACED', label: 'Part replaced' },
]

async function renderPage({ status = 'ASSIGNED', history = [createdEntry] } = {}) {
  api.workOrder.mockResolvedValue({ ...baseWorkOrder, status })
  api.workOrderHistory.mockResolvedValue(history)
  render(
    <MemoryRouter initialEntries={['/work-orders/wo-1']}>
      <Routes>
        <Route path="/work-orders/:id" element={<WorkOrderDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
  await screen.findByText('Chiller alarm')
}

function chooseStatus(value) {
  fireEvent.change(screen.getByLabelText('Next status'), { target: { value } })
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Apply status' }))
}

describe('WorkOrderDetailPage - BUG-305 reason codes', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    api.technicians.mockResolvedValue([])
    api.transitionWorkOrder.mockResolvedValue({})
    api.reasonCodes.mockImplementation((status) =>
      Promise.resolve(status === 'RESOLVED' ? resolutionCodes : cancellationCodes))
  })

  it('does not ask for a reason code on non-terminal transitions', async () => {
    await renderPage()
    chooseStatus('ON_HOLD')

    expect(screen.queryByLabelText(/reason/i)).not.toBeInTheDocument()
    expect(api.reasonCodes).not.toHaveBeenCalled()

    submit()
    await waitFor(() => expect(api.transitionWorkOrder).toHaveBeenCalledWith(
      'wo-1', { status: 'ON_HOLD', note: null, reasonCode: null }, 3))
  })

  it('shows the configured cancellation reasons and a required note when cancelling', async () => {
    await renderPage()
    chooseStatus('CANCELLED')

    expect(await screen.findByRole('option', { name: 'Duplicate work order' })).toBeInTheDocument()
    expect(api.reasonCodes).toHaveBeenCalledWith('CANCELLED')
    expect(screen.getByLabelText(/cancellation reason/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cancellation note/i)).toBeInTheDocument()
  })

  it('shows the configured resolution reasons when resolving', async () => {
    await renderPage({ status: 'IN_PROGRESS' })
    chooseStatus('RESOLVED')

    expect(await screen.findByRole('option', { name: 'Fault repaired' })).toBeInTheDocument()
    expect(api.reasonCodes).toHaveBeenCalledWith('RESOLVED')
    expect(screen.getByLabelText(/resolution reason/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/resolution note/i)).toBeInTheDocument()
  })

  it('blocks a blank cancellation and does not call the API', async () => {
    await renderPage()
    chooseStatus('CANCELLED')
    await screen.findByRole('option', { name: 'Duplicate work order' })
    submit()

    expect(await screen.findByText('Select a cancellation reason code.')).toBeInTheDocument()
    expect(screen.getByText('Enter a cancellation note.')).toBeInTheDocument()
    expect(api.transitionWorkOrder).not.toHaveBeenCalled()
  })

  it('blocks a whitespace-only note even when a reason code is chosen', async () => {
    await renderPage()
    chooseStatus('CANCELLED')
    await screen.findByRole('option', { name: 'Duplicate work order' })
    fireEvent.change(screen.getByLabelText(/cancellation reason/i), { target: { value: 'DUPLICATE' } })
    fireEvent.change(screen.getByLabelText(/cancellation note/i), { target: { value: '       ' } })
    submit()

    expect(await screen.findByText('Enter a cancellation note.')).toBeInTheDocument()
    expect(screen.queryByText('Select a cancellation reason code.')).not.toBeInTheDocument()
    expect(api.transitionWorkOrder).not.toHaveBeenCalled()
  })

  it('blocks a note that is too short', async () => {
    await renderPage({ status: 'IN_PROGRESS' })
    chooseStatus('RESOLVED')
    await screen.findByRole('option', { name: 'Fault repaired' })
    fireEvent.change(screen.getByLabelText(/resolution reason/i), { target: { value: 'FIXED' } })
    fireEvent.change(screen.getByLabelText(/resolution note/i), { target: { value: 'done' } })
    submit()

    expect(await screen.findByText('The resolution note must be at least 10 characters.')).toBeInTheDocument()
    expect(api.transitionWorkOrder).not.toHaveBeenCalled()
  })

  it('sends the reason code and trimmed note for valid cancellation evidence', async () => {
    await renderPage()
    chooseStatus('CANCELLED')
    await screen.findByRole('option', { name: 'Duplicate work order' })
    fireEvent.change(screen.getByLabelText(/cancellation reason/i), { target: { value: 'DUPLICATE' } })
    fireEvent.change(screen.getByLabelText(/cancellation note/i), { target: { value: '  Duplicate of WO-1234  ' } })
    submit()

    await waitFor(() => expect(api.transitionWorkOrder).toHaveBeenCalledWith(
      'wo-1', { status: 'CANCELLED', note: 'Duplicate of WO-1234', reasonCode: 'DUPLICATE' }, 3))
    expect(await screen.findByText(/work order status updated/i)).toBeInTheDocument()
  })

  it('sends the reason code and note for a valid resolution', async () => {
    await renderPage({ status: 'IN_PROGRESS' })
    chooseStatus('RESOLVED')
    await screen.findByRole('option', { name: 'Fault repaired' })
    fireEvent.change(screen.getByLabelText(/resolution reason/i), { target: { value: 'FIXED' } })
    fireEvent.change(screen.getByLabelText(/resolution note/i), { target: { value: 'Replaced the pressure sensor and re-tested.' } })
    submit()

    await waitFor(() => expect(api.transitionWorkOrder).toHaveBeenCalledWith(
      'wo-1',
      { status: 'RESOLVED', note: 'Replaced the pressure sensor and re-tested.', reasonCode: 'FIXED' },
      3,
    ))
  })

  it('shows field errors returned by the API next to the inputs', async () => {
    api.transitionWorkOrder.mockRejectedValue(
      new ApiError('One or more request fields are invalid.', 400, { errors: { note: 'The cancellation note is not acceptable.' } }))
    await renderPage()
    chooseStatus('CANCELLED')
    await screen.findByRole('option', { name: 'Duplicate work order' })
    fireEvent.change(screen.getByLabelText(/cancellation reason/i), { target: { value: 'DUPLICATE' } })
    fireEvent.change(screen.getByLabelText(/cancellation note/i), { target: { value: 'Duplicate of WO-1234' } })
    submit()

    expect(await screen.findByText('The cancellation note is not acceptable.')).toBeInTheDocument()
  })

  it('shows the stored reason in the audit timeline', async () => {
    await renderPage({
      status: 'CANCELLED',
      history: [
        createdEntry,
        {
          id: 'h2', fromStatus: 'ASSIGNED', toStatus: 'CANCELLED', note: 'Duplicate of WO-1234',
          reasonCode: 'DUPLICATE', reasonLabel: 'Duplicate work order',
          changedByDisplayName: 'Pat Iyer', changedAt: '2026-10-28T09:00:00Z',
        },
      ],
    })

    expect(screen.getByText('Reason: Duplicate work order')).toBeInTheDocument()
    expect(screen.getByText('Duplicate of WO-1234')).toBeInTheDocument()
  })
})