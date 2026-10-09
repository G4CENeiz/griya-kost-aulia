import { createServerFn } from '@tanstack/react-start'

import {
  type ChargePlan,
  type TermMonths,
  dayAfter,
  isTermMonths,
  planCharges,
} from '#/lib/charge-plan'
import { addDays, isIsoDay } from '#/lib/dates'
import { changedNothing, getDb, isUniqueViolation } from '#/server/db'
import { InputError, flag, readField, rowId } from '#/server/validation'

/** Sewa: the association of one tenant with one room, one row per stay (ADR-0004). */
export type Tenancy = {
  id: number
  roomId: number
  roomNumber: string
  tenantId: number
  tenantName: string
  tenantWhatsapp: string
  startDate: string
  moveOutDate: string | null
  isActive: boolean
  chargeCount: number
  lastPeriodEnd: string | null
  billedAmount: number
  paidAmount: number
}

type TenancyRow = {
  id: number
  room_id: number
  tenant_id: number
  start_date: string
  move_out_date: string | null
  room_number: string
  tenant_name: string
  whatsapp_number: string
  charge_count: number
  last_period_end: string | null
  billed_amount: number
  paid_amount: number
}

export type TenancyTerm = {
  termMonths: TermMonths
  plan: ChargePlan
}

/**
 * Active tenancies first, then the most recent. The paid amount ignores voided
 * payments in this one place, which is the rule ADR-0022 asks for.
 */
const SELECT_TENANCIES = `
  SELECT te.id, te.room_id, te.tenant_id, te.start_date, te.move_out_date,
         r.number AS room_number, tn.name AS tenant_name,
         tn.whatsapp_number,
         (SELECT COUNT(*) FROM charges c WHERE c.tenancy_id = te.id)
           AS charge_count,
         (SELECT MAX(c.period_end) FROM charges c WHERE c.tenancy_id = te.id)
           AS last_period_end,
         (SELECT COALESCE(SUM(c.amount), 0) FROM charges c
           WHERE c.tenancy_id = te.id) AS billed_amount,
         (SELECT COALESCE(SUM(p.amount), 0)
            FROM payments p
            JOIN charges c ON c.id = p.charge_id
           WHERE c.tenancy_id = te.id AND p.voided_at IS NULL) AS paid_amount
  FROM tenancies te
  JOIN rooms r ON r.id = te.room_id
  JOIN tenants tn ON tn.id = te.tenant_id
  ORDER BY (te.move_out_date IS NULL) DESC, te.start_date DESC, te.id DESC
`

function toTenancy(row: TenancyRow): Tenancy {
  return {
    id: row.id,
    roomId: row.room_id,
    roomNumber: row.room_number,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    tenantWhatsapp: row.whatsapp_number,
    startDate: row.start_date,
    moveOutDate: row.move_out_date,
    isActive: row.move_out_date === null,
    chargeCount: row.charge_count,
    lastPeriodEnd: row.last_period_end,
    billedAmount: row.billed_amount,
    paidAmount: row.paid_amount,
  }
}

function parseTerm(input: unknown): TenancyTerm {
  const termMonths = readField(input, 'termMonths')
  if (!isTermMonths(termMonths)) {
    throw new InputError('Masa sewa harus 1, 3, 6, 9, atau 12 bulan.')
  }
  const plan = readField(input, 'plan')
  if (plan !== 'monthly' && plan !== 'block') {
    throw new InputError('Cara penagihan harus bulanan atau satu blok.')
  }
  return { termMonths, plan }
}

function parseDay(value: unknown, label: string): string {
  if (!isIsoDay(value)) {
    throw new InputError(`${label} harus berupa tanggal yang benar.`)
  }
  return value
}

async function requireRoom(roomId: number): Promise<{ number: string; price: number }> {
  const room = await getDb()
    .prepare('SELECT number, price FROM rooms WHERE id = ?1')
    .bind(roomId)
    .first<{ number: string; price: number }>()
  if (!room) throw new InputError('Kamar tidak ditemukan.')
  return room
}

