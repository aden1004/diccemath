import JSZip from 'jszip'
import { buildRentalForm, validateTemplate, formatKoreanDate, rentalToFormValues, formFileName } from '@/lib/hwpx'
import { DEFAULT_TEMPLATE_BASE64 } from '@/lib/rental-form-template'
import type { RentalDetail } from '@/types'

const template = Buffer.from(DEFAULT_TEMPLATE_BASE64, 'base64')

const base: RentalDetail = {
  rentalId: 'R20260928-001',
  schoolName: '대구○○초등학교',
  teacherName: '홍길동',
  phone: '010-1234-5678',
  email: 'a@b.c',
  appliedAt: '2026-09-28T10:00:00+09:00',
  pickupMethod: 'delivery',
  availableFrom: '2026-10-05',
  returnDue: '2026-10-19',
  status: 'active',
  extended: true,
  items: [
    { rentalId: 'R20260928-001', equipmentName: '지오보드 & 고무줄', quantity: 2 },
    { rentalId: 'R20260928-001', equipmentName: '칠교판', quantity: 1 },
    { rentalId: 'R20260928-001', equipmentName: '쌓기나무', quantity: 5 },
  ],
}

async function sectionXml(buf: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf)
  return zip.file('Contents/section0.xml')!.async('string')
}

describe('formatKoreanDate', () => {
  it('요일 포함 한국식 날짜', () => {
    expect(formatKoreanDate('2026-10-05')).toBe('2026. 10. 5.(월)')
    expect(formatKoreanDate('bad')).toBe('bad')
  })
})

describe('rentalToFormValues', () => {
  it('매핑 규칙: 직위 교사 고정, 학교전화 공란, 비고 수령방법+연장', () => {
    const { fields, items } = rentalToFormValues(base)
    expect(fields.직위).toBe('교사')
    expect(fields.학교전화).toBe('')
    expect(fields.대여기간).toBe('2026. 10. 5.(월) ~ 2026. 10. 19.(월)')
    expect(items[0]).toEqual({ 교구명: '지오보드 & 고무줄', 수량: '2개', 비고: '택배 · 연장(1회)' })
  })
})

describe('validateTemplate', () => {
  it('기본 서식은 필수 자리표시자를 모두 포함', async () => {
    const r = await validateTemplate(template)
    expect(r.ok).toBe(true)
    expect(r.found).toEqual(expect.arrayContaining(['소속', '성명', '휴대폰', '대여기간', '교구목록', '비고']))
  })
  it('zip이 아니면 실패', async () => {
    const r = await validateTemplate(Buffer.from('not a zip'))
    expect(r.ok).toBe(false)
  })
})

// 행 반복 방식 서식: 기본 서식의 {{교구목록}} 칸을 {{교구명}}/{{수량}}/{{비고}} 3행으로 바꿔 생성
async function rowRepeatTemplate(): Promise<Buffer> {
  const zip = await JSZip.loadAsync(template)
  let xml = await zip.file('Contents/section0.xml')!.async('string')
  const rows = xml.match(/<hp:tr>[\s\S]*?<\/hp:tr>/g)!
  const listRow = rows.find(r => r.includes('{{교구목록}}'))!
  const remarkRow = rows.find(r => r.includes('{{비고}}'))!
  const nameRow = listRow.replace('{{교구목록}}', '{{교구명}}')
  const qtyRow = listRow.replace('{{교구목록}}', '{{수량}}').replace(/rowAddr="5"/g, 'rowAddr="6"')
  const remark2 = remarkRow.replace(/rowAddr="6"/g, 'rowAddr="7"')
  xml = xml.replace(listRow, nameRow + qtyRow).replace(remarkRow, remark2).replace('rowCnt="7"', 'rowCnt="8"')
  zip.file('Contents/section0.xml', xml)
  return zip.generateAsync({ type: 'nodebuffer' })
}

describe('buildRentalForm — 기본 서식(한 칸 여러 줄)', () => {
  it('교구 3개 → 교구목록 문단 3개, 행 수 7 유지, 자리표시자 없음', async () => {
    const out = await buildRentalForm(template, base)
    const xml = await sectionXml(out)
    expect(xml).not.toMatch(/\{\{/)
    expect(xml).toMatch(/rowCnt="7"/)
    expect((xml.match(/<hp:tr>/g) ?? []).length).toBe(7)
    expect(xml).toContain('지오보드 &amp; 고무줄(2개)')
    expect(xml).toContain('칠교판(1개)')
    expect(xml).toContain('쌓기나무(5개)')
    expect(xml).toContain('택배 · 연장(1회)')
    expect(xml).toContain('대구○○초등학교')
    // 한 칸 안에 문단 3개
    const cell = xml.match(/<hp:tc\b(?:(?!<\/hp:tc>)[\s\S])*?쌓기나무\(5개\)[\s\S]*?<\/hp:tc>/)![0]
    expect((cell.match(/<hp:p\b/g) ?? []).length).toBe(3)
    const zip = await JSZip.loadAsync(out)
    expect(Object.keys(zip.files)[0]).toBe('mimetype')
  })
  it('파일명', () => {
    expect(formFileName(base)).toBe('대여신청서_R20260928-001_대구○○초등학교.hwpx')
  })
})

describe('buildRentalForm — 행 반복 서식', () => {
  it('교구 3개 → 교구명·수량 2행 묶음 3회 복제, rowCnt 8→12, rowAddr 연속', async () => {
    const tpl = await rowRepeatTemplate()
    expect((await validateTemplate(tpl)).ok).toBe(true)
    const out = await buildRentalForm(tpl, base)
    const xml = await sectionXml(out)
    expect(xml).not.toMatch(/\{\{/)
    expect(xml).toMatch(/rowCnt="12"/)
    expect((xml.match(/<hp:tr>/g) ?? []).length).toBe(12)
    expect(xml).toContain('5개')
    expect((xml.match(/택배 · 연장\(1회\)/g) ?? []).length).toBe(1) // 비고는 블록 밖 → 1회
    const addrs = Array.from(xml.matchAll(/rowAddr="(\d+)"/g), m => Number(m[1]))
    expect(new Set(addrs).size).toBe(12)
    expect(Math.max(...addrs)).toBe(11)
  })
  it('교구 1개 → 원형 유지(rowCnt 8)', async () => {
    const tpl = await rowRepeatTemplate()
    const out = await buildRentalForm(tpl, { ...base, items: base.items.slice(0, 1), extended: false, pickupMethod: 'direct' })
    const xml = await sectionXml(out)
    expect(xml).toMatch(/rowCnt="8"/)
    expect(xml).toContain('직접 수령')
    expect(xml).not.toContain('연장')
  })
})

describe('validateTemplate — 교구 표기 방식 누락', () => {
  it('교구목록도 교구명+수량도 없으면 실패', async () => {
    const zip = await JSZip.loadAsync(template)
    let xml = await zip.file('Contents/section0.xml')!.async('string')
    xml = xml.replace('{{교구목록}}', '')
    zip.file('Contents/section0.xml', xml)
    const r = await validateTemplate(await zip.generateAsync({ type: 'nodebuffer' }))
    expect(r.ok).toBe(false)
    expect(r.missing.join()).toContain('교구목록')
  })
})
