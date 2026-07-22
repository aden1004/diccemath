'use client'
import { Suspense, useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Equipment, PickupMethod, CreateRentalRequest } from '@/types'
import { addDays, getMinAvailableFrom, getDefaultReturnDue, isWeekend } from '@/lib/date-utils'
import { SCHOOLS, SCHOOL_LEVELS, type SchoolLevel } from '@/lib/schools'

export default function RentalNewPage() {
  return (
    <Suspense fallback={null}>
      <RentalNewForm />
    </Suspense>
  )
}

function RentalNewForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // 홈 화면 교구 카드를 눌러 넘어온 경우: 해당 교구 1개 선택 (수령 방법 기본값은 직접 수령)
  const preselectName = searchParams.get('equipment')

  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [selected, setSelected] = useState<Record<string, number>>({})
  const [query, setQuery] = useState('')
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel | ''>('')
  const [schoolName, setSchoolName] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [pickupMethod, setPickupMethod] = useState<PickupMethod>('direct')
  const [availableFrom, setAvailableFrom] = useState('')
  const [returnDue, setReturnDue] = useState('')
  const [availableFromWarning, setAvailableFromWarning] = useState('')
  const [returnDueWarning, setReturnDueWarning] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const minAvailableFrom = useMemo(
    () => getMinAvailableFrom(new Date().toISOString().split('T')[0], pickupMethod),
    [pickupMethod]
  )

  useEffect(() => {
    fetch('/api/inventory')
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json() })
      .then((list: Equipment[]) => {
        setEquipment(list)
        if (preselectName) {
          const eq = list.find(e => e.name === preselectName)
          if (eq && eq.availableQty > 0) setSelected({ [eq.name]: 1 })
        }
      })
      .catch(() => setError('교구 목록을 불러오지 못했습니다.'))
  }, [preselectName])

  useEffect(() => {
    if (availableFrom >= minAvailableFrom) {
      setReturnDue(getDefaultReturnDue(availableFrom))
    } else {
      setAvailableFrom(minAvailableFrom)
      setReturnDue(getDefaultReturnDue(minAvailableFrom))
    }
  }, [availableFrom, minAvailableFrom])

  // 택배로 바꿀 때 택배불가 교구가 선택되어 있으면 알림을 띄우고 직접 수령을 유지
  function handleMethodChange(method: PickupMethod) {
    if (method === 'delivery') {
      const blocked = new Set(equipment.filter(e => e.noDelivery).map(e => e.name))
      const blockedSelected = Object.keys(selected).filter(name => blocked.has(name))
      if (blockedSelected.length > 0) {
        alert(
          `아래 교구는 택배 수령이 불가하여 직접 수령으로만 신청할 수 있습니다.\n\n- ${blockedSelected.join('\n- ')}\n\n택배를 원하시면 해당 교구의 선택을 해제해주세요.`
        )
        return
      }
    }
    setPickupMethod(method)
  }

  function handleAvailableFromChange(value: string) {
    if (value && isWeekend(value)) {
      setAvailableFromWarning('토요일·일요일은 수령일로 선택할 수 없습니다.')
      return
    }
    setAvailableFromWarning('')
    setAvailableFrom(value)
  }

  function handleReturnDueChange(value: string) {
    if (value && isWeekend(value)) {
      setReturnDueWarning('토요일·일요일은 반납일로 선택할 수 없습니다.')
      return
    }
    setReturnDueWarning('')
    setReturnDue(value)
  }

  // 가나다 정렬 + 검색 필터 (한 글자만 입력해도 포함 검색)
  const visibleEquipment = useMemo(() => {
    const q = query.trim().toLowerCase()
    return equipment
      .filter(item => !q || item.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }, [equipment, query])

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
        {/* Teacher info */}
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">신청자 정보</h2>
          <div className="grid grid-cols-1 sm:grid-cols-[9rem_1fr] gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">학교급</label>
              <select
                required
                value={schoolLevel}
                onChange={e => {
                  setSchoolLevel(e.target.value as SchoolLevel | '')
                  setSchoolName('')
                }}
                className="border rounded px-3 py-2 bg-white"
              >
                <option value="">선택</option>
                {SCHOOL_LEVELS.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">학교명</label>
              <select
                required
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                disabled={!schoolLevel}
                className="border rounded px-3 py-2 bg-white disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">{schoolLevel ? '학교를 선택하세요' : '학교급을 먼저 선택하세요'}</option>
                {schoolLevel && SCHOOLS[schoolLevel].map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.3fr_1.8fr] gap-3">
            {[
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
          </div>
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
                  onChange={() => handleMethodChange(method)}
                />
                {method === 'direct' ? '직접 수령' : '택배'}
              </label>
            ))}
          </div>
          {pickupMethod === 'delivery' && (
            <p className="text-xs text-gray-500 mt-1">택배 불가 교구는 직접 수령 시에만 선택할 수 있습니다.</p>
          )}
        </section>

        {/* Equipment selection */}
        <section>
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <h2 className="font-semibold">교구 선택</h2>
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="교구 이름 검색"
              className="border rounded px-3 py-1.5 text-sm w-52"
            />
          </div>
          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto border rounded p-3">
            {visibleEquipment.length === 0 && (
              <p className="text-sm text-gray-500">검색 결과가 없습니다.</p>
            )}
            {visibleEquipment.map(item => {
              const soldOut = item.availableQty === 0
              const deliveryBlocked = pickupMethod === 'delivery' && item.noDelivery
              const disabled = soldOut || deliveryBlocked
              return (
                <div key={item.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`eq-${item.id}`}
                    checked={item.name in selected}
                    disabled={disabled}
                    onChange={e => {
                      if (e.target.checked) handleQtyChange(item.name, 1, item.availableQty)
                      else handleQtyChange(item.name, 0, item.availableQty)
                    }}
                  />
                  <label
                    htmlFor={`eq-${item.id}`}
                    className={`flex-1 text-sm ${disabled ? 'text-gray-400' : ''}`}
                  >
                    {item.name}
                    {item.noDelivery && <span className="ml-2 text-orange-500 text-xs">택배 불가</span>}
                    {soldOut && <span className="ml-2 text-gray-400">(대여불가)</span>}
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
                  {soldOut && item.nextAvailableDate && (
                    <span className="text-xs text-amber-600 whitespace-nowrap">
                      {item.nextAvailableDate} 이후 대여 가능 예정
                    </span>
                  )}
                  <span className="text-xs text-gray-500 whitespace-nowrap">가용 {item.availableQty}</span>
                </div>
              )
            })}
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
              onChange={e => handleAvailableFromChange(e.target.value)}
              className="border rounded px-3 py-2"
            />
            {availableFromWarning && <p className="text-red-600 text-xs">{availableFromWarning}</p>}
            <p className="text-xs text-gray-500">
              직접 수령은 신청일 +2일, 택배는 배송 기간을 고려해 +5일부터 가능하며, 사이에 주말이 끼면 2일이 추가됩니다. 토·일은 선택할 수 없습니다.
            </p>
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
              onChange={e => handleReturnDueChange(e.target.value)}
              className="border rounded px-3 py-2"
            />
            {returnDueWarning && <p className="text-red-600 text-xs">{returnDueWarning}</p>}
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
