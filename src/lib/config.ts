/**
 * URL of the password-checking refresh Worker (worker/). Empty = the Refresh button falls back to
 * GitHub's "Run workflow" page. Can also be set at build time with VITE_REFRESH_API.
 */
export const REFRESH_API: string = import.meta.env.VITE_REFRESH_API || ''

export const REFRESH_FALLBACK_URL = 'https://github.com/white22266/social-dashboard/actions/workflows/request-refresh.yml'
