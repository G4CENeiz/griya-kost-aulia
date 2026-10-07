import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
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
import { formatRupiah } from '#/lib/format'
import { ROOM_STATUS_LABEL, ROOM_STATUS_VARIANT } from '#/lib/room-status'
import { listRoomTypes } from '#/server/admin/room-types'
import {
  type Room,
  type RoomInput,
  createRoom,
  deleteRoom,
  listRooms,
  updateRoom,
} from '#/server/admin/rooms'

export const Route = createFileRoute('/admin/kamar')({
  component: RoomsPage,
  loader: async () => ({
    rooms: await listRooms(),
    roomTypes: await listRoomTypes(),
  }),
})

type RoomTypeOption = { id: number; name: string }

type Editor = { mode: 'create'; room: null } | { mode: 'edit'; room: Room }

function RoomsPage() {
  const { rooms, roomTypes } = Route.useLoaderData()
  const router = useRouter()
  const [editor, setEditor] = useState<Editor | null>(null)
  const [confirmedDelete, setConfirmedDelete] = useState<Room | null>(null)

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Kamar</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Harga disimpan di tiap kamar. Status terisi mengikuti sewa yang berjalan.
          </p>
        </div>
        <Button
          disabled={roomTypes.length === 0}
          onClick={() => setEditor({ mode: 'create', room: null })}
        >
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
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditor({ mode: 'edit', room })}
                        >
                          Ubah
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setConfirmedDelete(room)}
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
        <RoomDialog
          editor={editor}
          roomTypes={roomTypes}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null)
            await router.invalidate()
          }}
        />
      ) : null}

      <DeleteRoomDialog
        room={confirmedDelete}
        onClose={() => setConfirmedDelete(null)}
        onDeleted={async () => {
          setConfirmedDelete(null)
          await router.invalidate()
        }}
      />
    </div>
  )
}

function RoomDialog({
  editor,
  roomTypes,
  onClose,
  onSaved,
}: {
  editor: Editor
  roomTypes: RoomTypeOption[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const create = useServerFn(createRoom)
  const update = useServerFn(updateRoom)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    number: editor.room?.number ?? '',
    roomTypeId: String(editor.room?.roomTypeId ?? roomTypes[0]?.id ?? ''),
    floor: String(editor.room?.floor ?? 1),
    price: String(editor.room?.price ?? ''),
    isUnavailable: editor.room?.isUnavailable ?? false,
    notes: editor.room?.notes ?? '',
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
      if (editor.mode === 'edit' && editor.room) {
        await update({ data: { id: editor.room.id, ...input } })
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
            <DialogTitle>{editor.mode === 'edit' ? 'Ubah kamar' : 'Kamar baru'}</DialogTitle>
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
  room: Room | null
  onClose: () => void
  onDeleted: () => Promise<void>
}) {
  const remove = useServerFn(deleteRoom)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    if (!room) return
    setIsDeleting(true)
    try {
      await remove({ data: { id: room.id } })
      toast.success('Kamar dihapus.')
      await onDeleted()
    } catch (error) {
      toast.error(errorMessage(error, 'Kamar gagal dihapus.'))
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={room !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus kamar {room?.number}?</AlertDialogTitle>
          <AlertDialogDescription>
            Kamar yang punya riwayat sewa tidak bisa dihapus.
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
