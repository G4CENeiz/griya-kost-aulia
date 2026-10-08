import { createFileRoute } from '@tanstack/react-router'

import { RoomsLayout } from '#/components/public/layouts'
import { getPublicRooms } from '#/server/public'

export const Route = createFileRoute('/kamar/')({
  component: RoomsPage,
  loader: () => getPublicRooms(),
})

function RoomsPage() {
  return <RoomsLayout view={Route.useLoaderData()} />
}
