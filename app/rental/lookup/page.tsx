'use client'
import { useState } from 'react'
import type { RentalDetail, RentalStatus } from '@/types'

const STATUS_LABEL: Record<RentalStatus, string> = {
  active: '대여중',
  extended: '연장중',
  return_requested: '반납신청',
  returned: '반납완료',
}

export default function LookupPage() {
  const [query, setQuery] = useState('')
  const [queryType, setQueryType] = useState<'rentalId' | 'phone'>('rentalId')
  const [results, setResults] = useState<RentalDetail[] | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionResult, setActionResult] = useState<Record<string, { message: string; ok: boolean }>>({})
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set())
  // 대여 ID로 조회한 경우 반납·연장 시 본인 확인용 휴대폰 번호
  const [verifyPhone, setVerifyPhone] = useState('')

  // 반납·연장 요청에 사용할 휴대폰 번호: 전화번호 조회 시 조회값, ID 조회 시 별도 입력값
  const phoneForAction = queryType === 'phone' ? query : verifyPhone

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
    if (!phoneForAction.trim()) {
      setActionResult(prev => ({ ...prev, [rentalId]: { message: '본인 확인을 위해 휴대폰 번호를 입력해주세요.', ok: false } }))
      return
    }
    if (!window.confirm('반납 신청하시겠습니까?\n교구를 센터로 반납해 주시면 관리자 확인 후 반납 완료 처리됩니다.')) return
    setPendingActions(prev => new Set(prev).add(rentalId))
    try {
      const res = await fetch(`/api/rental/${rentalId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneForAction }),
      })
      const data = await res.json()
      if (res.ok) {
        await fetchResults()
        setActionResult(prev => ({ ...prev, [rentalId]: { message: '반납 신청이 접수되었습니다. 관리자 확인 후 반납 완료 처리됩니다.', ok: true } }))
      } else {
        setActionResult(prev => ({ ...prev, [rentalId]: { message: data.error, ok: false } }))
      }
    } finally {
      setPendingActions(prev => { const next = new Set(prev); next.delete(rentalId); return next })
    }
  }

  async function handleExtend(rentalId: string) {
    if (pendingActions.has(rentalId)) return
    if (!phoneForAction.trim()) {
      setActionResult(prev => ({ ...prev, [rentalId]: { message: '본인 확인을 위해 휴대폰 번호를 입력해주세요.', ok: false } }))
      return
    }
    setPendingActions(prev => new Set(prev).add(rentalId))
    try {
      const res = await fetch(`/api/rental/${rentalId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneForAction }),
      })
      const data = await res.json()
      if (res.ok) {
        await fetchResults()
        setActionResult(prev => ({ ...prev, [rentalId]: { message: `반납 예정일이 ${data.newReturnDue}로 연장되었습니다.`, ok: true } }))
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
      <form onSubmit={handleSearch} className="glass rounded-3xl p-4 flex gap-2 mb-6">
        <select
          value={queryType}
          onChange={e => setQueryType(e.target.value as 'rentalId' | 'phone')}
          className="glass-input px-3 py-2"
        >
          <option value="rentalId">대여 ID</option>
          <option value="phone">전화번호</option>
        </select>
        <input
          required
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={queryType === 'rentalId' ? 'R20260423-001' : '010-0000-0000'}
          className="glass-input px-3 py-2 flex-1 min-w-0"
        />
        <button type="submit" className="btn-liquid px-5 py-2 whitespace-nowrap">
          {loading ? '조회 중...' : '조회'}
        </button>
      </form>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {results && queryType === 'rentalId' && results.some(r => r.status !== 'returned') && (
        <div className="glass rounded-3xl p-4 mb-4 flex flex-col gap-1">
          <label className="text-sm font-medium">본인 확인 — 신청 시 입력한 휴대폰 번호</label>
          <input
            type="tel"
            value={verifyPhone}
            onChange={e => setVerifyPhone(e.target.value)}
            placeholder="010-0000-0000"
            className="glass-input px-3 py-2 w-full sm:w-64"
          />
          <p className="text-xs text-gray-500">반납 신청·연장 시 대여 신청자 본인 확인에 사용됩니다.</p>
        </div>
      )}

      {results?.map(rental => (
        <div key={rental.rentalId} className="glass rounded-3xl p-5 mb-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="font-bold text-lg">{rental.rentalId}</p>
              <p className="text-gray-500 text-sm">{rental.schoolName} · {rental.teacherName}</p>
            </div>
            <span className={`text-sm px-3 py-1 rounded-full ${
              rental.status === 'returned'
                ? 'bg-gray-200/70 text-gray-500'
                : rental.status === 'return_requested'
                  ? 'bg-amber-100/80 text-amber-700'
                  : 'bg-blue-100/80 text-blue-700'
            }`}>
              {STATUS_LABEL[rental.status]}
            </span>
          </div>
          <div className="text-sm flex flex-col gap-1 mb-4">
            <p>수령: {rental.pickupMethod === 'direct' ? '직접 수령' : '택배'} · {rental.availableFrom}</p>
            <p>반납 예정: {rental.returnDue}</p>
            <p>교구: {rental.items.map(i => `${i.equipmentName} ${i.quantity}개`).join(', ')}</p>
          </div>
          {rental.status === 'return_requested' && (
            <p className="text-sm text-amber-700 mb-2">반납 신청 접수됨 · 교구 반납 후 관리자 확인 시 반납 완료 처리됩니다.</p>
          )}
          {rental.status !== 'returned' && rental.status !== 'return_requested' && (
            <div className="flex gap-2">
              <button
                onClick={() => handleReturn(rental.rentalId)}
                disabled={pendingActions.has(rental.rentalId)}
                className="btn-glass px-4 py-1.5 text-sm"
              >
                반납 신청
              </button>
              <button
                onClick={() => handleExtend(rental.rentalId)}
                disabled={rental.extended || pendingActions.has(rental.rentalId)}
                className="btn-glass px-4 py-1.5 text-sm text-blue-700"
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
