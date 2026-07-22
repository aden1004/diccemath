export interface Equipment {
  id: number
  name: string
  totalQty: number
  rentedQty: number
  photoUrl: string | null
  description: string
  availableQty: number // computed: totalQty - rentedQty
  noDelivery: boolean // 교구목록 H열 '택배불가' 표시 여부
  nextAvailableDate?: string | null // 전량 대여중일 때 가장 빠른 반납 예정일
}

export type PickupMethod = 'direct' | 'delivery'
export type RentalStatus = 'active' | 'returned' | 'extended'

export interface RentalRecord {
  rentalId: string
  schoolName: string
  teacherName: string
  phone: string
  email: string
  appliedAt: string   // ISO date string
  pickupMethod: PickupMethod
  availableFrom: string  // YYYY-MM-DD
  returnDue: string      // YYYY-MM-DD
  status: RentalStatus
  extended: boolean
}

export interface RentalItem {
  rentalId: string
  equipmentName: string
  quantity: number
}

export interface RentalDetail extends RentalRecord {
  items: RentalItem[]
}

export interface AdminEmail {
  id: number
  email: string
  name: string
  createdAt: string
}

export interface SessionData {
  isAdmin: boolean
}

export interface CreateRentalRequest {
  schoolName: string
  teacherName: string
  phone: string
  email: string
  pickupMethod: PickupMethod
  availableFrom: string
  returnDue: string
  items: Array<{ equipmentName: string; quantity: number }>
}
