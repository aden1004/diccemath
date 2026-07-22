import nodemailer from 'nodemailer'
import type { RentalDetail } from '@/types'

function getTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })
}

function formatItemList(items: RentalDetail['items']): string {
  return items.map(i => `• ${i.equipmentName} ${i.quantity}개`).join('\n')
}

async function sendMail(subject: string, text: string, recipients: string[]): Promise<void> {
  const transporter = getTransporter()
  if (!transporter) {
    console.warn('Email not sent: GMAIL_USER / GMAIL_APP_PASSWORD not configured')
    return
  }
  if (recipients.length === 0) return
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: recipients.join(','),
    subject,
    text,
  })
}

export async function sendRentalConfirmEmail(
  rental: RentalDetail,
  adminEmails: string[]
): Promise<void> {
  const subject = `[대구수학체험센터] 교구 대여 신청 확인 - ${rental.rentalId}`
  const text = `
대여 신청이 완료되었습니다.

대여 ID: ${rental.rentalId}
학교명: ${rental.schoolName}
신청자: ${rental.teacherName}
연락처: ${rental.phone}
수령방법: ${rental.pickupMethod === 'direct' ? '직접 수령' : '택배'}
수령 가능일: ${rental.availableFrom}
반납 예정일: ${rental.returnDue}

신청 교구:
${formatItemList(rental.items)}

문의: ${process.env.GMAIL_USER}
`.trim()
  await sendMail(subject, text, [rental.email, ...adminEmails].filter(Boolean))
}

export async function sendReturnEmail(
  rental: RentalDetail,
  adminEmails: string[]
): Promise<void> {
  const subject = `[대구수학체험센터] 교구 반납 신청 - ${rental.rentalId}`
  const text = `
교구 반납 신청이 접수되었습니다.

대여 ID: ${rental.rentalId}
학교명: ${rental.schoolName}
신청자: ${rental.teacherName}
연락처: ${rental.phone}
반납 예정일: ${rental.returnDue}

반납 교구:
${formatItemList(rental.items)}

문의: ${process.env.GMAIL_USER}
`.trim()
  await sendMail(subject, text, [rental.email, ...adminEmails].filter(Boolean))
}

export async function sendExtendEmail(
  rental: RentalDetail,
  newReturnDue: string,
  adminEmails: string[]
): Promise<void> {
  const subject = `[대구수학체험센터] 교구 대여 연장 신청 - ${rental.rentalId}`
  const text = `
교구 대여 연장 신청이 완료되었습니다.

대여 ID: ${rental.rentalId}
학교명: ${rental.schoolName}
신청자: ${rental.teacherName}
연락처: ${rental.phone}
변경된 반납 예정일: ${newReturnDue}

대여 교구:
${formatItemList(rental.items)}

문의: ${process.env.GMAIL_USER}
`.trim()
  await sendMail(subject, text, [rental.email, ...adminEmails].filter(Boolean))
}
