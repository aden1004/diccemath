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
  // 2026-04-20 = 월요일, 2026-04-23 = 목요일, 2026-04-26 = 일요일
  it('returns appliedDate +2 for direct pickup when no weekend in between', () => {
    // 월요일 신청 → 화·수 사이 주말 없음 → 수요일
    expect(getMinAvailableFrom('2026-04-20', 'direct')).toBe('2026-04-22')
  })
  it('adds 2 days for direct pickup when a weekend falls in between', () => {
    // 목요일 신청 → +2 = 토요일, 금~토 사이에 토요일 포함 → +2 = 월요일
    expect(getMinAvailableFrom('2026-04-23', 'direct')).toBe('2026-04-27')
  })
  it('returns appliedDate +5 for delivery when no weekend in between', () => {
    // 일요일 신청 → 월~금 사이 주말 없음 → 금요일
    expect(getMinAvailableFrom('2026-04-26', 'delivery')).toBe('2026-05-01')
  })
  it('adds 2 days for delivery when a weekend falls in between', () => {
    // 월요일 신청 → +5 = 토요일, 주말 포함 → +2 = 다음 주 월요일
    expect(getMinAvailableFrom('2026-04-20', 'delivery')).toBe('2026-04-27')
    // 목요일 신청 → +5 = 화요일, 사이에 토·일 포함 → +2 = 목요일
    expect(getMinAvailableFrom('2026-04-23', 'delivery')).toBe('2026-04-30')
  })
})

describe('getDefaultReturnDue', () => {
  it('returns availableFrom +14 days', () => {
    expect(getDefaultReturnDue('2026-04-25')).toBe('2026-05-09')
  })
})

describe('isValidAvailableFrom', () => {
  it('accepts date on or after min', () => {
    // 목요일 신청 직접 수령 → 최소 2026-04-27(월)
    expect(isValidAvailableFrom('2026-04-27', '2026-04-23', 'direct')).toBe(true)
    expect(isValidAvailableFrom('2026-04-28', '2026-04-23', 'direct')).toBe(true)
  })
  it('rejects date before min', () => {
    expect(isValidAvailableFrom('2026-04-25', '2026-04-23', 'direct')).toBe(false)
    expect(isValidAvailableFrom('2026-04-26', '2026-04-23', 'direct')).toBe(false)
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
