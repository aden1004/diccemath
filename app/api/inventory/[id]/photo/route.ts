import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { requireAdmin } from '@/lib/auth'
import { getAllEquipment, getEquipmentRowIndex, updateEquipmentPhoto } from '@/lib/sheets'

const MAX_BYTES = 4 * 1024 * 1024
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

// 교구 사진 업로드 → Vercel Blob 저장 → 시트 사진URL 갱신 (multipart, 필드명 file)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  // Blob 인증: 신형 연결은 BLOB_STORE_ID + Vercel OIDC 토큰(자동), 구형은 BLOB_READ_WRITE_TOKEN
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    return NextResponse.json({ error: '이미지 저장소가 설정되지 않았습니다. Vercel 프로젝트에 Blob 스토어를 연결한 뒤 재배포하세요.' }, { status: 503 })
  }
  try {
    const { id: rawId } = await params
    const id = parseInt(rawId, 10)
    const item = (await getAllEquipment()).find(e => e.id === id)
    if (!item) return NextResponse.json({ error: '교구를 찾을 수 없습니다.' }, { status: 404 })

    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: '이미지 파일을 선택해주세요.' }, { status: 400 })
    if (!ALLOWED.has(file.type)) return NextResponse.json({ error: 'PNG·JPG·WEBP·GIF 이미지만 가능합니다.' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: '이미지 크기는 4MB 이하여야 합니다.' }, { status: 400 })

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : file.type === 'image/gif' ? 'gif' : 'jpg'
    const blob = await put(`equipment/${id}-${Date.now()}.${ext}`, file, {
      access: 'public',
      contentType: file.type,
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 30,
    })
    const rowIndex = await getEquipmentRowIndex(item.name)
    if (rowIndex === -1) return NextResponse.json({ error: '교구 행을 찾지 못했습니다.' }, { status: 404 })
    await updateEquipmentPhoto(rowIndex, blob.url)
    return NextResponse.json({ ok: true, photoUrl: blob.url })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '사진 업로드에 실패했습니다.' }, { status: 500 })
  }
}
