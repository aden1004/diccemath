import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import type { SessionData } from '@/types'

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET env var must be set to at least 32 characters')
}

const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'diccemath-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 8, // 8 hours
  },
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), SESSION_OPTIONS)
}

export async function requireAdmin() {
  const session = await getSession()
  if (!session.isAdmin) {
    return null
  }
  return session
}
