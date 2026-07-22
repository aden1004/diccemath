import {
  getMinAvailableFrom,
  getDefaultReturnDue,
  isValidAvailableFrom,
  isValidReturnDue,
  addDays,
  formatDate,
} from '@/lib/date-utils'

describe('addDays', () => {
  it('adds days to a date string', () => {
    expect(addDays('2026-04-23', 2)).toBe('2026-04-25')
    expect(addDays('2026-04-30', 2)).toBe('2026-05-02')
  })
})

describe('getMinAvailableFrom', () => {
  it('returns appliedDate +2 for direct pickup', () => {
    expect(getMinAvailableFrom('2026-04-23', 'direct')).toBe('2026-04-25')
  })
  it('returns appliedDate +3 for delivery', () => {
    expect(getMinAvailableFrom('2026-04-23', 'delivery')).toBe('2026-04-26')
  })
})

describe('getDefaultReturnDue', () => {
  it('returns availableFrom +14 days', () => {
    expect(getDefaultReturnDue('2026-04-25')).toBe('2026-05-09')
  })
})

describe('isValidAvailableFrom', () => {
  it('accepts date on or after min', () => {
    expect(isValidAvailableFrom('2026-04-25', '2026-04-23', 'direct')).toBe(true)
    expect(isValidAvailableFrom('2026-04-28', '2026-04-23', 'direct')).toBe(true)
  })
  it('rejects date before min', () => {
    expect(isValidAvailableFrom('2026-04-24', '2026-04-23', 'direct')).toBe(false)
  })
})

describe('isValidReturnDue', () => {
  it('accepts date between availableFrom+1 and availableFrom+14', () => {
    expect(isValidReturnDue('2026-05-01', '2026-04-25')).toBe(true)
    expect(isValidReturnDue('2026-05-09', '2026-04-25')).toBe(true)
  })
  it('rejects date equal to availableFrom', () => {
    expect(isValidReturnDue('2026-04-25', '2026-04-25')).toBe(false)
  })
  it('rejects date after availableFrom+14', () => {
    expect(isValidReturnDue('2026-05-10', '2026-04-25')).toBe(false)
  })
})

describe('formatDate', () => {
  it('formats a UTC midnight date to YYYY-MM-DD', () => {
    expect(formatDate(new Date('2026-04-23T00:00:00Z'))).toBe('2026-04-23')
  })
})
