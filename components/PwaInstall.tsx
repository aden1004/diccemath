'use client'
import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const DISMISS_KEY = 'diccemath-pwa-dismissed'

// 서비스워커 등록 + 안드로이드 크롬 설치 배너 / iOS 안내
export function PwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIos, setShowIos] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})

    let dismissed = false
    try { dismissed = localStorage.getItem(DISMISS_KEY) === '1' } catch {}
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (dismissed || standalone) return

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    const ua = navigator.userAgent
    const isIos = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua)
    // iOS는 설치 이벤트가 없으므로 안내만 표시 (렌더 직후 비동기로 상태 갱신)
    const timer = isIos ? window.setTimeout(() => { setShowIos(true); setVisible(true) }, 0) : 0

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      if (timer) window.clearTimeout(timer)
    }
  }, [])

  function dismiss() {
    setVisible(false)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch {}
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') setVisible(false)
    setDeferred(null)
  }

  if (!visible) return null

  return (
    <div className="glass rounded-2xl px-4 py-3 mb-5 flex items-center gap-3 text-sm">
      <span className="text-xl">📲</span>
      <div className="flex-1 min-w-0">
        {showIos ? (
          <p>iPhone: Safari 하단 <b>공유</b> 버튼 → <b>홈 화면에 추가</b>를 누르면 앱처럼 사용할 수 있습니다.</p>
        ) : (
          <p>홈 화면에 앱으로 설치하면 주소 입력 없이 바로 열 수 있습니다.</p>
        )}
      </div>
      {!showIos && deferred && (
        <button type="button" onClick={install} className="btn-liquid px-4 py-1.5 text-sm whitespace-nowrap">앱 설치</button>
      )}
      <button type="button" onClick={dismiss} className="text-gray-500 text-xs whitespace-nowrap" aria-label="닫기">닫기</button>
    </div>
  )
}
