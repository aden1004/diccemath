'use client'
import { useState } from 'react'
import type { RentalDetail } from '@/types'

export default function LookupPage() {
  const [query, setQuery] = useState('')
  const [queryType, setQueryType] = useState<'rentalId' | 'phone'>('rentalId')
  const [results, setResults] = useState<RentalDetail[] | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionResult, setActionResult] = useState<Record<string, { message: string; ok: boolean }>>({})
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set())

  async function fetchResults() {
    setError('')
    setResults(null)
    setLoading(true)
    try {
      const params = new URLSearchParams({ [queryType]: query })
      const res = await fetch(`/api/rental/lookup?${params}`)
      if (!res.ok) {
        setError((await res.json()).error ?? '오류가 발생했습니다.')
        return
      }
      setResults(await res.json())
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    await fetchResults()
  }

  async function handleReturn(rentalId: string) {
    if (pendingActions.has(rentalId)) return
    setPendingActions(prev => new Set(prev).add(rentalId))
    try {
      const res = await fetch(`/api/rental/${rentalId}/return`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        await fetchResults()
      } else {
        setActionResult(prev => ({ ...prev, [rentalId]: { message: data.error, ok: false } }))
      }
    } finally {
      setPendingActions(prev => { const next = new Set(prev); next.delete(rentalId); return next })
    }
  }

  async function handleExtend(rentalId: string) {
    if (pendingActions.has(rentalId)) return
    setPendingActions(prev => new Set(prev).add(rentalId))
    try {
      const res = await fetch(`/api/rental/${rentalId}/extend`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        await fetchResults()
      } else {
        setActionResult(prev => ({ ...prev, [rentalId]: { message: data.error, ok: false } }))
      }
    } finally {
      setPendingActions(prev => { const next = new Set(prev); next.delete(rentalId); return next })
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">대여 조회</h1>
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <select
          value={queryType}
          onChange={e => setQueryType(e.target.value as 'rentalId' | 'phone')}
          className="border rounded px-3 py-2"
        >
          <option value="rentalId">대여 ID</option>
          <option value="phone">전화번호</option>
        </select>
        <input
          required
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={queryType === 'rentalId' ? 'R20260423-001' : '010-0000-0000'}
          className="border rounded px-3 py-2 flex-1"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          {loading ? '조회 중...' : '조회'}
        </button>
      </form>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {results?.map(rental => (
        <div key={rental.rentalId} className="bg-white rounded-lg shadow p-5 mb-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="font-bold text-lg">{rental.rentalId}</p>
              <p className="text-gray-500 text-sm">{rental.schoolName} · {rental.teacherName}</p>
            </div>
            <span className={`text-sm px-2 py-1 rounded ${
              rental.status === 'returned'
                ? 'bg-gray-100 text-gray-500'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {rental.status === 'returned' ? '반납완료' : rental.status === 'extended' ? '연장중' : '대여중'}
            </span>
          </div>
          <div className="text-sm flex flex-col gap-1 mb-4">
            <p>수령: {rental.pickupMethod === 'direct' ? '직접 수령' : '택배'} · {rental.availableFrom}</p>
            <p>반납 예정: {rental.returnDue}</p>
            <p>교구: {rental.items.map(i => `${i.equipmentName} ${i.quantity}개`).join(', ')}</p>
          </div>
          {rental.status !== 'returned' && (
            <div className="flex gap-2">
              <button
                onClick={() => handleReturn(rental.rentalId)}
                disabled={pendingActions.has(rental.rentalId)}
                className="bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded text-sm disabled:opacity-40"
              >
                반납 신청
              </button>
              <button
                onClick={() => handleExtend(rental.rentalId)}
                disabled={rental.extended || pendingActions.has(rental.rentalId)}
                className="bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded text-sm disabled:opacity-40"
              >
                {rental.extended ? '연장 불가 (1회 완료)' : '2주 연장'}
              </button>
            </div>
          )}
          {actionResult[rental.rentalId] && (
            <p className={`text-sm mt-2 ${actionResult[rental.rentalId].ok ? 'text-green-600' : 'text-red-600'}`}>
              {actionResult[rental.rentalId].message}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
