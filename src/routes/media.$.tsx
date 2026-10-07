import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'

/**
 * Gallery images and receipt PDFs are served from here through the R2 binding.
 * A receipt is only reachable with its unguessable key; the gallery keys are
 * not secret (ADR-0025).
 */
export const Route = createFileRoute('/media/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const key = params._splat
        if (!key) return new Response('Not found', { status: 404 })

        const object = await env.MEDIA.get(key)
        if (!object) return new Response('Not found', { status: 404 })

        return new Response(object.body, {
          headers: {
            'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
            'cache-control': 'public, max-age=31536000, immutable',
          },
        })
      },
    },
  },
})
