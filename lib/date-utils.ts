import type { PickupMethod } from '@/types'

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

// 한국 표준시(KST) 기준 YYYY-MM-DD. 서버(UTC)·브라우저 어디서 실행해도 동일한 '오늘'을 반환.
export function toKSTDate(date: Date = new Date()): string {
  if (isNaN(date.getTime())) return ''
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().split('T')[0]
}

// KST 기준 ISO 8601 문자열(+09:00 오프셋 포함). 대여기록 신청일시 저장용.
export function toKSTISOString(date: Date = new Date()): string {
  const local = new Date(date.getTime() + KST_OFFSET_MS).toISOString()
  return local.replace('Z', '+09:00')
}

// 전화번호 비교용 정규화: 숫자만 남김 (하이픈·공백·괄호 무시)
export function normalizePhone(phone: string): string {
  return (phone ?? '').replace(/\D/g, '')
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

// 휴대폰 번호 표시 형식: 숫자만 추출 후 010-1234-5678 형태로 하이픈 삽입 (입력 중 부분 문자열도 처리)
export function formatPhone(input: string): string {
  const d = normalizePhone(input).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
}
