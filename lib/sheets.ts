import { google } from 'googleapis'
import { generateRentalId } from '@/lib/rental-id'
import type { Equipment, RentalRecord, RentalItem, AdminEmail } from '@/types'

const SHEET_ID = process.env.GOOGLE_SHEET_ID
if (!SHEET_ID) throw new Error('GOOGLE_SHEET_ID is not set')

let _sheets: ReturnType<typeof google.sheets> | null = null

function getSheets() {
  if (!_sheets) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    _sheets = google.sheets({ version: 'v4', auth })
  }
  return _sheets
}

async function getRange(range: string): Promise<string[][]> {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range })
  return (res.data.values as string[][] | null | undefined) ?? []
}

async function appendRow(range: string, values: (string | number)[]): Promise<void> {
  const sheets = getSheets()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  })
}

async function updateRow(range: string, values: (string | number)[]): Promise<void> {
  const sheets = getSheets()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  })
}

// ── Equipment (Sheet1: 교구목록) ────────────────────────────────────────────
// Columns: A=순번, B=교구명, C=총수량, D=대여중수량, E=사진URL, F=설명, H=택배불가

function rowToEquipment(row: string[], idx: number): Equipment {
  return {
    id: parseInt(row[0] ?? String(idx + 1), 10),
    name: row[1] ?? '',
    totalQty: parseInt(row[2] ?? '0', 10),
    rentedQty: parseInt(row[3] ?? '0', 10),
    photoUrl: row[4] || null,
    description: row[5] ?? '',
    availableQty: parseInt(row[2] ?? '0', 10) - parseInt(row[3] ?? '0', 10),
    noDelivery: (row[7] ?? '').trim() !== '',
  }
}

export async function getAllEquipment(): Promise<Equipment[]> {
  const rows = await getRange('교구목록!A2:H')
  return rows.filter(r => r[1]).map(rowToEquipment)
}

export async function getEquipmentRowIndex(name: string): Promise<number> {
  const rows = await getRange('교구목록!A2:B')
  const idx = rows.findIndex(r => r[1] === name)
  return idx === -1 ? -1 : idx + 2 // 1-based, +1 for header
}

export async function addEquipment(
  name: string, totalQty: number, photoUrl: string, description: string
): Promise<void> {
  const rows = await getRange('교구목록!A2:A')
  const nextId = rows.length + 1
  await appendRow('교구목록!A:F', [nextId, name, totalQty, 0, photoUrl, description])
}

export async function addEquipmentBulk(
  items: Array<{ name: string; totalQty: number; photoUrl: string; description: string }>
): Promise<number> {
  const rows = await getRange('교구목록!A2:A')
  const startId = rows.length + 1
  const values = items.map((item, i) => [
    startId + i, item.name, item.totalQty, 0, item.photoUrl, item.description,
  ])
  const sheets = getSheets()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: '교구목록!A:F',
    valueInputOption: 'RAW',
    requestBody: { values },
  })
  return items.length
}

export async function updateEquipmentQty(
  rowIndex: number, totalQty: number
): Promise<void> {
  await updateRow(`교구목록!C${rowIndex}`, [totalQty])
}

export async function deleteEquipmentRow(rowIndex: number): Promise<void> {
  const sheets = getSheets()
  const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const sheet1 = sheetMeta.data.sheets?.find(s => s.properties?.title === '교구목록')
  if (!sheet1) throw new Error('Sheet "교구목록" not found')
  const sheetId = sheet1.properties!.sheetId!
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex },
        },
      }],
    },
  })
}

// TOCTOU: concurrent calls may produce incorrect counts; the rental API validates availability before calling this
export async function adjustRentedQty(name: string, delta: number): Promise<void> {
  const rowIndex = await getEquipmentRowIndex(name)
  if (rowIndex === -1) throw new Error(`Equipment not found: ${name}`)
  const rows = await getRange(`교구목록!C${rowIndex}:D${rowIndex}`)
  const current = parseInt(rows[0]?.[1] ?? '0', 10)
  await updateRow(`교구목록!D${rowIndex}`, [Math.max(0, current + delta)])
}

