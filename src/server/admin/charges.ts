import { createServerFn } from '@tanstack/react-start'

import { isIsoDay } from '#/lib/dates'
import { changedNothing, getDb, nowMs } from '#/server/db'
import { InputError, flag, readField, rowId, wholeNumber } from '#/server/validation'

/** Tagihan: an amount owed for one payment period of a tenancy. */
export type Charge = {
  id: number
  tenancyId: number
  roomNumber: string
  tenantName: string
  periodStart: string
  periodEnd: string
  amount: number
  dueDate: string
  paidAmount: number
  balance: number
  paymentCount: number
  isOverdue: boolean
}

/** A charge in the trash (ADR-0036). */
export type DeletedCharge = {
  id: number
  roomNumber: string
  tenantName: string
  periodStart: string
  periodEnd: string
  amount: number
  deletedAt: number
  paymentCount: number
}

/** The individual view: the charge and the payments against it. */
export type ChargeDetail = {
  charge: Charge
  payments: {
    id: number
    amount: number
    date: string
    method: 'cash' | 'transfer'
    note: string | null
    voidedAt: number | null
    voidReason: string | null
  }[]
}

type ChargeRow = {
  id: number
  tenancy_id: number
  room_number: string
  tenant_name: string
  period_start: string
  period_end: string
  amount: number
  due_date: string
  paid_amount: number
  payment_count: number
}

export type CreateChargesInput = {
  tenancyId: number
  startDate: string
  termMonths: number
  plan: 'monthly' | 'block'
}

/**
 * The paid amount and the payment count ignore voided payments here, and only
 * here, which is the single filter ADR-0022 asks for. balance and isOverdue are
 * derived, never stored (ADR-0013).
 */
const CHARGE_SELECT = `
  SELECT c.id, c.tenancy_id, c.period_start, c.period_end, c.amount, c.due_date,
         r.number AS room_number, tn.name AS tenant_name,
         (SELECT COALESCE(SUM(p.amount), 0) FROM payments p
           WHERE p.charge_id = c.id AND p.voided_at IS NULL) AS paid_amount,
         (SELECT COUNT(*) FROM payments p
           WHERE p.charge_id = c.id AND p.voided_at IS NULL) AS payment_count
  FROM charges c
  JOIN tenancies te ON te.id = c.tenancy_id
  JOIN rooms r ON r.id = te.room_id
  JOIN tenants tn ON tn.id = te.tenant_id
  WHERE c.deleted_at IS NULL
`

const ORDER_CHARGES = ' ORDER BY c.period_start, r.number'

function toCharge(row: ChargeRow, today: string): Charge {
  return {
    id: row.id,
    tenancyId: row.tenancy_id,
    roomNumber: row.room_number,
    tenantName: row.tenant_name,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    amount: row.amount,
    dueDate: row.due_date,
    paidAmount: row.paid_amount,
    balance: row.amount - row.paid_amount,
    paymentCount: row.payment_count,
    isOverdue: row.due_date < today && row.amount - row.paid_amount > 0,
  }
}

const CHARGE_ROW_SELECT = `
  SELECT c.id, c.tenancy_id, c.period_start, c.period_end, c.amount,
         c.due_date, r.number AS room_number, tn.name AS tenant_name,
         (SELECT COALESCE(SUM(p.amount), 0) FROM payments p
           WHERE p.charge_id = c.id AND p.voided_at IS NULL) AS paid_amount,
         (SELECT COUNT(*) FROM payments p
           WHERE p.charge_id = c.id AND p.voided_at IS NULL) AS payment_count
  FROM charges c
  JOIN tenancies te ON te.id = c.tenancy_id
  JOIN rooms r ON r.id = te.room_id
  JOIN tenants tn ON tn.id = te.tenant_id
`

async function readChargeRow(chargeId: number): Promise<ChargeRow> {
  const row = await getDb()
    .prepare(`${CHARGE_ROW_SELECT} WHERE c.id = ?1 AND c.deleted_at IS NULL`)
    .bind(chargeId)
    .first<ChargeRow>()
  if (!row) throw new InputError('Tagihan tidak ditemukan.')
  return row
}

