import { createServerFn } from '@tanstack/react-start'

import type { RoomStatus } from '#/lib/room-status'
import { listCharges } from '#/server/admin/charges'
import { type Payment, listPayments } from '#/server/admin/payments'
import { listRooms } from '#/server/admin/rooms'

/** Dasbor: room counts, availability, charges to chase, and recent payments. */
export type Dashboard = {
  rooms: { total: number; byStatus: Record<RoomStatus, number> }
  availability: { roomTypeName: string; available: number; total: number }[]
  outstanding: {
    total: number
    count: number
    overdue: number
    items: {
      id: number
      roomNumber: string
      tenantName: string
      dueDate: string
      balance: number
      isOverdue: boolean
    }[]
  }
  recentPayments: Payment[]
}

const RECENT_PAYMENTS = 5
const CHARGES_TO_CHASE = 6

/**
 * Composed from the same queries the record screens use, so the dashboard
 * cannot disagree with them. In particular the balance keeps its single
 * definition of "not voided" (ADR-0022).
 */
export const getDashboard = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Dashboard> => {
    const [rooms, charges, payments] = await Promise.all([
      listRooms(),
      listCharges({ data: { tenancyId: null } }),
      listPayments(),
    ])

    const byStatus: Record<RoomStatus, number> = {
      available: 0,
      occupied: 0,
      unavailable: 0,
    }
    for (const room of rooms) byStatus[room.status] += 1

    const availabilityByType = new Map<string, { available: number; total: number }>()
    for (const room of rooms) {
      const entry = availabilityByType.get(room.roomTypeName) ?? {
        available: 0,
        total: 0,
      }
      entry.total += 1
      if (room.status === 'available') entry.available += 1
      availabilityByType.set(room.roomTypeName, entry)
    }

    const unpaid = charges
      .filter((charge) => charge.balance > 0)
      .toSorted((left, right) => left.dueDate.localeCompare(right.dueDate))

    return {
      rooms: { total: rooms.length, byStatus },
      availability: [...availabilityByType.entries()]
        .map(([roomTypeName, entry]) => ({ roomTypeName, ...entry }))
        .toSorted((left, right) => left.roomTypeName.localeCompare(right.roomTypeName)),
      outstanding: {
        total: unpaid.reduce((sum, charge) => sum + charge.balance, 0),
        count: unpaid.length,
        overdue: unpaid.filter((charge) => charge.isOverdue).length,
        items: unpaid.slice(0, CHARGES_TO_CHASE).map((charge) => ({
          id: charge.id,
          roomNumber: charge.roomNumber,
          tenantName: charge.tenantName,
          dueDate: charge.dueDate,
          balance: charge.balance,
          isOverdue: charge.isOverdue,
        })),
      },
      recentPayments: payments
        .filter((payment) => payment.voidedAt === null)
        .slice(0, RECENT_PAYMENTS),
    }
  },
)
