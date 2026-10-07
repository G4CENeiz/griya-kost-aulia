import { createServerFn } from '@tanstack/react-start'

import { LANDING_SLUG } from '#/lib/pages'
import { type PublicView, loadPublicView } from '#/server/public-view'
import { InputError, readField } from '#/server/validation'

/** A slug is a URL segment. Anything else is refused before a query runs. */
function parseSlug(value: unknown): string {
  if (value === undefined || value === null) return LANDING_SLUG
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]{0,60}$/.test(value)) {
    throw new InputError('Alamat halaman tidak dikenal.')
  }
  return value
}

export const getPublicPage = createServerFn({ method: 'GET' })
  .validator((input: unknown) => ({ slug: parseSlug(readField(input, 'slug')) }))
  .handler(async ({ data }): Promise<PublicView> =>
    loadPublicView(data.slug, { includeUnpublished: false }),
  )
