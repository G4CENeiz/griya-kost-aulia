import { createFileRoute, notFound } from '@tanstack/react-router'

import { PublicRouteView } from '#/components/public/layouts'
import { getPublicPage } from '#/server/public'

export const Route = createFileRoute('/aturan')({
  component: Page,
  loader: async () => {
    const view = await getPublicPage({ data: { slug: 'rules' } })
    if (!view.page) throw notFound()
    return view
  },
})

function Page() {
  return <PublicRouteView view={Route.useLoaderData()} />
}
