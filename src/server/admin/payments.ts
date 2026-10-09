import { createServerFn } from '@tanstack/react-start'

import { isIsoDay } from '#/lib/dates'
import { changedNothing, getDb } from '#/server/db'
import { InputError, optionalText, readField, rowId } from '#/server/validation'

/** Pembayaran: money received against one charge. Never edited (ADR-0022). */
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

/** The individual view: the payment and the receipt that was issued for it. */
export type PaymentDetail = {
  payment: Payment
  receipt: { number: string; issuedAt: number; renderedAt: number | null } | null
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
  WHERE c.deleted_at IS NULL AND te.deleted_at IS NULL
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

export const getPayment = createServerFn({ method: 'GET' })
  .validator((input: unknown) => ({
    paymentId: rowId(readField(input, 'paymentId'), 'Pembayaran'),
  }))
  .handler(async ({ data }): Promise<PaymentDetail> => {
    const db = getDb()
    const row = await db
      .prepare(
        `SELECT p.id, p.charge_id, p.amount, p.date, p.method, p.note,
                p.voided_at, p.void_reason,
                c.period_start, c.period_end,
                r.number AS room_number, tn.name AS tenant_name
           FROM payments p
           JOIN charges c ON c.id = p.charge_id
           JOIN tenancies te ON te.id = c.tenancy_id
           JOIN rooms r ON r.id = te.room_id
           JOIN tenants tn ON tn.id = te.tenant_id
          WHERE p.id = ?1`,
      )
      .bind(data.paymentId)
      .first<PaymentRow>()
    if (!row) throw new InputError('Pembayaran tidak ditemukan.')

    const receipt = await db
      .prepare(
        `SELECT number, issued_at, rendered_at FROM receipts
          WHERE payment_id = ?1`,
      )
      .bind(data.paymentId)
      .first<{ number: string; issued_at: number; rendered_at: number | null }>()

    return {
      payment: toPayment(row),
      receipt: receipt
        ? {
            number: receipt.number,
            issuedAt: receipt.issued_at,
            renderedAt: receipt.rendered_at,
          }
        : null,
    }
  })

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
           FROM charges c
          WHERE c.id = ?1 AND c.deleted_at IS NULL
            AND (SELECT deleted_at FROM tenancies te WHERE te.id = c.tenancy_id)
                IS NULL`,
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

/**
 * Removing a voided payment for good (ADR-0036). The void is the soft delete of
 * a payment, so this is the second act, and it needs the payment to be voided
 * first. A receipt still refers to the payment, so its presence refuses the
 * removal until the receipt is dealt with.
 */
export const purgePayment = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    paymentId: rowId(readField(input, 'paymentId'), 'Pembayaran'),
  }))
  .handler(async ({ data }): Promise<{ id: number }> => {
    const db = getDb()
    const payment = await db
      .prepare('SELECT voided_at FROM payments WHERE id = ?1')
      .bind(data.paymentId)
      .first<{ voided_at: number | null }>()
    if (!payment) throw new InputError('Pembayaran tidak ditemukan.')
    if (payment.voided_at === null) {
      throw new InputError('Batalkan pembayaran ini dulu sebelum menghapus permanen.')
    }

    const receipt = await db
      .prepare('SELECT COUNT(*) AS total FROM receipts WHERE payment_id = ?1')
      .bind(data.paymentId)
      .first<{ total: number }>()
    if ((receipt?.total ?? 0) > 0) {
      throw new InputError('Pembayaran ini punya kuitansi, jadi tidak bisa dihapus permanen.')
    }

    const result = await db.prepare('DELETE FROM payments WHERE id = ?1').bind(data.paymentId).run()
    if (changedNothing(result.meta)) {
      throw new InputError('Pembayaran tidak ditemukan.')
    }
    return { id: data.paymentId }
  })
