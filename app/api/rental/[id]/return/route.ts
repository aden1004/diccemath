import { NextResponse } from 'next/server'
import { getRentalById, getRentalItems, updateRentalStatus, getAdminEmails } from '@/lib/sheets'
import { normalizePhone } from '@/lib/date-utils'
import { sendReturnRequestEmail } from '@/lib/email'

// 이용자 반납 신청: 상태만 '반납신청'으로 변경. 재고 복구는 관리자가 실물 확인 후 처리.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const phone = normalizePhone(String(body?.phone ?? ''))
    if (!phone) {
      return NextResponse.json({ error: '본인 확인을 위해 신청 시 입력한 휴대폰 번호를 입력해주세요.' }, { status: 400 })
    }

    const rental = await getRentalById(id)
    if (!rental || normalizePhone(rental.phone) !== phone) {
      // 존재 여부를 노출하지 않도록 동일 메시지 사용
      return NextResponse.json({ error: '대여 정보와 휴대폰 번호가 일치하지 않습니다.' }, { status: 404 })
    }
    if (rental.status === 'returned') {
      return NextResponse.json({ error: '이미 반납 처리된 건입니다.' }, { status: 400 })
    }
    if (rental.status === 'return_requested') {
      return NextResponse.json({ error: '이미 반납 신청된 건입니다. 관리자 확인 후 처리됩니다.' }, { status: 400 })
    }

    await updateRentalStatus(id, 'return_requested')

    const items = await getRentalItems(id)
    const adminEmailList = await getAdminEmails()
    await sendReturnRequestEmail(
      { ...rental, status: 'return_requested', items },
      adminEmailList.map(a => a.email)
    ).catch(err => console.error('Email send failed:', err))

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
