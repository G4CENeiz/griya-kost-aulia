import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import {
  ArrowUpRight,
  BedDouble,
  CalendarClock,
  FileText,
  Images,
  LayoutDashboard,
  Layers,
  ReceiptText,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
})

/**
 * The admin shell of ADR-0030: a fixed vertical sidebar, and content in one
 * column beside it. The sidebar is the only navigation the admin area has.
 */
type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Ringkasan',
    items: [{ to: '/admin', label: 'Dasbor', icon: LayoutDashboard, exact: true }],
  },
  {
    group: 'Properti',
    items: [
      { to: '/admin/kamar', label: 'Kamar', icon: BedDouble },
      { to: '/admin/tipe-kamar', label: 'Tipe Kamar', icon: Layers },
    ],
  },
  {
    group: 'Penghuni',
    items: [
      { to: '/admin/penghuni', label: 'Penghuni', icon: Users },
      { to: '/admin/sewa', label: 'Sewa', icon: CalendarClock },
    ],
  },
  {
    group: 'Keuangan',
    items: [
      { to: '/admin/tagihan', label: 'Tagihan', icon: ReceiptText },
      { to: '/admin/pembayaran', label: 'Pembayaran', icon: Wallet },
    ],
  },
  {
    group: 'Konten',
    items: [
      { to: '/admin/halaman', label: 'Halaman', icon: FileText },
      { to: '/admin/galeri', label: 'Galeri', icon: Images },
    ],
  },
  {
    group: 'Sistem',
    items: [{ to: '/admin/pengaturan', label: 'Pengaturan', icon: Settings }],
  },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {NAV.map((section) => (
        <div key={section.group} className="grid gap-1">
          <p className="text-muted-foreground px-3 text-xs font-medium tracking-wide uppercase">
            {section.group}
          </p>
          {section.items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              activeOptions={{ exact: item.exact ?? false }}
              className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm"
              activeProps={{
                className: 'bg-accent text-foreground font-medium',
              }}
            >
              <item.icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </>
  )
}

function Sidebar() {
  return (
    <aside className="bg-background fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r lg:flex">
      <div className="border-b px-6 py-5">
        <p className="font-semibold">Griya Kost Aulia</p>
        <p className="text-muted-foreground text-xs">Panel pengelola</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="grid gap-5">
          <NavLinks />
        </div>
      </nav>
      <div className="border-t px-3 py-3">
        <Link
          to="/"
          target="_blank"
          className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm"
        >
          Lihat situs publik
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </aside>
  )
}

function CompactNav() {
  return (
    <div className="bg-background sticky top-0 z-30 border-b lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Griya Kost Aulia</p>
          <p className="text-muted-foreground text-xs">Panel pengelola</p>
        </div>
        <Link to="/" target="_blank" className="text-sm underline">
          Situs
        </Link>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
        {NAV.flatMap((section) => section.items).map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.exact ?? false }}
            className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-2 rounded-md px-3 py-1.5 text-sm whitespace-nowrap"
            activeProps={{ className: 'bg-accent text-foreground font-medium' }}
          >
            <item.icon className="size-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

function AdminLayout() {
  return (
    <div className="bg-muted/40 min-h-screen">
      <Sidebar />
      <CompactNav />
      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
