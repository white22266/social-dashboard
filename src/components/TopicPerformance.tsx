import { useState } from 'react'
import type { Analysis, GroupRow } from '../lib/analytics'
import type { Category, EnrichedPost } from '../lib/types'
import { firstLine, fmtNum, fmtRate } from '../lib/format'
import { topicNotes } from '../data/insights'
import { ChartFrame, HBarChart, LowSampleLegend } from './charts'
import { SERIES } from '../lib/palette'
import { EvidenceBadge, Section, Segmented } from './ui'

type View = 'instagram' | 'tiktok' | 'all'

export default function TopicPerformance({ a, topics }: { a: Analysis; topics: Category[] }) {
  const [view, setView] = useState<View>('instagram')
  const rows: GroupRow[] = view === 'all' ? a.topics : a.topicsByPlatform[view] ?? []
  const label = (id: string) => topics.find((t) => t.id === id)?.label ?? id
  const byViews = [...rows].sort((x, y) => (y.medianViews ?? -1) - (x.medianViews ?? -1))
  const color = view === 'tiktok' ? SERIES.tiktok : view === 'instagram' ? SERIES.instagram : '#33557d'

  return (
    <Section
      id="topics"
      number="05"
      eyebrow="Content topics"
      title="What the account talks about, and what lands"
      intro={<>Every post was given one primary topic after reading its caption. The {topics.length} topics came from the content itself, not a template. Instagram is the default view because TikTok medians sit at 0–1 views for every topic.</>}
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Segmented label="Platform" value={view} onChange={setView} options={[{ value: 'instagram', label: 'Instagram' }, { value: 'tiktok', label: 'TikTok' }, { value: 'all', label: 'Both' }]} />
        <span className="text-[12px] text-muted"><LowSampleLegend /></span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartFrame title="Reach: median views per post" subtitle="A typical post in each topic">
          <HBarChart
            color={color}
            valueLabel="Median views"
            format={(v) => fmtNum(v)}
            data={byViews.map((r) => ({ label: label(r.key), value: r.medianViews, n: r.n, lowSample: r.lowSample }))}
          />
        </ChartFrame>
        <ChartFrame title="Response: engagement per 1,000 views" subtitle="Median of per-post rates, same topic order">
          <HBarChart
            color={color}
            valueLabel="Eng. / 1,000 views"
            format={(v) => fmtRate(v)}
            data={byViews.map((r) => ({ label: label(r.key), value: r.medianPer1000, n: r.n, lowSample: r.lowSample }))}
          />
        </ChartFrame>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-card">
        <table className="tabular w-full min-w-[880px] text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-[11px] tracking-wide text-muted uppercase">
              <th className="px-4 py-3 font-medium">Topic</th>
              <th className="px-3 py-3 text-right font-medium">Posts</th>
              <th className="px-3 py-3 text-right font-medium">Median views</th>
              <th className="px-3 py-3 text-right font-medium">Avg. engagement</th>
              <th className="px-3 py-3 text-right font-medium">Eng. / 1k</th>
              <th className="px-4 py-3 font-medium">Best post</th>
              <th className="px-4 py-3 font-medium">Weakest post</th>
            </tr>
          </thead>
          <tbody>
            {byViews.map((r) => (
              <tr key={r.key} className="border-b border-line align-top last:border-0">
                <td className="max-w-[300px] px-4 py-3">
                  <div className="font-semibold text-ink">{label(r.key)}</div>
                  {view !== 'tiktok' && topicNotes[r.key] && <div className="mt-1 text-[12px] leading-snug text-ink-2">{topicNotes[r.key]}</div>}
                </td>
                <td className="px-3 py-3 text-right"><EvidenceBadge n={r.n} /></td>
                <td className="px-3 py-3 text-right font-semibold text-ink">{fmtNum(r.medianViews)}</td>
                <td className="px-3 py-3 text-right text-ink-2">{fmtNum(r.avgEngagement, 1)}</td>
                <td className="px-3 py-3 text-right text-ink-2">{fmtRate(r.medianPer1000)}</td>
                <td className="max-w-[220px] px-4 py-3"><MiniPost post={r.best} /></td>
                <td className="max-w-[220px] px-4 py-3"><MiniPost post={r.weakest} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12px] text-muted">
        Best and weakest are ranked by views, with engagement breaking ties. Posts without a view count (1 image and 1 carousel) are not ranked. Topic assignments are in <code className="text-ink-2">src/data/annotations.json</code> and can be edited.
      </p>
    </Section>
  )
}

function MiniPost({ post }: { post: EnrichedPost | null }) {
  if (!post) return <span className="text-muted">—</span>
  return (
    <a href={post.url ?? undefined} target="_blank" rel="noreferrer" className="group block">
      <span className="line-clamp-2 text-[12.5px] leading-snug text-ink-2 group-hover:text-accent">{firstLine(post.caption, 70)}</span>
      <span className="text-[11.5px] text-muted">{fmtNum(post.views)} views · {fmtNum(post.engagement)} eng.</span>
    </a>
  )
}
