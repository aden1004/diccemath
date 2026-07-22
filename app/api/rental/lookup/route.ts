import { NextResponse } from 'next/server'
import { getRentalById, getRentalsByPhone, getRentalItems } from '@/lib/sheets'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const rentalId = searchParams.get('rentalId')
    const phone = searchParams.get('phone')

    if (!rentalId && !phone) {
      return NextResponse.json({ error: '대여ID 또는 전화번호를 입력해주세요.' }, { status: 400 })
    }

    if (rentalId) {
      const rental = await getRentalById(rentalId)
      if (!rental) return NextResponse.json({ error: '조회 결과가 없습니다.' }, { status: 404 })
      const items = await getRentalItems(rentalId)
      return NextResponse.json([{ ...rental, items }])
    }

    const rentals = await getRentalsByPhone(phone!)
    if (rentals.length === 0) return NextResponse.json({ error: '조회 결과가 없습니다.' }, { status: 404 })
    const results = await Promise.all(
      rentals.map(async r => ({ ...r, items: await getRentalItems(r.rentalId) }))
    )
    return NextResponse.json(results)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
