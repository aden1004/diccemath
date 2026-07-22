import Image from 'next/image'
import type { Equipment } from '@/types'

export function EquipmentCard({ item }: { item: Equipment }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-2">
      {item.photoUrl && (
        <div className="relative w-full h-40">
          <Image src={item.photoUrl} alt={item.name} fill className="object-contain rounded" unoptimized />
        </div>
      )}
      <h2 className="font-bold text-lg">{item.name}</h2>
      <p className="text-sm text-gray-600 line-clamp-3">{item.description}</p>
      <div className="mt-auto">
        {item.availableQty > 0 ? (
          <span className="text-green-600 text-sm font-medium">대여 가능 {item.availableQty}개</span>
        ) : (
          <span className="inline-block bg-gray-200 text-gray-500 text-xs px-2 py-1 rounded">대여불가</span>
        )}
      </div>
    </div>
  )
}
