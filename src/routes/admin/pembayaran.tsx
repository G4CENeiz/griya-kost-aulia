import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { type ChargeOption, METHOD_LABEL, PaymentDialog } from '#/components/payment-dialog'
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
import { listCharges } from '#/server/admin/charges'
import {
  type Payment,
  type PaymentDetail,
  getPayment,
  listPayments,
  purgePayment,
  voidPayment,
} from '#/server/admin/payments'

export const Route = createFileRoute('/admin/pembayaran')({
  component: PaymentsPage,
  loader: async () => ({
    payments: await listPayments(),
    charges: await listCharges({ data: { tenancyId: null } }),
  }),
})

type OpenDialog =
  | { kind: 'pay' }
  | { kind: 'view'; payment: Payment }
  | { kind: 'void'; payment: Payment }
  | { kind: 'purge'; payment: Payment }
  | null

function PaymentsPage() {
  const { payments, charges } = Route.useLoaderData()
  const router = useRouter()
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const refresh = async () => {
    setDialog(null)
    await router.invalidate()
  }

  const unpaid: ChargeOption[] = charges
    .filter((charge) => charge.balance > 0)
    .map((charge) => ({
      id: charge.id,
      roomNumber: charge.roomNumber,
      tenantName: charge.tenantName,
      periodStart: charge.periodStart,
      periodEnd: charge.periodEnd,
      balance: charge.balance,
    }))

  const received = payments
    .filter((payment) => payment.voidedAt === null)
    .reduce((sum, payment) => sum + payment.amount, 0)

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Pembayaran</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Pembayaran tidak pernah diubah. Membatalkan dengan alasan adalah cara menyembunyikannya;
            baris yang sudah dibatalkan bisa dihapus permanen.
          </p>
        </div>
        <Button disabled={unpaid.length === 0} onClick={() => setDialog({ kind: 'pay' })}>
          Catat pembayaran
        </Button>
      </div>

      {unpaid.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Tidak ada tagihan yang belum lunas.{' '}
          <Link to="/admin/tagihan" className="underline">
            Lihat tagihan
          </Link>
          .
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Buku pembayaran</CardTitle>
          <CardDescription>
            {payments.length} baris, total diterima {formatRupiah(received)}. Baris yang dibatalkan
            tidak dihitung.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada pembayaran.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Kamar</TableHead>
                  <TableHead>Penghuni</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => {
                  const voided = payment.voidedAt !== null
                  return (
                    <TableRow
                      key={payment.id}
                      className={voided ? 'text-muted-foreground' : undefined}
                    >
                      <TableCell className="whitespace-nowrap">{formatDay(payment.date)}</TableCell>
                      <TableCell>{payment.roomNumber}</TableCell>
                      <TableCell>{payment.tenantName}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDay(payment.periodStart)} – {formatDay(payment.periodEnd)}
                      </TableCell>
                      <TableCell className={voided ? 'line-through' : 'font-medium'}>
                        {formatRupiah(payment.amount)}
                      </TableCell>
                      <TableCell>{METHOD_LABEL[payment.method]}</TableCell>
                      <TableCell className="max-w-[14rem] text-sm">
                        {voided ? (
                          <span>Dibatalkan: {payment.voidReason}</span>
                        ) : (
                          (payment.note ?? '—')
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setDialog({ kind: 'view', payment })}
                          >
                            Lihat
                          </Button>
                          {voided ? (
                            <>
                              <Badge variant="outline">Batal</Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDialog({ kind: 'purge', payment })}
                              >
                                Hapus permanen
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDialog({ kind: 'void', payment })}
                            >
                              Batalkan
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {dialog?.kind === 'pay' ? (
        <PaymentDialog
          charges={unpaid}
          onClose={() => setDialog(null)}
          onSaved={async () => {
            setDialog(null)
            await router.invalidate()
          }}
        />
      ) : null}

      {dialog?.kind === 'view' ? (
        <PaymentDetailDialog payment={dialog.payment} onClose={() => setDialog(null)} />
      ) : null}

      {dialog?.kind === 'void' ? (
        <VoidPaymentDialog
          payment={dialog.payment}
          onClose={() => setDialog(null)}
          onVoided={refresh}
        />
      ) : null}

      {dialog?.kind === 'purge' ? (
        <PurgePaymentDialog
          payment={dialog.payment}
          onClose={() => setDialog(null)}
          onPurged={refresh}
        />
      ) : null}
    </div>
  )
}

/** The individual view: the payment, its charge, and its receipt when one exists. */
function PaymentDetailDialog({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const load = useServerFn(getPayment)
  const [detail, setDetail] = useState<PaymentDetail | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const result = await load({ data: { paymentId: payment.id } })
        if (alive) setDetail(result)
      } catch (error) {
        toast.error(errorMessage(error, 'Pembayaran gagal dimuat.'))
      }
    })()
    return () => {
      alive = false
    }
  }, [load, payment.id])

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Pembayaran {formatRupiah(payment.amount)}</DialogTitle>
          <DialogDescription>
            Kamar {payment.roomNumber} · {payment.tenantName} · {METHOD_LABEL[payment.method]}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-1 py-4 text-sm">
          <p>
            <span className="text-muted-foreground">Tanggal: </span>
            {formatDay(payment.date)}
          </p>
          <p>
            <span className="text-muted-foreground">Periode: </span>
            {formatDay(payment.periodStart)} – {formatDay(payment.periodEnd)}
          </p>
          <p>
            <span className="text-muted-foreground">Catatan: </span>
            {payment.note ?? '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Status: </span>
            {payment.voidedAt === null ? (
              'Sah'
            ) : (
              <>
                <Badge variant="outline">Batal</Badge> {payment.voidReason ?? '—'}
              </>
            )}
          </p>
          <p>
            <span className="text-muted-foreground">Kuitansi: </span>
            {!detail
              ? 'Memuat…'
              : detail.receipt
                ? `Nomor ${detail.receipt.number}`
                : 'Belum dibuat'}
          </p>
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

function PurgePaymentDialog({
  payment,
  onClose,
  onPurged,
}: {
  payment: Payment
  onClose: () => void
  onPurged: () => Promise<void>
}) {
  const remove = useServerFn(purgePayment)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    try {
      await remove({ data: { paymentId: payment.id } })
      toast.success('Pembayaran dihapus permanen.')
      await onPurged()
    } catch (error) {
      toast.error(errorMessage(error, 'Pembayaran gagal dihapus permanen.'))
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
            <AlertDialogTitle>
              Hapus permanen pembayaran {formatRupiah(payment.amount)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Barisnya dibuang dan tidak bisa dipulihkan. Sisa tagihan dihitung ulang tanpa baris
              ini. Pembayaran yang punya kuitansi ditolak.
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

function VoidPaymentDialog({
  payment,
  onClose,
  onVoided,
}: {
  payment: Payment
  onClose: () => void
  onVoided: () => Promise<void>
}) {
  const voidIt = useServerFn(voidPayment)
  const [isSaving, setIsSaving] = useState(false)
  const [reason, setReason] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    try {
      await voidIt({ data: { paymentId: payment.id, reason } })
      toast.success('Pembayaran dibatalkan.')
      await onVoided()
    } catch (error) {
      toast.error(errorMessage(error, 'Pembayaran gagal dibatalkan.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <AlertDialogContent>
        <form onSubmit={handleSubmit}>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan pembayaran {formatRupiah(payment.amount)}?</AlertDialogTitle>
            <AlertDialogDescription>
              Pembayaran tetap terlihat dengan alasannya, dan tidak lagi dihitung pada sisa tagihan.
              Perbaikan dilakukan dengan mencatat pembayaran baru.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-2 py-4">
            <Label htmlFor="void-reason">Alasan pembatalan</Label>
            <Textarea
              id="void-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              placeholder="Salah mencatat jumlah"
              required
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction type="submit" disabled={isSaving}>
              {isSaving ? 'Menyimpan…' : 'Batalkan pembayaran'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
