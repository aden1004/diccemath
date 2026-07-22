import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: '대구수학체험센터 교구 대여',
  description: '수학교구를 대여해 드립니다.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <header className="glass-header sticky top-0 z-50 text-white py-4 px-6">
          <Link href="/" className="text-xl font-bold drop-shadow-sm">대구수학체험센터 교구 대여</Link>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
