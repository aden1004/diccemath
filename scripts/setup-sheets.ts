// scripts/setup-sheets.ts
// Run once: npx ts-node scripts/setup-sheets.ts
// Requires .env.local to be loaded
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { google } from 'googleapis'
import bcrypt from 'bcryptjs'

const INITIAL_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD ?? 'admin1234'
const SHEET_ID = process.env.GOOGLE_SHEET_ID

async function main() {
  if (!SHEET_ID) throw new Error('GOOGLE_SHEET_ID is not set in .env.local')

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const sheets = google.sheets({ version: 'v4', auth })

  const sheetTitles = ['교구목록', '대여기록', '대여교구상세', '관리자설정', '관리자이메일']
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const existing = meta.data.sheets?.map(s => s.properties?.title) ?? []

  // Create missing sheets
  const toCreate = sheetTitles.filter(t => !existing.includes(t))
  if (toCreate.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: toCreate.map(title => ({ addSheet: { properties: { title } } })),
      },
    })
    console.log('Created sheets:', toCreate)
  }

  // Write headers (only for newly created sheets to avoid overwriting data)
  const headers: Array<[string, string[][]]> = [
    ['교구목록!A1:F1', [['순번', '교구명', '총수량', '대여중수량', '사진URL', '설명']]],
    ['대여기록!A1:K1', [['대여ID', '학교명', '선생님성함', '전화번호', '이메일', '신청일시', '수령방법', '수령가능일', '반납예정일', '상태', '연장여부']]],
    ['대여교구상세!A1:C1', [['대여ID', '교구명', '수량']]],
    ['관리자설정!A1:B1', [['키', '값']]],
    ['관리자이메일!A1:D1', [['ID', '이메일', '이름', '등록일']]],
  ]

  for (const [range, values] of headers) {
    const sheetName = range.split('!')[0]
    if (!toCreate.includes(sheetName)) continue
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range,
      valueInputOption: 'RAW',
      requestBody: { values },
    })
  }

  // Upsert admin password — update existing row if present, append if not
  const hash = await bcrypt.hash(INITIAL_PASSWORD, 10)
  const settingsRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: '관리자설정!A2:A',
  })
  const settingsRows: string[][] = (settingsRes.data.values ?? []) as string[][]
  const existingIdx = settingsRows.findIndex(r => r[0] === 'admin_password')

  if (existingIdx === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: '관리자설정!A:B',
      valueInputOption: 'RAW',
      requestBody: { values: [['admin_password', hash]] },
    })
  } else {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `관리자설정!B${existingIdx + 2}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[hash]] },
    })
  }

  console.log('Setup complete.')
  console.log('IMPORTANT: Change the password after first login at /admin/settings')
}

main().catch(console.error)
