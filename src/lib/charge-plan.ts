import { addDays, addMonths } from '#/lib/dates'

/** A term is 1, 3, 6, 9, or 12 months (ADR-0004). */
export const TERM_MONTHS = [1, 3, 6, 9, 12] as const
export type TermMonths = (typeof TERM_MONTHS)[number]

/**
 * How the term is charged. `monthly` creates one charge per month, `block`
 * creates one charge for the whole term. ADR-0004 allows both, and the charges
 * carry the choice, so it is not stored on the tenancy.
 */
export type ChargePlan = 'monthly' | 'block'

export type PlannedCharge = {
  periodStart: string
  periodEnd: string
  amount: number
  dueDate: string
}

export function isTermMonths(value: unknown): value is TermMonths {
  return typeof value === 'number' && (TERM_MONTHS as readonly number[]).includes(value)
}

/**
 * The charges a term produces, before anything is written. The server creates
 * exactly this list and the form previews it, so the two cannot differ
 * (ADR-0013). The due date defaults to the period start (ADR-0013).
 */
export function planCharges(input: {
  startDate: string
  termMonths: TermMonths
  plan: ChargePlan
  monthlyPrice: number
}): PlannedCharge[] {
  const { startDate, termMonths, plan, monthlyPrice } = input

  if (termMonths === 1 || plan === 'block') {
    const periodStart = startDate
    const periodEnd = addDays(addMonths(startDate, termMonths), -1)
    return [
      {
        periodStart,
        periodEnd,
        amount: monthlyPrice * termMonths,
        dueDate: periodStart,
      },
    ]
  }

  const charges: PlannedCharge[] = []
  for (let month = 0; month < termMonths; month += 1) {
    const periodStart = addMonths(startDate, month)
    charges.push({
      periodStart,
      periodEnd: addDays(addMonths(startDate, month + 1), -1),
      amount: monthlyPrice,
      dueDate: periodStart,
    })
  }
  return charges
}

/** The day after the last charge of a tenancy, for a renewal or a move. */
export function dayAfter(periodEnd: string): string {
  return addDays(periodEnd, 1)
}
