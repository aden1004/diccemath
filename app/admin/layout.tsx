import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav className="glass rounded-2xl px-6 py-3 flex gap-6 text-sm mb-6 items-center">
        <Link href="/admin" className="font-medium text-gray-700 hover:text-blue-600 transition-colors">대시보드</Link>
        <Link href="/admin/inventory" className="font-medium text-gray-700 hover:text-blue-600 transition-colors">교구 관리</Link>
        <Link href="/admin/settings" className="font-medium text-gray-700 hover:text-blue-600 transition-colors">설정</Link>
        <form action="/api/auth/logout" method="POST" className="ml-auto">
          <button type="submit" className="font-medium text-gray-500 hover:text-red-500 transition-colors">로그아웃</button>
        </form>
      </nav>
      {children}
    </div>
  )
}
