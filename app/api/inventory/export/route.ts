import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getAllEquipment } from '@/lib/sheets'
import { buildExportXlsx } from '@/lib/excel'
import { toKSTDate } from '@/lib/date-utils'

// 현재 교구 목록 엑셀 내보내기 (수정 후 재업로드용)
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  try {
    const equipment = (await getAllEquipment()).sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    const buf = await buildExportXlsx(equipment)
    const name = `교구목록_${toKSTDate()}.xlsx`
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '내보내기에 실패했습니다.' }, { status: 500 })
  }
}
