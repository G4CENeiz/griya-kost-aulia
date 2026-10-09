import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'

import { changedNothing, getDb, nowMs } from '#/server/db'
import { InputError, flag, optionalText, readField, rowId } from '#/server/validation'

/** Galeri: one image of one page, stored in R2 with its row in D1 (ADR-0025). */
export type GalleryImage = {
  id: number
  r2Key: string
  alt: string
  position: number
}

/** A gallery image in the trash (ADR-0036). */
export type DeletedGalleryImage = {
  id: number
  r2Key: string
  alt: string
  deletedAt: number
}

const MAX_UPLOAD_BYTES = 5_000_000
const ALLOWED_TYPES = new Set(['image/webp', 'image/jpeg', 'image/png'])

function extensionFor(contentType: string): string {
  if (contentType === 'image/png') return 'png'
  if (contentType === 'image/jpeg') return 'jpg'
  return 'webp'
}

/** A picture can only be added to a live page. */
async function requirePage(pageId: number): Promise<void> {
  const page = await getDb()
    .prepare('SELECT id FROM pages WHERE id = ?1 AND deleted_at IS NULL')
    .bind(pageId)
    .first<{ id: number }>()
  if (!page) throw new InputError('Halaman tidak ditemukan.')
}

export const listGalleryImages = createServerFn({ method: 'GET' })
  .validator((input: unknown) => ({
    pageId: rowId(readField(input, 'pageId'), 'Halaman'),
  }))
  .handler(async ({ data }): Promise<GalleryImage[]> => {
    const { results } = await getDb()
      .prepare(
        `SELECT id, r2_key, alt, position FROM page_images
          WHERE page_id = ?1 AND deleted_at IS NULL
          ORDER BY position, id`,
      )
      .bind(data.pageId)
      .all<{ id: number; r2_key: string; alt: string; position: number }>()
    return (results ?? []).map((row) => ({
      id: row.id,
      r2Key: row.r2_key,
      alt: row.alt,
      position: row.position,
    }))
  })

/**
 * The browser has already resized and encoded the file. This writes the object
 * and then the row; a failure between the two leaves an orphan object, which a
 * later sweep can find (ADR-0025).
 */
export const uploadGalleryImage = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    if (!(input instanceof FormData)) {
      throw new InputError('Unggahan tidak diterima.')
    }
    const pageId = Number(input.get('pageId'))
    if (!Number.isInteger(pageId) || pageId < 1) {
      throw new InputError('Halaman tidak dikenal.')
    }
    const file = input.get('file')
    if (!(file instanceof File)) {
      throw new InputError('Berkas gambar tidak ada.')
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      throw new InputError('Gambar harus WebP, JPEG, atau PNG.')
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new InputError('Berkas gambar lebih dari 5 MB.')
    }
    return {
      pageId,
      alt: optionalText(input.get('alt'), 'Teks alternatif', 160) ?? '',
      file,
    }
  })
  .handler(async ({ data }): Promise<{ id: number; r2Key: string }> => {
    await requirePage(data.pageId)
    const db = getDb()

    const key = `galeri/${crypto.randomUUID()}.${extensionFor(data.file.type)}`
    await env.MEDIA.put(key, await data.file.arrayBuffer(), {
      httpMetadata: { contentType: data.file.type },
    })

    const last = await db
      .prepare(
        `SELECT COALESCE(MAX(position), -1) + 1 AS next
           FROM page_images WHERE page_id = ?1 AND deleted_at IS NULL`,
      )
      .bind(data.pageId)
      .first<{ next: number }>()

    const row = await db
      .prepare(
        `INSERT INTO page_images (page_id, r2_key, alt, position, updated_at)
         VALUES (?1, ?2, ?3, ?4, unixepoch() * 1000)
         RETURNING id`,
      )
      .bind(data.pageId, key, data.alt, last?.next ?? 0)
      .first<{ id: number }>()
    if (!row) throw new Error('Gambar gagal disimpan.')

    return { id: row.id, r2Key: key }
  })

export const updateGalleryAlt = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    id: rowId(readField(input, 'id'), 'Gambar'),
    alt: optionalText(readField(input, 'alt'), 'Teks alternatif', 160) ?? '',
  }))
  .handler(async ({ data }): Promise<{ id: number }> => {
    const result = await getDb()
      .prepare(
        `UPDATE page_images SET alt = ?1, updated_at = unixepoch() * 1000
          WHERE id = ?2 AND deleted_at IS NULL`,
      )
      .bind(data.alt, data.id)
      .run()
    if ((result.meta.changes ?? 0) === 0) {
      throw new InputError('Gambar tidak ditemukan.')
    }
    return { id: data.id }
  })

