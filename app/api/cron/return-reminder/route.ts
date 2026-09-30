import { NextResponse } from 'next/server'
import { getAllActiveRentals, getRentalItems } from '@/lib/sheets'
import { sendReturnReminderEmail } from '@/lib/email'
import { addDays, toKSTDate } from '@/lib/date-utils'

// 반납 예정일 D-3 안내 메일 — Vercel Cron이 매일 1회 호출 (vercel.json 참조)
// 인증: Authorization: Bearer ${CRON_SECRET} (Vercel이 자동 부착). 수동 호출도 같은 헤더 필요.
const REMIND_DAYS = 3

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization') ?? ''
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  try {
    const target = addDays(toKSTDate(), REMIND_DAYS)
    // 대여중·연장중만 대상 (반납신청 상태는 제외)
    const rentals = (await getAllActiveRentals()).filter(
      r => r.returnDue === target && (r.status === 'active' || r.status === 'extended') && r.email
    )
    let sent = 0
    const failed: string[] = []
    for (const rental of rentals) {
      try {
        const items = await getRentalItems(rental.rentalId)
        await sendReturnReminderEmail({ ...rental, items }, REMIND_DAYS)
        sent++
      } catch (err) {
        console.error('Reminder failed:', rental.rentalId, err)
        failed.push(rental.rentalId)
      }
    }
    return NextResponse.json({ ok: true, date: toKSTDate(), target, sent, failed })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
