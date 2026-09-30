import { NextResponse } from 'next/server'
import { getAllRentals, getAllRentalItems } from '@/lib/sheets'
import { requireAdmin } from '@/lib/auth'
import { computeStats, type StatsView, type DateUnit } from '@/lib/stats'
import { buildStatsXlsx } from '@/lib/excel'

// 통계: ?from&to&view=renter|equipment|date&includeReturned=1&unit=day|month&format=xlsx
export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  try {
    const p = new URL(req.url).searchParams
    const from = p.get('from') ?? ''
    const to = p.get('to') ?? ''
    const view = (['renter', 'equipment', 'date'].includes(p.get('view') ?? '') ? p.get('view') : 'equipment') as StatsView
    const unit = (p.get('unit') === 'month' ? 'month' : 'day') as DateUnit
    const includeReturned = p.get('includeReturned') !== '0'
    if (!from || !to) return NextResponse.json({ error: '기간을 입력해주세요.' }, { status: 400 })
    if (from > to) return NextResponse.json({ error: '시작일이 종료일보다 늦습니다.' }, { status: 400 })

    const [rentals, items] = await Promise.all([getAllRentals(), getAllRentalItems()])
    const result = computeStats(rentals, items, view, { from, to, includeReturned, unit })

    if (p.get('format') === 'xlsx') {
      const buf = await buildStatsXlsx(result, { from, to, includeReturned, unit })
      const name = `대여통계_${from}_${to}.xlsx`
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
          'Cache-Control': 'no-store',
        },
      })
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
