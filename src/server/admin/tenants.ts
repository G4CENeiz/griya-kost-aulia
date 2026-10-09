import { createServerFn } from '@tanstack/react-start'

import { changedNothing, getDb, nowMs } from '#/server/db'
import { InputError, flag, optionalText, readField, rowId, text } from '#/server/validation'

/** Penghuni: a person who rents a room. */
export type Tenant = {
  id: number
  name: string
  whatsappNumber: string
  identityNumber: string | null
  notes: string | null
  activeTenancy: { roomNumber: string; startDate: string } | null
}

/** A tenant in the trash: hidden from every list, and restorable (ADR-0036). */
export type DeletedTenant = {
  id: number
  name: string
  whatsappNumber: string
  deletedAt: number
  tenancyCount: number
}

/** The individual view: the record and the stays that reference it. */
export type TenantDetail = {
  tenant: Tenant
  tenancies: {
    id: number
    roomNumber: string
    startDate: string
    moveOutDate: string | null
    chargeCount: number
    billedAmount: number
    paidAmount: number
  }[]
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

/** A live tenant, with the tenancy that is running when there is one. */
const SELECT_TENANTS = `
  SELECT t.id, t.name, t.whatsapp_number, t.identity_number, t.notes,
         r.number AS room_number, te.start_date
  FROM tenants t
  LEFT JOIN tenancies te
    ON te.tenant_id = t.id AND te.move_out_date IS NULL
  LEFT JOIN rooms r ON r.id = te.room_id
  WHERE t.deleted_at IS NULL
  ORDER BY t.name
`

/** One live tenant by id, for the individual view. */
const SELECT_TENANT = `
  SELECT t.id, t.name, t.whatsapp_number, t.identity_number, t.notes,
         r.number AS room_number, te.start_date
  FROM tenants t
  LEFT JOIN tenancies te
    ON te.tenant_id = t.id AND te.move_out_date IS NULL
  LEFT JOIN rooms r ON r.id = te.room_id
  WHERE t.id = ?1 AND t.deleted_at IS NULL
`

/**
 * One tenant by id whatever its state, for a permanent delete. A record in the
 * trash has deleted_at set, so the live lookup cannot reach it.
 */
const SELECT_ANY_TENANT = `
  SELECT t.id, t.name, t.whatsapp_number, t.identity_number, t.notes,
         r.number AS room_number, te.start_date
  FROM tenants t
  LEFT JOIN tenancies te
    ON te.tenant_id = t.id AND te.move_out_date IS NULL
  LEFT JOIN rooms r ON r.id = te.room_id
  WHERE t.id = ?1
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

async function requireTenant(id: number): Promise<TenantRow> {
  const row = await getDb().prepare(SELECT_TENANT).bind(id).first<TenantRow>()
  if (!row) throw new InputError('Penghuni tidak ditemukan.')
  return row
}

async function requireAnyTenant(id: number): Promise<TenantRow> {
  const row = await getDb().prepare(SELECT_ANY_TENANT).bind(id).first<TenantRow>()
  if (!row) throw new InputError('Penghuni tidak ditemukan.')
  return row
}

export const listTenants = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Tenant[]> => {
    const { results } = await getDb().prepare(SELECT_TENANTS).all<TenantRow>()
    return (results ?? []).map(toTenant)
  },
)

export const listDeletedTenants = createServerFn({ method: 'GET' }).handler(
  async (): Promise<DeletedTenant[]> => {
    const { results } = await getDb()
      .prepare(
        `SELECT t.id, t.name, t.whatsapp_number, t.deleted_at,
                (SELECT COUNT(*) FROM tenancies te WHERE te.tenant_id = t.id)
                  AS tenancy_count
           FROM tenants t
          WHERE t.deleted_at IS NOT NULL
          ORDER BY t.deleted_at DESC`,
      )
      .all<{
        id: number
        name: string
        whatsapp_number: string
        deleted_at: number
        tenancy_count: number
      }>()
    return (results ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      whatsappNumber: row.whatsapp_number,
      deletedAt: row.deleted_at,
      tenancyCount: row.tenancy_count,
    }))
  },
)

export const getTenant = createServerFn({ method: 'GET' })
  .validator((input: unknown) => ({
    id: rowId(readField(input, 'id'), 'Penghuni'),
  }))
  .handler(async ({ data }): Promise<TenantDetail> => {
    const tenant = toTenant(await requireTenant(data.id))
    const { results } = await getDb()
      .prepare(
        `SELECT te.id, r.number AS room_number, te.start_date, te.move_out_date,
                (SELECT COUNT(*) FROM charges c WHERE c.tenancy_id = te.id)
                  AS charge_count,
                (SELECT COALESCE(SUM(c.amount), 0) FROM charges c
                  WHERE c.tenancy_id = te.id) AS billed_amount,
                (SELECT COALESCE(SUM(p.amount), 0)
                   FROM payments p
                   JOIN charges c ON c.id = p.charge_id
                  WHERE c.tenancy_id = te.id AND p.voided_at IS NULL)
                  AS paid_amount
           FROM tenancies te
           JOIN rooms r ON r.id = te.room_id
          WHERE te.tenant_id = ?1
          ORDER BY te.start_date DESC`,
      )
      .bind(data.id)
      .all<{
        id: number
        room_number: string
        start_date: string
        move_out_date: string | null
        charge_count: number
        billed_amount: number
        paid_amount: number
      }>()

    return {
      tenant,
      tenancies: (results ?? []).map((row) => ({
        id: row.id,
        roomNumber: row.room_number,
        startDate: row.start_date,
        moveOutDate: row.move_out_date,
        chargeCount: row.charge_count,
        billedAmount: row.billed_amount,
        paidAmount: row.paid_amount,
      })),
    }
  })

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
          WHERE id = ?5 AND deleted_at IS NULL`,
      )
      .bind(data.name, data.whatsappNumber, data.identityNumber, data.notes, data.id)
      .run()
    if (changedNothing(result.meta)) {
      throw new InputError('Penghuni tidak ditemukan.')
    }
    return { id: data.id }
  })

