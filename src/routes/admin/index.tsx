import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * The admin home is the Dasbor screen (build step 5). Until it exists, the
 * admin root sends the owner to the screen that does.
 */
export const Route = createFileRoute('/admin/')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/pengaturan' })
  },
})
