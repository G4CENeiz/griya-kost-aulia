import { createServerFn } from '@tanstack/react-start'

import { LANDING_SLUG } from '#/lib/pages'
import { changedNothing, getDb, isUniqueViolation } from '#/server/db'
import { type PublicView, loadPublicView } from '#/server/public-view'
import { InputError, flag, readField, rowId, text } from '#/server/validation'

/** Halaman: a public page with a Markdown body (ADR-0024). */
export type AdminPage = {
  id: number
  slug: string
  title: string
  isPublished: boolean
  updatedAt: number
  bodyLength: number
}

type PageRow = {
  id: number
  slug: string
  title: string
  body_markdown: string
  is_published: number
  updated_at: number
}

export type PageInput = {
  slug: string
  title: string
  bodyMarkdown: string
  isPublished: boolean
}

/** These slugs would collide with the app's own routes. */
const RESERVED_SLUGS = new Set(['admin', 'media'])

function parseSlug(value: unknown): string {
  const slug = text(value, 'Alamat halaman', 60).toLowerCase()
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new InputError('Alamat halaman hanya boleh huruf kecil, angka, dan tanda hubung.')
  }
  if (RESERVED_SLUGS.has(slug)) {
    throw new InputError(`Alamat "${slug}" dipakai aplikasi. Pilih yang lain.`)
  }
  return slug
}

function parsePageInput(input: unknown): PageInput {
  const bodyMarkdown = readField(input, 'bodyMarkdown')
  if (typeof bodyMarkdown !== 'string') {
    throw new InputError('Isi halaman harus berupa teks.')
  }
  if (bodyMarkdown.length > 40_000) {
    throw new InputError('Isi halaman terlalu panjang.')
  }
  return {
    slug: parseSlug(readField(input, 'slug')),
    title: text(readField(input, 'title'), 'Judul', 120),
    bodyMarkdown,
    isPublished: flag(readField(input, 'isPublished'), 'Diterbitkan'),
  }
}

export const listPages = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AdminPage[]> => {
    const { results } = await getDb()
      .prepare(
        `SELECT id, slug, title, body_markdown, is_published, updated_at
           FROM pages
          ORDER BY (slug = ?1) DESC, slug`,
      )
      .bind(LANDING_SLUG)
      .all<PageRow>()
    return (results ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      isPublished: row.is_published === 1,
      updatedAt: row.updated_at,
      bodyLength: row.body_markdown.length,
    }))
  },
)

export const getPage = createServerFn({ method: 'GET' })
  .validator((input: unknown) => ({
    id: rowId(readField(input, 'id'), 'Halaman'),
  }))
  .handler(async ({ data }): Promise<PageInput & { id: number }> => {
    const row = await getDb()
      .prepare(
        `SELECT id, slug, title, body_markdown, is_published
           FROM pages WHERE id = ?1`,
      )
      .bind(data.id)
      .first<PageRow>()
    if (!row) throw new InputError('Halaman tidak ditemukan.')
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      bodyMarkdown: row.body_markdown,
      isPublished: row.is_published === 1,
    }
  })

/**
 * The whole public page as the editor will look once saved: identity, rooms,
 * gallery, and the page itself, published or not (ADR-0024).
 */
export const getPagePreview = createServerFn({ method: 'GET' })
  .validator((input: unknown) => ({
    slug: readField(input, 'slug'),
  }))
  .handler(async ({ data }): Promise<PublicView> => {
    const slug = typeof data.slug === 'string' && data.slug.trim() ? data.slug.trim() : LANDING_SLUG
    return loadPublicView(slug, { includeUnpublished: true })
  })

export const createPage = createServerFn({ method: 'POST' })
  .validator(parsePageInput)
  .handler(async ({ data }): Promise<{ id: number }> => {
    try {
      const row = await getDb()
        .prepare(
          `INSERT INTO pages (slug, title, body_markdown, is_published, updated_at)
           VALUES (?1, ?2, ?3, ?4, unixepoch() * 1000)
           RETURNING id`,
        )
        .bind(data.slug, data.title, data.bodyMarkdown, data.isPublished ? 1 : 0)
        .first<{ id: number }>()
      if (!row) throw new Error('Halaman gagal disimpan.')
      return { id: row.id }
    } catch (error) {
      if (isUniqueViolation(error, 'pages.slug')) {
        throw new InputError('Alamat halaman itu sudah dipakai.')
      }
      throw error
    }
  })

export const updatePage = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    id: rowId(readField(input, 'id'), 'Halaman'),
    ...parsePageInput(input),
  }))
  .handler(async ({ data }): Promise<{ id: number }> => {
    const db = getDb()
    const current = await db
      .prepare('SELECT slug FROM pages WHERE id = ?1')
      .bind(data.id)
      .first<{ slug: string }>()
    if (!current) throw new InputError('Halaman tidak ditemukan.')

    // The landing page keeps its slug: it is the address of the site.
    if (current.slug === LANDING_SLUG && data.slug !== LANDING_SLUG) {
      throw new InputError('Alamat halaman beranda tidak bisa diubah.')
    }

    try {
      const result = await db
        .prepare(
          `UPDATE pages
              SET slug = ?1, title = ?2, body_markdown = ?3, is_published = ?4,
                  updated_at = unixepoch() * 1000
            WHERE id = ?5`,
        )
        .bind(data.slug, data.title, data.bodyMarkdown, data.isPublished ? 1 : 0, data.id)
        .run()
      if (changedNothing(result.meta)) {
        throw new InputError('Halaman tidak ditemukan.')
      }
      return { id: data.id }
    } catch (error) {
      if (isUniqueViolation(error, 'pages.slug')) {
        throw new InputError('Alamat halaman itu sudah dipakai.')
      }
      throw error
    }
  })

export const deletePage = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    id: rowId(readField(input, 'id'), 'Halaman'),
  }))
  .handler(async ({ data }): Promise<{ id: number }> => {
    const db = getDb()
    const page = await db
      .prepare('SELECT slug FROM pages WHERE id = ?1')
      .bind(data.id)
      .first<{ slug: string }>()
    if (!page) throw new InputError('Halaman tidak ditemukan.')
    if (page.slug === LANDING_SLUG) {
      throw new InputError('Halaman beranda tidak bisa dihapus.')
    }

    // The gallery rows follow the page, and their objects are swept separately.
    await db.prepare('DELETE FROM page_images WHERE page_id = ?1').bind(data.id).run()
    await db.prepare('DELETE FROM pages WHERE id = ?1').bind(data.id).run()
    return { id: data.id }
  })
