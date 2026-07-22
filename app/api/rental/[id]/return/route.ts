import { NextResponse } from 'next/server'
import { getRentalById, getRentalItems, updateRentalStatus, adjustRentedQty, getAdminEmails } from '@/lib/sheets'
import { sendReturnEmail } from '@/lib/email'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const rental = await getRentalById(id)
    if (!rental) return NextResponse.json({ error: '조회 결과가 없습니다.' }, { status: 404 })
    if (rental.status === 'returned') {
      return NextResponse.json({ error: '이미 반납 처리된 건입니다.' }, { status: 400 })
    }

    await updateRentalStatus(id, 'returned')

    const items = await getRentalItems(id)
    for (const item of items) {
      await adjustRentedQty(item.equipmentName, -item.quantity)
    }

    const adminEmailList = await getAdminEmails()
    sendReturnEmail(
      { ...rental, items },
      adminEmailList.map(a => a.email)
    ).catch(err => console.error('Email send failed:', err))

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
