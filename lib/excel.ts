import ExcelJS from 'exceljs'
import type { Equipment } from '@/types'
import type { EquipmentInput } from '@/lib/sheets'
import { VIEW_LABEL, type StatsResult, type StatsFilter } from '@/lib/stats'

// ── 교구 일괄 업로드 엑셀 서식 / 내보내기 / 파싱 ────────────────────────────
// 열 구성: 교구명 | 총수량 | 사진URL | 설명 | 택배불가(O 표시)
export const EQUIPMENT_COLUMNS = ['교구명', '총수량', '사진URL', '설명', '택배불가'] as const
const SHEET_NAME = '교구목록'

function styleHeader(ws: ExcelJS.Worksheet) {
  const header = ws.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
  header.alignment = { vertical: 'middle', horizontal: 'center' }
  header.height = 22
  ws.columns = [
    { key: 'name', width: 28 },
    { key: 'totalQty', width: 10 },
    { key: 'photoUrl', width: 44 },
    { key: 'description', width: 50 },
    { key: 'noDelivery', width: 10 },
  ]
  ws.views = [{ state: 'frozen', ySplit: 1 }]
}

function addGuideSheet(wb: ExcelJS.Workbook) {
  const g = wb.addWorksheet('작성안내')
  g.columns = [{ width: 14 }, { width: 90 }]
  const rows: [string, string][] = [
    ['시트', `"${SHEET_NAME}" 시트에 한 줄에 교구 하나씩 입력. 1행(제목)은 수정·삭제하지 마세요.`],
    ['교구명', '필수. 이미 등록된 교구명과 같으면 그 교구의 총수량·사진·설명·택배불가를 갱신하고, 없으면 새로 추가합니다.'],
    ['총수량', '필수. 1 이상의 정수. 갱신 시 현재 대여중 수량보다 작게 설정할 수 없습니다.'],
    ['사진URL', '선택. 관리자 화면에서 사진을 업로드하면 자동으로 채워지므로 비워 두어도 됩니다. 외부 이미지 주소(https://…)도 가능.'],
    ['설명', '선택. 교구 카드와 상세 팝업에 표시되는 설명.'],
    ['택배불가', '선택. 택배 수령이 불가한 교구는 O(또는 Y, 예, 택배불가)를 입력. 비우면 택배 가능.'],
    ['업로드', '관리자 > 교구 관리 > [엑셀 업로드]에서 파일 선택 → 미리보기 확인 → [등록]. 삭제는 목록에서 개별 처리.'],
  ]
  g.addRow(['항목', '설명']).font = { bold: true }
  rows.forEach(r => g.addRow(r))
  g.eachRow(row => { row.alignment = { wrapText: true, vertical: 'top' } })
}

// 빈 서식(예시 2행 포함)
export async function buildTemplateXlsx(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(SHEET_NAME)
  ws.addRow([...EQUIPMENT_COLUMNS])
  styleHeader(ws)
  ws.addRow(['(예시) 레인보우 분수타일', 10, '', '분수의 개념을 시각적으로 이해하는 교구', ''])
  ws.addRow(['(예시) 대형 자석 도형판', 2, '', '칠판 부착형 자석 교구 (택배 불가)', 'O'])
  ws.getRow(2).font = { color: { argb: 'FF888888' }, italic: true }
  ws.getRow(3).font = { color: { argb: 'FF888888' }, italic: true }
  addGuideSheet(wb)
  return Buffer.from(await wb.xlsx.writeBuffer())
}

// 현재 목록 내보내기(수정 후 재업로드용)
export async function buildExportXlsx(equipment: Equipment[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(SHEET_NAME)
  ws.addRow([...EQUIPMENT_COLUMNS, '대여중(참고)'])
  styleHeader(ws)
  ws.getColumn(6).width = 12
  for (const e of equipment) {
    ws.addRow([e.name, e.totalQty, e.photoUrl ?? '', e.description, e.noDelivery ? 'O' : '', e.rentedQty])
  }
  ws.getColumn(6).eachCell((c, i) => { if (i > 1) c.font = { color: { argb: 'FF888888' } } })
  addGuideSheet(wb)
  return Buffer.from(await wb.xlsx.writeBuffer())
}

export type ParsedEquipmentRow = EquipmentInput & { row: number; error?: string }

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return ''
  if (typeof v === 'object') {
    if ('richText' in v) return v.richText.map(t => t.text).join('')
    if ('text' in v) return String(v.text)
    if ('result' in v) return String(v.result ?? '')
    if (v instanceof Date) return v.toISOString()
  }
  return String(v)
}

