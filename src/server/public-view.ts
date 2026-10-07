import { LANDING_SLUG } from '#/lib/pages'
import { type RoomStatus, roomStatus } from '#/lib/room-status'
import { getDb } from '#/server/db'

/**
 * Everything a public page renders. These queries live outside
 * src/server/admin/ on purpose: a server function in that directory is behind
 * the Access guard (ADR-0017), and a public page must never carry a guarded
 * call, or a production visitor with no token would take the page down.
 */
export type PublicSettings = {
  name: string
  tagline: string | null
  address: string | null
  whatsappNumber: string | null
  bankName: string | null
  accountNumber: string | null
  accountHolder: string | null
}

export type PublicRoom = {
  id: number
  number: string
  roomTypeName: string
  floor: number
  price: number
  facilities: string[]
  status: RoomStatus
}

export type PublicImage = {
  r2Key: string
  alt: string
}

export type PublicPage = {
  id: number
  slug: string
  title: string
  bodyMarkdown: string
  isPublished: boolean
}

export type PublicView = {
  settings: PublicSettings
  page: PublicPage | null
  rooms: PublicRoom[]
  images: PublicImage[]
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

type RoomRow = {
  id: number
  number: string
  floor: number
  price: number
  facilities: string
  room_type_name: string
  is_unavailable: number
  active_tenancies: number
}

type PageRow = {
  id: number
  slug: string
  title: string
  body_markdown: string
  is_published: number
}

function toFacilities(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

/** No tenant column and no tenant join: public pages never show tenant data (ADR-0019). */
const SELECT_PUBLIC_ROOMS = `
  SELECT r.id, r.number, r.floor, r.price, r.is_unavailable,
         t.name AS room_type_name, t.facilities,
         (SELECT COUNT(*) FROM tenancies te
           WHERE te.room_id = r.id AND te.move_out_date IS NULL) AS active_tenancies
  FROM rooms r
  JOIN room_types t ON t.id = r.room_type_id
  ORDER BY r.number
`

export async function loadPublicView(
  slug: string,
  options: { includeUnpublished: boolean },
): Promise<PublicView> {
  const db = getDb()

  const settingsRow = await db
    .prepare(
      `SELECT name, tagline, address, whatsapp_number, bank_name,
              account_number, account_holder
         FROM settings WHERE id = 1`,
    )
    .first<SettingsRow>()
  if (!settingsRow) {
    throw new Error('Baris pengaturan tidak ada di database.')
  }

  const pageRow = options.includeUnpublished
    ? await db
        .prepare(
          `SELECT id, slug, title, body_markdown, is_published
             FROM pages WHERE slug = ?1`,
        )
        .bind(slug)
        .first<PageRow>()
    : await db
        .prepare(
          `SELECT id, slug, title, body_markdown, is_published
             FROM pages WHERE slug = ?1 AND is_published = 1`,
        )
        .bind(slug)
        .first<PageRow>()

  const page: PublicPage | null = pageRow
    ? {
        id: pageRow.id,
        slug: pageRow.slug,
        title: pageRow.title,
        bodyMarkdown: pageRow.body_markdown,
        isPublished: pageRow.is_published === 1,
      }
    : null

  const rooms: PublicRoom[] = []
  if (slug === LANDING_SLUG) {
    const { results } = await db.prepare(SELECT_PUBLIC_ROOMS).all<RoomRow>()
    for (const row of results ?? []) {
      const isUnavailable = row.is_unavailable === 1
      rooms.push({
        id: row.id,
        number: row.number,
        roomTypeName: row.room_type_name,
        floor: row.floor,
        price: row.price,
        facilities: toFacilities(row.facilities),
        status: roomStatus({
          isUnavailable,
          activeTenancies: row.active_tenancies,
        }),
      })
    }
  }

  const images: PublicImage[] = []
  if (page) {
    const { results } = await db
      .prepare(
        `SELECT r2_key, alt FROM page_images
          WHERE page_id = ?1 ORDER BY position, id`,
      )
      .bind(page.id)
      .all<{ r2_key: string; alt: string }>()
    for (const row of results ?? []) {
      images.push({ r2Key: row.r2_key, alt: row.alt })
    }
  }

  return {
    page,
    rooms,
    images,
    settings: {
      name: settingsRow.name,
      tagline: settingsRow.tagline,
      address: settingsRow.address,
      whatsappNumber: settingsRow.whatsapp_number,
      bankName: settingsRow.bank_name,
      accountNumber: settingsRow.account_number,
      accountHolder: settingsRow.account_holder,
    },
  }
}
