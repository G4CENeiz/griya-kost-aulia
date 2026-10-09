import { createServerFn } from '@tanstack/react-start'

import { type RoomStatus, roomStatus } from '#/lib/room-status'
import { changedNothing, getDb, isUniqueViolation, nowMs } from '#/server/db'
import {
  InputError,
  flag,
  optionalText,
  readField,
  rowId,
  stringList,
  text,
} from '#/server/validation'

/** Tipe Kamar: a class of rooms. It carries the facilities; the room carries the price (ADR-0018). */
export type RoomType = {
  id: number
  name: string
  description: string | null
  facilities: string[]
  roomCount: number
}

/** A room type in the trash (ADR-0036). */
export type DeletedRoomType = {
  id: number
  name: string
  deletedAt: number
  roomCount: number
}

/** The individual view: the type and the rooms that use it. */
export type RoomTypeDetail = {
  roomType: RoomType
  rooms: {
    id: number
    number: string
    floor: number
    price: number
    status: RoomStatus
  }[]
}

type RoomTypeRow = {
  id: number
  name: string
  description: string | null
  facilities: string
  room_count: number
}

export type RoomTypeInput = {
  name: string
  description: string | null
  facilities: string[]
}

/** Live room types, with the number of live rooms that use each one. */
const SELECT_ROOM_TYPES = `
  SELECT rt.id, rt.name, rt.description, rt.facilities,
         (SELECT COUNT(*) FROM rooms r
           WHERE r.room_type_id = rt.id AND r.deleted_at IS NULL) AS room_count
  FROM room_types rt
  WHERE rt.deleted_at IS NULL
  ORDER BY rt.name
`

const SELECT_ROOM_TYPE = `
  SELECT rt.id, rt.name, rt.description, rt.facilities,
         (SELECT COUNT(*) FROM rooms r
           WHERE r.room_type_id = rt.id AND r.deleted_at IS NULL) AS room_count
  FROM room_types rt
  WHERE rt.id = ?1 AND rt.deleted_at IS NULL
`

function toFacilities(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function toRoomType(row: RoomTypeRow): RoomType {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    facilities: toFacilities(row.facilities),
    roomCount: row.room_count,
  }
}

function parseRoomTypeInput(input: unknown): RoomTypeInput {
  return {
    name: text(readField(input, 'name'), 'Nama tipe kamar', 80),
    description: optionalText(readField(input, 'description'), 'Keterangan', 300),
    facilities: stringList(readField(input, 'facilities'), 'Fasilitas', 30, 60),
  }
}

/**
 * The name is unique across the table, so a name in the trash blocks a new row
 * (ADR-0037). The message points at the trash, which is where the value is
 * freed.
 */
function nameTaken(): InputError {
  return new InputError(
    'Nama tipe kamar itu sudah dipakai, termasuk oleh baris di Sampah. Pulihkan atau hapus permanen baris itu dulu.',
  )
}

export const listRoomTypes = createServerFn({ method: 'GET' }).handler(
  async (): Promise<RoomType[]> => {
    const { results } = await getDb().prepare(SELECT_ROOM_TYPES).all<RoomTypeRow>()
    return (results ?? []).map(toRoomType)
  },
)

export const listDeletedRoomTypes = createServerFn({ method: 'GET' }).handler(
  async (): Promise<DeletedRoomType[]> => {
    const { results } = await getDb()
      .prepare(
        `SELECT rt.id, rt.name, rt.deleted_at,
                (SELECT COUNT(*) FROM rooms r WHERE r.room_type_id = rt.id)
                  AS room_count
           FROM room_types rt
          WHERE rt.deleted_at IS NOT NULL
          ORDER BY rt.deleted_at DESC`,
      )
      .all<{
        id: number
        name: string
        deleted_at: number
        room_count: number
      }>()
    return (results ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      deletedAt: row.deleted_at,
      roomCount: row.room_count,
    }))
  },
)

export const getRoomType = createServerFn({ method: 'GET' })
  .validator((input: unknown) => ({
    id: rowId(readField(input, 'id'), 'Tipe kamar'),
  }))
  .handler(async ({ data }): Promise<RoomTypeDetail> => {
    const row = await getDb().prepare(SELECT_ROOM_TYPE).bind(data.id).first<RoomTypeRow>()
    if (!row) throw new InputError('Tipe kamar tidak ditemukan.')

    const { results } = await getDb()
      .prepare(
        `SELECT r.id, r.number, r.floor, r.price, r.is_unavailable,
                (SELECT COUNT(*) FROM tenancies te
                  WHERE te.room_id = r.id AND te.move_out_date IS NULL)
                  AS active_tenancies
           FROM rooms r
          WHERE r.room_type_id = ?1 AND r.deleted_at IS NULL
          ORDER BY r.number`,
      )
      .bind(data.id)
      .all<{
        id: number
        number: string
        floor: number
        price: number
        is_unavailable: number
        active_tenancies: number
      }>()

    return {
      roomType: toRoomType(row),
      rooms: (results ?? []).map((room) => ({
        id: room.id,
        number: room.number,
        floor: room.floor,
        price: room.price,
        status: roomStatus({
          isUnavailable: room.is_unavailable === 1,
          activeTenancies: room.active_tenancies,
        }),
      })),
    }
  })

