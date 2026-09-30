import nodemailer from 'nodemailer'
import type { RentalDetail } from '@/types'

function getTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://diccemath.vercel.app').replace(/\/$/, '')
}

function formatItemList(items: RentalDetail['items']): string {
  return items.map(i => `• ${i.equipmentName} ${i.quantity}개`).join('\n')
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function toHtml(text: string): string {
  return `<div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;font-size:14px;line-height:1.8;color:#1e293b;white-space:pre-line">${escapeHtml(text)}</div>`
}

async function sendMail(subject: string, text: string, recipients: string[]): Promise<void> {
  const transporter = getTransporter()
  if (!transporter) {
    console.warn('Email not sent: GMAIL_USER / GMAIL_APP_PASSWORD not configured')
    return
  }
  if (recipients.length === 0) return
  await transporter.sendMail({
    from: { name: '대구수학체험센터 교구대여', address: process.env.GMAIL_USER! },
    to: recipients.join(','),
    replyTo: process.env.GMAIL_USER,
    subject,
    text,
    html: toHtml(text),
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

[반납 안내]
- 반납 시 먼저 대여 조회 페이지에서 "반납 신청"을 한 뒤 교구를 센터로 반납해 주세요.
- 반납 신청·연장에는 대여 ID(${rental.rentalId})와 신청 시 입력한 휴대폰 번호가 필요합니다.
- 반납 예정일 3일 전에 안내 메일이 발송됩니다.
- 대여 조회: ${siteUrl()}/rental/lookup

문의: ${process.env.GMAIL_USER}
`.trim()
  await sendMail(subject, text, [rental.email, ...adminEmails].filter(Boolean))
}

// 반납 예정일 D-3 안내 (이용자에게만 발송)
export async function sendReturnReminderEmail(rental: RentalDetail, daysLeft: number): Promise<void> {
  const subject = `[대구수학체험센터] 교구 반납 예정일 ${daysLeft}일 전 안내 - ${rental.rentalId}`
  const text = `
대여하신 교구의 반납 예정일이 ${daysLeft}일 남았습니다.

대여 ID: ${rental.rentalId}
학교명: ${rental.schoolName}
신청자: ${rental.teacherName}
반납 예정일: ${rental.returnDue}

대여 교구:
${formatItemList(rental.items)}

반납 방법: 대여 조회 페이지에서 "반납 신청" 후 교구를 센터로 반납해 주세요.
${rental.extended ? '(이미 1회 연장된 건으로 추가 연장은 불가합니다.)' : '기간 연장이 필요하면 같은 페이지에서 "2주 연장"(1회)을 신청할 수 있습니다.'}
대여 조회: ${siteUrl()}/rental/lookup

문의: ${process.env.GMAIL_USER}
`.trim()
  await sendMail(subject, text, [rental.email].filter(Boolean))
}

// 이용자 반납 신청 접수 알림 (관리자 확인 전)
export async function sendReturnRequestEmail(
  rental: RentalDetail,
  adminEmails: string[]
): Promise<void> {
  const subject = `[대구수학체험센터] 교구 반납 신청 접수 - ${rental.rentalId}`
  const text = `
교구 반납 신청이 접수되었습니다.
교구를 센터로 반납해 주시면 관리자 확인 후 반납 완료 처리됩니다.

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

// 관리자 반납 확인 완료 알림
export async function sendReturnEmail(
  rental: RentalDetail,
  adminEmails: string[]
): Promise<void> {
  const subject = `[대구수학체험센터] 교구 반납 완료 - ${rental.rentalId}`
  const text = `
교구 반납이 확인되어 반납 완료 처리되었습니다.

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
