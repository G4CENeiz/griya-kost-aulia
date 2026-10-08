import { useState } from 'react'

import { Badge } from '#/components/ui/badge'
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
import { Textarea } from '#/components/ui/textarea'
import { todayIso } from '#/lib/dates'
import { formatDay, formatRupiah } from '#/lib/format'
import { mapLink, whatsappLink } from '#/lib/links'
import { renderMarkdown } from '#/lib/markdown'
import { ROOM_STATUS_LABEL, ROOM_STATUS_VARIANT } from '#/lib/room-status'
import type { PublicImage, PublicRoom, PublicSettings } from '#/server/public-view'

export type PublicNavKey = 'home' | 'rooms' | 'rules' | 'faq' | 'contact'

const NAV: { key: PublicNavKey; href: string; label: string }[] = [
  { key: 'home', href: '/', label: 'Beranda' },
  { key: 'rooms', href: '/kamar', label: 'Kamar' },
  { key: 'rules', href: '/aturan', label: 'Aturan' },
  { key: 'faq', href: '/faq', label: 'FAQ' },
  { key: 'contact', href: '/kontak', label: 'Kontak' },
]

/** The header every public page carries: navigation and the WhatsApp call to action. */
export function PublicHeader({
  settings,
  current,
}: {
  settings: PublicSettings
  current: PublicNavKey | null
}) {
  const [enquiry, setEnquiry] = useState(false)
  const hasNumber = Boolean(settings.whatsappNumber)

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <a href="/" className="text-base font-semibold">
          {settings.name}
        </a>
        <nav className="order-3 flex w-full gap-1 overflow-x-auto text-sm sm:order-none sm:w-auto">
          {NAV.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className={
                item.key === current
                  ? 'bg-accent text-foreground rounded-md px-3 py-1.5 font-medium'
                  : 'text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5'
              }
            >
              {item.label}
            </a>
          ))}
        </nav>
        {hasNumber ? (
          <Button size="sm" onClick={() => setEnquiry(true)}>
            Tanya kamar
          </Button>
        ) : null}
      </div>
      {enquiry ? <EnquiryDialog settings={settings} onClose={() => setEnquiry(false)} /> : null}
    </header>
  )
}

export function PublicFooter({ settings }: { settings: PublicSettings }) {
  const map = mapLink(settings.address)
  const bank = [settings.bankName, settings.accountNumber].filter(Boolean).join(' · ')

  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-10 text-sm sm:grid-cols-3">
        <div>
          <p className="font-medium">Alamat</p>
          <p className="text-muted-foreground">{settings.address ?? '—'}</p>
          {map ? (
            <a href={map} target="_blank" rel="noreferrer" className="underline">
              Lihat di peta
            </a>
          ) : null}
        </div>
        <div>
          <p className="font-medium">WhatsApp</p>
          <p className="text-muted-foreground">{settings.whatsappNumber ?? '—'}</p>
        </div>
        <div>
          <p className="font-medium">Pembayaran</p>
          <p className="text-muted-foreground">{bank || '—'}</p>
          {settings.accountHolder ? (
            <p className="text-muted-foreground">a.n. {settings.accountHolder}</p>
          ) : null}
        </div>
      </div>
      <div className="border-t">
        <p className="text-muted-foreground mx-auto w-full max-w-6xl px-6 py-4 text-xs">
          {settings.name}
          {settings.tagline ? ` · ${settings.tagline}` : ''}
        </p>
      </div>
    </footer>
  )
}

