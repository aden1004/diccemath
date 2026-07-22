// scripts/verify-smtp.ts — quick SMTP credentials verification
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import nodemailer from 'nodemailer'

async function main() {
  console.log('SMTP credentials check:')
  console.log(`  GMAIL_USER: ${process.env.GMAIL_USER}`)
  console.log(`  GMAIL_APP_PASSWORD: ${process.env.GMAIL_APP_PASSWORD ? '(set, ' + process.env.GMAIL_APP_PASSWORD.length + ' chars)' : '(NOT SET)'}`)

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('Missing credentials')
    process.exit(1)
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })

  console.log('\nVerifying SMTP connection (Gmail)...')
  try {
    await transporter.verify()
    console.log('✓ SMTP connection OK — credentials work')
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string }
    console.error('✗ SMTP verify FAILED:', e.message || err)
    if (e.code) console.error(`  Code: ${e.code}`)
    process.exit(1)
  }

  console.log('\nSending test email to self...')
  try {
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER,
      subject: '[diccemath SMTP test] ' + new Date().toLocaleString('ko-KR'),
      text: '이 메일이 도착했다면 이메일 발송 기능이 정상 동작합니다.\n\nSMTP test from diccemath rental app.',
    })
    console.log('✓ Email sent')
    console.log(`  messageId: ${info.messageId}`)
    console.log(`  response: ${info.response}`)
    console.log(`  accepted: ${JSON.stringify(info.accepted)}`)
    console.log(`  rejected: ${JSON.stringify(info.rejected)}`)
  } catch (err: unknown) {
    const e = err as { message?: string }
    console.error('✗ Send FAILED:', e.message || err)
    process.exit(1)
  }
}

main()
