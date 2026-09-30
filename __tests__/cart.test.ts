/**
 * lib/cart 단위테스트 — node 환경에서 window/localStorage를 간단히 대체
 */
const store: Record<string, string> = {}
const listeners: Record<string, Array<() => void>> = {}
;(globalThis as unknown as { window: unknown }).window = {
  addEventListener: (t: string, cb: () => void) => { (listeners[t] ??= []).push(cb) },
  removeEventListener: (t: string, cb: () => void) => { listeners[t] = (listeners[t] ?? []).filter(f => f !== cb) },
  dispatchEvent: (e: { type: string }) => { (listeners[e.type] ?? []).forEach(f => f()); return true },
}
;(globalThis as unknown as { Event: unknown }).Event = class { type: string; constructor(t: string) { this.type = t } }
;(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
}

import { getCart, setCartQty, removeFromCart, clearCart, cartCount } from '@/lib/cart'
import { toKSTDate } from '@/lib/date-utils'

beforeEach(() => { clearCart() })

describe('cart', () => {
  it('담기·수량 변경·삭제', () => {
    setCartQty('지오보드', 2)
    setCartQty('칠교판', 1)
    expect(getCart()).toEqual({ 지오보드: 2, 칠교판: 1 })
    setCartQty('지오보드', 0)
    expect(getCart()).toEqual({ 칠교판: 1 })
    removeFromCart('칠교판')
    expect(getCart()).toEqual({})
  })

  it('종류·총수량 집계', () => {
    setCartQty('A', 3)
    setCartQty('B', 2)
    expect(cartCount(getCart())).toEqual({ kinds: 2, total: 5 })
  })

  it('저장 날짜가 오늘(KST)이 아니면 자동 비움', () => {
    store['diccemath-cart'] = JSON.stringify({ date: '2000-01-01', items: { A: 1 } })
    expect(getCart()).toEqual({})
    expect(store['diccemath-cart']).toBeUndefined()
  })

  it('저장 시 오늘(KST) 날짜 기록', () => {
    setCartQty('A', 1)
    expect(JSON.parse(store['diccemath-cart']).date).toBe(toKSTDate())
  })
})
