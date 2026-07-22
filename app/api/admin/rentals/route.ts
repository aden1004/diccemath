import { NextResponse } from 'next/server'
import { getAllActiveRentals, getRentalItems } from '@/lib/sheets'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  try {
    const rentals = await getAllActiveRentals()
    const results = await Promise.all(
      rentals.map(async r => ({ ...r, items: await getRentalItems(r.rentalId) }))
    )
    return NextResponse.json(results)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
