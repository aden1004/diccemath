'use client'
import { useState, useEffect } from 'react'
import type { RentalDetail } from '@/types'

export default function AdminDashboard() {
  const [rentals, setRentals] = useState<RentalDetail[]>([])
  const [statsFrom, setStatsFrom] = useState('')
  const [statsTo, setStatsTo] = useState('')
  const [stats, setStats] = useState<{ total: number; byEquipment: { name: string; count: number }[] } | null>(null)
  const [statsError, setStatsError] = useState('')
  const [actionMsg, setActionMsg] = useState<Record<string, { message: string; ok: boolean }>>({})

  useEffect(() => {
    fetch('/api/admin/rentals').then(r => {
      if (r.status === 401) { window.location.href = '/admin/login'; return null }
      return r.json()
    }).then(data => { if (data) setRentals(data) })
  }, [])

  async function handleReturn(rentalId: string) {
    if (!window.confirm('반납 처리하시겠습니까?')) return
    const res = await fetch(`/api/admin/rentals/${rentalId}/return`, { method: 'POST' })
    const data = await res.json()
    setActionMsg(prev => ({ ...prev, [rentalId]: { message: res.ok ? '반납 처리 완료' : data.error, ok: res.ok } }))
    if (res.ok) setRentals(prev => prev.filter(r => r.rentalId !== rentalId))
  }

  async function handleStats(e: React.FormEvent) {
    e.preventDefault()
    setStatsError('')
    setStats(null)
    const res = await fetch(`/api/admin/stats?from=${statsFrom}&to=${statsTo}`)
    if (!res.ok) {
      setStatsError((await res.json()).error ?? '통계 조회 실패')
      return
    }
    setStats(await res.json())
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">대시보드</h1>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">현재 대여 중 ({rentals.length}건)</h2>
        {rentals.length === 0 && <p className="text-gray-500">대여 중인 교구가 없습니다.</p>}
        <div className="flex flex-col gap-3">
          {rentals.map(rental => (
            <div key={rental.rentalId} className="bg-white rounded shadow p-4 flex justify-between items-start">
              <div>
                <p className="font-bold">
                  {rental.rentalId} · {rental.schoolName}
                  <span
                    className={`ml-2 align-middle text-xs px-2 py-0.5 rounded font-medium ${
                      rental.pickupMethod === 'delivery'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {rental.pickupMethod === 'delivery' ? '택배' : '직접 수령'}
                  </span>
                </p>
                <p className="text-sm text-gray-500">
                  {rental.teacherName} · 📞 {rental.phone} · ✉️ {rental.email}
                </p>
                <p className="text-sm">수령일: {rental.availableFrom} / 반납예정: {rental.returnDue}</p>
                <p className="text-sm text-gray-600">{rental.items.map(i => `${i.equipmentName} ${i.quantity}개`).join(', ')}</p>
                {actionMsg[rental.rentalId] && (
                  <p className={`text-sm mt-1 ${actionMsg[rental.rentalId].ok ? 'text-green-600' : 'text-red-600'}`}>
                    {actionMsg[rental.rentalId].message}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleReturn(rental.rentalId)}
                className="bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded text-sm whitespace-nowrap ml-4"
              >
                반납 처리
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">대여 통계</h2>
        <form onSubmit={handleStats} className="flex gap-2 mb-4">
          <input type="date" required value={statsFrom} onChange={e => setStatsFrom(e.target.value)} className="border rounded px-2 py-1" />
          <span className="self-center">~</span>
          <input type="date" required value={statsTo} onChange={e => setStatsTo(e.target.value)} className="border rounded px-2 py-1" />
          <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm">조회</button>
        </form>
        {statsError && <p className="text-red-600 text-sm mb-2">{statsError}</p>}
        {stats && (
          <div className="bg-white rounded shadow p-4">
            <p className="font-semibold mb-2">총 {stats.total}건</p>
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b"><th className="py-1">교구명</th><th>대여횟수</th></tr></thead>
              <tbody>
                {stats.byEquipment.map(s => (
                  <tr key={s.name} className="border-b"><td className="py-1">{s.name}</td><td>{s.count}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
