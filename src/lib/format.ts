const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

const day = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Jakarta',
})

/** Money is a whole number of rupiah. */
export function formatRupiah(amount: number): string {
  return rupiah.format(amount)
}

/** A calendar day held as ISO 'YYYY-MM-DD'. */
export function formatDay(iso: string): string {
  const [year, month, date] = iso.split('-').map(Number)
  return day.format(new Date(Date.UTC(year, month - 1, date)))
}
