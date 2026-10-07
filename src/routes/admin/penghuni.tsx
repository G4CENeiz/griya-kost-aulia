import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
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
import { formatDay } from '#/lib/format'
import {
  type Tenant,
  type TenantInput,
  createTenant,
  deleteTenant,
  listTenants,
  updateTenant,
} from '#/server/admin/tenants'

export const Route = createFileRoute('/admin/penghuni')({
  component: TenantsPage,
  loader: () => listTenants(),
})

type Editor = { mode: 'create'; tenant: null } | { mode: 'edit'; tenant: Tenant }

function TenantsPage() {
  const tenants = Route.useLoaderData()
  const router = useRouter()
  const [editor, setEditor] = useState<Editor | null>(null)
  const [confirmedDelete, setConfirmedDelete] = useState<Tenant | null>(null)

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Penghuni</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Satu orang satu sewa. Penghuni dengan sewa berjalan tidak bisa pindah ke sewa baru.
          </p>
        </div>
        <Button onClick={() => setEditor({ mode: 'create', tenant: null })}>Tambah penghuni</Button>
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
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditor({ mode: 'edit', tenant })}
                        >
                          Ubah
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setConfirmedDelete(tenant)}
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

      {editor ? (
        <TenantDialog
          editor={editor}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null)
            await router.invalidate()
          }}
        />
      ) : null}

      <DeleteTenantDialog
        tenant={confirmedDelete}
        onClose={() => setConfirmedDelete(null)}
        onDeleted={async () => {
          setConfirmedDelete(null)
          await router.invalidate()
        }}
      />
    </div>
  )
}

function TenantDialog({
  editor,
  onClose,
  onSaved,
}: {
  editor: Editor
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const create = useServerFn(createTenant)
  const update = useServerFn(updateTenant)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    name: editor.tenant?.name ?? '',
    whatsappNumber: editor.tenant?.whatsappNumber ?? '',
    identityNumber: editor.tenant?.identityNumber ?? '',
    notes: editor.tenant?.notes ?? '',
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
      if (editor.mode === 'edit' && editor.tenant) {
        await update({ data: { id: editor.tenant.id, ...input } })
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
            <DialogTitle>{editor.mode === 'edit' ? 'Ubah penghuni' : 'Penghuni baru'}</DialogTitle>
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
  tenant: Tenant | null
  onClose: () => void
  onDeleted: () => Promise<void>
}) {
  const remove = useServerFn(deleteTenant)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    if (!tenant) return
    setIsDeleting(true)
    try {
      await remove({ data: { id: tenant.id } })
      toast.success('Penghuni dihapus.')
      await onDeleted()
    } catch (error) {
      toast.error(errorMessage(error, 'Penghuni gagal dihapus.'))
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={tenant !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus {tenant?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Penghuni yang punya riwayat sewa tidak bisa dihapus.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Menghapus…' : 'Hapus'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
