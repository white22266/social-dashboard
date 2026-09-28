import { useState } from 'react'
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import { DAY_LABELS, DURATION_BUCKETS, TIME_BUCKETS, type Analysis, type GroupRow } from '../lib/analytics'
import type { EnrichedPost, Platform } from '../lib/types'
import { firstLine, fmtCompact, fmtDate, fmtNum, fmtRate, PLATFORM_LABEL } from '../lib/format'
import { patternNotes } from '../data/insights'
import { ChartFrame, HBarChart, LowSampleLegend, TooltipCard, type BarDatum } from './charts'
import { SERIES } from '../lib/palette'
import { Claim, Pill, Section, Segmented } from './ui'

type Metric = 'views' | 'rate'

const STRENGTH = {
  moderate: { tone: 'accent' as const, label: 'Moderate evidence' },
  weak: { tone: 'warn' as const, label: 'Weak evidence' },
  insufficient: { tone: 'bad' as const, label: 'Insufficient data' },
}

export default function ContentPatterns({ a, topicLabel }: { a: Analysis; topicLabel: (id: string) => string }) {
  const [platform, setPlatform] = useState<Platform>('instagram')
  const [metric, setMetric] = useState<Metric>('views')
  const value = (r: GroupRow) => (metric === 'views' ? r.medianViews : r.medianPer1000)
  const fmt = (v: number | null) => (metric === 'views' ? fmtNum(v) : fmtRate(v))
  const valueLabel = metric === 'views' ? 'Median views' : 'Eng. / 1,000 views'
  const color = SERIES[platform]

  const ordered = (rows: GroupRow[], order: { id: string; label: string }[]): BarDatum[] =>
    order.flatMap((o) => {
      const r = rows.find((x) => x.key === o.id)
      return r ? [{ label: o.label, value: value(r), n: r.n, lowSample: r.lowSample }] : []
    })

  const days = ordered(a.days[platform] ?? [], [1, 2, 3, 4, 5, 6, 0].map((d) => ({ id: DAY_LABELS[d], label: DAY_LABELS[d] })))
  const times = ordered(a.times[platform] ?? [], TIME_BUCKETS.map((b) => ({ id: b.id, label: `${b.label} ${b.range}` })))
  const durations = ordered(a.durations[platform] ?? [], DURATION_BUCKETS)
  const topics = [...(a.topicsByPlatform[platform] ?? [])]
    .sort((x, y) => (value(y) ?? -1) - (value(x) ?? -1))
    .map((r) => ({ label: topicLabel(r.key), value: value(r), n: r.n, lowSample: r.lowSample }))
  const f = a.frequencyByPlatform[platform]

  return (
    <Section
      id="patterns"
      number="07"
      eyebrow="Content patterns"
      title="When, how long, and how often"
      intro={<>Patterns are shown only with their sample size. With {a.byPlatform.instagram?.postsWithViews ?? 0} Instagram reels and {a.byPlatform.tiktok?.postsWithViews ?? 0} TikTok videos, most splits are indicative at best. TikTok's 20 videos were all posted in one 4-day window, so its day and time splits mostly reflect which day the account started getting views.</>}
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Segmented label="Platform" value={platform} onChange={setPlatform} options={[{ value: 'instagram', label: 'Instagram' }, { value: 'tiktok', label: 'TikTok' }]} />
        <Segmented label="Metric" value={metric} onChange={setMetric} options={[{ value: 'views', label: 'Median views' }, { value: 'rate', label: 'Eng. / 1,000' }]} />
        <span className="text-[12px] text-muted"><LowSampleLegend /> · times in Kuala Lumpur (UTC+8)</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PatternBlock title="Best days" strength={patternNotes.day.strength} platform={platform}>
          <HBarChart data={days} format={fmt} color={color} valueLabel={valueLabel} />
        </PatternBlock>
        <PatternBlock title="Strongest posting times" strength={patternNotes.time.strength} platform={platform}>
          <HBarChart data={times} format={fmt} color={color} valueLabel={valueLabel} />
        </PatternBlock>
        <PatternBlock title="Strongest video durations" strength={patternNotes.duration.strength} platform={platform}>
          <HBarChart data={durations} format={fmt} color={color} valueLabel={valueLabel} />
        </PatternBlock>
        <PatternBlock title="Strongest content categories" strength={patternNotes.topic.strength} platform={platform}>
          <HBarChart data={topics} format={fmt} color={color} valueLabel={valueLabel} />
        </PatternBlock>
      </div>

      <div className="mt-4">
        <ChartFrame
          title="Posting rhythm: every post over time"
          subtitle="Each dot is one post; height is views (square-root scale so small and viral posts both show). Gaps and bursts are visible at a glance."
          footer={
            <span className="tabular">
              {PLATFORM_LABEL[platform]}: {fmtRate(f.postsPerWeek)} posts/week across {fmtNum(f.spanDays)} days · {f.activeWeeks} active weeks · {fmtRate(f.postsPerActiveWeek)} posts per active week · median gap {fmtRate(f.medianGapDays)} days · longest gap {fmtNum(f.longestGapDays)} days
            </span>
          }
        >
          <Timeline posts={a.posts} topicLabel={topicLabel} />
        </ChartFrame>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {(Object.entries(patternNotes) as [keyof typeof patternNotes, (typeof patternNotes)[keyof typeof patternNotes]][]).map(([k, v]) => (
          <div key={k}>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="font-serif text-lg text-ink capitalize">{k === 'frequency' ? 'Posting frequency' : k === 'time' ? 'Posting time' : k}</h3>
              <Pill tone={STRENGTH[v.strength].tone}>{STRENGTH[v.strength].label}</Pill>
            </div>
            <div className="space-y-2">{v.lines.map((l, i) => <Claim key={i} kind={l.kind}>{l.text}</Claim>)}</div>
          </div>
        ))}
      </div>
    </Section>
  )
}

function PatternBlock({ title, strength, platform, children }: { title: string; strength: keyof typeof STRENGTH; platform: Platform; children: React.ReactNode }) {
  const s = platform === 'tiktok' ? STRENGTH.insufficient : STRENGTH[strength]
  return (
    <div className="rounded-xl border border-line bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
        <Pill tone={s.tone}>{s.label}</Pill>
      </div>
      {children}
    </div>
  )
}

function Timeline({ posts, topicLabel }: { posts: EnrichedPost[]; topicLabel: (id: string) => string }) {
  const series = (['instagram', 'tiktok'] as Platform[]).map((pl) => ({
    platform: pl,
    data: posts.filter((p) => p.platform === pl && p.views !== null && p.publishedAt).map((p) => ({ ...p, x: Date.parse(p.publishedAt!), y: p.views! })),
  }))
  const xs = series.flatMap((s) => s.data.map((d) => d.x))
  const pad = 10 * 86_400_000
  const [minX, maxX] = [Math.min(...xs) - pad, Math.max(...xs) + pad]
  // month ticks, thinned so there are at most ~8 labels
  const months: number[] = []
  for (let d = new Date(minX); d.getTime() <= maxX; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
    if (t >= minX) months.push(t)
  }
  const step = Math.max(1, Math.ceil(months.length / 8))
  const ticks = months.filter((_, i) => i % step === 0)
  return (
    <>
      <div className="mb-2 flex gap-4 text-[12px] text-ink-2">
        {series.map((s) => (
          <span key={s.platform} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: SERIES[s.platform] }} />
            {PLATFORM_LABEL[s.platform]} ({s.data.length})
          </span>
        ))}
      </div>
      <div className="h-[260px]" role="img" aria-label="Views of each post over time, by platform">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis type="number" dataKey="x" domain={[minX, maxX]} ticks={ticks} tickFormatter={(v) => new Date(v).toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' })} tickLine={false} axisLine={{ stroke: '#cfc8b9' }} />
            <YAxis type="number" dataKey="y" scale="sqrt" tickFormatter={fmtCompact} tickLine={false} axisLine={false} width={44} ticks={[0, 300, 1000, 5000, 15000, 30000]} />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0].payload as EnrichedPost
                return <TooltipCard title={firstLine(p.caption, 70)} rows={[['Platform', PLATFORM_LABEL[p.platform]], ['Published', fmtDate(p.publishedAt)], ['Views', fmtNum(p.views)], ['Topic', topicLabel(p.topic)]]} />
              }}
            />
            {series.map((s) => (
              <Scatter key={s.platform} data={s.data} fill={SERIES[s.platform]} stroke="#fff" strokeWidth={1.5} isAnimationActive={false} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}