export const listDeletedGalleryImages = createServerFn({ method: 'GET' })
  .validator((input: unknown) => ({
    pageId: rowId(readField(input, 'pageId'), 'Halaman'),
  }))
  .handler(async ({ data }): Promise<DeletedGalleryImage[]> => {
    const { results } = await getDb()
      .prepare(
        `SELECT id, r2_key, alt, deleted_at FROM page_images
          WHERE page_id = ?1 AND deleted_at IS NOT NULL
          ORDER BY deleted_at DESC, id`,
      )
      .bind(data.pageId)
      .all<{ id: number; r2_key: string; alt: string; deleted_at: number }>()
    return (results ?? []).map((row) => ({
      id: row.id,
      r2Key: row.r2_key,
      alt: row.alt,
      deletedAt: row.deleted_at,
    }))
  })

/**
 * A delete hides the picture; a permanent delete removes the row and the R2
 * object (ADR-0036). The object stays while the row is in the trash, so a
 * restore brings the picture back.
 */
export const deleteGalleryImage = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    id: rowId(readField(input, 'id'), 'Gambar'),
    permanent: flag(readField(input, 'permanent'), 'Hapus permanen'),
  }))
  .handler(async ({ data }): Promise<{ id: number; permanent: boolean }> => {
    const db = getDb()
    const image = await db
      .prepare('SELECT r2_key FROM page_images WHERE id = ?1')
      .bind(data.id)
      .first<{ r2_key: string }>()
    if (!image) throw new InputError('Gambar tidak ditemukan.')

    if (!data.permanent) {
      const result = await db
        .prepare(
          `UPDATE page_images SET deleted_at = ?1, updated_at = ?1
            WHERE id = ?2 AND deleted_at IS NULL`,
        )
        .bind(nowMs(), data.id)
        .run()
      if (changedNothing(result.meta)) {
        throw new InputError('Gambar itu sudah ada di sampah.')
      }
      return { id: data.id, permanent: false }
    }

    const result = await db.prepare('DELETE FROM page_images WHERE id = ?1').bind(data.id).run()
    if (changedNothing(result.meta)) {
      throw new InputError('Gambar tidak ditemukan.')
    }
    await env.MEDIA.delete(image.r2_key)
    return { id: data.id, permanent: true }
  })

export const restoreGalleryImage = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    id: rowId(readField(input, 'id'), 'Gambar'),
  }))
  .handler(async ({ data }): Promise<{ id: number }> => {
    const result = await getDb()
      .prepare(
        `UPDATE page_images SET deleted_at = NULL, updated_at = unixepoch() * 1000
          WHERE id = ?1 AND deleted_at IS NOT NULL`,
      )
      .bind(data.id)
      .run()
    if (changedNothing(result.meta)) {
      throw new InputError('Gambar itu tidak ada di sampah.')
    }
    return { id: data.id }
  })

/** Moves one image one step up or down by rewriting the whole order. */
export const moveGalleryImage = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const direction = readField(input, 'direction')
    if (direction !== 'up' && direction !== 'down') {
      throw new InputError('Arah perpindahan tidak dikenal.')
    }
    return {
      id: rowId(readField(input, 'id'), 'Gambar'),
      direction,
    }
  })
  .handler(async ({ data }): Promise<{ id: number }> => {
    const db = getDb()
    const image = await db
      .prepare('SELECT page_id FROM page_images WHERE id = ?1 AND deleted_at IS NULL')
      .bind(data.id)
      .first<{ page_id: number }>()
    if (!image) throw new InputError('Gambar tidak ditemukan.')

    const { results } = await db
      .prepare(
        `SELECT id FROM page_images
          WHERE page_id = ?1 AND deleted_at IS NULL
          ORDER BY position, id`,
      )
      .bind(image.page_id)
      .all<{ id: number }>()
    const order = (results ?? []).map((row) => row.id)

    const index = order.indexOf(data.id)
    const target = data.direction === 'up' ? index - 1 : index + 1
    if (index === -1 || target < 0 || target >= order.length) {
      // Already at the end: nothing to do, and not an error.
      return { id: data.id }
    }

    const nextOrder = [...order]
    const [moved] = nextOrder.splice(index, 1)
    nextOrder.splice(target, 0, moved as number)

    await db.batch(
      nextOrder.map((id, position) =>
        db
          .prepare(
            `UPDATE page_images SET position = ?1, updated_at = unixepoch() * 1000
              WHERE id = ?2`,
          )
          .bind(position, id),
      ),
    )
    return { id: data.id }
  })
