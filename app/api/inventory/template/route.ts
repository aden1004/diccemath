import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { buildTemplateXlsx } from '@/lib/excel'

// 교구 일괄 업로드 엑셀 서식 내려받기
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  const buf = await buildTemplateXlsx()
  const name = '교구_일괄업로드_서식.xlsx'
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Cache-Control': 'no-store',
    },
  })
}
