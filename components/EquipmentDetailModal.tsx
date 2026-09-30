'use client'
import { useEffect } from 'react'
import Image from 'next/image'
import type { Equipment } from '@/types'

type Props = {
  item: Equipment
  cartQty: number
  onChangeQty?: (qty: number) => void // 미지정 시 담기 UI 숨김(신청 화면 설명 보기용)
  onClose: () => void
}

// 교구 상세 보기 팝업: 사진 확대 · 전체 설명 · 가용 수량 · 택배 가능 여부 · 담기
export function EquipmentDetailModal({ item, cartQty, onChangeQty, onClose }: Props) {
  const rentable = item.availableQty > 0

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${item.name} 상세`}
    >
      <div
        className="glass w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-xl font-bold">{item.name}</h2>
          <button onClick={onClose} className="btn-glass px-3 py-1 text-sm" aria-label="닫기">✕</button>
        </div>

        {item.photoUrl && (
          <div className="relative w-full h-64 bg-white/80 rounded-2xl overflow-hidden mb-4">
            <Image src={item.photoUrl} alt={item.name} fill className="object-contain p-2" unoptimized />
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-3 text-xs">
          {rentable ? (
            <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">대여 가능 {item.availableQty}개</span>
          ) : (
            <span className="px-2 py-1 rounded-full bg-gray-200 text-gray-600 font-medium">
              전량 대여중{item.nextAvailableDate ? ` · ${item.nextAvailableDate} 이후 가능 예정` : ''}
            </span>
          )}
          {item.noDelivery
            ? <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-medium">택배 불가 · 직접 수령만</span>
            : <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">택배 가능</span>}
          <span className="px-2 py-1 rounded-full bg-white/70 text-gray-600">총 보유 {item.totalQty}개</span>
        </div>

        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed mb-4">
          {item.description || '등록된 설명이 없습니다.'}
        </p>

        {onChangeQty && (
          <div className="glass-inner p-3 flex items-center justify-between gap-3">
            {rentable ? (
              cartQty > 0 ? (
                <>
                  <span className="text-sm font-medium">담은 수량</span>
                  <QtyStepper qty={cartQty} max={item.availableQty} onChange={onChangeQty} />
                </>
              ) : (
                <>
                  <span className="text-sm text-gray-600">신청할 목록에 담아 두면 신청 화면에서 자동 선택됩니다.</span>
                  <button onClick={() => onChangeQty(1)} className="btn-liquid px-4 py-2 text-sm whitespace-nowrap">담기</button>
                </>
              )
            ) : (
              <span className="text-sm text-gray-500">현재 대여 가능한 수량이 없어 담을 수 없습니다.</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function QtyStepper({ qty, max, onChange }: { qty: number; max: number; onChange: (q: number) => void }) {
  return (
    <div className="inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => onChange(qty - 1)}
        className="btn-glass w-8 h-8 text-base leading-none"
        aria-label="수량 줄이기"
      >−</button>
      <span className="w-8 text-center text-sm font-semibold">{qty}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(qty + 1, max))}
        disabled={qty >= max}
        className="btn-glass w-8 h-8 text-base leading-none disabled:opacity-40"
        aria-label="수량 늘리기"
      >+</button>
    </div>
  )
}