async function requireTenant(tenantId: number): Promise<{ name: string }> {
  const tenant = await getDb()
    .prepare('SELECT name FROM tenants WHERE id = ?1 AND deleted_at IS NULL')
    .bind(tenantId)
    .first<{ name: string }>()
  if (!tenant) throw new InputError('Penghuni tidak ditemukan.')
  return tenant
}

async function requireFree(roomId: number, tenantId: number): Promise<void> {
  const db = getDb()
  const busyRoom = await db
    .prepare(
      `SELECT r.number FROM tenancies te
         JOIN rooms r ON r.id = te.room_id
        WHERE te.room_id = ?1 AND te.move_out_date IS NULL`,
    )
    .bind(roomId)
    .first<{ number: string }>()
  if (busyRoom) {
    throw new InputError(`Kamar ${busyRoom.number} masih terisi.`)
  }

  const busyTenant = await db
    .prepare(
      `SELECT tn.name FROM tenancies te
         JOIN tenants tn ON tn.id = te.tenant_id
        WHERE te.tenant_id = ?1 AND te.move_out_date IS NULL`,
    )
    .bind(tenantId)
    .first<{ name: string }>()
  if (busyTenant) {
    throw new InputError(`${busyTenant.name} masih punya sewa yang berjalan.`)
  }
}

/**
 * Writes the charges of one term. The caller has already created the tenancy.
 * A failure deletes the charges it wrote, so no term is ever half recorded.
 */
async function insertCharges(
  tenancyId: number,
  charges: ReturnType<typeof planCharges>,
): Promise<void> {
  const db = getDb()
  try {
    await db.batch(
      charges.map((charge) =>
        db
          .prepare(
            `INSERT INTO charges
               (tenancy_id, period_start, period_end, amount, due_date, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, unixepoch() * 1000)`,
          )
          .bind(tenancyId, charge.periodStart, charge.periodEnd, charge.amount, charge.dueDate),
      ),
    )
  } catch (error) {
    if (isUniqueViolation(error, 'tenancies')) {
      throw new InputError('Data sewa berubah. Coba lagi.')
    }
    if (isUniqueViolation(error, 'charges.tenancy_id')) {
      throw new InputError('Tagihan untuk periode itu sudah ada.')
    }
    throw error
  }
}

export const listTenancies = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Tenancy[]> => {
    const { results } = await getDb().prepare(SELECT_TENANCIES).all<TenancyRow>()
    return (results ?? []).map(toTenancy)
  },
)

/**
 * Starting a tenancy creates all charges for its term in one operation
 * (ADR-0013).
 */
export const startTenancy = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    roomId: rowId(readField(input, 'roomId'), 'Kamar'),
    tenantId: rowId(readField(input, 'tenantId'), 'Penghuni'),
    startDate: parseDay(readField(input, 'startDate'), 'Tanggal mulai'),
    ...parseTerm(input),
  }))
  .handler(async ({ data }): Promise<{ id: number; chargeCount: number }> => {
    await requireFree(data.roomId, data.tenantId)
    const room = await requireRoom(data.roomId)
    await requireTenant(data.tenantId)

    const db = getDb()
    const charges = planCharges({
      startDate: data.startDate,
      termMonths: data.termMonths,
      plan: data.plan,
      monthlyPrice: room.price,
    })

    const row = await db
      .prepare(
        `INSERT INTO tenancies (room_id, tenant_id, start_date, updated_at)
           VALUES (?1, ?2, ?3, unixepoch() * 1000)
           RETURNING id`,
      )
      .bind(data.roomId, data.tenantId, data.startDate)
      .first<{ id: number }>()
    if (!row) throw new Error('Sewa gagal disimpan.')

    try {
      await insertCharges(row.id, charges)
    } catch (error) {
      // Compensate: a tenancy without its charges is not a valid state.
      await db.prepare('DELETE FROM tenancies WHERE id = ?1').bind(row.id).run()
      throw error
    }

    return { id: row.id, chargeCount: charges.length }
  })

