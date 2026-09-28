import type { ReactNode } from 'react'
import { recommendations as R, type Rec } from '../data/insights'
import { Section } from './ui'

const KIND = {
  observation: { label: 'From the data', cls: 'text-accent bg-accent-soft' },
  hypothesis: { label: 'Hypothesis to test', cls: 'text-warn bg-warn-soft' },
  general: { label: 'General advice', cls: 'text-muted bg-paper-deep' },
}

function RecItem({ r }: { r: Rec }) {
  return (
    <li className="border-t border-line pt-3 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-ink">{r.title}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${KIND[r.kind].cls}`}>{KIND[r.kind].label}</span>
      </div>
      <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{r.detail}</p>
    </li>
  )
}

function Block({ title, marker, items, className = '' }: { title: string; marker: ReactNode; items: Rec[]; className?: string }) {
  return (
    <div className={`rounded-xl border border-line bg-card p-6 ${className}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-paper font-serif text-lg text-accent">{marker}</span>
        <h3 className="font-serif text-2xl text-ink">{title}</h3>
      </div>
      <ul className="space-y-3">{items.map((r) => <RecItem key={r.title} r={r} />)}</ul>
    </div>
  )
}

export default function Recommendations() {
  return (
    <Section
      id="next"
      number="09"
      eyebrow="What should I do next?"
      title="A plan built from this account's own numbers"
      intro={<>Every recommendation is labelled: <strong className="text-accent">from the data</strong> (backed by the numbers above), <strong className="text-warn">hypothesis to test</strong> (plausible, not proven) or <strong className="text-muted">general advice</strong> (not derived from this dataset).</>}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Block title="Create more" marker="+" items={R.more} />
        <Block title="Create less" marker="−" items={R.less} />
        <Block title="Experiment with" marker="?" items={R.experiment} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Block title="Strongest hooks" marker="“" items={R.hooks} />
        <Block title="Ideal video length" marker="◷" items={[R.duration]} />
        <Block title="Posting pattern" marker="≡" items={R.posting} />
      </div>

      <div className="mt-10">
        <h3 className="font-serif text-3xl text-ink">Instagram and TikTok need different jobs</h3>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-line border-t-[3px] border-t-ig bg-card p-6">
            <div className="eyebrow mb-3 text-ig">Instagram</div>
            <ul className="space-y-3">{R.platformStrategy.instagram.map((r) => <RecItem key={r.title} r={r} />)}</ul>
          </div>
          <div className="rounded-xl border border-line border-t-[3px] border-t-tt bg-card p-6">
            <div className="eyebrow mb-3 text-tt">TikTok</div>
            <ul className="space-y-3">{R.platformStrategy.tiktok.map((r) => <RecItem key={r.title} r={r} />)}</ul>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <h3 className="font-serif text-3xl text-ink">Your next 5 posts: a test plan</h3>
        <p className="mt-2 max-w-3xl text-[14px] text-ink-2">Each post tests one idea from this analysis and has a pass mark taken from the current benchmarks, so the next data refresh can confirm or reject it.</p>
        <ol className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
          {R.nextFive.map((t) => (
            <li key={t.n} className="flex flex-col rounded-xl border border-line bg-card p-5">
              <div className="flex items-baseline justify-between">
                <span className="font-serif text-4xl text-accent/80">{t.n}</span>
                <span className="text-[11px] font-semibold text-muted">{t.platform}</span>
              </div>
              <div className="mt-3 text-[13.5px] font-semibold text-ink">{t.topic}</div>
              <div className="mt-1 text-[12px] text-muted">{t.hook} · {t.format}</div>
              <p className="mt-3 flex-1 font-serif text-[15.5px] leading-snug text-ink-2">{t.brief}</p>
              <div className="mt-4 rounded-lg bg-paper px-3 py-2 text-[12px] text-ink-2">
                <span className="font-semibold text-ink">Pass mark: </span>{t.measure}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  )
}