/**
 * The same row whatever its state, for a permanent delete: a charge in the
 * trash has deleted_at set, so the live lookup cannot reach it.
 */
async function readAnyChargeRow(chargeId: number): Promise<ChargeRow> {
  const row = await getDb()
    .prepare(`${CHARGE_ROW_SELECT} WHERE c.id = ?1`)
    .bind(chargeId)
    .first<ChargeRow>()
  if (!row) throw new InputError('Tagihan tidak ditemukan.')
  return row
}

export const listCharges = createServerFn({ method: 'GET' })
  .validator((input: unknown) => {
    const tenancyId = readField(input, 'tenancyId')
    return {
      tenancyId: tenancyId === null || tenancyId === undefined ? null : rowId(tenancyId, 'Sewa'),
    }
  })
  .handler(async ({ data }): Promise<Charge[]> => {
    const today = new Date().toISOString().slice(0, 10)
    const statement = data.tenancyId
      ? getDb()
          .prepare(`${CHARGE_SELECT} WHERE c.tenancy_id = ?1${ORDER_CHARGES}`)
          .bind(data.tenancyId)
      : getDb().prepare(`${CHARGE_SELECT}${ORDER_CHARGES}`)
    const { results } = await statement.all<ChargeRow>()
    return (results ?? []).map((row) => toCharge(row, today))
  })

/** The individual view: the charge and every payment against it, voided or not. */
export const getCharge = createServerFn({ method: 'GET' })
  .validator((input: unknown) => ({
    chargeId: rowId(readField(input, 'chargeId'), 'Tagihan'),
  }))
  .handler(async ({ data }): Promise<ChargeDetail> => {
    const today = new Date().toISOString().slice(0, 10)
    const row = await readChargeRow(data.chargeId)
    const { results } = await getDb()
      .prepare(
        `SELECT id, amount, date, method, note, voided_at, void_reason
           FROM payments WHERE charge_id = ?1
          ORDER BY date DESC, id DESC`,
      )
      .bind(data.chargeId)
      .all<{
        id: number
        amount: number
        date: string
        method: 'cash' | 'transfer'
        note: string | null
        voided_at: number | null
        void_reason: string | null
      }>()

    return {
      charge: toCharge(row, today),
      payments: (results ?? []).map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        date: payment.date,
        method: payment.method,
        note: payment.note,
        voidedAt: payment.voided_at,
        voidReason: payment.void_reason,
      })),
    }
  })

export const listDeletedCharges = createServerFn({ method: 'GET' }).handler(
  async (): Promise<DeletedCharge[]> => {
    const { results } = await getDb()
      .prepare(
        `SELECT c.id, c.period_start, c.period_end, c.amount, c.deleted_at,
                r.number AS room_number, tn.name AS tenant_name,
                (SELECT COUNT(*) FROM payments p WHERE p.charge_id = c.id)
                  AS payment_count
           FROM charges c
           JOIN tenancies te ON te.id = c.tenancy_id
           JOIN rooms r ON r.id = te.room_id
           JOIN tenants tn ON tn.id = te.tenant_id
          WHERE c.deleted_at IS NOT NULL
          ORDER BY c.deleted_at DESC`,
      )
      .all<{
        id: number
        period_start: string
        period_end: string
        amount: number
        deleted_at: number
        room_number: string
        tenant_name: string
        payment_count: number
      }>()
    return (results ?? []).map((row) => ({
      id: row.id,
      roomNumber: row.room_number,
      tenantName: row.tenant_name,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      amount: row.amount,
      deletedAt: row.deleted_at,
      paymentCount: row.payment_count,
    }))
  },
)

/**
 * The amount of a charge is editable only while no payment settles it. Voiding
 * the payments puts it back in that state (ADR-0026).
 */
