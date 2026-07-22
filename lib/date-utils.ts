import type { PickupMethod } from '@/types'

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setUTCDate(d.getUTCDate() + days)
  return formatDate(d)
}

export function getMinAvailableFrom(appliedDate: string, method: PickupMethod): string {
  return addDays(appliedDate, method === 'direct' ? 2 : 3)
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
