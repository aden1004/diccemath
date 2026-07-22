import { NextResponse } from 'next/server'
import { getAllEquipment, addEquipment, getEarliestReturnDueByEquipment } from '@/lib/sheets'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    const equipment = await getAllEquipment()
    const hasSoldOut = equipment.some(e => e.availableQty <= 0)
    const earliestDue = hasSoldOut ? await getEarliestReturnDueByEquipment() : {}
    const result = equipment.map(e =>
      e.availableQty <= 0 ? { ...e, nextAvailableDate: earliestDue[e.name] ?? null } : e
    )
    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '교구 목록을 불러오지 못했습니다.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  try {
    const { name, totalQty, photoUrl, description } = await req.json()
    const qty = Number(totalQty)
    if (!name?.trim() || totalQty == null || isNaN(qty) || qty < 0 || !Number.isInteger(qty)) {
      return NextResponse.json({ error: '교구명과 수량은 필수입니다.' }, { status: 400 })
    }
    await addEquipment(name, qty, photoUrl ?? '', description ?? '')
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '교구 추가에 실패했습니다.' }, { status: 500 })
  }
}
