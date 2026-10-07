/**
 * Browser-side image preparation for the gallery (ADR-0025).
 *
 * Source photos come from a phone camera and are several megabytes each. The
 * browser resizes to at most 1600 px on the long edge and encodes WebP, so
 * nothing larger ever reaches the server, and no server-side image library is
 * needed (there is none in a Worker).
 */
export const MAX_EDGE = 1600

export async function toUploadableWebp(file: File): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    // A format this browser cannot decode, such as HEIC on some of them.
    throw new Error(`${file.name} tidak bisa dibaca sebagai gambar.`)
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Peramban ini tidak bisa menyiapkan gambar.')
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), 'image/webp', 0.85)
  })
  if (!blob) {
    throw new Error(`${file.name} gagal diubah menjadi WebP.`)
  }
  return blob
}
