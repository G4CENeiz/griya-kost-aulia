import { createFileRoute, useRouter } from '@tanstack/react-router'
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
import { ROOM_STATUS_LABEL } from '#/lib/room-status'
import {
  type DeletedRoomType,
  type RoomType,
  type RoomTypeDetail,
  type RoomTypeInput,
  createRoomType,
  deleteRoomType,
  getRoomType,
  listDeletedRoomTypes,
  listRoomTypes,
  restoreRoomType,
  updateRoomType,
} from '#/server/admin/room-types'

export const Route = createFileRoute('/admin/tipe-kamar')({
  component: RoomTypesPage,
  loader: async () => ({
    roomTypes: await listRoomTypes(),
    deleted: await listDeletedRoomTypes(),
  }),
})

type OpenDialog =
  | { kind: 'create' }
  | { kind: 'edit'; roomType: RoomType }
  | { kind: 'view'; roomType: RoomType }
  | { kind: 'delete'; roomType: RoomType }
  | { kind: 'purge'; roomType: DeletedRoomType }
  | null

function RoomTypesPage() {
  const { roomTypes, deleted } = Route.useLoaderData()
  const router = useRouter()
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const refresh = async () => {
    setDialog(null)
    await router.invalidate()
  }

  const restore = useServerFn(restoreRoomType)

  async function restoreRow(roomType: DeletedRoomType) {
    try {
      await restore({ data: { id: roomType.id } })
      toast.success('Tipe kamar dipulihkan.')
      await refresh()
    } catch (error) {
      toast.error(errorMessage(error, 'Tipe kamar gagal dipulihkan.'))
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Tipe Kamar</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Fasilitas disimpan di tipe kamar. Harga disimpan di tiap kamar. Menghapus menyembunyikan
            tipe kamar; kamar yang memakainya harus dipindahkan dulu.
          </p>
        </div>
        <Button onClick={() => setDialog({ kind: 'create' })}>Tambah tipe kamar</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar tipe kamar</CardTitle>
          <CardDescription>{roomTypes.length} tipe kamar terdaftar.</CardDescription>
        </CardHeader>
        <CardContent>
          {roomTypes.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Belum ada tipe kamar. Tambahkan satu untuk mulai mencatat kamar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Fasilitas</TableHead>
                  <TableHead>Kamar</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roomTypes.map((roomType) => (
                  <TableRow key={roomType.id}>
                    <TableCell className="font-medium">{roomType.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {roomType.facilities.length === 0 ? (
                          <span className="text-muted-foreground text-sm">Belum diisi</span>
                        ) : (
                          roomType.facilities.map((facility) => (
                            <Badge key={facility} variant="secondary">
                              {facility}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{roomType.roomCount} kamar</TableCell>
                    <TableCell className="text-muted-foreground max-w-[16rem] text-sm">
                      {roomType.description ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setDialog({ kind: 'view', roomType })}
                        >
                          Lihat
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDialog({ kind: 'edit', roomType })}
                        >
                          Ubah
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDialog({ kind: 'delete', roomType })}
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
              {deleted.length} tipe kamar terhapus. Nama tipe di sini masih memegang namanya sampai
              dihapus permanen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kamar yang pernah memakai</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deleted.map((roomType) => (
                  <TableRow key={roomType.id} className="text-muted-foreground">
                    <TableCell className="font-medium">{roomType.name}</TableCell>
                    <TableCell>{roomType.roomCount} kamar</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void restoreRow(roomType)}
                        >
                          Pulihkan
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDialog({ kind: 'purge', roomType })}
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
        <RoomTypeDetailDialog roomType={dialog.roomType} onClose={() => setDialog(null)} />
      ) : null}

      {dialog?.kind === 'create' || dialog?.kind === 'edit' ? (
        <RoomTypeDialog editor={dialog} onClose={() => setDialog(null)} onSaved={refresh} />
      ) : null}

      {dialog?.kind === 'delete' ? (
        <DeleteRoomTypeDialog
          roomType={dialog.roomType}
          onClose={() => setDialog(null)}
          onDeleted={refresh}
        />
      ) : null}

      {dialog?.kind === 'purge' ? (
        <PurgeRoomTypeDialog
          roomType={dialog.roomType}
          onClose={() => setDialog(null)}
          onPurged={refresh}
        />
      ) : null}
    </div>
  )
}

/** The individual view: the type and the live rooms that use it. */
function RoomTypeDetailDialog({ roomType, onClose }: { roomType: RoomType; onClose: () => void }) {
  const load = useServerFn(getRoomType)
  const [detail, setDetail] = useState<RoomTypeDetail | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const result = await load({ data: { id: roomType.id } })
        if (alive) setDetail(result)
      } catch (error) {
        toast.error(errorMessage(error, 'Tipe kamar gagal dimuat.'))
      }
    })()
    return () => {
      alive = false
    }
  }, [load, roomType.id])

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{roomType.name}</DialogTitle>
          <DialogDescription>{roomType.roomCount} kamar memakai tipe ini.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-1 text-sm">
            <p>
              <span className="text-muted-foreground">Keterangan: </span>
              {roomType.description ?? '—'}
            </p>
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-muted-foreground">Fasilitas: </span>
              {roomType.facilities.length === 0 ? (
                <span>—</span>
              ) : (
                roomType.facilities.map((facility) => (
                  <Badge key={facility} variant="secondary">
                    {facility}
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Kamar bertipe ini</p>
            {!detail ? (
              <p className="text-muted-foreground text-sm">Memuat…</p>
            ) : detail.rooms.length === 0 ? (
              <p className="text-muted-foreground text-sm">Belum ada kamar.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nomor</TableHead>
                    <TableHead>Lantai</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.rooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">{room.number}</TableCell>
                      <TableCell>{room.floor}</TableCell>
                      <TableCell>{formatRupiah(room.price)}</TableCell>
                      <TableCell className="text-right">{ROOM_STATUS_LABEL[room.status]}</TableCell>
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

function RoomTypeDialog({
  editor,
  onClose,
  onSaved,
}: {
  editor: { kind: 'create' } | { kind: 'edit'; roomType: RoomType }
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const create = useServerFn(createRoomType)
  const update = useServerFn(updateRoomType)
  const [isSaving, setIsSaving] = useState(false)
  const current = editor.kind === 'edit' ? editor.roomType : null
  const [form, setForm] = useState({
    name: current?.name ?? '',
    description: current?.description ?? '',
    facilities: (current?.facilities ?? []).join('\n'),
  })

  const input: RoomTypeInput = {
    name: form.name,
    description: form.description,
    facilities: form.facilities
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    try {
      if (current) {
        await update({ data: { id: current.id, ...input } })
        toast.success('Tipe kamar tersimpan.')
      } else {
        await create({ data: input })
        toast.success('Tipe kamar ditambahkan.')
      }
      await onSaved()
    } catch (error) {
      toast.error(errorMessage(error, 'Tipe kamar gagal disimpan.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{current ? 'Ubah tipe kamar' : 'Tipe kamar baru'}</DialogTitle>
            <DialogDescription>
              Fasilitas diisi satu per baris. Semua kamar bertipe ini memakai daftar yang sama.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type-name">Nama</Label>
              <Input
                id="type-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Tipe A"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type-facilities">Fasilitas</Label>
              <Textarea
                id="type-facilities"
                value={form.facilities}
                onChange={(event) => setForm({ ...form, facilities: event.target.value })}
                placeholder={'AC\nLemari\nKamar mandi dalam'}
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type-description">Keterangan</Label>
              <Textarea
                id="type-description"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                rows={2}
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

function DeleteRoomTypeDialog({
  roomType,
  onClose,
  onDeleted,
}: {
  roomType: RoomType
  onClose: () => void
  onDeleted: () => Promise<void>
}) {
  const remove = useServerFn(deleteRoomType)
  const [isSaving, setIsSaving] = useState(false)
  const [permanent, setPermanent] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    try {
      await remove({ data: { id: roomType.id, permanent } })
      toast.success(permanent ? 'Tipe kamar dihapus permanen.' : 'Tipe kamar dipindah ke sampah.')
      await onDeleted()
    } catch (error) {
      toast.error(errorMessage(error, 'Tipe kamar gagal dihapus.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <AlertDialogContent>
        <form onSubmit={handleSubmit}>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {roomType.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Hapus biasa menyembunyikan tipe kamar dan bisa dipulihkan dari Sampah. Tipe yang masih
              dipakai kamar ditolak, baik untuk disembunyikan maupun dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex items-start gap-2 py-4">
            <Checkbox
              id="type-permanent"
              checked={permanent}
              onCheckedChange={(checked) => setPermanent(checked === true)}
            />
            <div className="grid gap-1">
              <Label htmlFor="type-permanent">Hapus permanen</Label>
              <p className="text-muted-foreground text-xs">
                Barisnya dibuang dan tidak bisa dipulihkan. Namanya bebas dipakai lagi setelah ini.
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

function PurgeRoomTypeDialog({
  roomType,
  onClose,
  onPurged,
}: {
  roomType: DeletedRoomType
  onClose: () => void
  onPurged: () => Promise<void>
}) {
  const remove = useServerFn(deleteRoomType)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    try {
      await remove({ data: { id: roomType.id, permanent: true } })
      toast.success('Tipe kamar dihapus permanen.')
      await onPurged()
    } catch (error) {
      toast.error(errorMessage(error, 'Tipe kamar gagal dihapus permanen.'))
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
            <AlertDialogTitle>Hapus permanen {roomType.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Barisnya dibuang dan tidak bisa dipulihkan.
              {roomType.roomCount > 0
                ? ` ${roomType.roomCount} baris kamar, termasuk di Sampah, masih memakainya, jadi permintaan ini akan ditolak.`
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
