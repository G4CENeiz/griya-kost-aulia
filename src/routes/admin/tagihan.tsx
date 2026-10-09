import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { type ChargeOption, PaymentDialog } from '#/components/payment-dialog'
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
import { errorMessage } from '#/lib/errors'
import { formatDay, formatRupiah } from '#/lib/format'
import {
  type Charge,
  type ChargeDetail,
  type DeletedCharge,
  deleteCharge,
  getCharge,
  listCharges,
  listDeletedCharges,
  restoreCharge,
  updateChargeAmount,
  updateChargeDueDate,
} from '#/server/admin/charges'

export const Route = createFileRoute('/admin/tagihan')({
  component: ChargesPage,
  loader: async () => ({
    charges: await listCharges({ data: { tenancyId: null } }),
    deleted: await listDeletedCharges(),
  }),
})

type OpenDialog =
  | { kind: 'pay'; charge: Charge }
  | { kind: 'edit'; charge: Charge }
  | { kind: 'view'; charge: Charge }
  | { kind: 'delete'; charge: Charge }
  | { kind: 'purge'; charge: DeletedCharge }
  | null

function toOption(charge: Charge): ChargeOption {
  return {
    id: charge.id,
    roomNumber: charge.roomNumber,
    tenantName: charge.tenantName,
    periodStart: charge.periodStart,
    periodEnd: charge.periodEnd,
    balance: charge.balance,
  }
}

