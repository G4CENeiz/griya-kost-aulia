import { createServerFn } from '@tanstack/react-start'

import { getDb, nowMs } from '#/server/db'
import { optionalText, readField, text } from '#/server/validation'

/**
 * The property identity of ADR-0020. Every field except the name may be empty
 * until the owner fills it in.
 */
export type Settings = {
  name: string
  tagline: string | null
  address: string | null
  whatsappNumber: string | null
  bankName: string | null
  accountNumber: string | null
  accountHolder: string | null
}

type SettingsRow = {
  name: string
  tagline: string | null
  address: string | null
  whatsapp_number: string | null
  bank_name: string | null
  account_number: string | null
  account_holder: string | null
}

const SELECT_SETTINGS = `
  SELECT name, tagline, address, whatsapp_number, bank_name,
         account_number, account_holder
  FROM settings
  WHERE id = 1
`

function toSettings(row: SettingsRow): Settings {
  return {
    name: row.name,
    tagline: row.tagline,
    address: row.address,
    whatsappNumber: row.whatsapp_number,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    accountHolder: row.account_holder,
  }
}

export const getSettings = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Settings> => {
    const row = await getDb().prepare(SELECT_SETTINGS).first<SettingsRow>()
    if (!row) {
      throw new Error('Baris pengaturan tidak ada di database.')
    }
    return toSettings(row)
  },
)

export const updateSettings = createServerFn({ method: 'POST' })
  .validator((input: unknown): Settings => {
    const address = readField(input, 'address')
    return {
      name: text(readField(input, 'name'), 'Nama properti', 120),
      tagline: optionalText(readField(input, 'tagline'), 'Tagline', 160),
      address: optionalText(address, 'Alamat', 300),
      whatsappNumber: optionalText(readField(input, 'whatsappNumber'), 'Nomor WhatsApp', 30),
      bankName: optionalText(readField(input, 'bankName'), 'Nama bank', 80),
      accountNumber: optionalText(readField(input, 'accountNumber'), 'Nomor rekening', 40),
      accountHolder: optionalText(readField(input, 'accountHolder'), 'Nama pemilik rekening', 120),
    }
  })
  .handler(async ({ data }): Promise<Settings> => {
    await getDb()
      .prepare(
        `UPDATE settings
            SET name = ?1, tagline = ?2, address = ?3, whatsapp_number = ?4,
                bank_name = ?5, account_number = ?6, account_holder = ?7,
                updated_at = ?8
          WHERE id = 1`,
      )
      .bind(
        data.name,
        data.tagline,
        data.address,
        data.whatsappNumber,
        data.bankName,
        data.accountNumber,
        data.accountHolder,
        nowMs(),
      )
      .run()

    return data
  })
