import { createServerFn } from '@tanstack/react-start'

import { type RoomStatus, roomStatus } from '#/lib/room-status'
import { changedNothing, getDb, isUniqueViolation, nowMs } from '#/server/db'
import {
  InputError,
  flag,
  optionalText,
  readField,
  rowId,
  text,
  wholeNumber,
} from '#/server/validation'

/** Kamar: one physical rentable unit. The price lives here (ADR-0018). */
export type Room = {
  id: number
  number: string
  floor: number
  price: number
  isUnavailable: boolean
  notes: string | null
  roomTypeId: number
  roomTypeName: string
  status: RoomStatus
}

/** A room in the trash (ADR-0036). */
export type DeletedRoom = {
  id: number
  number: string
  roomTypeName: string
  deletedAt: number
  tenancyCount: number
}

/** The individual view: the room and the stays it has held. */
export type RoomDetail = {
  room: Room
  tenancies: {
    id: number
    tenantName: string
    startDate: string
    moveOutDate: string | null
    billedAmount: number
    paidAmount: number
  }[]
}

type RoomRow = {
  id: number
  number: string
  floor: number
  price: number
  is_unavailable: number
  notes: string | null
  room_type_id: number
  room_type_name: string
  active_tenancies: number
}

export type RoomInput = {
  number: string
  roomTypeId: number
  floor: number
  price: number
  isUnavailable: boolean
  notes: string | null
}

/**
 * One query for the admin list and, in build step 6, the public list. The
 * status is derived here so the two lists cannot disagree (ADR-0019).
 */
const SELECT_ROOMS = `
  SELECT r.id, r.number, r.floor, r.price, r.is_unavailable, r.notes,
         r.room_type_id, t.name AS room_type_name,
         (SELECT COUNT(*) FROM tenancies te
           WHERE te.room_id = r.id AND te.move_out_date IS NULL) AS active_tenancies
  FROM rooms r
  JOIN room_types t ON t.id = r.room_type_id
  WHERE r.deleted_at IS NULL
  ORDER BY r.number
`

const SELECT_ROOM = `
  SELECT r.id, r.number, r.floor, r.price, r.is_unavailable, r.notes,
         r.room_type_id, t.name AS room_type_name,
         (SELECT COUNT(*) FROM tenancies te
           WHERE te.room_id = r.id AND te.move_out_date IS NULL) AS active_tenancies
  FROM rooms r
  JOIN room_types t ON t.id = r.room_type_id
  WHERE r.id = ?1 AND r.deleted_at IS NULL
`

function toRoom(row: RoomRow): Room {
  const isUnavailable = row.is_unavailable === 1
  return {
    id: row.id,
    number: row.number,
    floor: row.floor,
    price: row.price,
    isUnavailable,
    notes: row.notes,
    roomTypeId: row.room_type_id,
    roomTypeName: row.room_type_name,
    status: roomStatus({
      isUnavailable,
      activeTenancies: row.active_tenancies,
    }),
  }
}

function parseRoomInput(input: unknown): RoomInput {
  return {
    number: text(readField(input, 'number'), 'Nomor kamar', 20),
    roomTypeId: rowId(readField(input, 'roomTypeId'), 'Tipe kamar'),
    floor: wholeNumber(readField(input, 'floor'), 'Lantai', -5, 100),
    price: wholeNumber(readField(input, 'price'), 'Harga', 0, 1_000_000_000),
    isUnavailable: flag(readField(input, 'isUnavailable'), 'Tidak tersedia'),
    notes: optionalText(readField(input, 'notes'), 'Catatan', 300),
  }
}

/** A room can only be assigned to a live type. */
async function requireRoomType(roomTypeId: number): Promise<void> {
  const found = await getDb()
    .prepare('SELECT id FROM room_types WHERE id = ?1 AND deleted_at IS NULL')
    .bind(roomTypeId)
    .first<{ id: number }>()
  if (!found) {
    throw new InputError('Tipe kamar tidak ditemukan.')
  }
}

