'use client'
import { useSyncExternalStore } from 'react'
import { toKSTDate } from '@/lib/date-utils'

// ── 담은 교구(장바구니) — 브라우저 localStorage 저장, 로그인 불필요 ────────
// 저장 구조: { date: 'YYYY-MM-DD'(KST), items: { [교구명]: 수량 } }
// 유지 기간: 당일. 날짜가 바뀌면 자동 비움.

const STORAGE_KEY = 'diccemath-cart'
const CHANGE_EVENT = 'diccemath-cart-change'

export type CartItems = Record<string, number>
type CartData = { date: string; items: CartItems }

// localStorage 사용 불가 환경(시크릿 모드 등)용 메모리 대체
let memoryFallback: CartData | null = null
const EMPTY: CartItems = {}
let cachedRaw: string | null = null
let cachedItems: CartItems = EMPTY

function readData(): CartData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CartData
    if (!parsed || typeof parsed !== 'object' || !parsed.items) return null
    return parsed
  } catch {
    return memoryFallback
  }
}

function writeData(data: CartData | null): void {
  try {
    if (data) localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    memoryFallback = data
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

// 현재 담은 목록 (날짜가 지났으면 비운 뒤 빈 목록 반환)
export function getCart(): CartItems {
  if (typeof window === 'undefined') return EMPTY
  const data = readData()
  if (!data) return EMPTY
  if (data.date !== toKSTDate()) {
    writeData(null)
    return EMPTY
  }
  // useSyncExternalStore용: 내용이 같으면 동일 참조 반환
  const raw = JSON.stringify(data.items)
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedItems = data.items
  }
  return cachedItems
}

export function setCartQty(name: string, qty: number): void {
  const items = { ...getCart() }
  if (qty <= 0) delete items[name]
  else items[name] = Math.floor(qty)
  writeData(Object.keys(items).length ? { date: toKSTDate(), items } : null)
}

export function removeFromCart(name: string): void {
  setCartQty(name, 0)
}

export function clearCart(): void {
  writeData(null)
}

export function cartCount(items: CartItems): { kinds: number; total: number } {
  const values = Object.values(items)
  return { kinds: values.length, total: values.reduce((a, b) => a + b, 0) }
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback)
  window.addEventListener('storage', callback) // 다른 탭에서 변경 시
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

// 컴포넌트에서 담은 목록을 구독. SSR 시에는 빈 목록.
export function useCart(): CartItems {
  return useSyncExternalStore(subscribe, getCart, () => EMPTY)
}