// ── Rental Records (Sheet2: 대여기록) ───────────────────────────────────────
// A=대여ID, B=학교명, C=선생님성함, D=전화번호, E=이메일, F=신청일시,
// G=수령방법, H=수령가능일, I=반납예정일, J=상태, K=연장여부

function rowToRental(row: string[]): RentalRecord {
  return {
    rentalId: row[0] ?? '',
    schoolName: row[1] ?? '',
    teacherName: row[2] ?? '',
    phone: row[3] ?? '',
    email: row[4] ?? '',
    appliedAt: row[5] ?? '',
    pickupMethod: (row[6] === 'delivery' ? 'delivery' : 'direct'),
    availableFrom: row[7] ?? '',
    returnDue: row[8] ?? '',
    status: (row[9] as RentalRecord['status']) ?? 'active',
    extended: row[10] === 'Y',
  }
}

export async function createRental(
  rental: Omit<RentalRecord, 'rentalId'>
): Promise<string> {
  const dateStr = rental.appliedAt.split('T')[0]
  // TOCTOU: countRentalsByDate + appendRow is not atomic. Concurrent submissions on the
  // same day can produce duplicate IDs. Probability is low for this use case but cannot
  // be fully eliminated without a locking primitive that Google Sheets does not provide.
  const seq = (await countRentalsByDate(dateStr)) + 1
  const rentalId = generateRentalId(dateStr, seq)
  await appendRow('대여기록!A:K', [
    rentalId,
    rental.schoolName,
    rental.teacherName,
    rental.phone,
    rental.email,
    rental.appliedAt,
    rental.pickupMethod,
    rental.availableFrom,
    rental.returnDue,
    rental.status,
    rental.extended ? 'Y' : 'N',
  ])
  return rentalId
}

export async function getRentalById(rentalId: string): Promise<RentalRecord | null> {
  const rows = await getRange('대여기록!A2:K')
  const row = rows.find(r => r[0] === rentalId)
  return row ? rowToRental(row) : null
}

export async function getRentalsByPhone(phone: string): Promise<RentalRecord[]> {
  const rows = await getRange('대여기록!A2:K')
  return rows.filter(r => r[3] === phone).map(rowToRental)
}

export async function getAllActiveRentals(): Promise<RentalRecord[]> {
  const rows = await getRange('대여기록!A2:K')
  return rows.filter(r => r[9] === 'active' || r[9] === 'extended').map(rowToRental)
}

export async function getRentalsByDateRange(
  from: string, to: string
): Promise<RentalRecord[]> {
  const rows = await getRange('대여기록!A2:K')
  return rows.filter(r => r[5]?.slice(0, 10) >= from && r[5]?.slice(0, 10) <= to).map(rowToRental)
}

async function getRentalRowIndex(rentalId: string): Promise<number> {
  const rows = await getRange('대여기록!A2:A')
  const idx = rows.findIndex(r => r[0] === rentalId)
  return idx === -1 ? -1 : idx + 2
}

export async function updateRentalStatus(
  rentalId: string,
  status: RentalRecord['status'],
  extended?: boolean
): Promise<void> {
  const rowIndex = await getRentalRowIndex(rentalId)
  if (rowIndex === -1) throw new Error(`Rental not found: ${rentalId}`)
  if (extended !== undefined) {
    await updateRow(`대여기록!J${rowIndex}:K${rowIndex}`, [status, extended ? 'Y' : 'N'])
  } else {
    await updateRow(`대여기록!J${rowIndex}`, [status])
  }
}

export async function updateRentalReturnDue(
  rentalId: string, newReturnDue: string
): Promise<void> {
  const rowIndex = await getRentalRowIndex(rentalId)
  if (rowIndex === -1) throw new Error(`Rental not found: ${rentalId}`)
  await updateRow(`대여기록!I${rowIndex}`, [newReturnDue])
}

export async function countRentalsByDate(datePrefix: string): Promise<number> {
  const rows = await getRange('대여기록!F2:F')
  return rows.filter(r => r[0]?.startsWith(datePrefix)).length
}

