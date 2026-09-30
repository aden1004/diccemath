import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getTemplateMeta, getTemplateFile, setTemplateFile, clearTemplateFile } from '@/lib/sheets'
import { validateTemplate, REQUIRED_PLACEHOLDERS } from '@/lib/hwpx'
import { DEFAULT_TEMPLATE_BASE64, DEFAULT_TEMPLATE_NAME } from '@/lib/rental-form-template'

const MAX_BYTES = 2 * 1024 * 1024 // 2MB (base64 분할 저장 한도 고려)

// 현재 서식 정보 조회 (?download=1 이면 파일 다운로드)
export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  try {
    const url = new URL(req.url)
    const meta = await getTemplateMeta()
    if (url.searchParams.get('download')) {
      const buf = (meta && (await getTemplateFile())) ?? Buffer.from(DEFAULT_TEMPLATE_BASE64, 'base64')
      const name = meta?.name ?? DEFAULT_TEMPLATE_NAME
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/hwp+zip',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
          'Cache-Control': 'no-store',
        },
      })
    }
    return NextResponse.json({
      source: meta ? 'uploaded' : 'default',
      name: meta?.name ?? DEFAULT_TEMPLATE_NAME,
      updatedAt: meta?.updatedAt ?? '',
      required: REQUIRED_PLACEHOLDERS,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '서식 정보를 불러오지 못했습니다.' }, { status: 500 })
  }
}

// 서식 업로드 (multipart/form-data, 필드명 file)
export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: '파일을 선택해주세요.' }, { status: 400 })
    }
    if (!file.name.toLowerCase().endsWith('.hwpx')) {
      return NextResponse.json({ error: 'HWPX 형식 파일만 업로드할 수 있습니다. (한글에서 "다른 이름으로 저장 → HWPX")' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: '파일 크기는 2MB 이하여야 합니다.' }, { status: 400 })
    }
    const buf = Buffer.from(await file.arrayBuffer())
    const check = await validateTemplate(buf)
    if (!check.ok) {
      return NextResponse.json(
        { error: `필수 자리표시자가 없습니다: ${check.missing.map(k => `{{${k}}}`).join(', ')}`, found: check.found },
        { status: 400 }
      )
    }
    await setTemplateFile(file.name, buf)
    return NextResponse.json({ ok: true, name: file.name, found: check.found })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '서식 저장에 실패했습니다.' }, { status: 500 })
  }
}

// 업로드 서식 삭제 → 기본 내장 서식으로 복귀
export async function DELETE() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  try {
    await clearTemplateFile()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '초기화에 실패했습니다.' }, { status: 500 })
  }
}
