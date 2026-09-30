import { computeStats, filterRentals } from '@/lib/stats'
import type { RentalRecord, RentalItem } from '@/types'

const R = (id: string, school: string, teacher: string, applied: string, status: RentalRecord['status']): RentalRecord => ({
  rentalId: id, schoolName: school, teacherName: teacher, phone: '010-0000-0001', email: 'a@b.c',
  appliedAt: applied, pickupMethod: 'direct', availableFrom: '2026-10-05', returnDue: '2026-10-19', status, extended: false,
})
const rentals: RentalRecord[] = [
  R('R1', '가초', '김교사', '2026-09-01T10:00:00+09:00', 'returned'),
  R('R2', '가초', '김교사', '2026-09-15T10:00:00+09:00', 'active'),
  R('R3', '나초', '이교사', '2026-09-30T20:00:00Z', 'extended'), // UTC 20:00 → KST 10-01
]
const items: RentalItem[] = [
  { rentalId: 'R1', equipmentName: '지오보드', quantity: 2 },
  { rentalId: 'R2', equipmentName: '지오보드', quantity: 1 },
  { rentalId: 'R2', equipmentName: '칠교판', quantity: 3 },
  { rentalId: 'R3', equipmentName: '칠교판', quantity: 5 },
]

describe('stats', () => {
  it('기간·반납완료 필터', () => {
    expect(filterRentals(rentals, { from: '2026-09-01', to: '2026-09-30', includeReturned: true }).map(r => r.rentalId)).toEqual(['R1', 'R2'])
    expect(filterRentals(rentals, { from: '2026-09-01', to: '2026-09-30', includeReturned: false }).map(r => r.rentalId)).toEqual(['R2'])
    expect(filterRentals(rentals, { from: '2026-10-01', to: '2026-10-31', includeReturned: true }).map(r => r.rentalId)).toEqual(['R3'])
  })
  it('대여자별', () => {
    const s = computeStats(rentals, items, 'renter', { from: '2026-09-01', to: '2026-10-31', includeReturned: true })
    expect(s.total).toEqual({ rentals: 3, kinds: 2, qty: 11 })
    expect(s.rows[0]).toMatchObject({ label: '가초 김교사', rentals: 2, kinds: 2, qty: 6 })
    expect(s.rows[1]).toMatchObject({ label: '나초 이교사', rentals: 1, kinds: 1, qty: 5 })
  })
  it('교구별', () => {
    const s = computeStats(rentals, items, 'equipment', { from: '2026-09-01', to: '2026-10-31', includeReturned: true })
    const map = Object.fromEntries(s.rows.map(r => [r.label, r]))
    expect(map['지오보드']).toMatchObject({ rentals: 2, qty: 3 })
    expect(map['칠교판']).toMatchObject({ rentals: 2, qty: 8 })
    expect(map['칠교판'].details.length).toBe(2)
  })
  it('신청일자별(월)', () => {
    const s = computeStats(rentals, items, 'date', { from: '2026-09-01', to: '2026-10-31', includeReturned: true, unit: 'month' })
    expect(s.rows.map(r => [r.label, r.rentals, r.qty])).toEqual([['2026-09', 2, 6], ['2026-10', 1, 5]])
  })
})
