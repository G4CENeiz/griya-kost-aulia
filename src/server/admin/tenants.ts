import { createServerFn } from '@tanstack/react-start'

import { changedNothing, getDb, isUniqueViolation } from '#/server/db'
import { InputError, optionalText, readField, rowId, text } from '#/server/validation'

/** Penghuni: a person who rents a room. */
export type Tenant = {
  id: number
  name: string
  whatsappNumber: string
  identityNumber: string | null
  notes: string | null
  activeTenancy: { roomNumber: string; startDate: string } | null
}

type TenantRow = {
  id: number
  name: string
  whatsapp_number: string
  identity_number: string | null
  notes: string | null
  room_number: string | null
  start_date: string | null
}

export type TenantInput = {
  name: string
  whatsappNumber: string
  identityNumber: string | null
  notes: string | null
}

const SELECT_TENANTS = `
  SELECT t.id, t.name, t.whatsapp_number, t.identity_number, t.notes,
         r.number AS room_number, te.start_date
  FROM tenants t
  LEFT JOIN tenancies te
    ON te.tenant_id = t.id AND te.move_out_date IS NULL
  LEFT JOIN rooms r ON r.id = te.room_id
  ORDER BY t.name
`

function toTenant(row: TenantRow): Tenant {
  return {
    id: row.id,
    name: row.name,
    whatsappNumber: row.whatsapp_number,
    identityNumber: row.identity_number,
    notes: row.notes,
    activeTenancy:
      row.room_number && row.start_date
        ? { roomNumber: row.room_number, startDate: row.start_date }
        : null,
  }
}

function parseTenantInput(input: unknown): TenantInput {
  return {
    name: text(readField(input, 'name'), 'Nama penghuni', 120),
    whatsappNumber: text(readField(input, 'whatsappNumber'), 'Nomor WhatsApp', 30),
    identityNumber: optionalText(readField(input, 'identityNumber'), 'Nomor identitas', 60),
    notes: optionalText(readField(input, 'notes'), 'Catatan', 300),
  }
}

export const listTenants = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Tenant[]> => {
    const { results } = await getDb().prepare(SELECT_TENANTS).all<TenantRow>()
    return (results ?? []).map(toTenant)
  },
)

export const createTenant = createServerFn({ method: 'POST' })
  .validator(parseTenantInput)
  .handler(async ({ data }): Promise<{ id: number }> => {
    const row = await getDb()
      .prepare(
        `INSERT INTO tenants
           (name, whatsapp_number, identity_number, notes, updated_at)
         VALUES (?1, ?2, ?3, ?4, unixepoch() * 1000)
         RETURNING id`,
      )
      .bind(data.name, data.whatsappNumber, data.identityNumber, data.notes)
      .first<{ id: number }>()
    if (!row) throw new Error('Penghuni gagal disimpan.')
    return { id: row.id }
  })

export const updateTenant = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    id: rowId(readField(input, 'id'), 'Penghuni'),
    ...parseTenantInput(input),
  }))
  .handler(async ({ data }): Promise<{ id: number }> => {
    const result = await getDb()
      .prepare(
        `UPDATE tenants
            SET name = ?1, whatsapp_number = ?2, identity_number = ?3,
                notes = ?4, updated_at = unixepoch() * 1000
          WHERE id = ?5`,
      )
      .bind(data.name, data.whatsappNumber, data.identityNumber, data.notes, data.id)
      .run()
    if (changedNothing(result.meta)) {
      throw new InputError('Penghuni tidak ditemukan.')
    }
    return { id: data.id }
  })

export const deleteTenant = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    id: rowId(readField(input, 'id'), 'Penghuni'),
  }))
  .handler(async ({ data }): Promise<{ id: number }> => {
    const db = getDb()
    const history = await db
      .prepare('SELECT COUNT(*) AS total FROM tenancies WHERE tenant_id = ?1')
      .bind(data.id)
      .first<{ total: number }>()
    if ((history?.total ?? 0) > 0) {
      throw new InputError('Penghuni ini punya riwayat sewa dan tidak bisa dihapus.')
    }

    try {
      await db.prepare('DELETE FROM tenants WHERE id = ?1').bind(data.id).run()
    } catch (error) {
      // The partial unique index on the active tenancy is the last word.
      if (isUniqueViolation(error, 'tenancies')) {
        throw new InputError('Penghuni ini masih punya sewa yang berjalan.')
      }
      throw error
    }
    return { id: data.id }
  })
