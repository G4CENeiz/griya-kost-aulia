import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { GalleryEditor } from '#/components/gallery-editor'
import { PublicPageView } from '#/components/public-page'
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
import { LANDING_SLUG } from '#/lib/pages'
import { type GalleryImage, listGalleryImages } from '#/server/admin/gallery'
import {
  type AdminPage,
  createPage,
  deletePage,
  getPage,
  getPagePreview,
  listPages,
  updatePage,
} from '#/server/admin/pages'
import type { PublicView } from '#/server/public-view'

export const Route = createFileRoute('/admin/halaman')({
  component: PagesPage,
  loader: () => listPages(),
})

type OpenEditor = { kind: 'edit'; id: number } | { kind: 'create' } | null

function PagesPage() {
  const pages = Route.useLoaderData()
  const router = useRouter()
  const [editor, setEditor] = useState<OpenEditor>(null)
  const [confirmedDelete, setConfirmedDelete] = useState<AdminPage | null>(null)

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Halaman</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Satu halaman berisi satu badan tulisan Markdown. Tata letaknya ditentukan aplikasi.
          </p>
        </div>
        <Button onClick={() => setEditor({ kind: 'create' })}>Tambah halaman</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar halaman</CardTitle>
          <CardDescription>{pages.length} halaman.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead>Alamat</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Isi</TableHead>
                <TableHead className="text-right">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell className="font-medium">{page.title}</TableCell>
                  <TableCell className="text-sm">
                    /{page.slug === LANDING_SLUG ? '' : page.slug}
                  </TableCell>
                  <TableCell>
                    <Badge variant={page.isPublished ? 'default' : 'secondary'}>
                      {page.isPublished ? 'Terbit' : 'Draf'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {page.bodyLength} karakter
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditor({ kind: 'edit', id: page.id })}
                      >
                        Ubah
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={page.slug === LANDING_SLUG}
                        onClick={() => setConfirmedDelete(page)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editor?.kind === 'edit' ? (
        <PageEditorDialog
          pageId={editor.id}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            await router.invalidate()
          }}
        />
      ) : null}

      {editor?.kind === 'create' ? (
        <NewPageDialog
          onClose={() => setEditor(null)}
          onCreated={async (id) => {
            await router.invalidate()
            setEditor({ kind: 'edit', id })
          }}
        />
      ) : null}

      <DeletePageDialog
        page={confirmedDelete}
        onClose={() => setConfirmedDelete(null)}
        onDeleted={async () => {
          setConfirmedDelete(null)
          await router.invalidate()
        }}
      />
    </div>
  )
}

