/** URL of the password-checking refresh Worker (worker/). Can be overridden at build time with VITE_REFRESH_API. */
export const REFRESH_API: string =
  import.meta.env.VITE_REFRESH_API || 'https://social-dashboard-refresh.social-dashboard-refresh-worker.workers.dev'
