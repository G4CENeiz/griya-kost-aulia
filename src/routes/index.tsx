import { createFileRoute } from '@tanstack/react-router'

import { HomeLayout } from '#/components/public/layouts'
import { LANDING_SLUG } from '#/lib/pages'
import { getPublicPage } from '#/server/public'

export const Route = createFileRoute('/')({
  component: LandingPage,
  loader: () => getPublicPage({ data: { slug: LANDING_SLUG } }),
})

function LandingPage() {
  return <HomeLayout view={Route.useLoaderData()} />
}
