import { generateRentalId, parseRentalDate } from '@/lib/rental-id'

describe('generateRentalId', () => {
  it('starts with R followed by date', () => {
    const id = generateRentalId('2026-04-23', 1)
    expect(id).toBe('R20260423-001')
  })
  it('zero-pads the sequence number', () => {
    expect(generateRentalId('2026-04-23', 12)).toBe('R20260423-012')
    expect(generateRentalId('2026-04-23', 100)).toBe('R20260423-100')
  })
  it('throws for seq out of range', () => {
    expect(() => generateRentalId('2026-04-23', 0)).toThrow(RangeError)
    expect(() => generateRentalId('2026-04-23', 1000)).toThrow(RangeError)
  })
})

describe('parseRentalDate', () => {
  it('extracts date from rental ID', () => {
    expect(parseRentalDate('R20260423-001')).toBe('2026-04-23')
  })
})
