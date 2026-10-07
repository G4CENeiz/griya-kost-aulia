import { Link, Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
})

/**
 * The admin shell. The navigation grows with the screens: each build step adds
 * its own entry here.
 */
function AdminLayout() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link to="/admin/pengaturan" className="font-semibold">
            Griya Kost Aulia
          </Link>
          <nav className="text-muted-foreground flex gap-4 text-sm">
            <Link
              to="/admin/pengaturan"
              className="hover:text-foreground"
              activeProps={{ className: 'text-foreground font-medium' }}
            >
              Pengaturan
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
