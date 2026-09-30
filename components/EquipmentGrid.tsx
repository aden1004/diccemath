'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Equipment } from '@/types'
import { EquipmentCard } from '@/components/EquipmentCard'
import { EquipmentDetailModal } from '@/components/EquipmentDetailModal'
import { CartBar } from '@/components/CartBar'
import { PwaInstall } from '@/components/PwaInstall'
import { useCart, setCartQty } from '@/lib/cart'

// 홈 화면: 교구 목록 + 검색/필터 + 상세 팝업 + 담기(장바구니)
export function EquipmentGrid({ equipment }: { equipment: Equipment[] }) {
  const cart = useCart()
  const [query, setQuery] = useState('')
  const [onlyCart, setOnlyCart] = useState(false)
  const [openName, setOpenName] = useState<string | null>(null)

  const byName = useMemo(() => new Map(equipment.map(e => [e.name, e])), [equipment])
  const openItem = openName ? byName.get(openName) ?? null : null

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return equipment.filter(e =>
      (!q || e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)) &&
      (!onlyCart || e.name in cart)
    )
  }, [equipment, query, onlyCart, cart])

  function changeQty(item: Equipment, qty: number) {
    setCartQty(item.name, Math.min(Math.max(0, qty), item.availableQty))
  }

  return (
    <div className="pb-24">
      <div className="flex justify-between items-center mb-6 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">수학교구 목록</h1>
        <div className="flex gap-2">
          <Link href="/rental/lookup" className="btn-glass px-5 py-2">
            대여 조회·반납·연장
          </Link>
          <Link href="/rental/new" className="btn-liquid px-5 py-2">
            대여 신청하기
          </Link>
        </div>
      </div>

      <PwaInstall />

      <div className="glass rounded-2xl p-3 mb-5 flex items-center gap-3 flex-wrap">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="교구 이름·설명 검색"
          className="glass-input px-3 py-2 text-sm flex-1 min-w-48"
        />
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={onlyCart} onChange={e => setOnlyCart(e.target.checked)} />
          담은 것만 보기
        </label>
        <p className="text-xs text-gray-500 basis-full">
          카드를 누르면 사진·설명을 크게 볼 수 있고, [담기]로 여러 교구를 모아 한 번에 신청할 수 있습니다.
        </p>
      </div>

      {visible.length === 0 && (
        <p className="text-gray-500 text-sm">
          {onlyCart ? '담은 교구가 없습니다.' : '검색 결과가 없습니다.'}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {visible.map(item => (
          <EquipmentCard
            key={item.id}
            item={item}
            cartQty={cart[item.name] ?? 0}
            onOpen={() => setOpenName(item.name)}
            onChangeQty={qty => changeQty(item, qty)}
          />
        ))}
      </div>

      {openItem && (
        <EquipmentDetailModal
          item={openItem}
          cartQty={cart[openItem.name] ?? 0}
          onChangeQty={qty => changeQty(openItem, qty)}
          onClose={() => setOpenName(null)}
        />
      )}

      <CartBar equipment={equipment} />
    </div>
  )
}
