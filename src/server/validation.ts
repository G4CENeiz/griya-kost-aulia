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
