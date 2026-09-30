// 최소 서비스워커: 설치 요건 충족용. 캐시하지 않고 네트워크로 통과 (재고 정보 최신성 유지)
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
