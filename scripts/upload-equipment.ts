// scripts/upload-equipment.ts
// One-time bulk upload of 182 equipment items + image paths.
// Run: npx ts-node scripts/upload-equipment.ts
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { google } from 'googleapis'
import * as fs from 'fs'
import * as path from 'path'

const SHEET_ID = process.env.GOOGLE_SHEET_ID
if (!SHEET_ID) throw new Error('GOOGLE_SHEET_ID is not set in .env.local')

interface Item {
  num: number
  name: string
  qty: number
  desc: string
}

async function main() {
  const dataPath = path.resolve(process.cwd(), '../equipment_data.json')
  const items: Item[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
  console.log(`Loaded ${items.length} items from ${dataPath}`)

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const sheets = google.sheets({ version: 'v4', auth })

  // Check if 교구목록 already has data; clear it before bulk upload
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: '교구목록!A2:F',
  })
  const existingCount = existing.data.values?.length ?? 0
  if (existingCount > 0) {
    console.log(`Clearing ${existingCount} existing rows (A2:F) before upload...`)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: '교구목록!A2:F',
    })
  }

  // Build the rows
  const rows = items.map((item) => [
    item.num,
    item.name,
    item.qty,
    0,                       // 대여중수량
    `/equipment/${item.num}.png`,  // 사진URL (local public path)
    item.desc,
  ])

  console.log(`Uploading ${rows.length} rows...`)
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: '교구목록!A:F',
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  })

  console.log(`✓ Uploaded ${rows.length} equipment items`)
  console.log(`Image paths: /equipment/1.png ... /equipment/${items.length}.png`)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
