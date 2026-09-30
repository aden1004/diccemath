import JSZip from 'jszip'
import type { RentalDetail } from '@/types'

// ── HWPX(한글 OWPML) 서식 채우기 ────────────────────────────────────────────
// HWPX는 zip 안에 XML(Contents/section*.xml)이 들어 있는 구조.
// 서식의 자리표시자({{소속}} 등)를 대여 정보로 치환하고,
// 교구 자리표시자({{교구명}}·{{수량}}·{{비고}})가 있는 표 행 묶음을 교구 수만큼 복제한다.

export const FIELD_PLACEHOLDERS = ['소속', '직위', '성명', '학교전화', '휴대폰', '대여기간', '대여ID', '신청일'] as const
export const ITEM_PLACEHOLDERS = ['교구명', '수량', '비고'] as const
export const REQUIRED_PLACEHOLDERS = ['소속', '성명', '휴대폰', '대여기간', '교구명', '수량'] as const

type FieldValues = Record<(typeof FIELD_PLACEHOLDERS)[number], string>
type ItemValues = Record<(typeof ITEM_PLACEHOLDERS)[number], string>

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// 'YYYY-MM-DD' → 'YYYY. M. D.(요일)'
export function formatKoreanDate(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!m) return ymd
  const [, y, mo, d] = m
  const day = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d))).getUTCDay()
  return `${y}. ${Number(mo)}. ${Number(d)}.(${WEEKDAYS[day]})`
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// 대여 정보 → 서식 값
export function rentalToFormValues(rental: RentalDetail): { fields: FieldValues; items: ItemValues[] } {
  const pickup = rental.pickupMethod === 'delivery' ? '택배' : '직접 수령'
  const remark = rental.extended ? `${pickup} · 연장(1회)` : pickup
  return {
    fields: {
      소속: rental.schoolName,
      직위: '교사',
      성명: rental.teacherName,
      학교전화: '',
      휴대폰: rental.phone,
      대여기간: `${formatKoreanDate(rental.availableFrom)} ~ ${formatKoreanDate(rental.returnDue)}`,
      대여ID: rental.rentalId,
      신청일: formatKoreanDate(rental.appliedAt.slice(0, 10)),
    },
    items: rental.items.length
      ? rental.items.map(i => ({ 교구명: i.equipmentName, 수량: `${i.quantity}개`, 비고: remark }))
      : [{ 교구명: '', 수량: '', 비고: remark }],
  }
}

function replacePlaceholders(xml: string, values: Record<string, string>): string {
  return xml.replace(/\{\{\s*([^}\s]+)\s*\}\}/g, (whole, key: string) =>
    key in values ? escapeXml(values[key]) : whole
  )
}

const ITEM_RE = /\{\{\s*(교구명|수량|비고)\s*\}\}/

// 표 하나(<hp:tbl>…</hp:tbl>)에서 교구 행 묶음을 복제
function expandTable(tbl: string, items: ItemValues[]): string {
  const rowRe = /<hp:tr>[\s\S]*?<\/hp:tr>/g
  const rows = tbl.match(rowRe)
  if (!rows) return tbl
  const blockIdx = rows.map((r, i) => (ITEM_RE.test(r) ? i : -1)).filter(i => i >= 0)
  if (blockIdx.length === 0) return tbl
  const start = blockIdx[0]
  const end = blockIdx[blockIdx.length - 1] // 연속 구간으로 간주
  const block = rows.slice(start, end + 1)
  const blockLen = block.length
  const extra = (items.length - 1) * blockLen

  const shiftRow = (row: string, delta: number) =>
    delta === 0 ? row : row.replace(/rowAddr="(\d+)"/g, (_, n: string) => `rowAddr="${Number(n) + delta}"`)

  const expanded: string[] = []
  items.forEach((item, k) => {
    block.forEach(row => expanded.push(replacePlaceholders(shiftRow(row, k * blockLen), item)))
  })
  // 원래 순서: 앞부분 + 확장 블록 + 뒷부분
  const before = rows.slice(0, start)
  const after = rows.slice(end + 1).map(r => shiftRow(r, extra))
  const newRows = [...before, ...expanded, ...after]

  // 행 문자열을 순서대로 교체
  let cursor = 0
  let result = tbl.replace(rowRe, () => newRows[cursor++] ?? '')
  // 남는 확장 행(원본 행 수보다 많을 때)은 마지막 행 뒤에 삽입
  if (cursor < newRows.length) {
    const rest = newRows.slice(cursor).join('')
    const lastEnd = result.lastIndexOf('</hp:tr>') + '</hp:tr>'.length
    result = result.slice(0, lastEnd) + rest + result.slice(lastEnd)
  }

  // rowCnt·표 높이 갱신
  result = result.replace(/rowCnt="(\d+)"/, (_, n: string) => `rowCnt="${Number(n) + extra}"`)
  const blockHeight = block.reduce((sum, row) => {
    const h = /<hp:cellSz width="\d+" height="(\d+)"/.exec(row)
    return sum + (h ? Number(h[1]) : 0)
  }, 0)
  result = result.replace(/(<hp:sz width="\d+" widthRelTo="[A-Z]+" height=")(\d+)(")/, (_, a: string, h: string, c: string) =>
    `${a}${Number(h) + blockHeight * (items.length - 1)}${c}`)
  return result
}