export function Hero({
  settings,
  availableCount,
  image,
}: {
  settings: PublicSettings
  availableCount: number
  image?: PublicImage
}) {
  const [enquiry, setEnquiry] = useState(false)

  return (
    <section className="border-b">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-14 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div className="grid gap-5">
          <h1 className="text-4xl font-semibold tracking-tight">{settings.name}</h1>
          {settings.tagline ? (
            <p className="text-muted-foreground text-lg">{settings.tagline}</p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {settings.whatsappNumber ? (
              <Button size="lg" onClick={() => setEnquiry(true)}>
                Tanya kamar
              </Button>
            ) : null}
            <Button size="lg" variant="outline" asChild>
              <a href="#kamar">Lihat kamar</a>
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">
            {availableCount > 0
              ? `${availableCount} kamar tersedia sekarang.`
              : 'Belum ada kamar yang tersedia.'}
          </p>
        </div>
        {image ? (
          <img
            src={`/media/${image.r2Key}`}
            alt={image.alt}
            className="aspect-4/3 w-full rounded-xl border object-cover"
          />
        ) : (
          <div className="bg-muted text-muted-foreground flex aspect-4/3 items-center justify-center rounded-xl border border-dashed p-4 text-center text-sm">
            Unggah foto properti dari menu Galeri, dan foto pertama tampil di sini.
          </div>
        )}
      </div>
      {enquiry ? <EnquiryDialog settings={settings} onClose={() => setEnquiry(false)} /> : null}
    </section>
  )
}

/** The facilities the rooms actually offer, collected from the rooms. */
export function FacilityStrip({ rooms }: { rooms: PublicRoom[] }) {
  const facilities = [...new Set(rooms.flatMap((room) => room.facilities))]
  if (facilities.length === 0) return null

  return (
    <section className="border-b">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
          Fasilitas
        </p>
        <div className="flex flex-wrap gap-2">
          {facilities.map((facility) => (
            <Badge key={facility} variant="outline">
              {facility}
            </Badge>
          ))}
        </div>
      </div>
    </section>
  )
}

export function RoomCard({ room }: { room: PublicRoom }) {
  return (
    <a
      href={`/kamar/${encodeURIComponent(room.number)}`}
      className="hover:border-foreground/30 grid gap-3 rounded-lg border p-4 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">Kamar {room.number}</p>
          <p className="text-muted-foreground text-sm">
            {room.roomTypeName} · lantai {room.floor}
          </p>
        </div>
        <Badge variant={ROOM_STATUS_VARIANT[room.status]}>{ROOM_STATUS_LABEL[room.status]}</Badge>
      </div>
      <p className="font-medium">
        {formatRupiah(room.price)}
        <span className="text-muted-foreground text-sm font-normal"> / bulan</span>
      </p>
      {room.facilities.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {room.facilities.map((facility) => (
            <Badge key={facility} variant="outline">
              {facility}
            </Badge>
          ))}
        </div>
      ) : null}
    </a>
  )
}

export function Gallery({
  images,
  showPlaceholder = false,
}: {
  images: PublicImage[]
  showPlaceholder?: boolean
}) {
  if (images.length === 0 && !showPlaceholder) return null

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-12">
      <h2 className="mb-4 text-2xl font-semibold tracking-tight">Galeri</h2>
      {images.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((slot) => (
            <div
              key={slot}
              className="bg-muted text-muted-foreground flex aspect-4/3 items-center justify-center rounded-lg border border-dashed text-sm"
            >
              Belum ada foto
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {images.map((image) => (
            <img
              key={image.r2Key}
              src={`/media/${image.r2Key}`}
              alt={image.alt}
              className="aspect-4/3 w-full rounded-lg border object-cover"
              loading="lazy"
            />
          ))}
        </div>
      )}
    </section>
  )
}

export function MarkdownBody({ markdown }: { markdown: string }) {
  if (!markdown.trim()) return null
  return (
    <div
      className="markdown"
      // markdown-it runs with html disabled, so no markup from the prose
      // reaches the page (ADR-0024).
      dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
    />
  )
}

export function ContactBlock({ settings }: { settings: PublicSettings }) {
  const map = mapLink(settings.address)
  const [enquiry, setEnquiry] = useState(false)

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="grid gap-2 text-sm">
        <p className="font-medium">Alamat</p>
        <p className="text-muted-foreground">{settings.address ?? '—'}</p>
        {map ? (
          <a href={map} target="_blank" rel="noreferrer" className="underline">
            Lihat di peta
          </a>
        ) : null}
        <p className="mt-4 font-medium">WhatsApp</p>
        <p className="text-muted-foreground">{settings.whatsappNumber ?? '—'}</p>
        <p className="mt-4 font-medium">Pembayaran</p>
        <p className="text-muted-foreground">
          {[settings.bankName, settings.accountNumber].filter(Boolean).join(' · ') || '—'}
        </p>
        {settings.accountHolder ? (
          <p className="text-muted-foreground">a.n. {settings.accountHolder}</p>
        ) : null}
      </div>
      <div className="grid content-start gap-3 rounded-lg border p-5">
        <p className="font-medium">Tanya kamar</p>
        <p className="text-muted-foreground text-sm">
          Isi nama dan nomor WhatsApp. Pesannya dikirim lewat WhatsApp, dan tidak ada data yang
          disimpan di situs ini.
        </p>
        {settings.whatsappNumber ? (
          <Button onClick={() => setEnquiry(true)}>Buka formulir</Button>
        ) : (
          <p className="text-muted-foreground text-sm">Nomor WhatsApp belum diisi.</p>
        )}
      </div>
      {enquiry ? <EnquiryDialog settings={settings} onClose={() => setEnquiry(false)} /> : null}
    </div>
  )
}

/**
 * The enquiry form writes nothing (ADR-0014). It composes a WhatsApp message and
 * opens WhatsApp, so an abandoned enquiry leaves no trace.
 */
export function EnquiryDialog({
  settings,
  roomNumber,
  onClose,
}: {
  settings: PublicSettings
  roomNumber?: string
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name: '',
    whatsappNumber: '',
    moveInDate: todayIso(),
    message: roomNumber ? `Saya tertarik dengan kamar ${roomNumber}.` : '',
  })

  const message = [
    `Halo, saya ${form.name || '(nama)'}.`,
    roomNumber
      ? `Saya tertarik dengan kamar ${roomNumber} di ${settings.name}.`
      : `Saya tertarik dengan kamar di ${settings.name}.`,
    form.moveInDate ? `Rencana masuk: ${formatDay(form.moveInDate)}.` : '',
    form.message,
    form.whatsappNumber ? `Nomor saya: ${form.whatsappNumber}.` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const link = whatsappLink(settings.whatsappNumber, message)

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-w-xl">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (link) window.open(link, '_blank', 'noopener')
            onClose()
          }}
        >
          <DialogHeader>
            <DialogTitle>{roomNumber ? `Tanya kamar ${roomNumber}` : 'Tanya kamar'}</DialogTitle>
            <DialogDescription>
              Pesan ini dikirim lewat WhatsApp. Tidak ada data yang disimpan di situs ini.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="enquiry-name">Nama</Label>
              <Input
                id="enquiry-name"
                placeholder="Nama lengkap"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="enquiry-whatsapp">Nomor WhatsApp</Label>
              <Input
                id="enquiry-whatsapp"
                inputMode="tel"
                value={form.whatsappNumber}
                onChange={(event) => setForm({ ...form, whatsappNumber: event.target.value })}
                placeholder="628123456789"
                required
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="enquiry-date">Rencana tanggal masuk</Label>
              <Input
                id="enquiry-date"
                type="date"
                value={form.moveInDate}
                onChange={(event) => setForm({ ...form, moveInDate: event.target.value })}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="enquiry-message">Pesan</Label>
              <Textarea
                id="enquiry-message"
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={!link}>
              Buka WhatsApp
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
