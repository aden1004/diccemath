import { NextResponse } from 'next/server'
import { getRentalById, getRentalItems, updateRentalStatus, updateRentalReturnDue, getAdminEmails } from '@/lib/sheets'
import { addDays } from '@/lib/date-utils'
import { sendExtendEmail } from '@/lib/email'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const rental = await getRentalById(id)
    if (!rental) return NextResponse.json({ error: '조회 결과가 없습니다.' }, { status: 404 })
    if (rental.status === 'returned') {
      return NextResponse.json({ error: '반납된 건은 연장할 수 없습니다.' }, { status: 400 })
    }
    if (rental.extended) {
      return NextResponse.json({ error: '연장은 1회만 가능합니다.' }, { status: 400 })
    }

    const newReturnDue = addDays(rental.returnDue, 14)
    await updateRentalReturnDue(id, newReturnDue)
    await updateRentalStatus(id, 'extended', true)

    const items = await getRentalItems(id)
    const adminEmailList = await getAdminEmails()
    await sendExtendEmail(
      { ...rental, items },
      newReturnDue,
      adminEmailList.map(a => a.email)
    ).catch(err => console.error('Email send failed:', err))

    return NextResponse.json({ ok: true, newReturnDue })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