/** Perpanjang: the charges of another term on the existing tenancy. */
export const renewTenancy = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    tenancyId: rowId(readField(input, 'tenancyId'), 'Sewa'),
    ...parseTerm(input),
  }))
  .handler(async ({ data }): Promise<{ id: number; chargeCount: number }> => {
    const db = getDb()
    const tenancy = await db
      .prepare(
        `SELECT te.id, te.start_date, te.move_out_date, r.price
             FROM tenancies te
             JOIN rooms r ON r.id = te.room_id
            WHERE te.id = ?1`,
      )
      .bind(data.tenancyId)
      .first<{
        id: number
        start_date: string
        move_out_date: string | null
        price: number
      }>()
    if (!tenancy) throw new InputError('Sewa tidak ditemukan.')
    if (tenancy.move_out_date !== null) {
      throw new InputError('Sewa ini sudah berakhir.')
    }

    const last = await db
      .prepare('SELECT MAX(period_end) AS period_end FROM charges WHERE tenancy_id = ?1')
      .bind(data.tenancyId)
      .first<{ period_end: string | null }>()

    const startDate = last?.period_end ? dayAfter(last.period_end) : tenancy.start_date

    const charges = planCharges({
      startDate,
      termMonths: data.termMonths,
      plan: data.plan,
      monthlyPrice: tenancy.price,
    })

    await insertCharges(data.tenancyId, charges)
    return { id: data.tenancyId, chargeCount: charges.length }
  })

/**
 * Pindah kamar: ends the tenancy on the given day and opens a new one for the
 * same tenant in another room the next day.
 */
export const moveTenancy = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    tenancyId: rowId(readField(input, 'tenancyId'), 'Sewa'),
    roomId: rowId(readField(input, 'roomId'), 'Kamar'),
    moveOutDate: parseDay(readField(input, 'moveOutDate'), 'Tanggal keluar'),
    ...parseTerm(input),
  }))
  .handler(async ({ data }): Promise<{ id: number; chargeCount: number }> => {
    const db = getDb()
    const tenancy = await db
      .prepare(
        `SELECT id, tenant_id, start_date, move_out_date
             FROM tenancies WHERE id = ?1`,
      )
      .bind(data.tenancyId)
      .first<{
        id: number
        tenant_id: number
        start_date: string
        move_out_date: string | null
      }>()
    if (!tenancy) throw new InputError('Sewa tidak ditemukan.')
    if (tenancy.move_out_date !== null) {
      throw new InputError('Sewa ini sudah berakhir.')
    }
    if (data.moveOutDate < tenancy.start_date) {
      throw new InputError('Tanggal keluar tidak boleh sebelum mulai sewa.')
    }

    const room = await requireRoom(data.roomId)
    const startDate = addDays(data.moveOutDate, 1)
    const charges = planCharges({
      startDate,
      termMonths: data.termMonths,
      plan: data.plan,
      monthlyPrice: room.price,
    })

    const ended = await db
      .prepare(
        `UPDATE tenancies
              SET move_out_date = ?1, updated_at = unixepoch() * 1000
            WHERE id = ?2 AND move_out_date IS NULL`,
      )
      .bind(data.moveOutDate, data.tenancyId)
      .run()
    if (changedNothing(ended.meta)) {
      throw new InputError('Sewa ini sudah berakhir.')
    }

    const row = await db
      .prepare(
        `INSERT INTO tenancies (room_id, tenant_id, start_date, updated_at)
           VALUES (?1, ?2, ?3, unixepoch() * 1000)
           RETURNING id`,
      )
      .bind(data.roomId, tenancy.tenant_id, startDate)
      .first<{ id: number }>()
    if (!row) {
      // Put the old tenancy back so the move is all or nothing.
      await db
        .prepare(
          `UPDATE tenancies SET move_out_date = NULL
              WHERE id = ?1`,
        )
        .bind(data.tenancyId)
        .run()
      throw new Error('Pindah kamar gagal disimpan.')
    }

    try {
      await insertCharges(row.id, charges)
    } catch (error) {
      await db.batch([
        db.prepare('DELETE FROM tenancies WHERE id = ?1').bind(row.id),
        db.prepare('UPDATE tenancies SET move_out_date = NULL WHERE id = ?1').bind(data.tenancyId),
      ])
      throw error
    }

    return { id: row.id, chargeCount: charges.length }
  })

