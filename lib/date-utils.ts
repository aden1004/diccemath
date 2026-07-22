import type { PickupMethod } from '@/types'

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setUTCDate(d.getUTCDate() + days)
  return formatDate(d)
}

function containsWeekend(fromInclusive: string, toInclusive: string): boolean {
  for (let d = fromInclusive; d <= toInclusive; d = addDays(d, 1)) {
    const day = new Date(d).getUTCDay()
    if (day === 0 || day === 6) return true
  }
  return false
}

// 직접 수령: 신청일 +2일, 택배: +5일(배송 기간 고려).
// 신청 다음 날부터 최소 수령일까지 토/일이 끼어 있으면 2일 추가.
export function getMinAvailableFrom(appliedDate: string, method: PickupMethod): string {
  const base = addDays(appliedDate, method === 'direct' ? 2 : 5)
  return containsWeekend(addDays(appliedDate, 1), base) ? addDays(base, 2) : base
}

export function getDefaultReturnDue(availableFrom: string): string {
  return addDays(availableFrom, 14)
}

export function isValidAvailableFrom(
  date: string,
  appliedDate: string,
  method: PickupMethod
): boolean {
  return date >= getMinAvailableFrom(appliedDate, method)
}

export function isValidReturnDue(returnDue: string, availableFrom: string): boolean {
  const min = addDays(availableFrom, 1)
  const max = addDays(availableFrom, 14)
  return returnDue >= min && returnDue <= max
}
