import type { MetadataRoute } from 'next'

// PWA 매니페스트: 홈 화면 설치(앱 모드 실행) 지원
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '대구수학체험센터 교구 대여',
    short_name: '교구대여',
    description: '대구수학체험센터 수학교구 대여 신청·조회',
    start_url: '/?source=pwa',
    display: 'standalone',
    background_color: '#e9eef9',
    theme_color: '#3b82f6',
    lang: 'ko',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
