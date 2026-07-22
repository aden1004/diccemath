'use client'
import { useState } from 'react'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (!res.ok) {
      setLoading(false)
      const data = await res.json()
      setError(data.error ?? '로그인 실패')
      return
    }
    // hard navigation so the new session cookie is included in middleware check
    window.location.href = '/admin'
  }

  return (
    <div className="max-w-sm mx-auto mt-20">
      <div className="glass rounded-3xl p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">관리자 로그인</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            required
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="glass-input px-3 py-2"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-liquid py-2.5"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}