/** The editor: the fields, and the whole page as it will look, live. */
function PageEditorDialog({
  pageId,
  onClose,
  onSaved,
}: {
  pageId: number
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const loadPage = useServerFn(getPage)
  const loadPreview = useServerFn(getPagePreview)
  const loadGallery = useServerFn(listGalleryImages)
  const save = useServerFn(updatePage)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState<{
    id: number
    slug: string
    title: string
    bodyMarkdown: string
    isPublished: boolean
  } | null>(null)
  const [preview, setPreview] = useState<PublicView | null>(null)
  const [gallery, setGallery] = useState<GalleryImage[] | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        // The preview follows the saved slug: only the landing page carries
        // the room list, and the landing page's slug cannot be changed.
        const page = await loadPage({ data: { id: pageId } })
        const [view, images] = await Promise.all([
          loadPreview({ data: { slug: page.slug } }),
          loadGallery({ data: { pageId } }),
        ])
        if (!alive) return
        setForm(page)
        setPreview(view)
        setGallery(images)
      } catch (error) {
        toast.error(errorMessage(error, 'Halaman gagal dimuat.'))
      }
    })()
    return () => {
      alive = false
    }
  }, [pageId, loadPage, loadPreview, loadGallery])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form) return
    setIsSaving(true)
    try {
      await save({
        data: {
          id: form.id,
          slug: form.slug,
          title: form.title,
          bodyMarkdown: form.bodyMarkdown,
          isPublished: form.isPublished,
        },
      })
      toast.success('Halaman tersimpan.')
      await onSaved()
    } catch (error) {
      toast.error(errorMessage(error, 'Halaman gagal disimpan.'))
    } finally {
      setIsSaving(false)
    }
  }

  const draft: PublicView | null =
    preview && form
      ? {
          ...preview,
          page: preview.page
            ? { ...preview.page, title: form.title, bodyMarkdown: form.bodyMarkdown }
            : preview.page,
        }
      : null

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
        {form ? (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Ubah halaman</DialogTitle>
              <DialogDescription>
                Pratinjau di bawah memakai tulisan yang sedang diedit, dengan susunan halaman publik
                yang sebenarnya.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="page-title">Judul</Label>
                <Input
                  id="page-title"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="page-slug">Alamat</Label>
                <Input
                  id="page-slug"
                  value={form.slug}
                  onChange={(event) => setForm({ ...form, slug: event.target.value })}
                  disabled={form.slug === LANDING_SLUG}
                  required
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="page-body">Isi halaman</Label>
                <Textarea
                  id="page-body"
                  className="min-h-[16rem] font-mono text-sm"
                  value={form.bodyMarkdown}
                  onChange={(event) => setForm({ ...form, bodyMarkdown: event.target.value })}
                />
                <p className="text-muted-foreground text-xs">
                  Markdown: judul dengan #, tebal dengan **, tautan dengan [teks](alamat), daftar
                  dengan tanda minus. HTML mentah ditampilkan sebagai teks.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="page-published"
                  checked={form.isPublished}
                  onCheckedChange={(checked) => setForm({ ...form, isPublished: checked === true })}
                />
                <Label htmlFor="page-published">Terbitkan halaman ini</Label>
              </div>
            </div>

            <div className="mb-6">
              {gallery ? <GalleryEditor pageId={form.id} initialImages={gallery} /> : null}
            </div>

            <DialogFooter className="mb-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Tutup
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </DialogFooter>

            <div className="grid gap-2">
              <p className="text-sm font-medium">Pratinjau halaman</p>
              <p className="text-muted-foreground text-xs">
                Gulir di dalam kotak untuk melihat seluruh halaman.
              </p>
              <div className="max-h-[40rem] overflow-y-auto rounded-lg border">
                {draft ? (
                  <PublicPageView view={draft} />
                ) : (
                  <p className="text-muted-foreground p-4 text-sm">Memuat pratinjau…</p>
                )}
              </div>
            </div>
          </form>
        ) : (
          <p className="text-muted-foreground p-4 text-sm">Memuat halaman…</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

function NewPageDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (id: number) => Promise<void>
}) {
  const create = useServerFn(createPage)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    slug: '',
    isPublished: false,
  })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    try {
      const result = await create({
        data: {
          title: form.title,
          slug: form.slug,
          bodyMarkdown: '',
          isPublished: form.isPublished,
        },
      })
      toast.success('Halaman dibuat.')
      await onCreated(result.id)
    } catch (error) {
      toast.error(errorMessage(error, 'Halaman gagal dibuat.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Halaman baru</DialogTitle>
            <DialogDescription>
              Halaman baru memakai susunan yang sama, tanpa daftar kamar.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-page-title">Judul</Label>
              <Input
                id="new-page-title"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Syarat sewa"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-page-slug">Alamat</Label>
              <Input
                id="new-page-slug"
                value={form.slug}
                onChange={(event) => setForm({ ...form, slug: event.target.value })}
                placeholder="syarat-sewa"
                required
              />
              <p className="text-muted-foreground text-xs">
                Huruf kecil, angka, dan tanda hubung. Halaman ini akan ada di /
                {form.slug || 'alamat'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Menyimpan…' : 'Buat halaman'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeletePageDialog({
  page,
  onClose,
  onDeleted,
}: {
  page: AdminPage | null
  onClose: () => void
  onDeleted: () => Promise<void>
}) {
  const remove = useServerFn(deletePage)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    if (!page) return
    setIsDeleting(true)
    try {
      await remove({ data: { id: page.id } })
      toast.success('Halaman dihapus.')
      await onDeleted()
    } catch (error) {
      toast.error(errorMessage(error, 'Halaman gagal dihapus.'))
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={page !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus halaman {page?.title}?</AlertDialogTitle>
          <AlertDialogDescription>
            Halaman dan baris galerinya dihapus. Halaman beranda tidak bisa dihapus.
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
