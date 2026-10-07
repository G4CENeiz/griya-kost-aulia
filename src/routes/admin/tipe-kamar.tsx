import { createFileRoute, useRouter } from '@tanstack/react-router'
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
import {
  type RoomType,
  type RoomTypeInput,
  createRoomType,
  deleteRoomType,
  listRoomTypes,
  updateRoomType,
} from '#/server/admin/room-types'

export const Route = createFileRoute('/admin/tipe-kamar')({
  component: RoomTypesPage,
  loader: () => listRoomTypes(),
})

type Editor = { mode: 'create'; roomType: null } | { mode: 'edit'; roomType: RoomType }

function RoomTypesPage() {
  const roomTypes = Route.useLoaderData()
  const router = useRouter()
  const [editor, setEditor] = useState<Editor | null>(null)
  const [confirmedDelete, setConfirmedDelete] = useState<RoomType | null>(null)

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Tipe Kamar</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Fasilitas disimpan di tipe kamar. Harga disimpan di tiap kamar.
          </p>
        </div>
        <Button onClick={() => setEditor({ mode: 'create', roomType: null })}>
          Tambah tipe kamar
        </Button>
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
                    <TableCell className="text-muted-foreground max-w-[16rem] text-sm">
                      {roomType.description ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditor({ mode: 'edit', roomType })}
                        >
                          Ubah
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setConfirmedDelete(roomType)}
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
        <RoomTypeDialog
          editor={editor}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null)
            await router.invalidate()
          }}
        />
      ) : null}

      <DeleteRoomTypeDialog
        roomType={confirmedDelete}
        onClose={() => setConfirmedDelete(null)}
        onDeleted={async () => {
          setConfirmedDelete(null)
          await router.invalidate()
        }}
      />
    </div>
  )
}

function RoomTypeDialog({
  editor,
  onClose,
  onSaved,
}: {
  editor: Editor
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const create = useServerFn(createRoomType)
  const update = useServerFn(updateRoomType)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    name: editor.roomType?.name ?? '',
    description: editor.roomType?.description ?? '',
    facilities: (editor.roomType?.facilities ?? []).join('\n'),
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
      if (editor.mode === 'edit' && editor.roomType) {
        await update({ data: { id: editor.roomType.id, ...input } })
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
            <DialogTitle>
              {editor.mode === 'edit' ? 'Ubah tipe kamar' : 'Tipe kamar baru'}
            </DialogTitle>
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
  roomType: RoomType | null
  onClose: () => void
  onDeleted: () => Promise<void>
}) {
  const remove = useServerFn(deleteRoomType)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    if (!roomType) return
    setIsDeleting(true)
    try {
      await remove({ data: { id: roomType.id } })
      toast.success('Tipe kamar dihapus.')
      await onDeleted()
    } catch (error) {
      toast.error(errorMessage(error, 'Tipe kamar gagal dihapus.'))
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={roomType !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus {roomType?.name ?? 'tipe kamar'}?</AlertDialogTitle>
          <AlertDialogDescription>
            Tipe kamar yang masih dipakai kamar tidak bisa dihapus.
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
