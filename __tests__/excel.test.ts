import ExcelJS from 'exceljs'
import { buildTemplateXlsx, buildExportXlsx, parseEquipmentXlsx } from '@/lib/excel'

describe('excel', () => {
  it('서식 생성 → 파싱 시 예시 행은 제외', async () => {
    const buf = await buildTemplateXlsx()
    const rows = await parseEquipmentXlsx(buf)
    expect(rows).toEqual([])
  })
  it('내보내기 → 파싱 왕복', async () => {
    const buf = await buildExportXlsx([
      { id: 1, name: '지오보드', totalQty: 5, rentedQty: 1, photoUrl: '/equipment/1.png', description: '설명', availableQty: 4, noDelivery: true },
      { id: 2, name: '칠교판', totalQty: 3, rentedQty: 0, photoUrl: null, description: '', availableQty: 3, noDelivery: false },
    ])
    const rows = await parseEquipmentXlsx(buf)
    expect(rows.map(r => [r.name, r.totalQty, r.noDelivery, r.error])).toEqual([['지오보드', 5, true, undefined], ['칠교판', 3, false, undefined]])
  })
  it('오류 판정: 교구명 누락·수량 오류·중복', async () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('교구목록')
    ws.addRow(['교구명', '총수량', '사진URL', '설명', '택배불가'])
    ws.addRow(['', 3, '', '', ''])
    ws.addRow(['A', 0, '', '', ''])
    ws.addRow(['B', 2, '', '', 'Y'])
    ws.addRow(['B', 4, '', '', ''])
    ws.addRow(['C', '2', 'ftp://x', '', ''])
    const rows = await parseEquipmentXlsx(Buffer.from(await wb.xlsx.writeBuffer()))
    expect(rows.map(r => r.error)).toEqual(['교구명 누락', '총수량은 1 이상의 정수', undefined, '교구명 중복 (4행)', '사진URL 형식 오류'])
    expect(rows[2].noDelivery).toBe(true)
  })
})
