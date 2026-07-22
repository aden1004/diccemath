import { NextResponse } from 'next/server'
import { updateAdminEmail, deleteAdminEmailRow } from '@/lib/sheets'
import { requireAdmin } from '@/lib/auth'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  try {
    const { email, name } = await req.json()
    if (!email) return NextResponse.json({ error: '이메일은 필수입니다.' }, { status: 400 })
    const { id: rawId } = await params
    const id = parseInt(rawId, 10)
    if (isNaN(id)) return NextResponse.json({ error: '잘못된 ID입니다.' }, { status: 400 })
    await updateAdminEmail(id, email, name ?? '')
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  try {
    const { id: rawId } = await params
    const id = parseInt(rawId, 10)
    if (isNaN(id)) return NextResponse.json({ error: '잘못된 ID입니다.' }, { status: 400 })
    await deleteAdminEmailRow(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