/** The number is unique across the table, so a number in the trash blocks a new row (ADR-0037). */
function numberTaken(): InputError {
  return new InputError(
    'Nomor kamar itu sudah dipakai, termasuk oleh baris di Sampah. Pulihkan atau hapus permanen baris itu dulu.',
  )
}

export const listRooms = createServerFn({ method: 'GET' }).handler(async (): Promise<Room[]> => {
  const { results } = await getDb().prepare(SELECT_ROOMS).all<RoomRow>()
  return (results ?? []).map(toRoom)
})

export const listDeletedRooms = createServerFn({ method: 'GET' }).handler(
  async (): Promise<DeletedRoom[]> => {
    const { results } = await getDb()
      .prepare(
        `SELECT r.id, r.number, r.deleted_at, t.name AS room_type_name,
                (SELECT COUNT(*) FROM tenancies te WHERE te.room_id = r.id)
                  AS tenancy_count
           FROM rooms r
           JOIN room_types t ON t.id = r.room_type_id
          WHERE r.deleted_at IS NOT NULL
          ORDER BY r.deleted_at DESC`,
      )
      .all<{
        id: number
        number: string
        deleted_at: number
        room_type_name: string
        tenancy_count: number
      }>()
    return (results ?? []).map((row) => ({
      id: row.id,
      number: row.number,
      roomTypeName: row.room_type_name,
      deletedAt: row.deleted_at,
      tenancyCount: row.tenancy_count,
    }))
  },
)

export const getRoom = createServerFn({ method: 'GET' })
  .validator((input: unknown) => ({
    id: rowId(readField(input, 'id'), 'Kamar'),
  }))
  .handler(async ({ data }): Promise<RoomDetail> => {
    const row = await getDb().prepare(SELECT_ROOM).bind(data.id).first<RoomRow>()
    if (!row) throw new InputError('Kamar tidak ditemukan.')

    const { results } = await getDb()
      .prepare(
        `SELECT te.id, tn.name AS tenant_name, te.start_date, te.move_out_date,
                (SELECT COALESCE(SUM(c.amount), 0) FROM charges c
                  WHERE c.tenancy_id = te.id AND c.deleted_at IS NULL)
                  AS billed_amount,
                (SELECT COALESCE(SUM(p.amount), 0)
                   FROM payments p
                   JOIN charges c ON c.id = p.charge_id
                  WHERE c.tenancy_id = te.id AND c.deleted_at IS NULL
                    AND p.voided_at IS NULL)
                  AS paid_amount
           FROM tenancies te
           JOIN tenants tn ON tn.id = te.tenant_id
          WHERE te.room_id = ?1
          ORDER BY te.start_date DESC`,
      )
      .bind(data.id)
      .all<{
        id: number
        tenant_name: string
        start_date: string
        move_out_date: string | null
        billed_amount: number
        paid_amount: number
      }>()

    return {
      room: toRoom(row),
      tenancies: (results ?? []).map((tenancy) => ({
        id: tenancy.id,
        tenantName: tenancy.tenant_name,
        startDate: tenancy.start_date,
        moveOutDate: tenancy.move_out_date,
        billedAmount: tenancy.billed_amount,
        paidAmount: tenancy.paid_amount,
      })),
    }
  })

export const createRoom = createServerFn({ method: 'POST' })
  .validator(parseRoomInput)
  .handler(async ({ data }): Promise<{ id: number }> => {
    await requireRoomType(data.roomTypeId)
    try {
      const row = await getDb()
        .prepare(
          `INSERT INTO rooms
             (number, room_type_id, floor, price, is_unavailable, notes, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, unixepoch() * 1000)
           RETURNING id`,
        )
        .bind(
          data.number,
          data.roomTypeId,
          data.floor,
          data.price,
          data.isUnavailable ? 1 : 0,
          data.notes,
        )
        .first<{ id: number }>()
      if (!row) throw new Error('Kamar gagal disimpan.')
      return { id: row.id }
    } catch (error) {
      if (isUniqueViolation(error, 'rooms.number')) throw numberTaken()
      throw error
    }
  })

