import { createFileRoute, notFound } from '@tanstack/react-router'

import { PublicRouteView } from '#/components/public/layouts'
import { LANDING_SLUG } from '#/lib/pages'
import { getPublicPage } from '#/server/public'

/**
 * Any other page the owner adds. It gets the generic layout: title, prose,
 * gallery, footer (ADR-0031).
 */
export const Route = createFileRoute('/$slug')({
  component: SlugPage,
  loader: async ({ params }) => {
    if (params.slug === LANDING_SLUG) throw notFound()
    const view = await getPublicPage({ data: { slug: params.slug } })
    if (!view.page) throw notFound()
    return view
  },
})

function SlugPage() {
  return <PublicRouteView view={Route.useLoaderData()} />
}
