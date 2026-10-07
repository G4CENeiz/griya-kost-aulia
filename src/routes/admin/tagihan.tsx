import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
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
  deleteCharge,
  listCharges,
  updateChargeAmount,
  updateChargeDueDate,
} from '#/server/admin/charges'

export const Route = createFileRoute('/admin/tagihan')({
  component: ChargesPage,
  loader: async () => ({ charges: await listCharges({ data: { tenancyId: null } }) }),
})

type OpenDialog =
  | { kind: 'pay'; charge: Charge }
  | { kind: 'edit'; charge: Charge }
  | { kind: 'delete'; charge: Charge }
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
  const { charges } = Route.useLoaderData()
  const router = useRouter()
  const [dialog, setDialog] = useState<OpenDialog>(null)

  const unpaid = charges.filter((charge) => charge.balance > 0)

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Tagihan</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Sisa dihitung dari pembayaran yang tidak dibatalkan. Lewat jatuh tempo hanya penanda,
          tidak disimpan.
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
          onDeleted={async () => {
            setDialog(null)
            await router.invalidate()
          }}
        />
      ) : null}
    </div>
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
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await remove({ data: { chargeId: charge.id } })
      toast.success('Tagihan dihapus.')
      await onDeleted()
    } catch (error) {
      toast.error(errorMessage(error, 'Tagihan gagal dihapus.'))
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Hapus tagihan {charge.roomNumber} periode {formatDay(charge.periodStart)}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Tagihan yang sudah punya pembayaran tidak bisa dihapus. Hapus tagihan ini berarti
            periode itu tidak lagi ditagih.
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