export const updateRoom = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    id: rowId(readField(input, 'id'), 'Kamar'),
    ...parseRoomInput(input),
  }))
  .handler(async ({ data }): Promise<{ id: number }> => {
    await requireRoomType(data.roomTypeId)
    try {
      const result = await getDb()
        .prepare(
          `UPDATE rooms
              SET number = ?1, room_type_id = ?2, floor = ?3, price = ?4,
                  is_unavailable = ?5, notes = ?6, updated_at = unixepoch() * 1000
            WHERE id = ?7 AND deleted_at IS NULL`,
        )
        .bind(
          data.number,
          data.roomTypeId,
          data.floor,
          data.price,
          data.isUnavailable ? 1 : 0,
          data.notes,
          data.id,
        )
        .run()
      if (changedNothing(result.meta)) {
        throw new InputError('Kamar tidak ditemukan.')
      }
      return { id: data.id }
    } catch (error) {
      if (isUniqueViolation(error, 'rooms.number')) throw numberTaken()
      throw error
    }
  })

/**
 * A delete hides the room; a permanent delete removes it (ADR-0036). Both are
 * refused while a stay runs in it: a hidden room that is occupied would leave
 * the stay pointing at nothing. The permanent delete is also refused while any
 * stay, past or present, refers to the room.
 */
export const deleteRoom = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    id: rowId(readField(input, 'id'), 'Kamar'),
    permanent: flag(readField(input, 'permanent'), 'Hapus permanen'),
  }))
  .handler(async ({ data }): Promise<{ id: number; permanent: boolean }> => {
    const db = getDb()
    const room = await db
      .prepare('SELECT number FROM rooms WHERE id = ?1')
      .bind(data.id)
      .first<{ number: string }>()
    if (!room) throw new InputError('Kamar tidak ditemukan.')

    const occupied = await db
      .prepare(
        `SELECT tn.name AS name FROM tenancies te
           JOIN tenants tn ON tn.id = te.tenant_id
          WHERE te.room_id = ?1 AND te.move_out_date IS NULL`,
      )
      .bind(data.id)
      .first<{ name: string }>()
    if (occupied) {
      throw new InputError(
        `Kamar ${room.number} masih diisi ${occupied.name}. Catat tanggal keluar dulu.`,
      )
    }

    if (!data.permanent) {
      const result = await db
        .prepare(
          `UPDATE rooms SET deleted_at = ?1, updated_at = ?1
            WHERE id = ?2 AND deleted_at IS NULL`,
        )
        .bind(nowMs(), data.id)
        .run()
      if (changedNothing(result.meta)) {
        throw new InputError('Kamar itu sudah ada di sampah.')
      }
      return { id: data.id, permanent: false }
    }

    const history = await db
      .prepare('SELECT COUNT(*) AS total FROM tenancies WHERE room_id = ?1')
      .bind(data.id)
      .first<{ total: number }>()
    if ((history?.total ?? 0) > 0) {
      throw new InputError(
        `Kamar ${room.number} punya ${history?.total} riwayat sewa, jadi tidak bisa dihapus permanen. Hapus sewa itu dulu, atau pulihkan kamar ini.`,
      )
    }

    const result = await db.prepare('DELETE FROM rooms WHERE id = ?1').bind(data.id).run()
    if (changedNothing(result.meta)) {
      throw new InputError('Kamar tidak ditemukan.')
    }
    return { id: data.id, permanent: true }
  })

export const restoreRoom = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    id: rowId(readField(input, 'id'), 'Kamar'),
  }))
  .handler(async ({ data }): Promise<{ id: number }> => {
    const result = await getDb()
      .prepare(
        `UPDATE rooms SET deleted_at = NULL, updated_at = unixepoch() * 1000
          WHERE id = ?1 AND deleted_at IS NOT NULL`,
      )
      .bind(data.id)
      .run()
    if (changedNothing(result.meta)) {
      throw new InputError('Kamar itu tidak ada di sampah.')
    }
    return { id: data.id }
  })
