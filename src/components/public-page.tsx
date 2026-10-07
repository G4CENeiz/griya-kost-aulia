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
import type { PublicSettings, PublicView } from '#/server/public-view'

/**
 * The public page of ADR-0024 and the layout of SPEC.md, in the fixed order the
 * app assembles: hero, room list, the Markdown body, the gallery, the footer.
 * The prose cannot reorder these; the app owns the layout.
 */
export function PublicPageView({ view }: { view: PublicView }) {
  const { settings, page, rooms, images } = view

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Hero settings={settings} />
      {rooms.length > 0 ? <RoomList rooms={rooms} /> : null}
      {page && page.bodyMarkdown.trim() ? (
        <section className="mx-auto w-full max-w-4xl px-6 py-10">
          <div
            className="markdown"
            // Rendered by markdown-it with html:false, so no markup from the
            // owner's prose reaches the page (ADR-0024).
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(page.bodyMarkdown),
            }}
          />
        </section>
      ) : null}
      <Gallery images={images} />
      <Footer settings={settings} />
    </div>
  )
}

function Hero({ settings }: { settings: PublicSettings }) {
  const [enquiry, setEnquiry] = useState(false)

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-start gap-4 px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">{settings.name}</h1>
        {settings.tagline ? (
          <p className="text-muted-foreground text-lg">{settings.tagline}</p>
        ) : null}
        {settings.whatsappNumber ? (
          <Button onClick={() => setEnquiry(true)}>Hubungi via WhatsApp</Button>
        ) : (
          <p className="text-muted-foreground text-sm">
            Nomor WhatsApp belum diisi di halaman Pengaturan.
          </p>
        )}
      </div>
      {enquiry ? <EnquiryDialog settings={settings} onClose={() => setEnquiry(false)} /> : null}
    </header>
  )
}

function RoomList({ rooms }: { rooms: PublicView['rooms'] }) {
  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-10">
      <h2 className="mb-4 text-xl font-semibold">Daftar kamar</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <div key={room.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">Kamar {room.number}</p>
                <p className="text-muted-foreground text-sm">
                  {room.roomTypeName} · lantai {room.floor}
                </p>
              </div>
              <Badge variant={ROOM_STATUS_VARIANT[room.status]}>
                {ROOM_STATUS_LABEL[room.status]}
              </Badge>
            </div>
            <p className="mt-3 font-medium">
              {formatRupiah(room.price)}
              <span className="text-muted-foreground text-sm font-normal"> / bulan</span>
            </p>
            {room.facilities.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1">
                {room.facilities.map((facility) => (
                  <Badge key={facility} variant="outline">
                    {facility}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}

function Gallery({ images }: { images: PublicView['images'] }) {
  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-10">
      <h2 className="mb-4 text-xl font-semibold">Galeri</h2>
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

function Footer({ settings }: { settings: PublicSettings }) {
  const map = mapLink(settings.address)
  const bank = [settings.bankName, settings.accountNumber].filter(Boolean).join(' · ')

  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto grid w-full max-w-4xl gap-4 px-6 py-10 text-sm sm:grid-cols-3">
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
    </footer>
  )
}

/**
 * The enquiry form writes nothing (ADR-0014). It composes a WhatsApp message
 * and opens WhatsApp, so an abandoned enquiry leaves no trace.
 */
function EnquiryDialog({ settings, onClose }: { settings: PublicSettings; onClose: () => void }) {
  const [form, setForm] = useState({
    name: '',
    whatsappNumber: '',
    moveInDate: todayIso(),
    message: '',
  })

  const message = [
    `Halo, saya ${form.name || '(nama)'}.`,
    `Saya tertarik dengan kamar di ${settings.name}.`,
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
            <DialogTitle>Tanya kamar</DialogTitle>
            <DialogDescription>
              Pesan ini dikirim lewat WhatsApp. Tidak ada data yang disimpan di situs ini.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="enquiry-name">Nama</Label>
              <Input
                id="enquiry-name"
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
                placeholder="Kamar yang diminati, atau pertanyaan lain"
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
