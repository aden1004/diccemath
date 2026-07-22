import { NextResponse } from 'next/server'
import {
  getAllEquipment,
  updateEquipmentQty,
  deleteEquipmentRow,
  getEquipmentRowIndex,
} from '@/lib/sheets'
import { requireAdmin } from '@/lib/auth'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  try {
    const { id: rawId } = await params
    const id = parseInt(rawId, 10)
    if (isNaN(id)) return NextResponse.json({ error: '잘못된 ID입니다.' }, { status: 400 })
    const { totalQty } = await req.json()
    const qty = Number(totalQty)
    if (totalQty == null || isNaN(qty) || qty < 0 || !Number.isInteger(qty)) {
      return NextResponse.json({ error: '수량이 올바르지 않습니다.' }, { status: 400 })
    }

    const all = await getAllEquipment()
    const item = all.find(e => e.id === id)
    if (!item) return NextResponse.json({ error: '교구를 찾을 수 없습니다.' }, { status: 404 })

    if (qty < item.rentedQty) {
      return NextResponse.json(
        { error: '현재 대여중 수량보다 작게 설정할 수 없습니다.' },
        { status: 400 }
      )
    }

    // TOCTOU: row index may be stale if concurrent writes occur between these two sheet reads
    const rowIndex = await getEquipmentRowIndex(item.name)
    await updateEquipmentQty(rowIndex, qty)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '수정에 실패했습니다.' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  try {
    const { id: rawId } = await params
    const id = parseInt(rawId, 10)
    if (isNaN(id)) return NextResponse.json({ error: '잘못된 ID입니다.' }, { status: 400 })
    const all = await getAllEquipment()
    const item = all.find(e => e.id === id)
    if (!item) return NextResponse.json({ error: '교구를 찾을 수 없습니다.' }, { status: 404 })

    if (item.rentedQty > 0) {
      return NextResponse.json(
        { error: '현재 대여중인 교구는 삭제할 수 없습니다.' },
        { status: 400 }
      )
    }

    // TOCTOU: row index may be stale if concurrent writes occur between these two sheet reads
    const rowIndex = await getEquipmentRowIndex(item.name)
    await deleteEquipmentRow(rowIndex)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 })
  }
}