function ChargesPage() {
  const { charges, deleted } = Route.useLoaderData()
  const router = useRouter()
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const refresh = async () => {
    setDialog(null)
    await router.invalidate()
  }

  const restore = useServerFn(restoreCharge)

  async function restoreRow(charge: DeletedCharge) {
    try {
      await restore({ data: { chargeId: charge.id } })
      toast.success('Tagihan dipulihkan.')
      await refresh()
    } catch (error) {
      toast.error(errorMessage(error, 'Tagihan gagal dipulihkan.'))
    }
  }

  const unpaid = charges.filter((charge) => charge.balance > 0)

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Tagihan</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Sisa dihitung dari pembayaran yang tidak dibatalkan. Lewat jatuh tempo hanya penanda,
          tidak disimpan. Menghapus menyembunyikan tagihan, jadi periode itu berhenti ditagih.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar tagihan</CardTitle>
          <CardDescription>
            {charges.length} tagihan, {unpaid.length} belum lunas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {charges.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Belum ada tagihan. Tagihan dibuat saat sewa dimulai atau diperpanjang.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kamar</TableHead>
                  <TableHead>Penghuni</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Jatuh tempo</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Terbayar</TableHead>
                  <TableHead>Sisa</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charges.map((charge) => (
                  <TableRow key={charge.id}>
                    <TableCell className="font-medium">{charge.roomNumber}</TableCell>
                    <TableCell>{charge.tenantName}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDay(charge.periodStart)} – {formatDay(charge.periodEnd)}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {formatDay(charge.dueDate)}
                        {charge.isOverdue ? <Badge variant="destructive">Lewat</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell>{formatRupiah(charge.amount)}</TableCell>
                    <TableCell>{formatRupiah(charge.paidAmount)}</TableCell>
                    <TableCell>
                      {charge.balance === 0 ? (
                        <Badge variant="secondary">Lunas</Badge>
                      ) : (
                        formatRupiah(charge.balance)
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 whitespace-nowrap">
                        {charge.balance > 0 ? (
                          <Button size="sm" onClick={() => setDialog({ kind: 'pay', charge })}>
                            Catat
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setDialog({ kind: 'view', charge })}
                        >
                          Lihat
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDialog({ kind: 'edit', charge })}
                        >
                          Ubah
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDialog({ kind: 'delete', charge })}
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
              {deleted.length} tagihan terhapus. Periode ini tidak dihitung lagi sampai dipulihkan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kamar</TableHead>
                  <TableHead>Penghuni</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Pembayaran</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deleted.map((charge) => (
                  <TableRow key={charge.id} className="text-muted-foreground">
                    <TableCell className="font-medium">{charge.roomNumber}</TableCell>
                    <TableCell>{charge.tenantName}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDay(charge.periodStart)} – {formatDay(charge.periodEnd)}
                    </TableCell>
                    <TableCell>{formatRupiah(charge.amount)}</TableCell>
                    <TableCell>{charge.paymentCount} baris</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 whitespace-nowrap">
                        <Button size="sm" variant="outline" onClick={() => void restoreRow(charge)}>
                          Pulihkan
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDialog({ kind: 'purge', charge })}
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
        <ChargeDetailDialog charge={dialog.charge} onClose={() => setDialog(null)} />
      ) : null}

      {dialog?.kind === 'pay' ? (
        <PaymentDialog
          charge={toOption(dialog.charge)}
          onClose={() => setDialog(null)}
          onSaved={async () => {
            setDialog(null)
            await router.invalidate()
          }}
        />
      ) : null}

      {dialog?.kind === 'edit' ? (
        <EditChargeDialog
          charge={dialog.charge}
          onClose={() => setDialog(null)}
          onSaved={async () => {
            setDialog(null)
            await router.invalidate()
          }}
        />
      ) : null}

      {dialog?.kind === 'delete' ? (
        <DeleteChargeDialog
          charge={dialog.charge}
          onClose={() => setDialog(null)}
          onDeleted={refresh}
        />
      ) : null}

      {dialog?.kind === 'purge' ? (
        <PurgeChargeDialog
          charge={dialog.charge}
          onClose={() => setDialog(null)}
          onPurged={refresh}
        />
      ) : null}
    </div>
  )
}

/** The individual view: the charge and every payment against it. */
function ChargeDetailDialog({ charge, onClose }: { charge: Charge; onClose: () => void }) {
  const load = useServerFn(getCharge)
  const [detail, setDetail] = useState<ChargeDetail | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const result = await load({ data: { chargeId: charge.id } })
        if (alive) setDetail(result)
      } catch (error) {
        toast.error(errorMessage(error, 'Tagihan gagal dimuat.'))
      }
    })()
    return () => {
      alive = false
    }
  }, [load, charge.id])

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Tagihan kamar {charge.roomNumber} · {formatDay(charge.periodStart)}
          </DialogTitle>
          <DialogDescription>
            {charge.tenantName} · periode sampai {formatDay(charge.periodEnd)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-1 text-sm">
            <p>
              <span className="text-muted-foreground">Jumlah: </span>
              {formatRupiah(charge.amount)}
            </p>
            <p>
              <span className="text-muted-foreground">Jatuh tempo: </span>
              {formatDay(charge.dueDate)}
              {charge.isOverdue ? ' · lewat jatuh tempo' : ''}
            </p>
            <p>
              <span className="text-muted-foreground">Terbayar: </span>
              {formatRupiah(charge.paidAmount)}
            </p>
            <p>
              <span className="text-muted-foreground">Sisa: </span>
              {formatRupiah(charge.balance)}
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Pembayaran</p>
            {!detail ? (
              <p className="text-muted-foreground text-sm">Memuat…</p>
            ) : detail.payments.length === 0 ? (
              <p className="text-muted-foreground text-sm">Belum ada pembayaran.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Metode</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="whitespace-nowrap">{formatDay(payment.date)}</TableCell>
                      <TableCell>{payment.method === 'cash' ? 'Tunai' : 'Transfer'}</TableCell>
                      <TableCell>{formatRupiah(payment.amount)}</TableCell>
                      <TableCell className="text-sm">
                        {payment.voidedAt === null
                          ? 'Sah'
                          : `Dibatalkan: ${payment.voidReason ?? '—'}`}
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

function EditChargeDialog({
  charge,
  onClose,
  onSaved,
}: {
  charge: Charge
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const saveAmount = useServerFn(updateChargeAmount)
  const saveDueDate = useServerFn(updateChargeDueDate)
  const [isSaving, setIsSaving] = useState(false)
  const [amount, setAmount] = useState(String(charge.amount))
  const [dueDate, setDueDate] = useState(charge.dueDate)
  const hasPayments = charge.paymentCount > 0

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    try {
      if (!hasPayments && Number(amount) !== charge.amount) {
        await saveAmount({ data: { chargeId: charge.id, amount } })
      }
      if (dueDate !== charge.dueDate) {
        await saveDueDate({ data: { chargeId: charge.id, dueDate } })
      }
      toast.success('Tagihan tersimpan.')
      await onSaved()
    } catch (error) {
      toast.error(errorMessage(error, 'Tagihan gagal disimpan.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ubah tagihan</DialogTitle>
            <DialogDescription>
              {hasPayments
                ? 'Jumlah tidak bisa diubah karena tagihan ini sudah punya pembayaran. Batalkan pembayarannya dulu.'
                : 'Jumlah bisa diubah selama belum ada pembayaran. Jatuh tempo selalu bisa diubah.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="charge-amount">Jumlah</Label>
              <Input
                id="charge-amount"
                inputMode="numeric"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={hasPayments}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="charge-due-date">Jatuh tempo</Label>
              <Input
                id="charge-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                required
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

function DeleteChargeDialog({
  charge,
  onClose,
  onDeleted,
}: {
  charge: Charge
  onClose: () => void
  onDeleted: () => Promise<void>
}) {
  const remove = useServerFn(deleteCharge)
  const [isSaving, setIsSaving] = useState(false)
  const [permanent, setPermanent] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    try {
      await remove({ data: { chargeId: charge.id, permanent } })
      toast.success(permanent ? 'Tagihan dihapus permanen.' : 'Tagihan dipindah ke sampah.')
      await onDeleted()
    } catch (error) {
      toast.error(errorMessage(error, 'Tagihan gagal dihapus.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <AlertDialogContent>
        <form onSubmit={handleSubmit}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Hapus tagihan {charge.roomNumber} periode {formatDay(charge.periodStart)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Hapus biasa menyembunyikan tagihan, jadi periode itu berhenti ditagih, dan bisa
              dipulihkan dari Sampah. Tagihan yang punya pembayaran sah ditolak sampai pembayarannya
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex items-start gap-2 py-4">
            <Checkbox
              id="charge-permanent"
              checked={permanent}
              onCheckedChange={(checked) => setPermanent(checked === true)}
            />
            <div className="grid gap-1">
              <Label htmlFor="charge-permanent">Hapus permanen</Label>
              <p className="text-muted-foreground text-xs">
                Barisnya dibuang dan tidak bisa dipulihkan. Ditolak bila masih ada baris pembayaran,
                termasuk yang dibatalkan.
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

function PurgeChargeDialog({
  charge,
  onClose,
  onPurged,
}: {
  charge: DeletedCharge
  onClose: () => void
  onPurged: () => Promise<void>
}) {
  const remove = useServerFn(deleteCharge)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    try {
      await remove({ data: { chargeId: charge.id, permanent: true } })
      toast.success('Tagihan dihapus permanen.')
      await onPurged()
    } catch (error) {
      toast.error(errorMessage(error, 'Tagihan gagal dihapus permanen.'))
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
            <AlertDialogTitle>Hapus permanen tagihan {charge.roomNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              Barisnya dibuang dan tidak bisa dipulihkan.
              {charge.paymentCount > 0
                ? ` Masih ada ${charge.paymentCount} baris pembayaran, jadi permintaan ini akan ditolak.`
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