const YES = new Set(['o', 'y', 'yes', '예', '택배불가', '불가', 'true', '1', '○', '◯'])

// 업로드 파일 파싱: 1행 제목, 2행부터 데이터. "(예시)"로 시작하는 행은 건너뜀
export async function parseEquipmentXlsx(data: Buffer | Uint8Array): Promise<ParsedEquipmentRow[]> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(Buffer.from(data) as unknown as ArrayBuffer)
  const ws = wb.getWorksheet(SHEET_NAME) ?? wb.worksheets[0]
  if (!ws) return []
  const out: ParsedEquipmentRow[] = []
  ws.eachRow((row, n) => {
    if (n === 1) return
    const name = cellText(row.getCell(1).value).trim()
    const qtyText = cellText(row.getCell(2).value).trim()
    const photoUrl = cellText(row.getCell(3).value).trim()
    const description = cellText(row.getCell(4).value).trim()
    const noDelivery = YES.has(cellText(row.getCell(5).value).trim().toLowerCase())
    if (!name && !qtyText && !description) return // 빈 행
    if (name.startsWith('(예시)')) return
    const totalQty = Number(qtyText)
    let error: string | undefined
    if (!name) error = '교구명 누락'
    else if (!Number.isInteger(totalQty) || totalQty < 1) error = '총수량은 1 이상의 정수'
    else if (photoUrl && !/^(https?:\/\/|\/)/.test(photoUrl)) error = '사진URL 형식 오류'
    out.push({ row: n, name, totalQty: Number.isFinite(totalQty) ? totalQty : 0, photoUrl, description, noDelivery, error })
  })
  // 파일 내 중복 교구명
  const seen = new Map<string, number>()
  for (const r of out) {
    if (seen.has(r.name)) r.error ??= `교구명 중복 (${seen.get(r.name)}행)`
    else seen.set(r.name, r.row)
  }
  return out
}

// ── 통계 엑셀 내보내기 ───────────────────────────────────────────────────────

export async function buildStatsXlsx(result: StatsResult, f: StatsFilter): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const title = VIEW_LABEL[result.view]
  const keyHeader = result.view === 'renter' ? '대여자(학교 성함)' : result.view === 'equipment' ? '교구명' : (f.unit === 'month' ? '신청월' : '신청일')

  // 요약 시트
  const ws = wb.addWorksheet(`${title} 요약`)
  ws.addRow([`교구 대여 통계 — ${title}`]).font = { bold: true, size: 14 }
  ws.addRow([`기간: ${f.from} ~ ${f.to} (신청일 기준) · 반납완료 ${f.includeReturned ? '포함' : '제외'}`])
  ws.addRow([`합계: 대여 ${result.total.rentals}건 · 교구 ${result.total.kinds}종 · 수량 ${result.total.qty}개`])
  ws.addRow([])
  const header = ws.addRow(result.view === 'renter' ? [keyHeader, '휴대폰', '대여 건수', '교구 종수', '수량 합'] : [keyHeader, '대여 건수', '교구 종수', '수량 합'])
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
  for (const r of result.rows) {
    ws.addRow(result.view === 'renter' ? [r.label, r.sub ?? '', r.rentals, r.kinds, r.qty] : [r.label, r.rentals, r.kinds, r.qty])
  }
  ws.columns = [{ width: 32 }, { width: 16 }, { width: 12 }, { width: 12 }, { width: 12 }]

  // 상세 시트
  const d = wb.addWorksheet('상세 내역')
  const dh = d.addRow([keyHeader, '내역', '수량', '대여 ID · 기간 · 상태'])
  dh.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  dh.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
  for (const r of result.rows) for (const line of r.details) d.addRow([r.label, line.label, line.qty, line.sub ?? ''])
  d.columns = [{ width: 32 }, { width: 36 }, { width: 8 }, { width: 48 }]
  d.views = [{ state: 'frozen', ySplit: 1 }]
  return Buffer.from(await wb.xlsx.writeBuffer())
}
