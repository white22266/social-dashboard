import { useState } from 'react'
import { CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import { QUADRANTS, type Analysis } from '../lib/analytics'
import type { EnrichedPost, Platform, QuadrantId } from '../lib/types'
import { firstLine, fmtCompact, fmtNum, fmtPct, fmtRate, PLATFORM_LABEL } from '../lib/format'
import { quadrantNotes } from '../data/insights'
import { TooltipCard } from './charts'
import { SERIES } from '../lib/palette'
import { PostThumb } from './PostCard'
import { Section, Segmented } from './ui'

const TONE: Record<QuadrantId, { ring: string; chip: string; tint: string }> = {
  'reach-engage': { ring: 'border-good/40', chip: 'bg-good-soft text-good', tint: '#2f7a4b' },
  'reach-only': { ring: 'border-warn/40', chip: 'bg-warn-soft text-warn', tint: '#a8781c' },
  'engage-only': { ring: 'border-accent/40', chip: 'bg-accent-soft text-accent', tint: '#33557d' },
  neither: { ring: 'border-bad/30', chip: 'bg-bad-soft text-bad', tint: '#b0493b' },
}

export default function ReachEngagementMatrix({ a, topicLabel }: { a: Analysis; topicLabel: (id: string) => string }) {
  const [platform, setPlatform] = useState<Platform>('instagram')
  const posts = a.posts.filter((p) => p.platform === platform && p.quadrant)
  const bench = a.benchmarksByPlatform[platform]
  const degenerate = (bench.medianViews ?? 0) <= 1 || bench.medianEngagement === 0
  const excluded = a.unclassifiedForQuadrant.filter((p) => p.platform === platform).length

  return (
    <Section
      id="matrix"
      number="06"
      eyebrow="Reach vs engagement"
      title="Which posts travelled, and which got a response"
      intro={<>Each post is compared with its own platform's medians. Views at or above the median counts as good reach; engagement (likes + comments + shares) at or above the median counts as good engagement.</>}
    >
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Segmented label="Platform" value={platform} onChange={setPlatform} options={[{ value: 'instagram', label: 'Instagram' }, { value: 'tiktok', label: 'TikTok' }]} />
        <span className="tabular text-[13px] text-ink-2">
          Benchmarks: <strong className="text-ink">{fmtNum(bench.medianViews, 1)}</strong> median views · <strong className="text-ink">{fmtNum(bench.medianEngagement, 1)}</strong> median engagement
          {excluded > 0 && <span className="text-muted"> · {excluded} posts without a view count excluded</span>}
        </span>
      </div>

      {degenerate && (
        <div className="mb-6 rounded-xl border border-warn/40 bg-warn-soft px-5 py-4 text-[14px] text-ink">
          <strong className="font-semibold">Read with caution.</strong> {PLATFORM_LABEL[platform]}'s median views are {fmtNum(bench.medianViews, 1)} and median engagement is {fmtNum(bench.medianEngagement, 1)}. Under the ≥ median rule, a video with 0 likes counts as "good engagement", so these groups mostly separate 0 views from 1+ views and say little about content.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
        {!degenerate && <MatrixChart posts={posts} medianViews={bench.medianViews!} medianEng={bench.medianEngagement!} topicLabel={topicLabel} />}
        <div className={`grid gap-3 sm:grid-cols-2 ${degenerate ? 'lg:col-span-2 lg:grid-cols-4' : ''}`}>
          {QUADRANTS.map((q) => {
            const items = posts.filter((p) => p.quadrant === q.id)
            const themes = topThemes(items, topicLabel)
            return (
              <div key={q.id} className={`rounded-xl border bg-card p-4 ${TONE[q.id].ring}`}>
                <div className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold tracking-wide uppercase ${TONE[q.id].chip}`}>{q.short}</div>
                <div className="mt-2 text-[13px] font-semibold text-ink">{q.label}</div>
                <div className="tabular mt-2 flex items-baseline gap-2">
                  <span className="font-serif text-4xl text-ink">{items.length}</span>
                  <span className="text-[13px] text-muted">posts · {fmtPct(items.length, posts.length)}</span>
                </div>
                {themes && <div className="mt-2 text-[12px] text-ink-2"><span className="text-muted">Common themes:</span> {themes}</div>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {QUADRANTS.map((q) => {
          const items = posts.filter((p) => p.quadrant === q.id).sort((x, y) => (y.views ?? 0) - (x.views ?? 0))
          const notes = platform === 'instagram' ? quadrantNotes[q.id] : null
          return (
            <div key={q.id} className="rounded-xl border border-line bg-card p-5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: TONE[q.id].tint }} />
                <h3 className="font-serif text-xl text-ink">{q.label}</h3>
              </div>
              {notes ? (
                <div className="mt-3 space-y-2 text-[13.5px] leading-relaxed">
                  <p className="text-ink-2"><span className="font-semibold text-ink">What it means. </span>{notes.interpretation}</p>
                  <p className="text-ink-2"><span className="font-semibold text-ink">What to do. </span>{notes.action}</p>
                </div>
              ) : (
                <p className="mt-3 text-[13px] text-muted">No interpretation for this platform: the benchmark is too low to separate content quality (see note above).</p>
              )}
              <div className="mt-4 space-y-2">
                {items.slice(0, 3).map((p) => (
                  <a key={p.id} href={p.url ?? undefined} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-lg p-1 hover:bg-paper">
                    <PostThumb post={p} className="h-12 w-9 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] text-ink-2 group-hover:text-accent">{firstLine(p.caption, 80)}</div>
                      <div className="tabular text-[11.5px] text-muted">{fmtNum(p.views)} views · {fmtNum(p.engagement)} eng. · {topicLabel(p.topic)}</div>
                    </div>
                  </a>
                ))}
                {items.length === 0 && <div className="text-[12.5px] text-muted">No posts.</div>}
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

function topThemes(items: EnrichedPost[], topicLabel: (id: string) => string) {
  const counts = new Map<string, number>()
  for (const p of items) counts.set(p.topic, (counts.get(p.topic) ?? 0) + 1)
  return [...counts.entries()].sort((x, y) => y[1] - x[1]).slice(0, 2).map(([k, n]) => `${topicLabel(k)} (${n})`).join(', ')
}

function MatrixChart({ posts, medianViews, medianEng, topicLabel }: { posts: EnrichedPost[]; medianViews: number; medianEng: number; topicLabel: (id: string) => string }) {
  // log scales: views and engagement both span 3+ orders of magnitude. Engagement of 0 is drawn at 0.5.
  const pts = posts.map((p) => ({ ...p, x: p.views!, y: Math.max(p.engagement!, 0.5) }))
  const maxX = Math.max(...pts.map((p) => p.x)) * 1.5
  const minX = Math.max(1, Math.min(...pts.map((p) => p.x)) / 1.5)
  const maxY = Math.max(...pts.map((p) => p.y)) * 1.5
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h3 className="text-[14px] font-semibold text-ink">Every post on one map</h3>
        <span className="text-[11.5px] text-muted">log scales · lines = platform medians · 0 engagement on bottom edge</span>
      </div>
      <div className="h-[360px]" role="img" aria-label="Scatter of views against engagement per post, split into four quadrants at the platform medians">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 16, bottom: 24, left: 4 }}>
            <CartesianGrid />
            <ReferenceArea x1={medianViews} x2={maxX} y1={medianEng} y2={maxY} fill="#2f7a4b" fillOpacity={0.05} />
            <ReferenceArea x1={minX} x2={medianViews} y1={0.4} y2={medianEng} fill="#b0493b" fillOpacity={0.04} />
            <XAxis type="number" dataKey="x" scale="log" domain={[minX, maxX]} tickFormatter={fmtCompact} tickLine={false} axisLine={{ stroke: '#cfc8b9' }}
              label={{ value: 'Views', position: 'insideBottom', offset: -14, fontSize: 11, fill: '#7c828c' }} ticks={[100, 300, 1000, 3000, 10000, 30000].filter((t) => t >= minX && t <= maxX)} />
            <YAxis type="number" dataKey="y" scale="log" domain={[0.4, maxY]} tickFormatter={(v) => (v < 1 ? '0' : fmtCompact(v))} tickLine={false} axisLine={false} width={40}
              ticks={[0.5, 1, 3, 10, 30, 100, 300, 1000].filter((t) => t <= maxY)}
              label={{ value: 'Engagement', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#7c828c' }} />
            <ReferenceLine x={medianViews} stroke="#1b2330" strokeOpacity={0.35} />
            <ReferenceLine y={medianEng} stroke="#1b2330" strokeOpacity={0.35} />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0].payload as EnrichedPost
                return (
                  <TooltipCard
                    title={firstLine(p.caption, 70)}
                    rows={[['Views', fmtNum(p.views)], ['Engagement', fmtNum(p.engagement)], ['Eng. / 1k', fmtRate(p.engagementPer1000)], ['Topic', topicLabel(p.topic)]]}
                  />
                )
              }}
            />
            <Scatter data={pts} fill={SERIES[posts[0]?.platform ?? 'instagram']} stroke="#fff" strokeWidth={1.5} isAnimationActive={false} shape="circle" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2 px-1 text-[11px] text-muted">
        <span>↖ low reach · good engagement</span>
        <span className="text-right">good reach · good engagement ↗</span>
        <span>↙ low reach · low engagement</span>
        <span className="text-right">good reach · low engagement ↘</span>
      </div>
    </div>
  )
}
