import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getAdminPassword, setAdminPassword } from '@/lib/sheets'
import { getSession, requireAdmin } from '@/lib/auth'

export async function PUT(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  try {
    const { currentPassword, newPassword } = await req.json()
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: '모든 항목을 입력해주세요.' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: '새 비밀번호는 8자 이상이어야 합니다.' }, { status: 400 })
    }

    const storedHash = await getAdminPassword()
    const isValid = await bcrypt.compare(currentPassword, storedHash)
    if (!isValid) {
      return NextResponse.json({ error: '현재 비밀번호가 틀렸습니다.' }, { status: 401 })
    }

    const isSame = await bcrypt.compare(newPassword, storedHash)
    if (isSame) {
      return NextResponse.json({ error: '동일한 비밀번호로 변경할 수 없습니다.' }, { status: 400 })
    }

    const newHash = await bcrypt.hash(newPassword, 10)
    await setAdminPassword(newHash)

    const session = await getSession()
    await session.destroy()

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
