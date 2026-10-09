import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Textarea } from '#/components/ui/textarea'
import { errorMessage } from '#/lib/errors'
import { formatDay, formatRupiah } from '#/lib/format'
import {
  type DeletedTenant,
  type Tenant,
  type TenantDetail,
  type TenantInput,
  createTenant,
  deleteTenant,
  getTenant,
  listDeletedTenants,
  listTenants,
  restoreTenant,
  updateTenant,
} from '#/server/admin/tenants'

export const Route = createFileRoute('/admin/penghuni')({
  component: TenantsPage,
  loader: async () => ({
    tenants: await listTenants(),
    deleted: await listDeletedTenants(),
  }),
})

type OpenDialog =
  | { kind: 'create' }
  | { kind: 'edit'; tenant: Tenant }
  | { kind: 'view'; tenant: Tenant }
  | { kind: 'delete'; tenant: Tenant }
  | { kind: 'purge'; tenant: DeletedTenant }
  | null

function TenantsPage() {
  const { tenants, deleted } = Route.useLoaderData()
  const router = useRouter()
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const refresh = async () => {
    setDialog(null)
    await router.invalidate()
  }

  const restore = useServerFn(restoreTenant)

  async function restoreTenantRow(tenant: DeletedTenant) {
    try {
      await restore({ data: { id: tenant.id } })
      toast.success('Penghuni dipulihkan.')
      await refresh()
    } catch (error) {
      toast.error(errorMessage(error, 'Penghuni gagal dipulihkan.'))
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Penghuni</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Satu orang satu sewa. Menghapus menyembunyikan penghuni; riwayat sewanya tetap utuh.
          </p>
        </div>
        <Button onClick={() => setDialog({ kind: 'create' })}>Tambah penghuni</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar penghuni</CardTitle>
          <CardDescription>{tenants.length} penghuni terdaftar.</CardDescription>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada penghuni.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Kamar</TableHead>
                  <TableHead>Identitas</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>{tenant.whatsappNumber}</TableCell>
                    <TableCell>
                      {tenant.activeTenancy ? (
                        <Badge variant="secondary">
                          Kamar {tenant.activeTenancy.roomNumber} sejak{' '}
                          {formatDay(tenant.activeTenancy.startDate)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Tidak menyewa</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {tenant.identityNumber ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setDialog({ kind: 'view', tenant })}
                        >
                          Lihat
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDialog({ kind: 'edit', tenant })}
                        >
                          Ubah
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDialog({ kind: 'delete', tenant })}
                        >
                          Hapus
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {deleted.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sampah</CardTitle>
            <CardDescription>
              {deleted.length} penghuni terhapus. Pulihkan untuk memakainya lagi, atau hapus
              permanen untuk membuang barisnya.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Riwayat sewa</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deleted.map((tenant) => (
                  <TableRow key={tenant.id} className="text-muted-foreground">
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>{tenant.whatsappNumber}</TableCell>
                    <TableCell>{tenant.tenancyCount} sewa</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void restoreTenantRow(tenant)}
                        >
                          Pulihkan
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDialog({ kind: 'purge', tenant })}
                        >
                          Hapus permanen
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {dialog?.kind === 'view' ? (
        <TenantDetailDialog tenant={dialog.tenant} onClose={() => setDialog(null)} />
      ) : null}

      {dialog?.kind === 'create' || dialog?.kind === 'edit' ? (
        <TenantDialog editor={dialog} onClose={() => setDialog(null)} onSaved={refresh} />
      ) : null}

      {dialog?.kind === 'delete' ? (
        <DeleteTenantDialog
          tenant={dialog.tenant}
          onClose={() => setDialog(null)}
          onDeleted={refresh}
        />
      ) : null}

      {dialog?.kind === 'purge' ? (
        <PurgeTenantDialog
          tenant={dialog.tenant}
          onClose={() => setDialog(null)}
          onPurged={refresh}
        />
      ) : null}
    </div>
  )
}

/** The individual view: the record, and the stays that reference it. */
function TenantDetailDialog({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const load = useServerFn(getTenant)
  const [detail, setDetail] = useState<TenantDetail | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const result = await load({ data: { id: tenant.id } })
        if (alive) setDetail(result)
      } catch (error) {
        toast.error(errorMessage(error, 'Penghuni gagal dimuat.'))
      }
    })()
    return () => {
      alive = false
    }
  }, [load, tenant.id])

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tenant.name}</DialogTitle>
          <DialogDescription>
            WhatsApp {tenant.whatsappNumber}
            {tenant.activeTenancy
              ? ` · kamar ${tenant.activeTenancy.roomNumber} sejak ${formatDay(tenant.activeTenancy.startDate)}`
              : ' · tidak sedang menyewa'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-1 text-sm">
            <p>
              <span className="text-muted-foreground">Nomor identitas: </span>
              {tenant.identityNumber ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Catatan: </span>
              {tenant.notes ?? '—'}
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Riwayat sewa</p>
            {!detail ? (
              <p className="text-muted-foreground text-sm">Memuat…</p>
            ) : detail.tenancies.length === 0 ? (
              <p className="text-muted-foreground text-sm">Belum pernah menyewa.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kamar</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Tagihan</TableHead>
                    <TableHead className="text-right">Terbayar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.tenancies.map((tenancy) => (
                    <TableRow key={tenancy.id}>
                      <TableCell className="font-medium">{tenancy.roomNumber}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDay(tenancy.startDate)} –{' '}
                        {tenancy.moveOutDate ? formatDay(tenancy.moveOutDate) : 'sekarang'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {tenancy.chargeCount} tagihan, {formatRupiah(tenancy.billedAmount)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatRupiah(tenancy.paidAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TenantDialog({
  editor,
  onClose,
  onSaved,
}: {
  editor: { kind: 'create' } | { kind: 'edit'; tenant: Tenant }
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const create = useServerFn(createTenant)
  const update = useServerFn(updateTenant)
  const [isSaving, setIsSaving] = useState(false)
  const current = editor.kind === 'edit' ? editor.tenant : null
  const [form, setForm] = useState({
    name: current?.name ?? '',
    whatsappNumber: current?.whatsappNumber ?? '',
    identityNumber: current?.identityNumber ?? '',
    notes: current?.notes ?? '',
  })

  const input: TenantInput = {
    name: form.name,
    whatsappNumber: form.whatsappNumber,
    identityNumber: form.identityNumber,
    notes: form.notes,
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    try {
      if (current) {
        await update({ data: { id: current.id, ...input } })
        toast.success('Penghuni tersimpan.')
      } else {
        await create({ data: input })
        toast.success('Penghuni ditambahkan.')
      }
      await onSaved()
    } catch (error) {
      toast.error(errorMessage(error, 'Penghuni gagal disimpan.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{current ? 'Ubah penghuni' : 'Penghuni baru'}</DialogTitle>
            <DialogDescription>
              Nama dan nomor WhatsApp dipakai untuk menghubungi penghuni.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="tenant-name">Nama</Label>
              <Input
                id="tenant-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tenant-whatsapp">Nomor WhatsApp</Label>
              <Input
                id="tenant-whatsapp"
                inputMode="tel"
                value={form.whatsappNumber}
                onChange={(event) => setForm({ ...form, whatsappNumber: event.target.value })}
                placeholder="628123456789"
                required
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="tenant-identity">Nomor identitas</Label>
              <Input
                id="tenant-identity"
                value={form.identityNumber}
                onChange={(event) => setForm({ ...form, identityNumber: event.target.value })}
                placeholder="KTP atau kartu pelajar"
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="tenant-notes">Catatan</Label>
              <Textarea
                id="tenant-notes"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteTenantDialog({
  tenant,
  onClose,
  onDeleted,
}: {
  tenant: Tenant
  onClose: () => void
  onDeleted: () => Promise<void>
}) {
  const remove = useServerFn(deleteTenant)
  const [isSaving, setIsSaving] = useState(false)
  const [permanent, setPermanent] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    try {
      await remove({ data: { id: tenant.id, permanent } })
      toast.success(permanent ? 'Penghuni dihapus permanen.' : 'Penghuni dipindah ke sampah.')
      await onDeleted()
    } catch (error) {
      toast.error(errorMessage(error, 'Penghuni gagal dihapus.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <AlertDialogContent>
        <form onSubmit={handleSubmit}>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {tenant.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Hapus biasa menyembunyikan penghuni dari daftar dan bisa dipulihkan dari Sampah.
              Riwayat sewanya tetap utuh.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex items-start gap-2 py-4">
            <Checkbox
              id="tenant-permanent"
              checked={permanent}
              onCheckedChange={(checked) => setPermanent(checked === true)}
            />
            <div className="grid gap-1">
              <Label htmlFor="tenant-permanent">Hapus permanen</Label>
              <p className="text-muted-foreground text-xs">
                Barisnya dibuang dan tidak bisa dipulihkan. Ditolak bila penghuni ini masih punya
                riwayat sewa.
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction type="submit" disabled={isSaving}>
              {isSaving ? 'Menyimpan…' : permanent ? 'Hapus permanen' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function PurgeTenantDialog({
  tenant,
  onClose,
  onPurged,
}: {
  tenant: DeletedTenant
  onClose: () => void
  onPurged: () => Promise<void>
}) {
  const remove = useServerFn(deleteTenant)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    try {
      await remove({ data: { id: tenant.id, permanent: true } })
      toast.success('Penghuni dihapus permanen.')
      await onPurged()
    } catch (error) {
      toast.error(errorMessage(error, 'Penghuni gagal dihapus permanen.'))
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <AlertDialogContent>
        <form onSubmit={handleSubmit}>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus permanen {tenant.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Barisnya dibuang dan tidak bisa dipulihkan.
              {tenant.tenancyCount > 0
                ? ` Penghuni ini punya ${tenant.tenancyCount} riwayat sewa, jadi permintaan ini akan ditolak.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction type="submit" disabled={isSaving}>
              {isSaving ? 'Menghapus…' : 'Hapus permanen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
