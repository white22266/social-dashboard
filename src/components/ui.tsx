import type { ReactNode } from 'react'
import type { Platform } from '../lib/types'
import { PLATFORM_LABEL } from '../lib/format'

export function Section({ id, number, eyebrow, title, intro, children }: {
  id: string
  number: string
  eyebrow: string
  title: string
  intro?: ReactNode
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-line-strong pt-12 pb-16 sm:pt-16 sm:pb-20">
      <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-[180px_1fr]">
        <div className="flex items-baseline gap-3 lg:block">
          <div className="font-serif text-5xl leading-none text-accent/80 sm:text-6xl">{number}</div>
          <div className="eyebrow lg:mt-3">{eyebrow}</div>
        </div>
        <div>
          <h2 className="font-serif text-3xl leading-tight font-medium tracking-tight text-ink sm:text-[2.6rem]">{title}</h2>
          {intro && <div className="mt-4 max-w-3xl text-[15.5px] text-ink-2">{intro}</div>}
        </div>
      </div>
      {children}
    </section>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-card ${className}`}>{children}</div>
}

export function PlatformTag({ platform, className = '' }: { platform: Platform; className?: string }) {
  const tone = platform === 'instagram' ? 'bg-ig-soft text-ig' : 'bg-tt-soft text-tt'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${platform === 'instagram' ? 'bg-ig' : 'bg-tt'}`} />
      {PLATFORM_LABEL[platform]}
    </span>
  )
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'good' | 'warn' | 'bad' }) {
  const tones = {
    neutral: 'bg-paper-deep text-ink-2',
    accent: 'bg-accent-soft text-accent',
    good: 'bg-good-soft text-good',
    warn: 'bg-warn-soft text-warn',
    bad: 'bg-bad-soft text-bad',
  }
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${tones[tone]}`}>{children}</span>
}

/** Labels a statement as something the data shows vs. an untested explanation. */
export function Claim({ kind, children }: { kind: 'observation' | 'hypothesis' | 'general'; children: ReactNode }) {
  const meta = {
    observation: { label: 'Observation', cls: 'text-accent', mark: '●' },
    hypothesis: { label: 'Hypothesis', cls: 'text-warn', mark: '◐' },
    general: { label: 'General advice', cls: 'text-muted', mark: '○' },
  }[kind]
  return (
    <div className="text-[14.5px] leading-relaxed text-ink-2">
      <div className={`text-[10.5px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase ${meta.cls}`}>
        {meta.mark} {meta.label}
      </div>
      <div className="mt-0.5">{children}</div>
    </div>
  )
}

export function EvidenceBadge({ n, threshold = 5 }: { n: number; threshold?: number }) {
  if (n < threshold) return <Pill tone="warn">n={n} · low sample</Pill>
  if (n < 10) return <Pill>n={n} · indicative</Pill>
  return <Pill tone="accent">n={n}</Pill>
}

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-line bg-card p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${value === o.value ? 'bg-ink text-white' : 'text-ink-2 hover:bg-paper'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Metric({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium tracking-wide text-muted uppercase">{label}</div>
      <div className="tabular mt-0.5 text-[15px] font-semibold text-ink">{value}</div>
      {sub && <div className="text-[11.5px] text-muted">{sub}</div>}
    </div>
  )
}
