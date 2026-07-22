import { NextResponse } from 'next/server'
import { getRentalById, getRentalItems } from '@/lib/sheets'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const rental = await getRentalById(id)
    if (!rental) return NextResponse.json({ error: '조회 결과가 없습니다.' }, { status: 404 })
    const items = await getRentalItems(id)
    return NextResponse.json({ ...rental, items })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
