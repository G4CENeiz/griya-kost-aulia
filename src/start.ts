import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

import { decideAccess, forbiddenResponse } from '#/server/admin/guard'

/**
 * TanStack Start applies its own CSRF middleware to server function calls only
 * when this file does not exist. Defining a start instance replaces it, so the
 * protection is added here explicitly. Server functions are same-origin RPC
 * endpoints and need it.
 */
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})

/**
 * ADR-0017. A request middleware cannot tell an admin server function call
 * from a public one, because it receives no usable metadata for those calls, so
 * it guards the page route by path.
 */
const adminPageGuard = createMiddleware({ type: 'request' }).server(
  async ({ pathname, request, next }) => {
    if (!pathname.startsWith('/admin')) return next()

    const decision = await decideAccess(request)
    if (decision === 'deny') return forbiddenResponse()

    return next()
  },
)

/**
 * ADR-0017. For a server function call the function middleware does receive the
 * real source file, so the directory is the enforcement key. A server function
 * outside src/server/admin/ is not protected.
 *
 * A function middleware cannot return a Response, so a denial travels as an
 * error envelope with no data.
 */
const adminServerFunctionGuard = createMiddleware({ type: 'function' }).server(
  async ({ serverFnMeta, next }) => {
    if (!serverFnMeta.filename.startsWith('src/server/admin/')) return next()

    const decision = await decideAccess(getRequest())
    if (decision === 'deny') {
      throw new Error('Forbidden')
    }

    return next()
  },
)

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, adminPageGuard],
  functionMiddleware: [adminServerFunctionGuard],
}))
