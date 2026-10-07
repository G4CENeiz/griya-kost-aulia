import { useServerFn } from '@tanstack/react-start'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { errorMessage } from '#/lib/errors'
import { toUploadableWebp } from '#/lib/image'
import {
  type GalleryImage,
  deleteGalleryImage,
  listGalleryImages,
  moveGalleryImage,
  updateGalleryAlt,
  uploadGalleryImage,
} from '#/server/admin/gallery'

/**
 * The Galeri card of the Halaman screen (ADR-0025): select images, see
 * thumbnails, reorder, and delete. The browser resizes and encodes each file
 * before it is sent.
 */
export function GalleryEditor({
  pageId,
  initialImages,
}: {
  pageId: number
  initialImages: GalleryImage[]
}) {
  const list = useServerFn(listGalleryImages)
  const upload = useServerFn(uploadGalleryImage)
  const removeImage = useServerFn(deleteGalleryImage)
  const moveImage = useServerFn(moveGalleryImage)
  const saveAlt = useServerFn(updateGalleryAlt)
  const [images, setImages] = useState<GalleryImage[]>(initialImages)
  const [isBusy, setIsBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setImages(await list({ data: { pageId } }))
    } catch (error) {
      toast.error(errorMessage(error, 'Galeri gagal dimuat.'))
    }
  }, [list, pageId])

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setIsBusy(true)
    try {
      for (const file of Array.from(files)) {
        const webp = await toUploadableWebp(file)
        const body = new FormData()
        body.set('pageId', String(pageId))
        body.set('alt', '')
        body.set(
          'file',
          new File([webp], `${file.name.replace(/\.[^.]+$/, '')}.webp`, {
            type: webp.type,
          }),
        )
        await upload({ data: body })
      }
      toast.success('Gambar diunggah.')
      await refresh()
    } catch (error) {
      toast.error(errorMessage(error, 'Gambar gagal diunggah.'))
    } finally {
      setIsBusy(false)
    }
  }

  async function run(action: () => Promise<unknown>, fallback: string) {
    setIsBusy(true)
    try {
      await action()
      await refresh()
    } catch (error) {
      toast.error(errorMessage(error, fallback))
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor="gallery-files">Galeri</Label>
        <Input
          id="gallery-files"
          type="file"
          accept="image/*"
          multiple
          disabled={isBusy}
          onChange={(event) => {
            void handleFiles(event.target.files)
            event.target.value = ''
          }}
        />
        <p className="text-muted-foreground text-xs">
          Gambar diperkecil menjadi 1600 px dan diubah ke WebP di peramban sebelum dikirim. Galeri
          kosong menampilkan kotak abu-abu di halaman publik.
        </p>
      </div>

      {images.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {images.map((image, index) => (
            <li key={image.id} className="grid gap-2 rounded-lg border p-3">
              <img
                src={`/media/${image.r2Key}`}
                alt={image.alt}
                className="aspect-4/3 w-full rounded border object-cover"
              />
              <div className="flex items-center gap-1">
                <Input
                  defaultValue={image.alt}
                  placeholder="Teks alternatif"
                  aria-label="Teks alternatif"
                  disabled={isBusy}
                  onBlur={(event) => {
                    if (event.target.value === image.alt) return
                    void run(
                      () => saveAlt({ data: { id: image.id, alt: event.target.value } }),
                      'Teks alternatif gagal disimpan.',
                    )
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  aria-label="Naikkan"
                  disabled={isBusy || index === 0}
                  onClick={() =>
                    void run(
                      () => moveImage({ data: { id: image.id, direction: 'up' } }),
                      'Gambar gagal dipindah.',
                    )
                  }
                >
                  ↑
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  aria-label="Turunkan"
                  disabled={isBusy || index === images.length - 1}
                  onClick={() =>
                    void run(
                      () => moveImage({ data: { id: image.id, direction: 'down' } }),
                      'Gambar gagal dipindah.',
                    )
                  }
                >
                  ↓
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  aria-label="Hapus"
                  disabled={isBusy}
                  onClick={() =>
                    void run(() => removeImage({ data: { id: image.id } }), 'Gambar gagal dihapus.')
                  }
                >
                  Hapus
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">Belum ada gambar.</p>
      )}
    </div>
  )
}
