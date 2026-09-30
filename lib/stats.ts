import type { RentalRecord, RentalItem, RentalStatus } from '@/types'

// ── 대여 통계 집계 (순수 함수: 테스트 가능) ──────────────────────────────────
export type StatsView = 'renter' | 'equipment' | 'date'
export type DateUnit = 'day' | 'month'

export type StatsFilter = {
  from: string           // YYYY-MM-DD (신청일 기준, KST)
  to: string
  includeReturned: boolean // 반납완료 건 포함 여부
  unit?: DateUnit          // date 보기 단위
}

export type DetailLine = { label: string; qty: number; sub?: string }
export type StatsRow = {
  key: string
  label: string
  sub?: string           // 보조 표시(학교명 등)
  rentals: number        // 대여 건수
  kinds: number          // 교구 종수
  qty: number            // 교구 수량 합
  details: DetailLine[]  // 펼침 내역
}
export type StatsResult = { view: StatsView; total: { rentals: number; kinds: number; qty: number }; rows: StatsRow[] }

const STATUS_LABEL: Record<RentalStatus, string> = { active: '대여중', extended: '연장중', return_requested: '반납신청', returned: '반납완료' }

export function appliedDate(r: RentalRecord): string {
  // appliedAt: '+09:00' ISO 또는 과거 UTC ISO → KST 날짜
  const d = new Date(r.appliedAt)
  if (isNaN(d.getTime())) return r.appliedAt.slice(0, 10)
  return new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10)
}

export function filterRentals(rentals: RentalRecord[], f: StatsFilter): RentalRecord[] {
  return rentals.filter(r => {
    const d = appliedDate(r)
    if (f.from && d < f.from) return false
    if (f.to && d > f.to) return false
    if (!f.includeReturned && r.status === 'returned') return false
    return true
  })
}

export function computeStats(rentals: RentalRecord[], items: RentalItem[], view: StatsView, f: StatsFilter): StatsResult {
  const selected = filterRentals(rentals, f)
  const byId = new Map(selected.map(r => [r.rentalId, r]))
  const itemsOf = new Map<string, RentalItem[]>()
  for (const it of items) {
    if (!byId.has(it.rentalId)) continue
    ;(itemsOf.get(it.rentalId) ?? itemsOf.set(it.rentalId, []).get(it.rentalId)!).push(it)
  }

  const groups = new Map<string, { label: string; sub?: string; rentalIds: Set<string>; kinds: Set<string>; qty: number; details: DetailLine[] }>()
  const group = (key: string, label: string, sub?: string) =>
    groups.get(key) ?? groups.set(key, { label, sub, rentalIds: new Set(), kinds: new Set(), qty: 0, details: [] }).get(key)!

  for (const r of selected) {
    const its = itemsOf.get(r.rentalId) ?? []
    const period = `${r.availableFrom}~${r.returnDue}`
    if (view === 'renter') {
      const g = group(`${r.schoolName}|${r.teacherName}|${r.phone}`, `${r.schoolName} ${r.teacherName}`, r.phone)
      g.rentalIds.add(r.rentalId)
      for (const it of its) {
        g.kinds.add(it.equipmentName); g.qty += it.quantity
        g.details.push({ label: it.equipmentName, qty: it.quantity, sub: `${r.rentalId} · ${period} · ${STATUS_LABEL[r.status]}` })
      }
    } else if (view === 'equipment') {
      for (const it of its) {
        const g = group(it.equipmentName, it.equipmentName)
        g.rentalIds.add(r.rentalId); g.kinds.add(it.equipmentName); g.qty += it.quantity
        g.details.push({ label: `${r.schoolName} ${r.teacherName}`, qty: it.quantity, sub: `${r.rentalId} · ${period} · ${STATUS_LABEL[r.status]}` })
      }
    } else {
      const d = appliedDate(r)
      const key = f.unit === 'month' ? d.slice(0, 7) : d
      const g = group(key, key)
      g.rentalIds.add(r.rentalId)
      for (const it of its) {
        g.kinds.add(it.equipmentName); g.qty += it.quantity
        g.details.push({ label: `${r.schoolName} ${r.teacherName} — ${it.equipmentName}`, qty: it.quantity, sub: `${r.rentalId} · ${STATUS_LABEL[r.status]}` })
      }
    }
  }

  const rows: StatsRow[] = Array.from(groups.entries()).map(([key, g]) => ({
    key, label: g.label, sub: g.sub, rentals: g.rentalIds.size, kinds: g.kinds.size, qty: g.qty, details: g.details,
  }))
  if (view === 'date') rows.sort((a, b) => a.key.localeCompare(b.key))
  else rows.sort((a, b) => b.rentals - a.rentals || b.qty - a.qty || a.label.localeCompare(b.label, 'ko'))

  const allKinds = new Set<string>()
  let qty = 0
  for (const its of itemsOf.values()) for (const it of its) { allKinds.add(it.equipmentName); qty += it.quantity }
  return { view, total: { rentals: selected.length, kinds: allKinds.size, qty }, rows }
}

export const VIEW_LABEL: Record<StatsView, string> = { renter: '대여자별', equipment: '교구별', date: '신청일자별' }