function fillSectionXml(xml: string, fields: FieldValues, items: ItemValues[]): string {
  let out = xml.replace(/<hp:tbl\b[\s\S]*?<\/hp:tbl>/g, tbl => expandTable(tbl, items))
  out = replacePlaceholders(out, fields)
  // 표 밖에 남은 교구 자리표시자는 첫 교구 값으로 채움
  out = replacePlaceholders(out, items[0])
  return out
}

// 서식 검증: 필수 자리표시자 존재 여부
export async function validateTemplate(template: Buffer | Uint8Array): Promise<{ ok: boolean; missing: string[]; found: string[] }> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(template)
  } catch {
    return { ok: false, missing: [...REQUIRED_PLACEHOLDERS], found: [] }
  }
  const sections = Object.keys(zip.files).filter(f => /^Contents\/section\d+\.xml$/.test(f))
  if (sections.length === 0) return { ok: false, missing: [...REQUIRED_PLACEHOLDERS], found: [] }
  let all = ''
  for (const f of sections) all += await zip.file(f)!.async('string')
  const found = Array.from(new Set(Array.from(all.matchAll(/\{\{\s*([^}\s]+)\s*\}\}/g), m => m[1])))
  const missing = REQUIRED_PLACEHOLDERS.filter(k => !found.includes(k))
  return { ok: missing.length === 0, missing, found }
}

// 서식 + 대여 정보 → 완성된 HWPX 바이너리
export async function buildRentalForm(template: Buffer | Uint8Array, rental: RentalDetail): Promise<Buffer> {
  const { fields, items } = rentalToFormValues(rental)
  const zip = await JSZip.loadAsync(template)
  const sections = Object.keys(zip.files).filter(f => /^Contents\/section\d+\.xml$/.test(f))
  for (const f of sections) {
    const xml = await zip.file(f)!.async('string')
    zip.file(f, fillSectionXml(xml, fields, items))
  }
  // 미리보기 텍스트도 갱신(있을 때만)
  const prv = zip.file('Preview/PrvText.txt')
  if (prv) zip.file('Preview/PrvText.txt', `수학교구 대여 신청서 ${rental.rentalId} ${rental.schoolName} ${rental.teacherName}`)
  // mimetype은 압축 없이 첫 항목이어야 함
  const mimetype = await zip.file('mimetype')?.async('string')
  const out = new JSZip()
  if (mimetype) out.file('mimetype', mimetype, { compression: 'STORE' })
  for (const name of Object.keys(zip.files)) {
    if (name === 'mimetype') continue
    const entry = zip.files[name]
    if (entry.dir) continue
    out.file(name, await entry.async('uint8array'), { compression: 'DEFLATE' })
  }
  return out.generateAsync({ type: 'nodebuffer' })
}

// 다운로드 파일명(안전한 문자만)
export function formFileName(rental: RentalDetail): string {
  const school = rental.schoolName.replace(/[\\/:*?"<>|]/g, '').slice(0, 30)
  return `대여신청서_${rental.rentalId}_${school}.hwpx`
}
