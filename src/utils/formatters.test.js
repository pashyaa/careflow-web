import { describe, expect, it } from 'vitest'
import { formatDateTime, formatMinutes, slaStateLabel } from './formatters.js'

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

describe('formatDateTime', () => {
  it('renders in the requested site time zone', () => {
    const text = formatDateTime('2026-10-09T12:00:00Z', 'Asia/Kolkata')
    expect(text).toMatch(/5:30|05:30/)   // 12:00 UTC is 17:30 IST
  })
})