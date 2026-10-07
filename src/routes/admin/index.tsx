import { createFileRoute, Link } from '@tanstack/react-router'

import { METHOD_LABEL } from '#/components/payment-dialog'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { formatDay, formatRupiah } from '#/lib/format'
import { ROOM_STATUS_LABEL } from '#/lib/room-status'
import { getDashboard } from '#/server/admin/dashboard'

export const Route = createFileRoute('/admin/')({
  component: DashboardPage,
  loader: () => getDashboard(),
})

const STATUS_ORDER = ['occupied', 'available', 'unavailable'] as const

function DashboardPage() {
  const dashboard = Route.useLoaderData()
  const { rooms, outstanding, recentPayments, availability } = dashboard
  const nothingRecorded = rooms.total === 0

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dasbor</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Ringkasan properti: kamar, tagihan yang perlu ditagih, dan pembayaran terakhir.
        </p>
      </div>

      {nothingRecorded ? (
        <p className="text-muted-foreground text-sm">
          Belum ada kamar. Mulai dari{' '}
          <Link to="/admin/tipe-kamar" className="underline">
            tipe kamar
          </Link>{' '}
          lalu{' '}
          <Link to="/admin/kamar" className="underline">
            kamar
          </Link>
          .
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Kamar" value={rooms.total} />
        {STATUS_ORDER.map((status) => (
          <StatCard key={status} label={ROOM_STATUS_LABEL[status]} value={rooms.byStatus[status]} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ketersediaan per tipe kamar</CardTitle>
          <CardDescription>
            Ketersediaan dihitung dari sewa yang berjalan, bukan dari kolom tersendiri.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availability.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada tipe kamar.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availability.map((entry) => (
                <Badge key={entry.roomTypeName} variant="outline">
                  {entry.roomTypeName}: {entry.available} dari {entry.total} tersedia
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tagihan belum lunas</CardTitle>
          <CardDescription>
            {outstanding.count} tagihan, sisa {formatRupiah(outstanding.total)}
            {outstanding.overdue > 0 ? `, ${outstanding.overdue} sudah lewat jatuh tempo` : ''}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {outstanding.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">Semua tagihan lunas.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kamar</TableHead>
                    <TableHead>Penghuni</TableHead>
                    <TableHead>Jatuh tempo</TableHead>
                    <TableHead className="text-right">Sisa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outstanding.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.roomNumber}</TableCell>
                      <TableCell>{item.tenantName}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {formatDay(item.dueDate)}
                          {item.isOverdue ? <Badge variant="destructive">Lewat</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatRupiah(item.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4">
                <Link to="/admin/tagihan" className="text-sm underline">
                  Lihat semua tagihan
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pembayaran terakhir</CardTitle>
          <CardDescription>Pembayaran yang dibatalkan tidak muncul di sini.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada pembayaran.</p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {recentPayments.map((payment) => (
                <li key={payment.id} className="flex justify-between gap-4">
                  <span>
                    {formatDay(payment.date)} · Kamar {payment.roomNumber} · {payment.tenantName} ·{' '}
                    {METHOD_LABEL[payment.method]}
                  </span>
                  <span className="font-medium">{formatRupiah(payment.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}
