import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav className="bg-gray-800 text-white px-6 py-3 flex gap-6 text-sm mb-6">
        <Link href="/admin" className="hover:text-blue-300">대시보드</Link>
        <Link href="/admin/inventory" className="hover:text-blue-300">교구 관리</Link>
        <Link href="/admin/settings" className="hover:text-blue-300">설정</Link>
        <form action="/api/auth/logout" method="POST" className="ml-auto">
          <button type="submit" className="hover:text-red-300">로그아웃</button>
        </form>
      </nav>
      {children}
    </div>
  )
}
