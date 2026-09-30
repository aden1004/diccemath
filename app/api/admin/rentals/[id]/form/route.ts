import { NextResponse } from 'next/server'
import { getRentalById, getRentalItems, getTemplateFile } from '@/lib/sheets'
import { requireAdmin } from '@/lib/auth'
import { buildRentalForm, formFileName } from '@/lib/hwpx'
import { DEFAULT_TEMPLATE_BASE64 } from '@/lib/rental-form-template'

// 관리자: 대여 건의 신청서(HWPX) 생성·다운로드
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  try {
    const { id } = await params
    const rental = await getRentalById(id)
    if (!rental) return NextResponse.json({ error: '조회 결과가 없습니다.' }, { status: 404 })
    const items = await getRentalItems(id)

    // 업로드된 서식이 있으면 사용, 없으면 기본 내장 서식
    const template = (await getTemplateFile()) ?? Buffer.from(DEFAULT_TEMPLATE_BASE64, 'base64')
    const file = await buildRentalForm(template, { ...rental, items })
    const name = formFileName({ ...rental, items })

    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        'Content-Type': 'application/hwp+zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(name)}"; filename*=UTF-8''${encodeURIComponent(name)}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '신청서 생성에 실패했습니다.' }, { status: 500 })
  }
}
