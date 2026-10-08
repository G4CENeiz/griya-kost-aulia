/** The slug of the landing page. It is the only page with the hero and the rooms preview. */
export const LANDING_SLUG = 'home'

/** The slug of the room list page. */
export const ROOMS_SLUG = 'rooms'

/** The built-in pages, each with its own layout (ADR-0031). */
export const BUILT_IN_SLUGS = [LANDING_SLUG, ROOMS_SLUG, 'rules', 'faq', 'contact'] as const
