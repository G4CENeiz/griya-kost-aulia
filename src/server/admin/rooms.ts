import { createServerFn } from '@tanstack/react-start'

import { type RoomStatus, roomStatus } from '#/lib/room-status'
import { changedNothing, getDb, isUniqueViolation } from '#/server/db'
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
  ORDER BY r.number
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

async function requireRoomType(roomTypeId: number): Promise<void> {
  const found = await getDb()
    .prepare('SELECT id FROM room_types WHERE id = ?1')
    .bind(roomTypeId)
    .first<{ id: number }>()
  if (!found) {
    throw new InputError('Tipe kamar tidak ditemukan.')
  }
}

export const listRooms = createServerFn({ method: 'GET' }).handler(async (): Promise<Room[]> => {
  const { results } = await getDb().prepare(SELECT_ROOMS).all<RoomRow>()
  return (results ?? []).map(toRoom)
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
      if (isUniqueViolation(error, 'rooms.number')) {
        throw new InputError('Nomor kamar itu sudah dipakai.')
      }
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
            WHERE id = ?7`,
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
      if (isUniqueViolation(error, 'rooms.number')) {
        throw new InputError('Nomor kamar itu sudah dipakai.')
      }
      throw error
    }
  })

export const deleteRoom = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    id: rowId(readField(input, 'id'), 'Kamar'),
  }))
  .handler(async ({ data }): Promise<{ id: number }> => {
    const db = getDb()
    const history = await db
      .prepare('SELECT COUNT(*) AS total FROM tenancies WHERE room_id = ?1')
      .bind(data.id)
      .first<{ total: number }>()
    if ((history?.total ?? 0) > 0) {
      throw new InputError('Kamar ini punya riwayat sewa dan tidak bisa dihapus.')
    }

    await db.prepare('DELETE FROM rooms WHERE id = ?1').bind(data.id).run()
    return { id: data.id }
  })
