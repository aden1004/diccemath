import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { getAdminPassword } from '@/lib/sheets'

export async function POST(req: Request) {
  try {
    const { password } = await req.json()
    if (!password) {
      return NextResponse.json({ error: '비밀번호를 입력해주세요.' }, { status: 400 })
    }

    const storedHash = await getAdminPassword()
    if (!storedHash) {
      return NextResponse.json({ error: '관리자 설정이 필요합니다.' }, { status: 500 })
    }

    const isValid = await bcrypt.compare(password, storedHash)
    if (!isValid) {
      return NextResponse.json({ error: '비밀번호가 틀렸습니다.' }, { status: 401 })
    }

    const session = await getSession()
    session.isAdmin = true
    await session.save()

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
