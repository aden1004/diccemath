// app/api/rental/route.ts
import { NextResponse } from 'next/server'
import {
  getAllEquipment,
  adjustRentedQty,
  createRental,
  addRentalItems,
  getAdminEmails,
  getRentalById,
  getRentalItems,
} from '@/lib/sheets'
import { isValidAvailableFrom, isValidReturnDue } from '@/lib/date-utils'
import { sendRentalConfirmEmail } from '@/lib/email'
import type { CreateRentalRequest } from '@/types'

export async function POST(req: Request) {
  try {
    const body: CreateRentalRequest = await req.json()
    const { schoolName, teacherName, phone, email, pickupMethod, availableFrom, returnDue, items } = body

    if (!schoolName || !teacherName || !phone || !email || !items?.length ||
        !['direct', 'delivery'].includes(pickupMethod)) {
      return NextResponse.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '유효한 이메일 주소를 입력해주세요.' }, { status: 400 })
    }

    const now = new Date()
    const today = now.toISOString().split('T')[0]

    if (!isValidAvailableFrom(availableFrom, today, pickupMethod)) {
      return NextResponse.json({ error: '수령 가능일이 올바르지 않습니다.' }, { status: 400 })
    }

    if (!isValidReturnDue(returnDue, availableFrom)) {
      return NextResponse.json({ error: '반납 예정일이 올바르지 않습니다.' }, { status: 400 })
    }

    // Check stock for all items
    const allEquipment = await getAllEquipment()
    for (const item of items) {
      if (!item.equipmentName || !Number.isInteger(item.quantity) || item.quantity < 1) {
        return NextResponse.json({ error: '교구 수량이 올바르지 않습니다.' }, { status: 400 })
      }
      const eq = allEquipment.find(e => e.name === item.equipmentName)
      if (!eq) {
        return NextResponse.json({ error: `교구를 찾을 수 없습니다: ${item.equipmentName}` }, { status: 400 })
      }
      if (eq.availableQty < item.quantity) {
        return NextResponse.json(
          { error: `신청 시점에 재고가 소진되었습니다: ${item.equipmentName}` },
          { status: 409 }
        )
      }
      if (pickupMethod === 'delivery' && eq.noDelivery) {
        return NextResponse.json(
          { error: `택배 수령이 불가한 교구입니다 (직접 수령만 가능): ${item.equipmentName}` },
          { status: 400 }
        )
      }
    }

    const rentalId = await createRental({
      schoolName, teacherName, phone, email,
      appliedAt: now.toISOString(),
      pickupMethod,
      availableFrom,
      returnDue,
      status: 'active',
      extended: false,
    })

    // Add rental items and adjust stock
    await addRentalItems(rentalId, items)
    for (const item of items) {
      await adjustRentedQty(item.equipmentName, item.quantity)
    }

    // Send confirmation emails (fire-and-forget)
    const adminEmailList = await getAdminEmails()
    const rentalItems = await getRentalItems(rentalId)
    const rental = await getRentalById(rentalId)
    if (rental) {
      sendRentalConfirmEmail(
        { ...rental, items: rentalItems },
        adminEmailList.map(a => a.email)
      ).catch(err => console.error('Email send failed:', err))
    }

    return NextResponse.json({ rentalId }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
