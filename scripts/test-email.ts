// scripts/test-email.ts
// Test email sending: add admin email + create test rental + verify
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { google } from 'googleapis'

const SHEET_ID = process.env.GOOGLE_SHEET_ID
if (!SHEET_ID) throw new Error('GOOGLE_SHEET_ID not set')

const TEST_RENTER_EMAIL = process.env.GMAIL_USER!  // send to ourselves
const TEST_ADMIN_EMAIL = process.env.GMAIL_USER!   // also receive as admin
const TEST_ADMIN_NAME = '지석'

async function main() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const sheets = google.sheets({ version: 'v4', auth })

  // 1. Add admin email to 관리자이메일 sheet
  console.log('1. Checking admin email...')
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: '관리자이메일!A2:D',
  })
  const rows = existing.data.values ?? []
  const found = rows.find(r => r[1] === TEST_ADMIN_EMAIL)

  if (!found) {
    console.log(`   Adding admin email: ${TEST_ADMIN_EMAIL}`)
    const today = new Date().toISOString().split('T')[0]
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: '관리자이메일!A:D',
      valueInputOption: 'RAW',
      requestBody: { values: [[rows.length + 1, TEST_ADMIN_EMAIL, TEST_ADMIN_NAME, today]] },
    })
    console.log('   ✓ Admin email added')
  } else {
    console.log(`   ✓ Admin email already registered: ${TEST_ADMIN_EMAIL}`)
  }

  // 2. Create test rental via API
  console.log('\n2. Creating test rental via /api/rental...')
  const today = new Date()
  const availableFrom = new Date(today)
  availableFrom.setDate(availableFrom.getDate() + 3)
  const returnDue = new Date(availableFrom)
  returnDue.setDate(returnDue.getDate() + 7)

  const body = {
    schoolName: '테스트학교',
    teacherName: '테스트선생님',
    phone: '010-1234-5678',
    email: TEST_RENTER_EMAIL,
    pickupMethod: 'direct',
    availableFrom: availableFrom.toISOString().split('T')[0],
    returnDue: returnDue.toISOString().split('T')[0],
    items: [{ equipmentName: '레인보우 분수타일', quantity: 1 }],
  }
  console.log(`   Renter email: ${TEST_RENTER_EMAIL}`)
  console.log(`   Admin email: ${TEST_ADMIN_EMAIL}`)
  console.log(`   Equipment: 레인보우 분수타일 1개`)
  console.log(`   AvailableFrom: ${body.availableFrom}, ReturnDue: ${body.returnDue}`)

  const res = await fetch('http://localhost:3000/api/rental', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json()
    console.error(`   ✗ Rental creation failed: ${JSON.stringify(err)}`)
    process.exit(1)
  }
  const result = await res.json()
  console.log(`   ✓ Rental created: ${result.rentalId}`)
  console.log(`\n3. Email send is fire-and-forget, check the dev server logs for any errors.`)
  console.log(`   Expected: 1 email to ${TEST_RENTER_EMAIL} (renter + admin combined since same address)`)
  console.log(`\n4. Wait ~5 seconds, then check your Gmail inbox at ${TEST_RENTER_EMAIL}`)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
