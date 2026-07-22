export function generateRentalId(dateStr: string, seq: number): string {
  if (seq < 1 || seq > 999) throw new RangeError(`seq must be 1–999, got ${seq}`)
  const compact = dateStr.replace(/-/g, '')
  const padded = String(seq).padStart(3, '0')
  return `R${compact}-${padded}`
}

export function parseRentalDate(rentalId: string): string {
  const compact = rentalId.slice(1, 9)
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`
}
