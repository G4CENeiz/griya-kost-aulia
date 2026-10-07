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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link to="/admin" className="font-semibold">
            Griya Kost Aulia
          </Link>
          <nav className="text-muted-foreground flex flex-wrap gap-4 text-sm">
            <Link
              to="/admin"
              activeOptions={{ exact: true }}
              className="hover:text-foreground"
              activeProps={{ className: 'text-foreground font-medium' }}
            >
              Dasbor
            </Link>
            <Link
              to="/admin/kamar"
              className="hover:text-foreground"
              activeProps={{ className: 'text-foreground font-medium' }}
            >
              Kamar
            </Link>
            <Link
              to="/admin/tipe-kamar"
              className="hover:text-foreground"
              activeProps={{ className: 'text-foreground font-medium' }}
            >
              Tipe Kamar
            </Link>
            <Link
              to="/admin/penghuni"
              className="hover:text-foreground"
              activeProps={{ className: 'text-foreground font-medium' }}
            >
              Penghuni
            </Link>
            <Link
              to="/admin/sewa"
              className="hover:text-foreground"
              activeProps={{ className: 'text-foreground font-medium' }}
            >
              Sewa
            </Link>
            <Link
              to="/admin/tagihan"
              className="hover:text-foreground"
              activeProps={{ className: 'text-foreground font-medium' }}
            >
              Tagihan
            </Link>
            <Link
              to="/admin/pembayaran"
              className="hover:text-foreground"
              activeProps={{ className: 'text-foreground font-medium' }}
            >
              Pembayaran
            </Link>
            <Link
              to="/admin/halaman"
              className="hover:text-foreground"
              activeProps={{ className: 'text-foreground font-medium' }}
            >
              Halaman
            </Link>
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
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
