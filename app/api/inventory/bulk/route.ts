import { NextResponse } from 'next/server'
import { addEquipmentBulk } from '@/lib/sheets'
import { requireAdmin } from '@/lib/auth'

export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

  try {
    const { items } = await req.json()
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: '업로드할 항목이 없습니다.' }, { status: 400 })
    }

    const cleaned: Array<{ name: string; totalQty: number; photoUrl: string; description: string }> = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const name = String(item?.name ?? '').trim()
      const totalQty = Number(item?.totalQty)
      const photoUrl = String(item?.photoUrl ?? '').trim()
      const description = String(item?.description ?? '').trim()

      if (!name) {
        return NextResponse.json({ error: `${i + 1}번째 행: 교구명이 비어있습니다.` }, { status: 400 })
      }
      if (!Number.isInteger(totalQty) || totalQty < 1) {
        return NextResponse.json(
          { error: `${i + 1}번째 행 (${name}): 총수량은 1 이상의 정수여야 합니다.` },
          { status: 400 }
        )
      }
      cleaned.push({ name, totalQty, photoUrl, description })
    }

    const count = await addEquipmentBulk(cleaned)
    return NextResponse.json({ count })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
