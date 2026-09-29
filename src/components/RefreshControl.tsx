import { useEffect, useRef, useState, type FormEvent } from 'react'
import { REFRESH_API, REFRESH_FALLBACK_URL } from '../lib/config'

type Phase =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'error'; message: string }
  | { kind: 'running'; startedAt: string }
  | { kind: 'ready' }
  | { kind: 'slow'; startedAt: string }

const POLL_MS = 30_000
const SLOW_AFTER_MS = 20 * 60_000

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

/** Password-protected refresh. The password is checked by the refresh Worker, never in this code. */
export default function RefreshControl({ collectedAt }: { collectedAt: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })

  // After a refresh starts, watch the published data version until the new build is live.
  const startedAt = phase.kind === 'running' || phase.kind === 'slow' ? phase.startedAt : null
  useEffect(() => {
    if (!startedAt) return
    const check = async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}data-version.json?t=${Date.now()}`, { cache: 'no-store' })
        const v = (await res.json()) as { collectedAt?: string }
        if (v.collectedAt && v.collectedAt > collectedAt && Date.parse(v.collectedAt) >= Date.parse(startedAt) - 60_000) {
          setPhase({ kind: 'ready' })
          return
        }
      } catch {
        /* keep polling */
      }
      if (Date.now() - Date.parse(startedAt) > SLOW_AFTER_MS) setPhase({ kind: 'slow', startedAt })
    }
    const id = setInterval(check, POLL_MS)
    return () => clearInterval(id)
  }, [startedAt, collectedAt])

  if (!REFRESH_API) {
    return (
      <a href={REFRESH_FALLBACK_URL} target="_blank" rel="noreferrer" className={BUTTON}>
        <span aria-hidden>↻</span> Refresh data &amp; AI analysis
      </a>
    )
  }

  const open = () => {
    setPhase((p) => (p.kind === 'error' ? { kind: 'idle' } : p))
    dialogRef.current?.showModal()
    inputRef.current?.focus()
  }

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const password = inputRef.current?.value ?? ''
    if (!password) return
    setPhase({ kind: 'submitting' })
    try {
      const res = await fetch(`${REFRESH_API}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string; attemptsLeft?: number; retryAfterSeconds?: number; startedAt?: string }
      if (res.status === 202 && body.startedAt) {
        if (inputRef.current) inputRef.current.value = ''
        dialogRef.current?.close()
        setPhase({ kind: 'running', startedAt: body.startedAt })
        return
      }
      const minutes = Math.ceil((body.retryAfterSeconds ?? 0) / 60)
      const message =
        body.error === 'wrong_password'
          ? `密码错误 · Incorrect password${body.attemptsLeft !== undefined ? ` (${body.attemptsLeft} attempts left)` : ''}`
          : body.error === 'locked'
            ? `尝试次数过多，请 ${minutes} 分钟后再试 · Too many attempts, try again in ${minutes} min`
            : body.error === 'cooldown'
              ? `刷新已在进行中（${time(body.startedAt!)} 开始），请 ${minutes} 分钟后再试 · A refresh is already running`
              : '刷新服务暂时不可用 · The refresh service is unavailable'
      setPhase({ kind: 'error', message })
      inputRef.current?.select()
    } catch {
      setPhase({ kind: 'error', message: '无法连接刷新服务 · Could not reach the refresh service' })
    }
  }

  const busy = phase.kind === 'running' || phase.kind === 'slow'

  return (
    <>
      <button type="button" onClick={open} disabled={busy || phase.kind === 'ready'} className={`${BUTTON} disabled:cursor-default disabled:opacity-60`}>
        <span aria-hidden className={busy ? 'inline-block animate-spin' : ''}>↻</span>
        {busy ? 'Refreshing…' : 'Refresh data & AI analysis'}
      </button>

      <span role="status" className="text-[12.5px] leading-snug text-muted">
        {phase.kind === 'running' && <>Started {time(phase.startedAt)}. Collecting data and rewriting the AI analysis. This takes about 7–10 minutes.</>}
        {phase.kind === 'slow' && <>Still waiting (started {time(phase.startedAt)}). The owner's Mac must be on with Ollama running.</>}
        {phase.kind === 'ready' && (
          <>
            <strong className="text-good">Update ready.</strong>{' '}
            <button type="button" onClick={() => location.reload()} className="font-medium text-accent underline underline-offset-2">
              Reload the page
            </button>
          </>
        )}
        {(phase.kind === 'idle' || phase.kind === 'submitting' || phase.kind === 'error') && <>Password required. New data and a rewritten analysis appear about 7–10 minutes later.</>}
      </span>

      <dialog
        ref={dialogRef}
        aria-labelledby="refresh-title"
        className="m-auto w-[min(420px,calc(100vw-32px))] rounded-2xl border border-line bg-card p-0 text-ink shadow-[0_24px_64px_rgba(27,35,48,0.18)] backdrop:bg-ink/30 backdrop:backdrop-blur-[2px]"
      >
        <form onSubmit={submit} className="p-6">
          <h2 id="refresh-title" className="font-serif text-2xl text-ink">Refresh the dashboard</h2>
          <p className="mt-1.5 text-[13.5px] text-ink-2">
            Collects the latest Instagram and TikTok data, then the AI rewrites the analysis. 输入密码开始刷新。
          </p>
          <label htmlFor="refresh-password" className="mt-5 block text-[12px] font-semibold tracking-wide text-muted uppercase">
            Password · 密码
          </label>
          <input
            ref={inputRef}
            id="refresh-password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={phase.kind === 'error'}
            aria-describedby="refresh-error"
            className="mt-1.5 w-full rounded-lg border border-line-strong bg-paper px-3 py-2.5 text-[15px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 aria-[invalid=true]:border-bad"
          />
          <p id="refresh-error" aria-live="assertive" className="mt-2 min-h-[1.25rem] text-[13px] font-medium text-bad">
            {phase.kind === 'error' ? phase.message : ''}
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => dialogRef.current?.close()} className="rounded-lg px-4 py-2 text-[13.5px] font-medium text-ink-2 hover:bg-paper">
              Cancel
            </button>
            <button type="submit" disabled={phase.kind === 'submitting'} className="rounded-lg bg-ink px-4 py-2 text-[13.5px] font-medium text-white hover:bg-accent disabled:opacity-60">
              {phase.kind === 'submitting' ? 'Checking…' : 'Refresh'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}

const BUTTON =
  'inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-accent'
