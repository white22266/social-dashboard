/**
 * POST /refresh  { "password": "..." }
 *   202 { ok, startedAt }                       refresh requested (GitHub "Request refresh" workflow dispatched)
 *   401 { error: "wrong_password", attemptsLeft }
 *   429 { error: "locked", retryAfterSeconds }  too many wrong passwords from this IP
 *   429 { error: "cooldown", retryAfterSeconds, startedAt }  a refresh was requested in the last 10 minutes
 *   502 { error: "github_failed", status }
 *
 * The password is only ever compared here (a Worker secret); it never appears in the website code.
 * The owner's Mac watches for the dispatched workflow run and performs the actual refresh.
 */

interface Env {
  GUARD: KVNamespace
  REFRESH_PASSWORD: string
  GITHUB_TOKEN: string
  GITHUB_REPO: string
  WORKFLOW: string
  ALLOWED_ORIGINS: string
}

const MAX_FAILS = 5
const LOCK_SECONDS = 15 * 60
const COOLDOWN_SECONDS = 10 * 60

async function sha256(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))
}

/** Constant-time comparison (hash first so lengths are equal). */
async function safeEqual(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([sha256(a), sha256(b)])
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i]
  return diff === 0 && b.length > 0
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    const origin = req.headers.get('Origin') ?? ''
    const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    const cors: Record<string, string> = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    }
    const json = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (url.pathname !== '/refresh' || req.method !== 'POST') return json(404, { error: 'not_found' })
    if (!allowed.includes(origin)) return json(403, { error: 'forbidden_origin' })

    const ip = req.headers.get('CF-Connecting-IP') ?? 'unknown'
    const failKey = `fail:${ip}`
    const fails = Number((await env.GUARD.get(failKey)) ?? 0)
    if (fails >= MAX_FAILS) return json(429, { error: 'locked', retryAfterSeconds: LOCK_SECONDS })

    let password = ''
    try {
      const body = (await req.json()) as { password?: unknown }
      if (typeof body.password === 'string') password = body.password.slice(0, 200)
    } catch {
      /* treated as a wrong password */
    }

    if (!(await safeEqual(password, env.REFRESH_PASSWORD ?? ''))) {
      await env.GUARD.put(failKey, String(fails + 1), { expirationTtl: LOCK_SECONDS })
      return json(401, { error: 'wrong_password', attemptsLeft: Math.max(0, MAX_FAILS - fails - 1) })
    }
    await env.GUARD.delete(failKey)

    const now = Date.now()
    const last = Number((await env.GUARD.get('last_trigger')) ?? 0)
    if (now - last < COOLDOWN_SECONDS * 1000) {
      return json(429, {
        error: 'cooldown',
        retryAfterSeconds: Math.ceil((COOLDOWN_SECONDS * 1000 - (now - last)) / 1000),
        startedAt: new Date(last).toISOString(),
      })
    }

    const gh = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/${env.WORKFLOW}/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'social-dashboard-refresh-worker',
      },
      body: JSON.stringify({ ref: 'main' }),
    })
    if (gh.status !== 204) return json(502, { error: 'github_failed', status: gh.status })

    await env.GUARD.put('last_trigger', String(now), { expirationTtl: COOLDOWN_SECONDS })
    return json(202, { ok: true, startedAt: new Date(now).toISOString() })
  },
} satisfies ExportedHandler<Env>
