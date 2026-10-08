import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { GalleryEditor } from '#/components/gallery-editor'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { LANDING_SLUG } from '#/lib/pages'
import { listGalleryImages } from '#/server/admin/gallery'
import { listPages } from '#/server/admin/pages'

/**
 * Galeri: the pictures of one page, chosen with the selector. The same card is
 * inside the Halaman editor, so an upload behaves the same in both places.
 */
export const Route = createFileRoute('/admin/galeri')({
  validateSearch: (search: Record<string, unknown>) => ({
    page: typeof search.page === 'number' ? search.page : undefined,
  }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ deps }) => {
    const pages = await listPages()
    const pageId = deps.page ?? pages[0]?.id ?? null
    return {
      pages,
      pageId,
      images: pageId ? await listGalleryImages({ data: { pageId } }) : [],
    }
  },
  component: GalleryPage,
})

function GalleryPage() {
  const { pages, pageId, images } = Route.useLoaderData()
  const navigate = useNavigate()
  const selected = pages.find((page) => page.id === pageId)

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Galeri</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Gambar per halaman. Gambar diperkecil menjadi 1600 px dan diubah ke WebP sebelum diunggah.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Halaman</CardTitle>
          <CardDescription>Pilih halaman untuk melihat dan mengubah gambarnya.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid max-w-sm gap-2">
            <Label htmlFor="gallery-page">Halaman</Label>
            <Select
              value={pageId ? String(pageId) : ''}
              onValueChange={(value) =>
                void navigate({ to: '/admin/galeri', search: { page: Number(value) } })
              }
            >
              <SelectTrigger id="gallery-page">
                <SelectValue placeholder="Pilih halaman" />
              </SelectTrigger>
              <SelectContent>
                {pages.map((page) => (
                  <SelectItem key={page.id} value={String(page.id)}>
                    {page.title}
                    {page.slug === LANDING_SLUG ? ' (beranda)' : ` /${page.slug}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {pageId && selected ? (
            <GalleryEditor key={pageId} pageId={pageId} initialImages={images} />
          ) : (
            <p className="text-muted-foreground text-sm">Belum ada halaman.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
