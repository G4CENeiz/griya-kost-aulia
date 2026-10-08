import { createFileRoute, notFound } from '@tanstack/react-router'

import { RoomLayout } from '#/components/public/layouts'
import { getPublicRoom } from '#/server/public'

/** One room by its number. An unknown number is a 404, not an error page. */
export const Route = createFileRoute('/kamar/$number')({
  component: RoomPage,
  loader: async ({ params }) => {
    try {
      return await getPublicRoom({ data: { number: params.number } })
    } catch {
      throw notFound()
    }
  },
})

function RoomPage() {
  const { settings, room, images } = Route.useLoaderData()
  return <RoomLayout view={{ settings, page: null, rooms: [], images }} room={room} />
}
