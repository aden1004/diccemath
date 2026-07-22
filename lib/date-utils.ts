import type { PickupMethod } from '@/types'

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setUTCDate(d.getUTCDate() + days)
  return formatDate(d)
}

export function isWeekend(dateStr: string): boolean {
  const day = new Date(dateStr).getUTCDay()
  return day === 0 || day === 6
}

function containsWeekend(fromInclusive: string, toInclusive: string): boolean {
  for (let d = fromInclusive; d <= toInclusive; d = addDays(d, 1)) {
    if (isWeekend(d)) return true
  }
  return false
}

// 직접 수령: 신청일 +2일, 택배: +5일(배송 기간 고려).
// 신청 다음 날부터 최소 수령일까지 토/일이 끼어 있으면 2일 추가.
// 토/일은 수령일이 될 수 없으므로 최소일이 주말이면 다음 평일로 미룸.
export function getMinAvailableFrom(appliedDate: string, method: PickupMethod): string {
  const base = addDays(appliedDate, method === 'direct' ? 2 : 5)
  let min = containsWeekend(addDays(appliedDate, 1), base) ? addDays(base, 2) : base
  while (isWeekend(min)) min = addDays(min, 1)
  return min
}

export function getDefaultReturnDue(availableFrom: string): string {
  return addDays(availableFrom, 14)
}

export function isValidAvailableFrom(
  date: string,
  appliedDate: string,
  method: PickupMethod
): boolean {
  return date >= getMinAvailableFrom(appliedDate, method) && !isWeekend(date)
}

export function isValidReturnDue(returnDue: string, availableFrom: string): boolean {
  const min = addDays(availableFrom, 1)
  const max = addDays(availableFrom, 14)
  return returnDue >= min && returnDue <= max && !isWeekend(returnDue)
}
