import { NextResponse } from 'next/server'
import { getAdminEmails, addAdminEmail } from '@/lib/sheets'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  try {
    const emails = await getAdminEmails()
    return NextResponse.json(emails)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  try {
    const { email, name } = await req.json()
    if (!email) return NextResponse.json({ error: '이메일은 필수입니다.' }, { status: 400 })
    await addAdminEmail(email, name ?? '')
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
