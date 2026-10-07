import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { type Settings, getSettings, updateSettings } from '#/server/admin/settings'

export const Route = createFileRoute('/admin/pengaturan')({
  component: PengaturanPage,
  loader: () => getSettings(),
})

function PengaturanPage() {
  const saved = Route.useLoaderData()
  const router = useRouter()
  const save = useServerFn(updateSettings)
  const [form, setForm] = useState<Settings>(saved)
  const [isSaving, setIsSaving] = useState(false)

  function setField<K extends keyof Settings>(field: K, value: Settings[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    try {
      await save({ data: form })
      await router.invalidate()
      toast.success('Pengaturan tersimpan.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Pengaturan gagal disimpan.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Pengaturan</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Identitas properti ini dipakai oleh halaman publik dan kuitansi.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identitas properti</CardTitle>
          <CardDescription>Nama dan tagline muncul di bagian atas halaman publik.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            id="name"
            label="Nama properti"
            value={form.name}
            onChange={(value) => setField('name', value)}
            required
          />
          <Field
            id="tagline"
            label="Tagline"
            value={form.tagline}
            onChange={(value) => setField('tagline', value)}
            placeholder="Kost nyaman dekat kampus"
          />
          <Field
            id="address"
            label="Alamat"
            value={form.address}
            onChange={(value) => setField('address', value)}
            className="sm:col-span-2"
          />
          <Field
            id="whatsappNumber"
            label="Nomor WhatsApp"
            value={form.whatsappNumber}
            onChange={(value) => setField('whatsappNumber', value)}
            placeholder="628123456789"
            inputMode="tel"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rekening pembayaran</CardTitle>
          <CardDescription>
            Data ini muncul di bagian bawah halaman publik dan di kuitansi.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            id="bankName"
            label="Nama bank"
            value={form.bankName}
            onChange={(value) => setField('bankName', value)}
          />
          <Field
            id="accountNumber"
            label="Nomor rekening"
            value={form.accountNumber}
            onChange={(value) => setField('accountNumber', value)}
            inputMode="numeric"
          />
          <Field
            id="accountHolder"
            label="Nama pemilik rekening"
            value={form.accountHolder}
            onChange={(value) => setField('accountHolder', value)}
            hint="Dipakai juga sebagai nama penanda tangan kuitansi."
            className="sm:col-span-2"
          />
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

type FieldProps = {
  id: string
  label: string
  value: string | null
  onChange: (value: string) => void
  hint?: string
  placeholder?: string
  className?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  required?: boolean
}

function Field({
  id,
  label,
  value,
  onChange,
  hint,
  placeholder,
  className,
  inputMode,
  required,
}: FieldProps) {
  return (
    <div className={`grid gap-2 ${className ?? ''}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        required={required}
      />
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  )
}