// ── Rental Items (Sheet3: 대여교구상세) ─────────────────────────────────────
// A=대여ID, B=교구명, C=수량

export async function addRentalItems(
  rentalId: string,
  items: Array<{ equipmentName: string; quantity: number }>
): Promise<void> {
  if (items.length === 0) return
  const sheets = getSheets()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: '대여교구상세!A:C',
    valueInputOption: 'RAW',
    requestBody: { values: items.map(item => [rentalId, item.equipmentName, item.quantity]) },
  })
}

// 교구별로 대여중(active/extended) 건들의 가장 빠른 반납 예정일
export async function getEarliestReturnDueByEquipment(): Promise<Record<string, string>> {
  const rentals = await getAllActiveRentals()
  if (rentals.length === 0) return {}
  const dueById = new Map(rentals.map(r => [r.rentalId, r.returnDue]))
  const rows = await getRange('대여교구상세!A2:C')
  const earliest: Record<string, string> = {}
  for (const r of rows) {
    const due = dueById.get(r[0] ?? '')
    const name = r[1]
    if (!due || !name) continue
    if (!earliest[name] || due < earliest[name]) earliest[name] = due
  }
  return earliest
}

export async function getRentalItems(rentalId: string): Promise<RentalItem[]> {
  const rows = await getRange('대여교구상세!A2:C')
  return rows
    .filter(r => r[0] === rentalId)
    .map(r => ({ rentalId: r[0], equipmentName: r[1] ?? '', quantity: parseInt(r[2] ?? '0', 10) }))
}

// ── Admin Settings (Sheet4: 관리자설정) ─────────────────────────────────────
// A=키, B=값

export async function getAdminPassword(): Promise<string> {
  const rows = await getRange('관리자설정!A2:B')
  const row = rows.find(r => r[0] === 'admin_password')
  return row?.[1] ?? ''
}

export async function setAdminPassword(hash: string): Promise<void> {
  const rows = await getRange('관리자설정!A2:A')
  const idx = rows.findIndex(r => r[0] === 'admin_password')
  if (idx === -1) {
    await appendRow('관리자설정!A:B', ['admin_password', hash])
  } else {
    await updateRow(`관리자설정!B${idx + 2}`, [hash])
  }
}

// ── Admin Emails (Sheet5: 관리자이메일) ──────────────────────────────────────
// A=ID, B=이메일, C=이름, D=등록일

export async function getAdminEmails(): Promise<AdminEmail[]> {
  const rows = await getRange('관리자이메일!A2:D')
  return rows.filter(r => r[1]).map(r => ({
    id: parseInt(r[0] ?? '0', 10),
    email: r[1] ?? '',
    name: r[2] ?? '',
    createdAt: r[3] ?? '',
  }))
}

async function getAdminEmailRowIndex(id: number): Promise<number> {
  const rows = await getRange('관리자이메일!A2:A')
  const idx = rows.findIndex(r => parseInt(r[0], 10) === id)
  return idx === -1 ? -1 : idx + 2
}

export async function addAdminEmail(email: string, name: string): Promise<void> {
  const rows = await getRange('관리자이메일!A2:A')
  const nextId = rows.length + 1
  const today = new Date().toISOString().split('T')[0]
  await appendRow('관리자이메일!A:D', [nextId, email, name, today])
}

export async function updateAdminEmail(
  id: number, email: string, name: string
): Promise<void> {
  const rowIndex = await getAdminEmailRowIndex(id)
  if (rowIndex === -1) throw new Error(`Admin email not found: ${id}`)
  await updateRow(`관리자이메일!B${rowIndex}:C${rowIndex}`, [email, name])
}

export async function deleteAdminEmailRow(id: number): Promise<void> {
  const rowIndex = await getAdminEmailRowIndex(id)
  if (rowIndex === -1) throw new Error(`Admin email not found: ${id}`)
  const sheets = getSheets()
  const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const sheet = sheetMeta.data.sheets?.find(s => s.properties?.title === '관리자이메일')
  if (!sheet) throw new Error('Sheet "관리자이메일" not found')
  const sheetId = sheet.properties!.sheetId!
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex },
        },
      }],
    },
  })
}
