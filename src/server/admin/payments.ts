import { createServerFn } from '@tanstack/react-start'

import { isIsoDay } from '#/lib/dates'
import { changedNothing, getDb } from '#/server/db'
import { InputError, optionalText, readField, rowId } from '#/server/validation'

/** Pembayaran: money received against one charge. Never edited, never deleted (ADR-0022). */
export type Payment = {
  id: number
  chargeId: number
  roomNumber: string
  tenantName: string
  periodStart: string
  periodEnd: string
  amount: number
  date: string
  method: 'cash' | 'transfer'
  note: string | null
  voidedAt: number | null
  voidReason: string | null
}

type PaymentRow = {
  id: number
  charge_id: number
  room_number: string
  tenant_name: string
  period_start: string
  period_end: string
  amount: number
  date: string
  method: 'cash' | 'transfer'
  note: string | null
  voided_at: number | null
  void_reason: string | null
}

export type PaymentInput = {
  chargeId: number
  amount: number
  date: string
  method: 'cash' | 'transfer'
  note: string | null
}

/** At most two payments settle one charge (ADR-0026). */
const MAX_PAYMENTS_PER_CHARGE = 2

const SELECT_PAYMENTS = `
  SELECT p.id, p.charge_id, p.amount, p.date, p.method, p.note,
         p.voided_at, p.void_reason,
         c.period_start, c.period_end,
         r.number AS room_number, tn.name AS tenant_name
  FROM payments p
  JOIN charges c ON c.id = p.charge_id
  JOIN tenancies te ON te.id = c.tenancy_id
  JOIN rooms r ON r.id = te.room_id
  JOIN tenants tn ON tn.id = te.tenant_id
  ORDER BY p.date DESC, p.id DESC
`

function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    chargeId: row.charge_id,
    roomNumber: row.room_number,
    tenantName: row.tenant_name,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    amount: row.amount,
    date: row.date,
    method: row.method,
    note: row.note,
    voidedAt: row.voided_at,
    voidReason: row.void_reason,
  }
}

export const listPayments = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Payment[]> => {
    const { results } = await getDb().prepare(SELECT_PAYMENTS).all<PaymentRow>()
    return (results ?? []).map(toPayment)
  },
)

export const createPayment = createServerFn({ method: 'POST' })
  .validator((input: unknown): PaymentInput => {
    const method = readField(input, 'method')
    if (method !== 'cash' && method !== 'transfer') {
      throw new InputError('Metode pembayaran harus tunai atau transfer.')
    }
    const date = readField(input, 'date')
    if (!isIsoDay(date)) {
      throw new InputError('Tanggal pembayaran harus berupa tanggal.')
    }
    const amount = readField(input, 'amount')
    const parsed = typeof amount === 'string' ? Number(amount) : amount
    if (typeof parsed !== 'number' || !Number.isInteger(parsed) || parsed <= 0) {
      throw new InputError('Jumlah pembayaran harus angka bulat lebih dari 0.')
    }
    return {
      chargeId: rowId(readField(input, 'chargeId'), 'Tagihan'),
      amount: parsed,
      date,
      method,
      note: optionalText(readField(input, 'note'), 'Catatan', 200),
    }
  })
  .handler(async ({ data }): Promise<{ id: number }> => {
    const db = getDb()
    const charge = await db
      .prepare(
        `SELECT c.amount,
                (SELECT COALESCE(SUM(p.amount), 0) FROM payments p
                  WHERE p.charge_id = c.id AND p.voided_at IS NULL) AS paid_amount,
                (SELECT COUNT(*) FROM payments p
                  WHERE p.charge_id = c.id AND p.voided_at IS NULL) AS payment_count
           FROM charges c WHERE c.id = ?1`,
      )
      .bind(data.chargeId)
      .first<{ amount: number; paid_amount: number; payment_count: number }>()
    if (!charge) throw new InputError('Tagihan tidak ditemukan.')

    if (charge.payment_count >= MAX_PAYMENTS_PER_CHARGE) {
      throw new InputError('Tagihan ini sudah punya dua angsuran. Batalkan salah satunya dulu.')
    }

    const balance = charge.amount - charge.paid_amount
    if (balance <= 0) {
      throw new InputError('Tagihan ini sudah lunas.')
    }
    if (data.amount > balance) {
      throw new InputError(
        `Pembayaran melebihi sisa tagihan (Rp ${balance.toLocaleString('id-ID')}).`,
      )
    }

    const row = await db
      .prepare(
        `INSERT INTO payments
           (charge_id, amount, date, method, note, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, unixepoch() * 1000)
         RETURNING id`,
      )
      .bind(data.chargeId, data.amount, data.date, data.method, data.note)
      .first<{ id: number }>()
    if (!row) throw new Error('Pembayaran gagal disimpan.')
    return { id: row.id }
  })

/**
 * A payment is voided with a reason and stays visible (ADR-0022). The receipt
 * of that payment, if it exists, keeps its number and renders with a marker.
 */
export const voidPayment = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    paymentId: rowId(readField(input, 'paymentId'), 'Pembayaran'),
    reason: readField(input, 'reason'),
  }))
  .handler(async ({ data }): Promise<{ id: number }> => {
    if (typeof data.reason !== 'string' || !data.reason.trim()) {
      throw new InputError('Alasan pembatalan wajib diisi.')
    }
    const result = await getDb()
      .prepare(
        `UPDATE payments
            SET voided_at = unixepoch() * 1000, void_reason = ?1,
                updated_at = unixepoch() * 1000
          WHERE id = ?2 AND voided_at IS NULL`,
      )
      .bind(data.reason.trim(), data.paymentId)
      .run()
    if (changedNothing(result.meta)) {
      throw new InputError('Pembayaran tidak ditemukan atau sudah dibatalkan.')
    }
    return { id: data.paymentId }
  })
