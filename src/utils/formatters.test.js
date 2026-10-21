import { describe, expect, it } from 'vitest'
import { formatDateTime, formatMinutes, isOverdue, siteTimeZone, slaStateLabel } from './formatters.js'

describe('formatMinutes', () => {
  it('formats minutes and hours', () => {
    expect(formatMinutes(15)).toBe('15 min')
    expect(formatMinutes(240)).toBe('4 h')
    expect(formatMinutes(1440)).toBe('24 h')
    expect(formatMinutes(90)).toBe('1 h 30 min')
    expect(formatMinutes(null)).toBe('—')
  })
})

describe('slaStateLabel', () => {
  it('maps API states to labels', () => {
    expect(slaStateLabel('AT_RISK')).toBe('At risk')
    expect(slaStateLabel('MET_LATE')).toBe('Met late')
    expect(slaStateLabel('nope')).toBe('—')
  })
})
describe('site time zone display', () => {
  const instant = '2026-10-09T12:00:00Z'

  it('shows the same instant in IST and New York, regardless of browser zone', () => {
    expect(formatDateTime(instant, 'Asia/Kolkata')).toMatch(/05:30/)               // 17:30 IST
    expect(formatDateTime(instant, 'America/New_York')).toMatch(/08:00.*(GMT-4|EDT)/i)
  })

  it('prefers the SLA snapshot zone, then the site zone', () => {
    expect(siteTimeZone({ sla: { timeZone: 'Asia/Kolkata' }, site: { timeZone: 'America/New_York' } })).toBe('Asia/Kolkata')
    expect(siteTimeZone({ sla: null, site: { timeZone: 'America/New_York' } })).toBe('America/New_York')
  })
})

describe('isOverdue', () => {
  const future = new Date(Date.now() + 3600_000).toISOString()
  const past = new Date(Date.now() - 3600_000).toISOString()

  it('follows the API SLA state, not the browser clock', () => {
    expect(isOverdue({ status: 'NEW', targetResolutionAt: future, sla: { resolutionState: 'BREACHED' } })).toBe(true)
    expect(isOverdue({ status: 'NEW', targetResolutionAt: past, sla: { resolutionState: 'ON_TRACK' } })).toBe(false)
  })

  it('never flags resolved or cancelled work, and falls back for legacy rows', () => {
    expect(isOverdue({ status: 'RESOLVED', targetResolutionAt: past, sla: { resolutionState: 'BREACHED' } })).toBe(false)
    expect(isOverdue({ status: 'NEW', targetResolutionAt: past, sla: null })).toBe(true)
  })
})

describe('formatDateTime', () => {
  it('renders in the requested site time zone', () => {
    const text = formatDateTime('2026-10-09T12:00:00Z', 'Asia/Kolkata')
    expect(text).toMatch(/5:30|05:30/)   // 12:00 UTC is 17:30 IST
  })
})