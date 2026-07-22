import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function POST() {
  const session = await getSession()
  await session.destroy()
  return NextResponse.redirect(
    new URL('/admin/login', process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'),
    303
  )
}