export const createRoomType = createServerFn({ method: 'POST' })
  .validator(parseRoomTypeInput)
  .handler(async ({ data }): Promise<{ id: number }> => {
    try {
      const row = await getDb()
        .prepare(
          `INSERT INTO room_types (name, description, facilities, updated_at)
           VALUES (?1, ?2, ?3, unixepoch() * 1000)
           RETURNING id`,
        )
        .bind(data.name, data.description, JSON.stringify(data.facilities))
        .first<{ id: number }>()
      if (!row) throw new Error('Tipe kamar gagal disimpan.')
      return { id: row.id }
    } catch (error) {
      if (isUniqueViolation(error, 'room_types.name')) throw nameTaken()
      throw error
    }
  })

export const updateRoomType = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    id: rowId(readField(input, 'id'), 'Tipe kamar'),
    ...parseRoomTypeInput(input),
  }))
  .handler(async ({ data }): Promise<{ id: number }> => {
    try {
      const result = await getDb()
        .prepare(
          `UPDATE room_types
              SET name = ?1, description = ?2, facilities = ?3,
                  updated_at = unixepoch() * 1000
            WHERE id = ?4 AND deleted_at IS NULL`,
        )
        .bind(data.name, data.description, JSON.stringify(data.facilities), data.id)
        .run()
      if (changedNothing(result.meta)) {
        throw new InputError('Tipe kamar tidak ditemukan.')
      }
      return { id: data.id }
    } catch (error) {
      if (isUniqueViolation(error, 'room_types.name')) throw nameTaken()
      throw error
    }
  })

/**
 * A delete hides the room type; a permanent delete removes it (ADR-0036). Both
 * are refused while a room uses it: the hide, because a live room would point
 * at a hidden type, and the permanent delete, because the room would lose its
 * type. The count in the message names what blocks it.
 */
export const deleteRoomType = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    id: rowId(readField(input, 'id'), 'Tipe kamar'),
    permanent: flag(readField(input, 'permanent'), 'Hapus permanen'),
  }))
  .handler(async ({ data }): Promise<{ id: number; permanent: boolean }> => {
    const db = getDb()
    const roomType = await db
      .prepare('SELECT id, name FROM room_types WHERE id = ?1')
      .bind(data.id)
      .first<{ id: number; name: string }>()
    if (!roomType) throw new InputError('Tipe kamar tidak ditemukan.')

    const used = await db
      .prepare(
        `SELECT COUNT(*) AS total FROM rooms
          WHERE room_type_id = ?1 AND deleted_at IS NULL`,
      )
      .bind(data.id)
      .first<{ total: number }>()
    if ((used?.total ?? 0) > 0) {
      throw new InputError(
        `Tipe kamar ${roomType.name} masih dipakai oleh ${used?.total} kamar. Pindahkan kamar itu ke tipe lain dulu.`,
      )
    }

    if (!data.permanent) {
      const result = await db
        .prepare(
          `UPDATE room_types SET deleted_at = ?1, updated_at = ?1
            WHERE id = ?2 AND deleted_at IS NULL`,
        )
        .bind(nowMs(), data.id)
        .run()
      if (changedNothing(result.meta)) {
        throw new InputError('Tipe kamar itu sudah ada di sampah.')
      }
      return { id: data.id, permanent: false }
    }

    // Every room row still points at the type, deleted or not, so the type
    // cannot be removed while one exists.
    const referenced = await db
      .prepare('SELECT COUNT(*) AS total FROM rooms WHERE room_type_id = ?1')
      .bind(data.id)
      .first<{ total: number }>()
    if ((referenced?.total ?? 0) > 0) {
      throw new InputError(
        `Masih ada ${referenced?.total} baris kamar, termasuk di Sampah, yang memakai tipe ini. Hapus permanen kamar itu dulu.`,
      )
    }

    const result = await db.prepare('DELETE FROM room_types WHERE id = ?1').bind(data.id).run()
    if (changedNothing(result.meta)) {
      throw new InputError('Tipe kamar tidak ditemukan.')
    }
    return { id: data.id, permanent: true }
  })

export const restoreRoomType = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    id: rowId(readField(input, 'id'), 'Tipe kamar'),
  }))
  .handler(async ({ data }): Promise<{ id: number }> => {
    const result = await getDb()
      .prepare(
        `UPDATE room_types
            SET deleted_at = NULL, updated_at = unixepoch() * 1000
          WHERE id = ?1 AND deleted_at IS NOT NULL`,
      )
      .bind(data.id)
      .run()
    if (changedNothing(result.meta)) {
      throw new InputError('Tipe kamar itu tidak ada di sampah.')
    }
    return { id: data.id }
  })
