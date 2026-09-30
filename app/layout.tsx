import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: '대구수학체험센터 교구 대여',
  description: '수학교구를 대여해 드립니다.',
  applicationName: '교구대여',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '교구대여' },
  icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
}

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <header className="glass-header sticky top-0 z-50 text-white py-3 px-6">
          <Link href="/" className="flex items-center gap-4 flex-wrap">
            <span className="bg-white rounded-xl px-3 py-1.5 shadow-sm inline-flex items-center">
              <Image
                src="/logo.png"
                alt="대구창의융합교육원"
                width={690}
                height={120}
                className="h-8 w-auto"
                priority
                unoptimized
              />
            </span>
            <span className="text-xl font-bold drop-shadow-sm">대구수학체험센터 교구 대여</span>
          </Link>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
        <footer className="text-center text-sm text-gray-500 py-8">
          made by Aden
        </footer>
        <Analytics />
      </body>
    </html>
  )
}
