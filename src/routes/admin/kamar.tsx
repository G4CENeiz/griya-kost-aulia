import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
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
import { ROOM_STATUS_LABEL, ROOM_STATUS_VARIANT } from '#/lib/room-status'
import { listRoomTypes } from '#/server/admin/room-types'
import {
  type DeletedRoom,
  type Room,
  type RoomDetail,
  type RoomInput,
  createRoom,
  deleteRoom,
  getRoom,
  listDeletedRooms,
  listRooms,
  restoreRoom,
  updateRoom,
} from '#/server/admin/rooms'

export const Route = createFileRoute('/admin/kamar')({
  component: RoomsPage,
  loader: async () => ({
    rooms: await listRooms(),
    deleted: await listDeletedRooms(),
    roomTypes: await listRoomTypes(),
  }),
})

type RoomTypeOption = { id: number; name: string }

type OpenDialog =
  | { kind: 'create' }
  | { kind: 'edit'; room: Room }
  | { kind: 'view'; room: Room }
  | { kind: 'delete'; room: Room }
  | { kind: 'purge'; room: DeletedRoom }
  | null

function RoomsPage() {
  const { rooms, deleted, roomTypes } = Route.useLoaderData()
  const router = useRouter()
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const refresh = async () => {
    setDialog(null)
    await router.invalidate()
  }

  const restore = useServerFn(restoreRoom)

  async function restoreRow(room: DeletedRoom) {
    try {
      await restore({ data: { id: room.id } })
      toast.success('Kamar dipulihkan.')
      await refresh()
    } catch (error) {
      toast.error(errorMessage(error, 'Kamar gagal dipulihkan.'))
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Kamar</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Harga disimpan di tiap kamar. Status terisi mengikuti sewa yang berjalan. Menghapus
            menyembunyikan kamar; riwayat sewanya tetap utuh.
          </p>
        </div>
        <Button disabled={roomTypes.length === 0} onClick={() => setDialog({ kind: 'create' })}>
          Tambah kamar
        </Button>
      </div>

      {roomTypes.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Buat{' '}
          <Link to="/admin/tipe-kamar" className="underline">
            tipe kamar
          </Link>{' '}
          sebelum mencatat kamar.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Daftar kamar</CardTitle>
          <CardDescription>{rooms.length} kamar terdaftar.</CardDescription>
        </CardHeader>
        <CardContent>
          {rooms.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada kamar.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Lantai</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">{room.number}</TableCell>
                    <TableCell>{room.roomTypeName}</TableCell>
                    <TableCell>{room.floor}</TableCell>
                    <TableCell>{formatRupiah(room.price)}</TableCell>
                    <TableCell>
                      <Badge variant={ROOM_STATUS_VARIANT[room.status]}>
                        {ROOM_STATUS_LABEL[room.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setDialog({ kind: 'view', room })}
                        >
                          Lihat
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDialog({ kind: 'edit', room })}
                        >
                          Ubah
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDialog({ kind: 'delete', room })}
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
              {deleted.length} kamar terhapus. Nomor kamar di sini masih memegang nomornya sampai
              dihapus permanen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Riwayat sewa</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deleted.map((room) => (
                  <TableRow key={room.id} className="text-muted-foreground">
                    <TableCell className="font-medium">{room.number}</TableCell>
                    <TableCell>{room.roomTypeName}</TableCell>
                    <TableCell>{room.tenancyCount} sewa</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 whitespace-nowrap">
                        <Button size="sm" variant="outline" onClick={() => void restoreRow(room)}>
                          Pulihkan
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDialog({ kind: 'purge', room })}
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
        <RoomDetailDialog room={dialog.room} onClose={() => setDialog(null)} />
      ) : null}

      {dialog?.kind === 'create' || dialog?.kind === 'edit' ? (
        <RoomDialog
          editor={dialog}
          roomTypes={roomTypes}
          onClose={() => setDialog(null)}
          onSaved={refresh}
        />
      ) : null}

      {dialog?.kind === 'delete' ? (
        <DeleteRoomDialog room={dialog.room} onClose={() => setDialog(null)} onDeleted={refresh} />
      ) : null}

      {dialog?.kind === 'purge' ? (
        <PurgeRoomDialog room={dialog.room} onClose={() => setDialog(null)} onPurged={refresh} />
      ) : null}
    </div>
  )
}

/** The individual view: the room and the stays it has held. */
function RoomDetailDialog({ room, onClose }: { room: Room; onClose: () => void }) {
  const load = useServerFn(getRoom)
  const [detail, setDetail] = useState<RoomDetail | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const result = await load({ data: { id: room.id } })
        if (alive) setDetail(result)
      } catch (error) {
        toast.error(errorMessage(error, 'Kamar gagal dimuat.'))
      }
    })()
    return () => {
      alive = false
    }
  }, [load, room.id])

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kamar {room.number}</DialogTitle>
          <DialogDescription>
            {room.roomTypeName} · lantai {room.floor} ·{' '}
            {ROOM_STATUS_LABEL[room.status].toLowerCase()}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-1 text-sm">
            <p>
              <span className="text-muted-foreground">Harga per bulan: </span>
              {formatRupiah(room.price)}
            </p>
            <p>
              <span className="text-muted-foreground">Tidak tersedia: </span>
              {room.isUnavailable ? 'Ya' : 'Tidak'}
            </p>
            <p>
              <span className="text-muted-foreground">Catatan: </span>
              {room.notes ?? '—'}
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Riwayat sewa</p>
            {!detail ? (
              <p className="text-muted-foreground text-sm">Memuat…</p>
            ) : detail.tenancies.length === 0 ? (
              <p className="text-muted-foreground text-sm">Belum pernah disewa.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Penghuni</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Tagihan</TableHead>
                    <TableHead className="text-right">Terbayar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.tenancies.map((tenancy) => (
                    <TableRow key={tenancy.id}>
                      <TableCell className="font-medium">{tenancy.tenantName}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDay(tenancy.startDate)} –{' '}
                        {tenancy.moveOutDate ? formatDay(tenancy.moveOutDate) : 'sekarang'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatRupiah(tenancy.billedAmount)}
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

function RoomDialog({
  editor,
  roomTypes,
  onClose,
  onSaved,
}: {
  editor: { kind: 'create' } | { kind: 'edit'; room: Room }
  roomTypes: RoomTypeOption[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const create = useServerFn(createRoom)
  const update = useServerFn(updateRoom)
  const [isSaving, setIsSaving] = useState(false)
  const current = editor.kind === 'edit' ? editor.room : null
  const [form, setForm] = useState({
    number: current?.number ?? '',
    roomTypeId: String(current?.roomTypeId ?? roomTypes[0]?.id ?? ''),
    floor: String(current?.floor ?? 1),
    price: String(current?.price ?? ''),
    isUnavailable: current?.isUnavailable ?? false,
    notes: current?.notes ?? '',
  })

  const input: RoomInput = {
    number: form.number,
    roomTypeId: Number(form.roomTypeId),
    floor: Number(form.floor),
    price: Number(form.price),
    isUnavailable: form.isUnavailable,
    notes: form.notes,
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    try {
      if (current) {
        await update({ data: { id: current.id, ...input } })
        toast.success('Kamar tersimpan.')
      } else {
        await create({ data: input })
        toast.success('Kamar ditambahkan.')
      }
      await onSaved()
    } catch (error) {
      toast.error(errorMessage(error, 'Kamar gagal disimpan.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{current ? 'Ubah kamar' : 'Kamar baru'}</DialogTitle>
            <DialogDescription>Nomor kamar tampil di daftar publik.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="room-number">Nomor</Label>
              <Input
                id="room-number"
                value={form.number}
                onChange={(event) => setForm({ ...form, number: event.target.value })}
                placeholder="01"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="room-type">Tipe kamar</Label>
              <Select
                value={form.roomTypeId}
                onValueChange={(value) => setForm({ ...form, roomTypeId: value })}
              >
                <SelectTrigger id="room-type">
                  <SelectValue placeholder="Pilih tipe kamar" />
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.map((roomType) => (
                    <SelectItem key={roomType.id} value={String(roomType.id)}>
                      {roomType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="room-floor">Lantai</Label>
              <Input
                id="room-floor"
                type="number"
                value={form.floor}
                onChange={(event) => setForm({ ...form, floor: event.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="room-price">Harga per bulan</Label>
              <Input
                id="room-price"
                inputMode="numeric"
                value={form.price}
                onChange={(event) => setForm({ ...form, price: event.target.value })}
                placeholder="1500000"
                required
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="room-notes">Catatan</Label>
              <Textarea
                id="room-notes"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox
                id="room-unavailable"
                checked={form.isUnavailable}
                onCheckedChange={(checked) => setForm({ ...form, isUnavailable: checked === true })}
              />
              <Label htmlFor="room-unavailable">Tidak tersedia untuk disewa</Label>
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

function DeleteRoomDialog({
  room,
  onClose,
  onDeleted,
}: {
  room: Room
  onClose: () => void
  onDeleted: () => Promise<void>
}) {
  const remove = useServerFn(deleteRoom)
  const [isSaving, setIsSaving] = useState(false)
  const [permanent, setPermanent] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    try {
      await remove({ data: { id: room.id, permanent } })
      toast.success(permanent ? 'Kamar dihapus permanen.' : 'Kamar dipindah ke sampah.')
      await onDeleted()
    } catch (error) {
      toast.error(errorMessage(error, 'Kamar gagal dihapus.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <AlertDialogContent>
        <form onSubmit={handleSubmit}>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kamar {room.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Hapus biasa menyembunyikan kamar dan bisa dipulihkan dari Sampah. Riwayat sewanya
              tetap utuh. Kamar yang sedang terisi ditolak, baik untuk disembunyikan maupun dihapus
              permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex items-start gap-2 py-4">
            <Checkbox
              id="room-permanent"
              checked={permanent}
              onCheckedChange={(checked) => setPermanent(checked === true)}
            />
            <div className="grid gap-1">
              <Label htmlFor="room-permanent">Hapus permanen</Label>
              <p className="text-muted-foreground text-xs">
                Barisnya dibuang dan tidak bisa dipulihkan. Ditolak bila kamar punya riwayat sewa.
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

function PurgeRoomDialog({
  room,
  onClose,
  onPurged,
}: {
  room: DeletedRoom
  onClose: () => void
  onPurged: () => Promise<void>
}) {
  const remove = useServerFn(deleteRoom)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    try {
      await remove({ data: { id: room.id, permanent: true } })
      toast.success('Kamar dihapus permanen.')
      await onPurged()
    } catch (error) {
      toast.error(errorMessage(error, 'Kamar gagal dihapus permanen.'))
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
            <AlertDialogTitle>Hapus permanen kamar {room.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Barisnya dibuang dan tidak bisa dipulihkan. Nomornya bebas dipakai lagi setelah ini.
              {room.tenancyCount > 0
                ? ` Kamar ini punya ${room.tenancyCount} riwayat sewa, jadi permintaan ini akan ditolak.`
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
