import { createServerFn } from '@tanstack/react-start'

import { getDb, isUniqueViolation } from '#/server/db'
import { InputError, optionalText, readField, rowId, stringList, text } from '#/server/validation'

/** Tipe Kamar: a class of rooms. It carries the facilities; the room carries the price (ADR-0018). */
export type RoomType = {
  id: number
  name: string
  description: string | null
  facilities: string[]
}

type RoomTypeRow = {
  id: number
  name: string
  description: string | null
  facilities: string
}

export type RoomTypeInput = {
  name: string
  description: string | null
  facilities: string[]
}

const SELECT_ROOM_TYPES = `
  SELECT id, name, description, facilities
  FROM room_types
  ORDER BY name
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
  }
}

function parseRoomTypeInput(input: unknown): RoomTypeInput {
  return {
    name: text(readField(input, 'name'), 'Nama tipe kamar', 80),
    description: optionalText(readField(input, 'description'), 'Keterangan', 300),
    facilities: stringList(readField(input, 'facilities'), 'Fasilitas', 30, 60),
  }
}

export const listRoomTypes = createServerFn({ method: 'GET' }).handler(
  async (): Promise<RoomType[]> => {
    const { results } = await getDb().prepare(SELECT_ROOM_TYPES).all<RoomTypeRow>()
    return (results ?? []).map(toRoomType)
  },
)

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
      if (isUniqueViolation(error, 'room_types.name')) {
        throw new InputError('Nama tipe kamar itu sudah dipakai.')
      }
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
            WHERE id = ?4`,
        )
        .bind(data.name, data.description, JSON.stringify(data.facilities), data.id)
        .run()
      if (!result.meta.changed_db) {
        throw new InputError('Tipe kamar tidak ditemukan.')
      }
      return { id: data.id }
    } catch (error) {
      if (isUniqueViolation(error, 'room_types.name')) {
        throw new InputError('Nama tipe kamar itu sudah dipakai.')
      }
      throw error
    }
  })

export const deleteRoomType = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    id: rowId(readField(input, 'id'), 'Tipe kamar'),
  }))
  .handler(async ({ data }): Promise<{ id: number }> => {
    const db = getDb()
    const used = await db
      .prepare('SELECT COUNT(*) AS total FROM rooms WHERE room_type_id = ?1')
      .bind(data.id)
      .first<{ total: number }>()
    if ((used?.total ?? 0) > 0) {
      throw new InputError(`Tipe kamar ini masih dipakai oleh ${used?.total} kamar.`)
    }

    await db.prepare('DELETE FROM room_types WHERE id = ?1').bind(data.id).run()
    return { id: data.id }
  })