/**
 * Move-out records a date only (ADR-0023). A null day reopens the tenancy,
 * which is how a mistyped move-out date is undone.
 */
export const setMoveOutDate = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const moveOutDate = readField(input, 'moveOutDate')
    return {
      tenancyId: rowId(readField(input, 'tenancyId'), 'Sewa'),
      moveOutDate: moveOutDate === null ? null : parseDay(moveOutDate, 'Tanggal keluar'),
    }
  })
  .handler(async ({ data }): Promise<{ id: number }> => {
    const db = getDb()
    const tenancy = await db
      .prepare('SELECT start_date FROM tenancies WHERE id = ?1')
      .bind(data.tenancyId)
      .first<{ start_date: string }>()
    if (!tenancy) throw new InputError('Sewa tidak ditemukan.')

    if (data.moveOutDate !== null) {
      if (data.moveOutDate < tenancy.start_date) {
        throw new InputError('Tanggal keluar tidak boleh sebelum mulai sewa.')
      }
      const other = await db
        .prepare(
          `SELECT tn.name AS tenant_name FROM tenancies te
             JOIN tenants tn ON tn.id = te.tenant_id
            WHERE te.id = ?1`,
        )
        .bind(data.tenancyId)
        .first<{ tenant_name: string }>()
      if (other) {
        const busy = await db
          .prepare(
            `SELECT te.id FROM tenancies te
              WHERE te.tenant_id = (SELECT tenant_id FROM tenancies WHERE id = ?1)
                AND te.id != ?1 AND te.move_out_date IS NULL`,
          )
          .bind(data.tenancyId)
          .first<{ id: number }>()
        if (busy) {
          throw new InputError(`${other.tenant_name} masih punya sewa lain yang berjalan.`)
        }
      }
    }

    const result = await db
      .prepare(
        `UPDATE tenancies
            SET move_out_date = ?1, updated_at = unixepoch() * 1000
          WHERE id = ?2`,
      )
      .bind(data.moveOutDate, data.tenancyId)
      .run()
    if (changedNothing(result.meta)) {
      throw new InputError('Sewa tidak ditemukan.')
    }
    return { id: data.tenancyId }
  })

export const deleteTenancy = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    tenancyId: rowId(readField(input, 'tenancyId'), 'Sewa'),
    confirm: flag(readField(input, 'confirm'), 'Konfirmasi'),
  }))
  .handler(async ({ data }): Promise<{ id: number }> => {
    const db = getDb()
    const charges = await db
      .prepare('SELECT COUNT(*) AS total FROM charges WHERE tenancy_id = ?1')
      .bind(data.tenancyId)
      .first<{ total: number }>()
    if ((charges?.total ?? 0) > 0) {
      throw new InputError('Sewa ini sudah punya tagihan. Hapus tagihannya dulu.')
    }

    const result = await db
      .prepare('DELETE FROM tenancies WHERE id = ?1')
      .bind(data.tenancyId)
      .run()
    if (changedNothing(result.meta)) {
      throw new InputError('Sewa tidak ditemukan.')
    }
    return { id: data.tenancyId }
  })
