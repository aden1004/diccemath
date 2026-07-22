import Image from 'next/image'
import Link from 'next/link'
import type { Equipment } from '@/types'

export function EquipmentCard({ item }: { item: Equipment }) {
  const rentable = item.availableQty > 0

  const content = (
    <>
      {item.photoUrl && (
        <div className="relative w-full h-40 bg-white/80 rounded-2xl overflow-hidden">
          <Image src={item.photoUrl} alt={item.name} fill className="object-contain p-1" unoptimized />
        </div>
      )}
      <h2 className="font-bold text-lg">{item.name}</h2>
      <p className="text-sm text-gray-600 line-clamp-3">{item.description}</p>
      <div className="mt-auto flex items-center justify-between gap-2">
        {rentable ? (
          <>
            <span className="text-green-600 text-sm font-medium">대여 가능 {item.availableQty}개</span>
            <span className="text-blue-600 text-sm font-semibold">대여 신청 →</span>
          </>
        ) : (
          <span className="inline-block bg-gray-200 text-gray-500 text-xs px-2 py-1 rounded">대여불가</span>
        )}
      </div>
    </>
  )

  if (rentable) {
    return (
      <Link
        href={`/rental/new?equipment=${encodeURIComponent(item.name)}`}
        className="glass rounded-3xl p-4 flex flex-col gap-2 transition hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-blue-300/60"
      >
        {content}
      </Link>
    )
  }

  return (
    <div className="glass rounded-3xl p-4 flex flex-col gap-2 opacity-80">
      {content}
    </div>
  )
}
