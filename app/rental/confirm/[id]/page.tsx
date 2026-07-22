import { getRentalById, getRentalItems } from '@/lib/sheets'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function ConfirmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rental = await getRentalById(id)
  if (!rental) notFound()
  const items = await getRentalItems(id)

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-green-700 mb-2">신청 완료!</h1>
        <p className="text-gray-600 mb-4">아래 대여 ID를 저장해두세요. 조회/반납/연장 시 필요합니다.</p>
        <div className="bg-white rounded border p-4 mb-4 flex flex-col gap-2">
          <div className="flex justify-between">
            <span className="text-gray-500">대여 ID</span>
            <span className="font-bold text-blue-700">{rental.rentalId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">학교명</span>
            <span>{rental.schoolName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">수령 방법</span>
            <span>{rental.pickupMethod === 'direct' ? '직접 수령' : '택배'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">수령 가능일</span>
            <span>{rental.availableFrom}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">반납 예정일</span>
            <span>{rental.returnDue}</span>
          </div>
          <hr />
          <div>
            <p className="text-gray-500 mb-1">신청 교구</p>
            <ul className="list-disc list-inside text-sm">
              {items.length > 0
                ? items.map(item => (
                    <li key={item.equipmentName}>{item.equipmentName} {item.quantity}개</li>
                  ))
                : <li className="text-gray-400">교구 정보 없음</li>
              }
            </ul>
          </div>
        </div>
        <Link href="/" className="text-blue-600 hover:underline text-sm">← 교구 목록으로</Link>
      </div>
    </div>
  )
}
