import { createFileRoute, notFound } from '@tanstack/react-router'

import { PublicRouteView } from '#/components/public/layouts'
import { getPublicPage } from '#/server/public'

export const Route = createFileRoute('/kontak')({
  component: Page,
  loader: async () => {
    const view = await getPublicPage({ data: { slug: 'contact' } })
    if (!view.page) throw notFound()
    return view
  },
})

function Page() {
  return <PublicRouteView view={Route.useLoaderData()} />
}
