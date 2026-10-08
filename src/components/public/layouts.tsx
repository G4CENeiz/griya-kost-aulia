import { type ReactNode, useMemo, useState } from 'react'

import {
  ContactBlock,
  EnquiryDialog,
  FacilityStrip,
  Gallery,
  Hero,
  MarkdownBody,
  type PublicNavKey,
  PublicFooter,
  PublicHeader,
  RoomCard,
} from '#/components/public/sections'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { formatRupiah } from '#/lib/format'
import { LANDING_SLUG, ROOMS_SLUG } from '#/lib/pages'
import { ROOM_STATUS_LABEL, ROOM_STATUS_VARIANT } from '#/lib/room-status'
import type { PublicRoom, PublicSettings, PublicView } from '#/server/public-view'

/** Header, content, footer. Every public layout runs inside this. */
export function PublicShell({
  view,
  current,
  children,
}: {
  view: PublicView
  current: PublicNavKey | null
  children: ReactNode
}) {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <PublicHeader settings={view.settings} current={current} />
      <div className="flex-1">{children}</div>
      <PublicFooter settings={view.settings} />
    </div>
  )
}

/** Beranda: hero, facilities, a preview of the rooms, the prose, the gallery. */
export function HomeLayout({ view }: { view: PublicView }) {
  const preview = view.rooms.slice(0, 3)

  return (
    <PublicShell view={view} current="home">
      <Hero settings={view.settings} roomCount={view.rooms.length} />
      <FacilityStrip rooms={view.rooms} />

      {preview.length > 0 ? (
        <section id="kamar" className="mx-auto w-full max-w-6xl px-6 py-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Kamar</h2>
              <p className="text-muted-foreground text-sm">
                {view.rooms.length} kamar, dengan status yang diperbarui dari catatan pengelola.
              </p>
            </div>
            <a href="/kamar" className="text-sm underline">
              Lihat semua kamar
            </a>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {preview.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        </section>
      ) : null}

      {view.page && view.page.bodyMarkdown.trim() ? (
        <section className="mx-auto w-full max-w-3xl px-6 py-8">
          <MarkdownBody markdown={view.page.bodyMarkdown} />
        </section>
      ) : null}

      <Gallery images={view.images} />
    </PublicShell>
  )
}

/** Daftar kamar: every room, with the filters a visitor actually asks for. */
export function RoomsLayout({ view }: { view: PublicView }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [floor, setFloor] = useState('all')
  const [status, setStatus] = useState('all')

  const types = [...new Set(view.rooms.map((room) => room.roomTypeName))]
  const floors = [...new Set(view.rooms.map((room) => room.floor))].toSorted(
    (left, right) => left - right,
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return view.rooms.filter((room) => {
      if (needle && !room.number.toLowerCase().includes(needle)) return false
      if (type !== 'all' && room.roomTypeName !== type) return false
      if (floor !== 'all' && String(room.floor) !== floor) return false
      if (status !== 'all' && room.status !== status) return false
      return true
    })
  }, [view.rooms, query, type, floor, status])

  const isFiltered = query.trim() !== '' || type !== 'all' || floor !== 'all' || status !== 'all'

  return (
    <PublicShell view={view} current="rooms">
      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          {view.page?.title ?? 'Daftar kamar'}
        </h1>
        {view.page && view.page.bodyMarkdown.trim() ? (
          <div className="mt-4 max-w-3xl">
            <MarkdownBody markdown={view.page.bodyMarkdown} />
          </div>
        ) : null}

        <div className="my-6 grid gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="filter-number">Nomor kamar</Label>
            <Input
              id="filter-number"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="01"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="filter-type">Tipe</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="filter-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua tipe</SelectItem>
                {types.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="filter-floor">Lantai</Label>
            <Select value={floor} onValueChange={setFloor}>
              <SelectTrigger id="filter-floor">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua lantai</SelectItem>
                {floors.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    Lantai {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="filter-status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="filter-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                <SelectItem value="available">{ROOM_STATUS_LABEL.available}</SelectItem>
                <SelectItem value="occupied">{ROOM_STATUS_LABEL.occupied}</SelectItem>
                <SelectItem value="unavailable">{ROOM_STATUS_LABEL.unavailable}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-muted-foreground mb-4 text-sm">
          {filtered.length} dari {view.rooms.length} kamar.
          {isFiltered ? (
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setQuery('')
                setType('all')
                setFloor('all')
                setStatus('all')
              }}
            >
              Hapus filter
            </Button>
          ) : null}
        </p>

        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Tidak ada kamar yang cocok dengan filter itu.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        )}
      </section>

      <Gallery images={view.images} />
    </PublicShell>
  )
}

