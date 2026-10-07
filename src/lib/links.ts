/**
 * Links derived from stored values. They live in src/lib so a client component
 * can use them without importing the server data module.
 */

/** A wa.me link, built from the digits of the number and nothing else. */
export function whatsappLink(number: string | null, message: string): string | null {
  if (!number) return null
  const digits = number.replace(/[^0-9]/g, '')
  if (!digits) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

/** The map link is derived from the address, never stored (ADR-0020). */
export function mapLink(address: string | null): string | null {
  if (!address) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}
