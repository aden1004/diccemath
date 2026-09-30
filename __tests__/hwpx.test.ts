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
    expect(r.found).toEqual(expect.arrayContaining(['소속', '성명', '휴대폰', '대여기간', '교구명', '수량']))
  })
  it('zip이 아니면 실패', async () => {
    const r = await validateTemplate(Buffer.from('not a zip'))
    expect(r.ok).toBe(false)
  })
})

describe('buildRentalForm', () => {
  it('교구 3개 → 행 묶음 3회 복제, rowCnt 8→14, 자리표시자 없음, XML 이스케이프', async () => {
    const out = await buildRentalForm(template, base)
    const xml = await sectionXml(out)
    expect(xml).not.toMatch(/\{\{/)
    expect(xml).toMatch(/rowCnt="14"/)
    expect((xml.match(/<hp:tr>/g) ?? []).length).toBe(14)
    expect(xml).toContain('지오보드 &amp; 고무줄')
    expect(xml).toContain('칠교판')
    expect(xml).toContain('쌓기나무')
    expect(xml).toContain('5개')
    expect(xml).toContain('택배 · 연장(1회)')
    expect(xml).toContain('대구○○초등학교')
    // rowAddr 연속성: 0..13 각 1회 이상
    const addrs = Array.from(xml.matchAll(/rowAddr="(\d+)"/g), m => Number(m[1]))
    expect(new Set(addrs).size).toBe(14)
    expect(Math.max(...addrs)).toBe(13)
    // 첫 항목은 mimetype
    const zip = await JSZip.loadAsync(out)
    expect(Object.keys(zip.files)[0]).toBe('mimetype')
  })
  it('교구 1개 → 원형 유지(rowCnt 8)', async () => {
    const out = await buildRentalForm(template, { ...base, items: base.items.slice(0, 1), extended: false, pickupMethod: 'direct' })
    const xml = await sectionXml(out)
    expect(xml).toMatch(/rowCnt="8"/)
    expect(xml).toContain('직접 수령')
    expect(xml).not.toContain('연장')
  })
  it('파일명', () => {
    expect(formFileName(base)).toBe('대여신청서_R20260928-001_대구○○초등학교.hwpx')
  })
})
