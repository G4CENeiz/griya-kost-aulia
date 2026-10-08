import { createServerFn } from '@tanstack/react-start'

import { LANDING_SLUG, ROOMS_SLUG } from '#/lib/pages'
import {
  type PublicImage,
  type PublicRoom,
  type PublicSettings,
  type PublicView,
  loadPublicView,
  loadRoomView,
} from '#/server/public-view'
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

export const getPublicRooms = createServerFn({ method: 'GET' }).handler(
  async (): Promise<PublicView> => loadPublicView(ROOMS_SLUG, { includeUnpublished: false }),
)

export const getPublicRoom = createServerFn({ method: 'GET' })
  .validator((input: unknown) => {
    const number = readField(input, 'number')
    if (typeof number !== 'string' || !number.trim() || number.length > 20) {
      throw new InputError('Nomor kamar tidak dikenal.')
    }
    return { number: number.trim() }
  })
  .handler(
    async ({
      data,
    }): Promise<{
      settings: PublicSettings
      room: PublicRoom
      images: PublicImage[]
    }> => loadRoomView(data.number),
  )