/**
 * A delete hides the record and a permanent delete removes it (ADR-0036). A
 * tenant with tenancy history can be hidden, because hiding cannot break the
 * ledger, but not removed, because the charges would lose their name.
 */
export const deleteTenant = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    id: rowId(readField(input, 'id'), 'Penghuni'),
    permanent: flag(readField(input, 'permanent'), 'Hapus permanen'),
  }))
  .handler(async ({ data }): Promise<{ id: number; permanent: boolean }> => {
    const db = getDb()
    const tenant = await requireAnyTenant(data.id)

    // A hidden tenant with a running stay would leave the room occupied by
    // somebody no list can reach. End the stay first.
    const running = await db
      .prepare(
        `SELECT r.number AS number
           FROM tenancies te
           JOIN rooms r ON r.id = te.room_id
          WHERE te.tenant_id = ?1 AND te.move_out_date IS NULL`,
      )
      .bind(data.id)
      .first<{ number: string }>()
    if (running) {
      throw new InputError(
        `${tenant.name} masih menyewa kamar ${running.number}. Akhiri sewanya dulu sebelum menghapus.`,
      )
    }

    if (!data.permanent) {
      const result = await db
        .prepare(
          `UPDATE tenants SET deleted_at = ?1, updated_at = ?1
            WHERE id = ?2 AND deleted_at IS NULL`,
        )
        .bind(nowMs(), data.id)
        .run()
      if (changedNothing(result.meta)) {
        throw new InputError('Penghuni itu sudah ada di sampah.')
      }
      return { id: data.id, permanent: false }
    }

    const history = await db
      .prepare('SELECT COUNT(*) AS total FROM tenancies WHERE tenant_id = ?1')
      .bind(data.id)
      .first<{ total: number }>()
    if ((history?.total ?? 0) > 0) {
      throw new InputError(
        `${tenant.name} punya ${history?.total} riwayat sewa, jadi tidak bisa dihapus permanen. Hapus sewa itu dulu, atau pulihkan penghuni ini.`,
      )
    }

    const result = await db.prepare('DELETE FROM tenants WHERE id = ?1').bind(data.id).run()
    if (changedNothing(result.meta)) {
      throw new InputError('Penghuni tidak ditemukan.')
    }
    return { id: data.id, permanent: true }
  })

export const restoreTenant = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    id: rowId(readField(input, 'id'), 'Penghuni'),
  }))
  .handler(async ({ data }): Promise<{ id: number }> => {
    const result = await getDb()
      .prepare(
        `UPDATE tenants
            SET deleted_at = NULL, updated_at = unixepoch() * 1000
          WHERE id = ?1 AND deleted_at IS NOT NULL`,
      )
      .bind(data.id)
      .run()
    if (changedNothing(result.meta)) {
      throw new InputError('Penghuni itu tidak ada di sampah.')
    }
    return { id: data.id }
  })
