import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import StatusBadge from './StatusBadge.jsx'

describe('StatusBadge', () => {
  it('renders a readable status label and semantic class', () => {
    render(<StatusBadge status="IN_PROGRESS" />)

    const badge = screen.getByText('In Progress')
    expect(badge).toHaveClass('status-badge', 'status-in_progress')
  })
})

