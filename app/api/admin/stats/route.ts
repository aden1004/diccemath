import { NextResponse } from 'next/server'
import { getRentalsByDateRange, getRentalItems } from '@/lib/sheets'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from') ?? ''
    const to = searchParams.get('to') ?? ''

    if (!from || !to) {
      return NextResponse.json({ error: '기간을 입력해주세요.' }, { status: 400 })
    }

    const rentals = await getRentalsByDateRange(from, to)
    const counts: Record<string, number> = {}
    const allItems = await Promise.all(rentals.map(r => getRentalItems(r.rentalId)))
    for (const items of allItems) {
      for (const item of items) {
        counts[item.equipmentName] = (counts[item.equipmentName] ?? 0) + 1
      }
    }
    const sorted = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({ total: rentals.length, byEquipment: sorted })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
