'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Equipment, PickupMethod, CreateRentalRequest } from '@/types'
import { addDays, getMinAvailableFrom, getDefaultReturnDue } from '@/lib/date-utils'

export default function RentalNewPage() {
  const router = useRouter()
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [selected, setSelected] = useState<Record<string, number>>({})
  const [schoolName, setSchoolName] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [pickupMethod, setPickupMethod] = useState<PickupMethod>('direct')
  const [availableFrom, setAvailableFrom] = useState('')
  const [returnDue, setReturnDue] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const minAvailableFrom = useMemo(
    () => getMinAvailableFrom(new Date().toISOString().split('T')[0], pickupMethod),
    [pickupMethod]
  )

  useEffect(() => {
    fetch('/api/inventory')
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json() })
      .then(setEquipment)
      .catch(() => setError('교구 목록을 불러오지 못했습니다.'))
  }, [])

  useEffect(() => {
    if (availableFrom >= minAvailableFrom) {
      setReturnDue(getDefaultReturnDue(availableFrom))
    } else {
      setAvailableFrom(minAvailableFrom)
      setReturnDue(getDefaultReturnDue(minAvailableFrom))
    }
  }, [availableFrom, minAvailableFrom])

  function handleQtyChange(name: string, qty: number, max: number) {
    if (qty <= 0) {
      const next = { ...selected }
      delete next[name]
      setSelected(next)
    } else {
      setSelected(prev => ({ ...prev, [name]: Math.min(qty, max) }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const items = Object.entries(selected).map(([equipmentName, quantity]) => ({ equipmentName, quantity }))
    if (items.length === 0) {
      setError('교구를 1개 이상 선택해주세요.')
      return
    }

    const body: CreateRentalRequest = {
      schoolName, teacherName, phone, email,
      pickupMethod, availableFrom, returnDue, items,
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/rental', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? '오류가 발생했습니다.')
        return
      }
      const { rentalId } = await res.json()
      router.push(`/rental/confirm/${rentalId}`)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">교구 대여 신청</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Equipment selection */}
        <section>
          <h2 className="font-semibold mb-3">교구 선택</h2>
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto border rounded p-3">
            {equipment.map(item => (
              <div key={item.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`eq-${item.id}`}
                  checked={item.name in selected}
                  disabled={item.availableQty === 0}
                  onChange={e => {
                    if (e.target.checked) handleQtyChange(item.name, 1, item.availableQty)
                    else handleQtyChange(item.name, 0, item.availableQty)
                  }}
                />
                <label htmlFor={`eq-${item.id}`} className="flex-1 text-sm">
                  {item.name}
                  {item.availableQty === 0 && <span className="ml-2 text-gray-400">(대여불가)</span>}
                </label>
                {item.name in selected && (
                  <input
                    type="number"
                    min={1}
                    max={item.availableQty}
                    value={selected[item.name]}
                    onChange={e => {
                      const qty = parseInt(e.target.value, 10)
                      if (!isNaN(qty)) handleQtyChange(item.name, qty, item.availableQty)
                    }}
                    className="w-16 border rounded px-2 py-1 text-sm"
                  />
                )}
                <span className="text-xs text-gray-500">가용 {item.availableQty}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Teacher info */}
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">신청자 정보</h2>
          {[
            { label: '학교명', value: schoolName, onChange: setSchoolName },
            { label: '선생님 성함', value: teacherName, onChange: setTeacherName },
            { label: '핸드폰', value: phone, onChange: setPhone, type: 'tel' },
            { label: '이메일', value: email, onChange: setEmail, type: 'email' },
          ].map(({ label, value, onChange, type }) => (
            <div key={label} className="flex flex-col gap-1">
              <label className="text-sm font-medium">{label}</label>
              <input
                required
                type={type ?? 'text'}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="border rounded px-3 py-2"
              />
            </div>
          ))}
        </section>

        {/* Pickup method */}
        <section>
          <h2 className="font-semibold mb-2">수령 방법</h2>
          <div className="flex gap-4">
            {(['direct', 'delivery'] as PickupMethod[]).map(method => (
              <label key={method} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value={method}
                  checked={pickupMethod === method}
                  onChange={() => setPickupMethod(method)}
                />
                {method === 'direct' ? '직접 수령' : '택배'}
              </label>
            ))}
          </div>
        </section>

        {/* Dates */}
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">수령 가능일 (최소: {minAvailableFrom})</label>
            <input
              type="date"
              required
              min={minAvailableFrom}
              value={availableFrom}
              onChange={e => setAvailableFrom(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              반납 예정일 (기본: 수령일+14, 최대: {availableFrom ? addDays(availableFrom, 14) : '-'})
            </label>
            <input
              type="date"
              required
              min={availableFrom ? addDays(availableFrom, 1) : ''}
              max={availableFrom ? addDays(availableFrom, 14) : ''}
              value={returnDue}
              onChange={e => setReturnDue(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>
        </section>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? '신청 중...' : '대여 신청하기'}
        </button>
      </form>
    </div>
  )
}
