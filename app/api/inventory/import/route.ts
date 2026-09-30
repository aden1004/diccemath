import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { parseEquipmentXlsx, type ParsedEquipmentRow } from '@/lib/excel'
import { getAllEquipment, getEquipmentRowIndex, updateEquipmentDetails, addEquipmentRows, type EquipmentInput } from '@/lib/sheets'

type PreviewRow = ParsedEquipmentRow & { action: 'add' | 'update' | 'error'; current?: { totalQty: number; rentedQty: number } }

// 1단계: 파일 파싱 + 갱신/추가 판정 미리보기 (multipart, 필드명 file)
export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: '파일을 선택해주세요.' }, { status: 400 })
    if (!file.name.toLowerCase().endsWith('.xlsx')) return NextResponse.json({ error: 'xlsx 파일만 업로드할 수 있습니다.' }, { status: 400 })
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: '파일 크기는 5MB 이하여야 합니다.' }, { status: 400 })

    const rows = await parseEquipmentXlsx(Buffer.from(await file.arrayBuffer()))
    if (rows.length === 0) return NextResponse.json({ error: '읽을 수 있는 데이터 행이 없습니다. "교구목록" 시트와 제목 행을 확인해주세요.' }, { status: 400 })

    const existing = new Map((await getAllEquipment()).map(e => [e.name, e]))
    const preview: PreviewRow[] = rows.map(r => {
      const cur = existing.get(r.name)
      if (r.error) return { ...r, action: 'error' }
      if (cur && r.totalQty < cur.rentedQty) {
        return { ...r, action: 'error', error: `현재 대여중 ${cur.rentedQty}개보다 작게 설정 불가`, current: { totalQty: cur.totalQty, rentedQty: cur.rentedQty } }
      }
      return cur
        ? { ...r, action: 'update', current: { totalQty: cur.totalQty, rentedQty: cur.rentedQty } }
        : { ...r, action: 'add' }
    })
    return NextResponse.json({ rows: preview })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '파일을 읽지 못했습니다. 서식 파일로 작성했는지 확인해주세요.' }, { status: 500 })
  }
}

// 2단계: 확정 반영 (JSON: { rows: EquipmentInput[] })
export async function PUT(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  try {
    const { rows } = (await req.json()) as { rows: EquipmentInput[] }
    if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json({ error: '반영할 항목이 없습니다.' }, { status: 400 })

    const existing = new Map((await getAllEquipment()).map(e => [e.name, e]))
    const toAdd: EquipmentInput[] = []
    let updated = 0
    for (const raw of rows) {
      const input: EquipmentInput = {
        name: String(raw.name ?? '').trim(),
        totalQty: Number(raw.totalQty),
        photoUrl: String(raw.photoUrl ?? '').trim(),
        description: String(raw.description ?? '').trim(),
        noDelivery: Boolean(raw.noDelivery),
      }
      if (!input.name || !Number.isInteger(input.totalQty) || input.totalQty < 1) continue
      const cur = existing.get(input.name)
      if (cur) {
        if (input.totalQty < cur.rentedQty) continue
        // 사진URL을 비워 보낸 경우 기존 사진 유지
        if (!input.photoUrl && cur.photoUrl) input.photoUrl = cur.photoUrl
        const rowIndex = await getEquipmentRowIndex(input.name)
        if (rowIndex === -1) continue
        await updateEquipmentDetails(rowIndex, input)
        updated++
      } else {
        toAdd.push(input)
      }
    }
    const added = await addEquipmentRows(toAdd)
    return NextResponse.json({ ok: true, updated, added })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '반영 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
