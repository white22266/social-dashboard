import type { Analysis } from '../lib/analytics'
import type { Dataset, Platform } from '../lib/types'
import { fmtDate, fmtNum, fmtRate, PLATFORM_LABEL } from '../lib/format'
import { executiveSummary } from '../data/insights'
import StatCard from './StatCard'
import { Section } from './ui'

const FIELDS: { key: string; label: string; get: (p: Dataset['posts'][number]) => unknown }[] = [
  { key: 'url', label: 'Post URL', get: (p) => p.url },
  { key: 'caption', label: 'Caption', get: (p) => p.caption || null },
  { key: 'publishedAt', label: 'Published date', get: (p) => p.publishedAt },
  { key: 'contentType', label: 'Content type', get: (p) => p.contentType },
  { key: 'views', label: 'Views', get: (p) => p.views },
  { key: 'likes', label: 'Likes', get: (p) => p.likes },
  { key: 'comments', label: 'Comments', get: (p) => p.comments },
  { key: 'shares', label: 'Shares', get: (p) => p.shares },
  { key: 'durationSec', label: 'Duration', get: (p) => p.durationSec },
  { key: 'thumbnail', label: 'Thumbnail', get: (p) => p.thumbnail },
]

export default function Overview({ a, data }: { a: Analysis; data: Dataset }) {
  const o = a.overall
  const platforms = Object.keys(a.byPlatform) as Platform[]
  return (
    <Section
      id="overview"
      number="01"
      eyebrow="Overview"
      title={`What ${o.posts} posts say about the content engine`}
      intro={<>Every public post we could retrieve from both accounts, normalised into one dataset. Medians describe a typical post; totals and averages are shown for context but are pulled up by a few viral reels.</>}
    >
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Posts analysed" value={fmtNum(o.posts)} detail={platforms.map((p) => `${a.byPlatform[p].posts} ${PLATFORM_LABEL[p]}`).join(' · ')} />
        <StatCard label="Total views" value={fmtNum(o.totalViews)} detail={`${o.postsWithViews} posts have a public view count`} />
        <StatCard label="Median views" value={fmtNum(o.medianViews)} detail={`Average ${fmtNum(o.avgViews)}: skewed by a few viral reels`} />
        <StatCard label="Total engagement" value={fmtNum(o.totalEngagement)} detail={`${fmtNum(o.totalLikes)} likes · ${fmtNum(o.totalComments)} comments · ${fmtNum(o.totalShares)} shares`} />
        <StatCard label="Engagement / 1,000 views" value={fmtRate(o.pooledPer1000)} detail={`All posts pooled. Typical post: ${fmtRate(o.medianPer1000)}`} />
        <StatCard
          label="Date range"
          value={<span className="text-[1.45rem] leading-tight">{fmtDate(a.frequencyOverall.firstPost, { month: 'short', year: 'numeric' })} – {fmtDate(a.frequencyOverall.lastPost, { month: 'short', year: 'numeric' })}</span>}
          detail={`${fmtDate(a.frequencyOverall.firstPost)} to ${fmtDate(a.frequencyOverall.lastPost)}`}
        />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <div className="eyebrow mb-4">The short version</div>
          <ol className="space-y-4">
            {executiveSummary.map((s, i) => (
              <li key={i} className="flex gap-4">
                <span className="font-serif text-2xl leading-none text-accent/70">{i + 1}</span>
                <p className="font-serif text-[19px] leading-snug text-ink">{s}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-xl border border-line bg-card p-5">
          <div className="flex items-baseline justify-between">
            <div className="eyebrow">Data completeness</div>
            <div className="text-[12px] text-muted">collected {fmtDate(data.meta.collectedAt)}</div>
          </div>
          <table className="tabular mt-3 w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="py-1.5 font-medium">Field</th>
                {platforms.map((p) => (
                  <th key={p} className="py-1.5 text-right font-medium">{PLATFORM_LABEL[p]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line">
                <td className="py-1.5 text-ink-2">Posts retrieved</td>
                {platforms.map((p) => {
                  const acc = data.meta.accounts[p]
                  return (
                    <td key={p} className="py-1.5 text-right text-ink">
                      {acc.postsCollected}{acc.postsOnProfile !== null && <span className="text-muted"> of {acc.postsOnProfile}</span>}
                    </td>
                  )
                })}
              </tr>
              {FIELDS.map((f) => (
                <tr key={f.key} className="border-b border-line last:border-0">
                  <td className="py-1.5 text-ink-2">{f.label}</td>
                  {platforms.map((p) => {
                    const items = data.posts.filter((x) => x.platform === p)
                    const have = items.filter((x) => f.get(x) !== null && f.get(x) !== undefined).length
                    const tone = have === items.length ? 'text-good' : have === 0 ? 'text-bad' : 'text-warn'
                    return (
                      <td key={p} className={`py-1.5 text-right ${tone}`}>
                        {have === items.length ? 'All' : have === 0 ? 'None' : `${have}/${items.length}`}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="mt-3 space-y-1 text-[12px] leading-snug text-muted">
            <li>Instagram share counts are not public, so they are left empty (null) rather than 0. Instagram engagement = likes + comments.</li>
            <li>Instagram views exist for Reels only. The 1 image and 1 carousel post have no view count.</li>
            <li>{a.byPlatform.tiktok?.zeroViewPosts ?? 0} TikTok videos report exactly 0 views. These are reported values, kept as 0.</li>
            {data.meta.accounts.instagram.postsOnProfile !== null && data.meta.accounts.instagram.postsOnProfile > data.meta.accounts.instagram.postsCollected && (
              <li>
                {data.meta.accounts.instagram.postsOnProfile - data.meta.accounts.instagram.postsCollected} Instagram posts listed on the profile were not returned by either scraper, most likely archived or restricted posts.
              </li>
            )}
          </ul>
        </div>
      </div>
    </Section>
  )
}
