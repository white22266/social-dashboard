import { useState } from 'react'
import type { Analysis } from '../lib/analytics'
import type { Category, Platform } from '../lib/types'
import { firstLine, fmtNum, fmtRate } from '../lib/format'
import { hookNotes } from '../data/insights'
import { ChartFrame, HBarChart, LowSampleLegend } from './charts'
import { SERIES } from '../lib/palette'
import { Claim, EvidenceBadge, Section, Segmented } from './ui'

export default function HookAnalysis({ a, hooks }: { a: Analysis; hooks: Category[] }) {
  const [platform, setPlatform] = useState<Platform>('instagram')
  const rows = [...(a.hooksByPlatform[platform] ?? [])].sort((x, y) => (y.medianViews ?? -1) - (x.medianViews ?? -1))
  const label = (id: string) => hooks.find((h) => h.id === id)?.label ?? id
  const color = SERIES[platform]

  return (
    <Section
      id="hooks"
      number="08"
      eyebrow="Hook analysis"
      title="How the opening line changes the outcome"
      intro="Each caption's first line was classified into one hook style. Some hooks buy reach, others buy response, and few do both."
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Segmented label="Platform" value={platform} onChange={setPlatform} options={[{ value: 'instagram', label: 'Instagram' }, { value: 'tiktok', label: 'TikTok' }]} />
        <span className="text-[12px] text-muted"><LowSampleLegend /></span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartFrame title="Reach by hook: median views">
          <HBarChart color={color} valueLabel="Median views" format={(v) => fmtNum(v)} data={rows.map((r) => ({ label: label(r.key), value: r.medianViews, n: r.n, lowSample: r.lowSample }))} />
        </ChartFrame>
        <ChartFrame title="Response by hook: engagement per 1,000 views" subtitle="Same order as the reach chart">
          <HBarChart color={color} valueLabel="Eng. / 1,000 views" format={(v) => fmtRate(v)} data={rows.map((r) => ({ label: label(r.key), value: r.medianPer1000, n: r.n, lowSample: r.lowSample }))} />
        </ChartFrame>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-card">
        <table className="tabular w-full min-w-[760px] text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-[11px] tracking-wide text-muted uppercase">
              <th className="px-4 py-3 font-medium">Hook type</th>
              <th className="px-3 py-3 text-right font-medium">Posts</th>
              <th className="px-3 py-3 text-right font-medium">Median views</th>
              <th className="px-3 py-3 text-right font-medium">Median eng.</th>
              <th className="px-3 py-3 text-right font-medium">Eng. / 1k</th>
              <th className="px-4 py-3 font-medium">Best example</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-line align-top last:border-0">
                <td className="px-4 py-3">
                  <div className="font-semibold text-ink">{label(r.key)}</div>
                  <div className="text-[12px] text-muted">{hooks.find((h) => h.id === r.key)?.description}</div>
                </td>
                <td className="px-3 py-3 text-right"><EvidenceBadge n={r.n} /></td>
                <td className="px-3 py-3 text-right font-semibold text-ink">{fmtNum(r.medianViews)}</td>
                <td className="px-3 py-3 text-right text-ink-2">{fmtNum(r.medianEngagement, 1)}</td>
                <td className="px-3 py-3 text-right text-ink-2">{fmtRate(r.medianPer1000)}</td>
                <td className="max-w-[320px] px-4 py-3">
                  {r.best && (
                    <a href={r.best.url ?? undefined} target="_blank" rel="noreferrer" className="group block">
                      <span className="font-serif text-[14.5px] leading-snug text-ink group-hover:text-accent">“{firstLine(r.best.caption, 90)}”</span>
                      <span className="block text-[11.5px] text-muted">{fmtNum(r.best.views)} views · {fmtNum(r.best.engagement)} eng.</span>
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {platform === 'instagram' && (
        <div className="mt-8 grid grid-cols-1 max-w-4xl gap-3">
          {hookNotes.map((l, i) => <Claim key={i} kind={l.kind}>{l.text}</Claim>)}
        </div>
      )}
    </Section>
  )
}
