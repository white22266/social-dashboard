import type { Platform } from './types'

export const NA = '—'

export function fmtNum(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return NA
  return v.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 })
}

export function fmtCompact(v: number | null | undefined): string {
  if (v === null || v === undefined) return NA
  if (Math.abs(v) < 10_000) return fmtNum(v, v < 10 && v % 1 ? 1 : 0)
  return v.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })
}

export function fmtRate(v: number | null | undefined): string {
  return fmtNum(v, 1)
}

export function fmtPct(part: number, whole: number): string {
  return whole ? `${Math.round((part / whole) * 100)}%` : NA
}

export function fmtDate(iso: string | null, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  if (!iso) return NA
  return new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Asia/Kuala_Lumpur', ...opts })
}

export function firstLine(caption: string, max = 110): string {
  const line = caption.trim().split('\n').find((l) => l.trim()) ?? ''
  const clean = line.replace(/^["“”]+|["“”]+$/g, '').trim()
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() + '…' : clean || '(no caption)'
}

export const PLATFORM_LABEL: Record<Platform, string> = { instagram: 'Instagram', tiktok: 'TikTok' }

export function thumbSrc(path: string | null): string | null {
  return path ? `${import.meta.env.BASE_URL}${path}` : null
}
