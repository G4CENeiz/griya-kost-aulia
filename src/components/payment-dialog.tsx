import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Textarea } from '#/components/ui/textarea'
import { todayIso } from '#/lib/dates'
import { errorMessage } from '#/lib/errors'
import { formatDay, formatRupiah } from '#/lib/format'
import { createPayment } from '#/server/admin/payments'

export type ChargeOption = {
  id: number
  roomNumber: string
  tenantName: string
  periodStart: string
  periodEnd: string
  balance: number
}

export const METHOD_LABEL = {
  cash: 'Tunai',
  transfer: 'Transfer',
} as const

function describe(charge: ChargeOption): string {
  return `Kamar ${charge.roomNumber} · ${charge.tenantName} · ${formatDay(charge.periodStart)} – ${formatDay(charge.periodEnd)}`
}

/**
 * Recording a payment. Either the charge is known, or the admin picks one from
 * the charges that still have a balance.
 */
export function PaymentDialog({
  charge,
  charges,
  onClose,
  onSaved,
}: {
  charge?: ChargeOption | null
  charges?: ChargeOption[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const save = useServerFn(createPayment)
  const [isSaving, setIsSaving] = useState(false)
  const [chargeId, setChargeId] = useState(
    charge ? String(charge.id) : String(charges?.[0]?.id ?? ''),
  )
  const selected = charge ?? charges?.find((option) => String(option.id) === chargeId)
  const [amount, setAmount] = useState(String(selected?.balance ?? ''))
  const [date, setDate] = useState(todayIso())
  const [method, setMethod] = useState<'cash' | 'transfer'>('cash')
  const [note, setNote] = useState('')

  function pickCharge(value: string) {
    setChargeId(value)
    const next = charges?.find((option) => String(option.id) === value)
    if (next) setAmount(String(next.balance))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    try {
      await save({
        data: {
          chargeId: Number(chargeId),
          amount,
          date,
          method,
          note,
        },
      })
      toast.success('Pembayaran dicatat.')
      await onSaved()
    } catch (error) {
      toast.error(errorMessage(error, 'Pembayaran gagal disimpan.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-w-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Catat pembayaran</DialogTitle>
            <DialogDescription>
              Satu tagihan diselesaikan oleh satu pembayaran atau dua angsuran. Sisa tagihan menjadi{' '}
              {formatRupiah(selected?.balance ?? 0)}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {charge ? (
              <p className="text-sm font-medium">{describe(charge)}</p>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="payment-charge">Tagihan</Label>
                <Select value={chargeId} onValueChange={pickCharge}>
                  <SelectTrigger id="payment-charge">
                    <SelectValue placeholder="Pilih tagihan" />
                  </SelectTrigger>
                  <SelectContent>
                    {(charges ?? []).map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        {describe(option)} · sisa {formatRupiah(option.balance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="payment-amount">Jumlah</Label>
                <Input
                  id="payment-amount"
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="payment-date">Tanggal</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="payment-method">Metode</Label>
                <Select
                  value={method}
                  onValueChange={(value) => setMethod(value as 'cash' | 'transfer')}
                >
                  <SelectTrigger id="payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{METHOD_LABEL.cash}</SelectItem>
                    <SelectItem value="transfer">{METHOD_LABEL.transfer}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="payment-note">Catatan</Label>
              <Textarea
                id="payment-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                placeholder="Nomor referensi transfer, atau catatan lain"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Menyimpan…' : 'Simpan pembayaran'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