/** One room: its records, its facilities, and an enquiry that names it. */
export function RoomLayout({ view, room }: { view: PublicView; room: PublicRoom }) {
  const [enquiry, setEnquiry] = useState(false)

  return (
    <PublicShell view={view} current="rooms">
      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <a href="/kamar" className="text-muted-foreground text-sm underline">
          ← Semua kamar
        </a>

        <div className="mt-4 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="grid gap-5">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight">Kamar {room.number}</h1>
                <Badge variant={ROOM_STATUS_VARIANT[room.status]}>
                  {ROOM_STATUS_LABEL[room.status]}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                {room.roomTypeName} · lantai {room.floor}
              </p>
            </div>

            <div className="rounded-lg border p-5">
              <p className="text-2xl font-semibold">
                {formatRupiah(room.price)}
                <span className="text-muted-foreground text-sm font-normal"> / bulan</span>
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                Harga sudah termasuk fasilitas di bawah. Tidak ada uang jaminan.
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Fasilitas</p>
              {room.facilities.length === 0 ? (
                <p className="text-muted-foreground text-sm">Belum diisi.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {room.facilities.map((facility) => (
                    <Badge key={facility} variant="outline">
                      {facility}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid content-start gap-4 rounded-xl border p-6">
            <p className="text-lg font-medium">Tertarik dengan kamar ini?</p>
            <p className="text-muted-foreground text-sm">
              Kirim pertanyaan lewat WhatsApp. Sebutkan kamar {room.number}, dan pengelola akan
              menjawab dengan ketersediaannya.
            </p>
            {view.settings.whatsappNumber ? (
              <Button size="lg" onClick={() => setEnquiry(true)}>
                Tanya kamar {room.number}
              </Button>
            ) : (
              <p className="text-muted-foreground text-sm">
                Nomor WhatsApp belum diisi di Pengaturan.
              </p>
            )}
            {view.settings.address ? (
              <p className="text-muted-foreground text-sm">{view.settings.address}</p>
            ) : null}
          </div>
        </div>
      </section>

      <Gallery images={view.images} />

      {enquiry ? (
        <EnquiryDialog
          settings={view.settings}
          roomNumber={room.number}
          onClose={() => setEnquiry(false)}
        />
      ) : null}
    </PublicShell>
  )
}

/** Aturan, FAQ, Kontak, and any page the owner adds. */
export function ProseLayout({
  view,
  current,
  children,
}: {
  view: PublicView
  current: PublicNavKey | null
  children?: ReactNode
}) {
  return (
    <PublicShell view={view} current={current}>
      <section className="mx-auto w-full max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">{view.page?.title ?? 'Halaman'}</h1>
        {view.page && view.page.bodyMarkdown.trim() ? (
          <div className="mt-6">
            <MarkdownBody markdown={view.page.bodyMarkdown} />
          </div>
        ) : (
          <p className="text-muted-foreground mt-6 text-sm">
            Isi halaman ini belum ditulis. Tulisan diisi dari Halaman pada panel pengelola.
          </p>
        )}
        {children ? <div className="mt-8">{children}</div> : null}
      </section>
      {current === 'contact' ? null : <Gallery images={view.images} />}
    </PublicShell>
  )
}

export function ContactLayout({ view }: { view: PublicView }) {
  return (
    <ProseLayout view={view} current="contact">
      <ContactBlock settings={view.settings} />
    </ProseLayout>
  )
}

/**
 * The layout of a page, chosen from its slug. The public route and the editor
 * preview both use this, so a preview cannot show a shape the visitor does not
 * get (ADR-0033).
 */
export function PublicRouteView({ view }: { view: PublicView }) {
  const slug = view.page?.slug
  if (slug === LANDING_SLUG) return <HomeLayout view={view} />
  if (slug === ROOMS_SLUG) return <RoomsLayout view={view} />
  if (slug === 'contact') return <ContactLayout view={view} />
  if (slug === 'rules') return <ProseLayout view={view} current="rules" />
  if (slug === 'faq') return <ProseLayout view={view} current="faq" />
  return <ProseLayout view={view} current={null} />
}

export type { PublicSettings }
