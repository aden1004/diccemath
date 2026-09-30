'use client'
import Image from 'next/image'
import type { Equipment } from '@/types'
import { QtyStepper } from '@/components/EquipmentDetailModal'

type Props = {
  item: Equipment
  cartQty: number
  onOpen: () => void            // 카드 클릭 → 상세 팝업
  onChangeQty: (qty: number) => void
}

export function EquipmentCard({ item, cartQty, onOpen, onChangeQty }: Props) {
  const rentable = item.availableQty > 0
  const inCart = cartQty > 0

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      className={`glass rounded-3xl p-4 flex flex-col gap-2 transition cursor-pointer hover:-translate-y-1 hover:shadow-xl
        ${inCart ? 'ring-2 ring-blue-500/70' : 'hover:ring-2 hover:ring-blue-300/60'}
        ${rentable ? '' : 'opacity-80'}`}
    >
      {item.photoUrl && (
        <div className="relative w-full h-40 bg-white/80 rounded-2xl overflow-hidden">
          <Image src={item.photoUrl} alt={item.name} fill className="object-contain p-1" unoptimized />
          {inCart && (
            <span className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow">
              담김 {cartQty}개
            </span>
          )}
        </div>
      )}
      <h2 className="font-bold text-lg">{item.name}</h2>
      <p className="text-sm text-gray-600 line-clamp-3">{item.description}</p>
      <div className="mt-auto flex items-center justify-between gap-2">
        {rentable ? (
          <>
            <span className="text-green-600 text-sm font-medium whitespace-nowrap">대여 가능 {item.availableQty}개</span>
            {inCart ? (
              <QtyStepper qty={cartQty} max={item.availableQty} onChange={onChangeQty} />
            ) : (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onChangeQty(1) }}
                className="btn-liquid px-4 py-1.5 text-sm"
              >
                담기
              </button>
            )}
          </>
        ) : (
          <span className="inline-block bg-gray-200 text-gray-500 text-xs px-2 py-1 rounded">
            대여불가{item.nextAvailableDate ? ` · ${item.nextAvailableDate} 이후` : ''}
          </span>
        )}
      </div>
    </div>
  )
}
