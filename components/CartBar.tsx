'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { Equipment } from '@/types'
import { QtyStepper } from '@/components/EquipmentDetailModal'
import { useCart, setCartQty, removeFromCart, clearCart, cartCount } from '@/lib/cart'

// 화면 하단 고정 바: 담은 교구 요약 · 목록 펼치기(수량 조정·삭제·비우기) · 대여 신청 이동
export function CartBar({ equipment }: { equipment: Equipment[] }) {
  const cart = useCart()
  const [open, setOpen] = useState(false)
  const { kinds, total } = cartCount(cart)
  if (kinds === 0) return null

  const byName = new Map(equipment.map(e => [e.name, e]))
  const names = Object.keys(cart).sort((a, b) => a.localeCompare(b, 'ko'))

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 px-3 pb-3 pointer-events-none">
      <div className="max-w-5xl mx-auto pointer-events-auto">
        {open && (
          <div className="glass rounded-3xl p-4 mb-2 max-h-[45vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">담은 교구</h3>
              <button
                type="button"
                onClick={() => { if (window.confirm('담은 교구를 모두 비우시겠습니까?')) clearCart() }}
                className="text-xs text-red-600 hover:underline"
              >
                전체 비우기
              </button>
            </div>
            <ul className="flex flex-col gap-2">
              {names.map(name => {
                const eq = byName.get(name)
                const max = eq?.availableQty ?? cart[name]
                return (
                  <li key={name} className="glass-inner px-3 py-2 flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{name}</p>
                      {eq?.noDelivery && <p className="text-xs text-orange-600">택배 불가 · 직접 수령만</p>}
                      {!eq && <p className="text-xs text-gray-500">목록에서 확인되지 않는 교구</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <QtyStepper qty={cart[name]} max={max} onChange={q => setCartQty(name, Math.min(q, max))} />
                      <button
                        type="button"
                        onClick={() => removeFromCart(name)}
                        className="text-xs text-gray-500 hover:text-red-600"
                        aria-label={`${name} 삭제`}
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
        <div className="glass rounded-full pl-3 sm:pl-5 pr-2 py-2 flex items-center justify-between gap-2 sm:gap-3 shadow-xl">
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="text-xs sm:text-sm font-medium flex items-center gap-2 whitespace-nowrap min-w-0"
            aria-expanded={open}
          >
            <span className="bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full inline-flex items-center justify-center shrink-0">
              {kinds}
            </span>
            <span className="truncate">담은 교구 {kinds}종 {total}개</span>
            <span className="text-xs text-gray-500 shrink-0">{open ? '접기 ▾' : '목록 ▴'}</span>
          </button>
          <Link href="/rental/new?from=cart" className="btn-liquid px-4 sm:px-5 py-2 text-xs sm:text-sm whitespace-nowrap shrink-0">
            <span className="hidden sm:inline">담은 교구로 </span>대여 신청 →
          </Link>
        </div>
      </div>
    </div>
  )
}
