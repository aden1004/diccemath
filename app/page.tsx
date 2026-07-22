import Link from 'next/link'
import { getAllEquipment } from '@/lib/sheets'
import { EquipmentCard } from '@/components/EquipmentCard'

export const revalidate = 60

export default async function HomePage() {
  const equipment = await getAllEquipment()

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">수학교구 목록</h1>
        <div className="flex gap-2">
          <Link
            href="/rental/lookup"
            className="bg-gray-100 text-gray-800 px-4 py-2 rounded hover:bg-gray-200 border"
          >
            대여 조회·반납·연장
          </Link>
          <Link
            href="/rental/new"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            대여 신청하기
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {equipment.map(item => (
          <EquipmentCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
