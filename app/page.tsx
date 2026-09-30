import { getAllEquipment, getEarliestReturnDueByEquipment } from '@/lib/sheets'
import { EquipmentGrid } from '@/components/EquipmentGrid'

export const revalidate = 60

export default async function HomePage() {
  const equipment = (await getAllEquipment()).sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  // 전량 대여중인 교구는 가장 빠른 반납 예정일을 함께 표시
  const hasSoldOut = equipment.some(e => e.availableQty <= 0)
  const earliestDue = hasSoldOut ? await getEarliestReturnDueByEquipment() : {}
  const withDue = equipment.map(e =>
    e.availableQty <= 0 ? { ...e, nextAvailableDate: earliestDue[e.name] ?? null } : e
  )

  return <EquipmentGrid equipment={withDue} />
}
