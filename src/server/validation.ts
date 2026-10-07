/**
 * Input parsers for the admin server functions.
 *
 * A server function is an HTTP boundary: the browser sends whatever it likes,
 * so every field is parsed here before it reaches a query. Messages are
 * Indonesian, because they can reach the admin on screen.
 */
export class InputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InputError'
  }
}

function asRecord(input: unknown): Record<string, unknown> {
  if (typeof input !== 'object' || input === null) {
    throw new InputError('Data yang dikirim tidak dikenali.')
  }
  return input as Record<string, unknown>
}

export function readField(input: unknown, field: string): unknown {
  return asRecord(input)[field]
}

/** A required, trimmed, non-empty string. */
export function text(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string') {
    throw new InputError(`${label} harus berupa teks.`)
  }
  const trimmed = value.trim()
  if (!trimmed) {
    throw new InputError(`${label} tidak boleh kosong.`)
  }
  if (trimmed.length > max) {
    throw new InputError(`${label} tidak boleh lebih dari ${max} karakter.`)
  }
  return trimmed
}

/** An optional string. Blank becomes null, so the database holds no empty string. */
export function optionalText(value: unknown, label: string, max: number): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') {
    throw new InputError(`${label} harus berupa teks.`)
  }
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length > max) {
    throw new InputError(`${label} tidak boleh lebih dari ${max} karakter.`)
  }
  return trimmed
}

/** A whole number, from a number or from the text a form input sends. */
export function wholeNumber(value: unknown, label: string, min: number, max: number): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value.trim().replace(/[.\s]/g, ''))
        : Number.NaN

  if (!Number.isInteger(parsed)) {
    throw new InputError(`${label} harus berupa angka bulat.`)
  }
  if (parsed < min || parsed > max) {
    throw new InputError(`${label} harus antara ${min} dan ${max}.`)
  }
  return parsed
}

/** A row id, as sent by the list screens. */
export function rowId(value: unknown, label: string): number {
  return wholeNumber(value, label, 1, Number.MAX_SAFE_INTEGER)
}

/** A checkbox value. Anything that is not a boolean is refused. */
export function flag(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new InputError(`${label} harus berupa ya atau tidak.`)
  }
  return value
}

/** A list of short non-empty strings, one per array entry. */
export function stringList(
  value: unknown,
  label: string,
  maxItems: number,
  maxLength: number,
): string[] {
  if (value === null || value === undefined) return []
  if (!Array.isArray(value)) {
    throw new InputError(`${label} harus berupa daftar.`)
  }
  if (value.length > maxItems) {
    throw new InputError(`${label} tidak boleh lebih dari ${maxItems} baris.`)
  }
  return value.map((entry) => text(entry, label, maxLength))
}