export const updateChargeAmount = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    chargeId: rowId(readField(input, 'chargeId'), 'Tagihan'),
    amount: wholeNumber(readField(input, 'amount'), 'Jumlah tagihan', 1, 1_000_000_000),
  }))
  .handler(async ({ data }): Promise<{ id: number }> => {
    const charge = await readChargeRow(data.chargeId)
    if (charge.payment_count > 0) {
      throw new InputError(
        'Tagihan yang sudah punya pembayaran tidak bisa diubah jumlahnya. Batalkan pembayarannya dulu.',
      )
    }

    const result = await getDb()
      .prepare(
        `UPDATE charges SET amount = ?1, updated_at = unixepoch() * 1000
          WHERE id = ?2 AND deleted_at IS NULL`,
      )
      .bind(data.amount, data.chargeId)
      .run()
    if (changedNothing(result.meta)) {
      throw new InputError('Tagihan tidak ditemukan.')
    }
    return { id: data.chargeId }
  })

/** The due date stays editable at any time (ADR-0026). */
export const updateChargeDueDate = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const dueDate = readField(input, 'dueDate')
    if (!isIsoDay(dueDate)) {
      throw new InputError('Jatuh tempo harus berupa tanggal yang benar.')
    }
    return {
      chargeId: rowId(readField(input, 'chargeId'), 'Tagihan'),
      dueDate,
    }
  })
  .handler(async ({ data }): Promise<{ id: number }> => {
    const result = await getDb()
      .prepare(
        `UPDATE charges SET due_date = ?1, updated_at = unixepoch() * 1000
          WHERE id = ?2 AND deleted_at IS NULL`,
      )
      .bind(data.dueDate, data.chargeId)
      .run()
    if (changedNothing(result.meta)) {
      throw new InputError('Tagihan tidak ditemukan.')
    }
    return { id: data.chargeId }
  })

/**
 * A delete hides the charge, so the period stops being owed (ADR-0036). A
 * charge that live payments settle cannot be hidden, because the money would
 * vanish from every balance. A permanent delete is refused while any payment
 * row, voided or not, still refers to the charge.
 */
export const deleteCharge = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    chargeId: rowId(readField(input, 'chargeId'), 'Tagihan'),
    permanent: flag(readField(input, 'permanent'), 'Hapus permanen'),
  }))
  .handler(async ({ data }): Promise<{ id: number; permanent: boolean }> => {
    const db = getDb()
    const charge = await readAnyChargeRow(data.chargeId)

    if (!data.permanent) {
      if (charge.payment_count > 0) {
        throw new InputError(
          'Tagihan yang sudah punya pembayaran tidak bisa dihapus. Batalkan pembayarannya dulu.',
        )
      }
      const result = await db
        .prepare(
          `UPDATE charges SET deleted_at = ?1, updated_at = ?1
            WHERE id = ?2 AND deleted_at IS NULL`,
        )
        .bind(nowMs(), data.chargeId)
        .run()
      if (changedNothing(result.meta)) {
        throw new InputError('Tagihan itu sudah ada di sampah.')
      }
      return { id: data.chargeId, permanent: false }
    }

    const all = await db
      .prepare('SELECT COUNT(*) AS total FROM payments WHERE charge_id = ?1')
      .bind(data.chargeId)
      .first<{ total: number }>()
    if ((all?.total ?? 0) > 0) {
      throw new InputError(
        `Tagihan ini punya ${all?.total} baris pembayaran, termasuk yang dibatalkan. Hapus permanen pembayaran itu dulu.`,
      )
    }

    const result = await db.prepare('DELETE FROM charges WHERE id = ?1').bind(data.chargeId).run()
    if (changedNothing(result.meta)) {
      throw new InputError('Tagihan tidak ditemukan.')
    }
    return { id: data.chargeId, permanent: true }
  })

export const restoreCharge = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    chargeId: rowId(readField(input, 'chargeId'), 'Tagihan'),
  }))
  .handler(async ({ data }): Promise<{ id: number }> => {
    const result = await getDb()
      .prepare(
        `UPDATE charges SET deleted_at = NULL, updated_at = unixepoch() * 1000
          WHERE id = ?1 AND deleted_at IS NOT NULL`,
      )
      .bind(data.chargeId)
      .run()
    if (changedNothing(result.meta)) {
      throw new InputError('Tagihan itu tidak ada di sampah.')
    }
    return { id: data.chargeId }
  })
