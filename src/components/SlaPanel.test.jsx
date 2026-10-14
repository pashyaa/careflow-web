import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SlaPanel from './SlaPanel.jsx'

const sla = {
  policyName: 'Critical - default', policyScope: 'PRIORITY', responseMinutes: 30, resolutionMinutes: 240,
  businessHoursOnly: false, timeZone: 'Asia/Kolkata',
  responseDueAt: '2026-10-09T10:30:00Z', firstResponseAt: null, responseState: 'BREACHED',
  resolutionDueAt: '2026-10-09T14:00:00Z', resolvedAt: null, resolutionState: 'ON_TRACK', overallState: 'BREACHED',
}

describe('SlaPanel', () => {
  it('shows the policy snapshot and SLA states', () => {
    render(<SlaPanel sla={sla} />)
    expect(screen.getByText('Critical - default')).toBeInTheDocument()
    expect(screen.getAllByText('Breached').length).toBeGreaterThan(0)
    expect(screen.getByText('On track')).toBeInTheDocument()
    expect(screen.getByText('24×7')).toBeInTheDocument()
  })

  it('renders nothing without SLA data', () => {
    const { container } = render(<SlaPanel sla={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})