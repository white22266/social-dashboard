import type { ReactNode } from 'react'
import type { Analysis, GroupRow } from '../lib/analytics'
import type { Dataset, EnrichedPost, Platform } from '../lib/types'
import { firstLine, fmtNum, fmtRate, NA } from '../lib/format'
import { platformNarrative } from '../data/insights'
import { Claim, Section } from './ui'
import { PostThumb } from './PostCard'

function strongestTheme(rows: GroupRow[]): GroupRow | null {
  const eligible = rows.filter((r) => r.n >= 3 && r.medianViews !== null)
  // median first; average breaks ties (TikTok medians are all 0–1)
  return eligible.sort((x, y) => (y.medianViews ?? 0) - (x.medianViews ?? 0) || (y.avgViews ?? 0) - (x.avgViews ?? 0))[0] ?? null
}

function topPost(posts: EnrichedPost[], platform: Platform) {
  return posts.filter((p) => p.platform === platform && p.views !== null).sort((x, y) => y.views! - x.views!)[0] ?? null
}

export default function PlatformComparison({ a, data, topicLabel }: { a: Analysis; data: Dataset; topicLabel: (id: string) => string }) {
  const ig = a.byPlatform.instagram
  const tt = a.byPlatform.tiktok
  const fi = a.frequencyByPlatform.instagram
  const ft = a.frequencyByPlatform.tiktok
  if (!ig || !tt) return null

  const themeIg = strongestTheme(a.topicsByPlatform.instagram)
  const themeTt = strongestTheme(a.topicsByPlatform.tiktok)
  const topIg = topPost(a.posts, 'instagram')
  const topTt = topPost(a.posts, 'tiktok')

  const rows: { label: string; ig: ReactNode; tt: ReactNode; igSub?: ReactNode; ttSub?: ReactNode; big?: boolean }[] = [
    { label: 'Median views', ig: fmtNum(ig.medianViews), tt: fmtNum(tt.medianViews), big: true, igSub: `${ig.postsWithViews} reels with views`, ttSub: `${tt.zeroViewPosts} of ${tt.posts} videos at 0 views` },
    { label: 'Engagement / 1,000 views', ig: fmtRate(ig.pooledPer1000), tt: fmtRate(tt.pooledPer1000), big: true, igSub: `typical post ${fmtRate(ig.medianPer1000)} · likes + comments`, ttSub: `typical post ${fmtRate(tt.medianPer1000)} · on ${fmtNum(tt.totalViews)} views total` },
    { label: 'Posting frequency', ig: `${fmtRate(fi.postsPerWeek)} / week`, tt: `${tt.posts} in ${fmtRate(ft.spanDays)} days`, big: true, igSub: `${fi.activeWeeks} active weeks · longest gap ${fmtNum(fi.longestGapDays)} days`, ttSub: `nothing in the ${fmtNum(ft.daysSinceLastPost)} days since` },
    { label: 'Posts analysed', ig: fmtNum(ig.posts), tt: fmtNum(tt.posts), igSub: `${data.meta.accounts.instagram.followers ? fmtNum(data.meta.accounts.instagram.followers) + ' followers' : ''}`, ttSub: `${data.meta.accounts.tiktok.followers !== null ? fmtNum(data.meta.accounts.tiktok.followers) + ' followers' : ''}` },
    { label: 'Total views', ig: fmtNum(ig.totalViews), tt: fmtNum(tt.totalViews) },
    { label: 'Average views', ig: fmtNum(ig.avgViews), tt: fmtNum(tt.avgViews, 1) },
    { label: 'Median likes', ig: fmtNum(ig.medianLikes, 1), tt: fmtNum(tt.medianLikes, 1) },
    { label: 'Median comments', ig: fmtNum(ig.medianComments, 1), tt: fmtNum(tt.medianComments, 1) },
    { label: 'Median shares', ig: ig.sharesReported ? fmtNum(ig.medianShares, 1) : <span className="text-muted">not public</span>, tt: tt.sharesReported ? fmtNum(tt.medianShares, 1) : NA },
    {
      label: 'Strongest theme',
      ig: themeIg ? topicLabel(themeIg.key) : NA,
      tt: themeTt ? topicLabel(themeTt.key) : NA,
      igSub: themeIg && `median ${fmtNum(themeIg.medianViews)} · avg ${fmtNum(themeIg.avgViews)} views · n=${themeIg.n}`,
      ttSub: themeTt && `median ${fmtNum(themeTt.medianViews)} · avg ${fmtNum(themeTt.avgViews)} views · n=${themeTt.n}`,
    },
  ]

  return (
    <Section
      id="platforms"
      number="02"
      eyebrow="Instagram vs TikTok"
      title="Two channels at different stages"
      intro="Instagram is producing reach with the occasional breakout. TikTok has not started distributing yet. The same scripts show the gap most clearly."
    >
      <div className="overflow-hidden rounded-xl border border-line bg-card">
        <div className="grid grid-cols-[1fr_auto_1fr] border-b border-line">
          <div className="border-t-[3px] border-ig px-4 py-4 text-right sm:px-8">
            <div className="font-serif text-2xl font-medium text-ink sm:text-3xl">Instagram</div>
            <div className="text-[12px] text-muted">@{data.meta.accounts.instagram.handle}</div>
          </div>
          <div className="w-px bg-line" />
          <div className="border-t-[3px] border-tt px-4 py-4 sm:px-8">
            <div className="font-serif text-2xl font-medium text-ink sm:text-3xl">TikTok</div>
            <div className="text-[12px] text-muted">@{data.meta.accounts.tiktok.handle}</div>
          </div>
        </div>
        {rows.map((r) => (
          <div key={r.label} className="border-b border-line last:border-0">
            <div className="pt-3 text-center text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">{r.label}</div>
            <div className="grid grid-cols-[1fr_auto_1fr] pb-3">
              <div className="px-4 text-right sm:px-8">
                <div className={`tabular text-ink ${r.big ? 'font-serif text-[2rem] leading-tight sm:text-[2.6rem]' : 'text-[17px] font-semibold'}`}>{r.ig}</div>
                {r.igSub && <div className="text-[12px] text-muted">{r.igSub}</div>}
              </div>
              <div className="w-px bg-line" />
              <div className="px-4 sm:px-8">
                <div className={`tabular text-ink ${r.big ? 'font-serif text-[2rem] leading-tight sm:text-[2.6rem]' : 'text-[17px] font-semibold'}`}>{r.tt}</div>
                {r.ttSub && <div className="text-[12px] text-muted">{r.ttSub}</div>}
              </div>
            </div>
          </div>
        ))}
        <div className="border-t border-line">
          <div className="pt-3 text-center text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">Highest-viewed post</div>
          <div className="grid grid-cols-[1fr_auto_1fr] pb-4">
            <TopPost post={topIg} align="right" />
            <div className="w-px bg-line" />
            <TopPost post={topTt} align="left" />
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {([['Instagram', platformNarrative.instagram], ['TikTok', platformNarrative.tiktok], ['What the difference means', platformNarrative.differences]] as const).map(([title, lines]) => (
          <div key={title}>
            <h3 className="mb-3 font-serif text-xl text-ink">{title}</h3>
            <div className="space-y-3">
              {lines.map((l, i) => <Claim key={i} kind={l.kind}>{l.text}</Claim>)}
            </div>
          </div>
        ))}
      </div>

      {a.crossPosts.length > 0 && (
        <div className="mt-12">
          <h3 className="font-serif text-2xl text-ink">Same script, two platforms</h3>
          <p className="mt-1 max-w-3xl text-[14px] text-ink-2">
            {a.crossPosts.length} TikTok videos reuse an Instagram caption. With the content held constant, the gap between the two platforms is plain.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-card">
            <table className="tabular w-full min-w-[560px] text-[13px]">
              <thead>
                <tr className="border-b border-line text-left text-[11px] tracking-wide text-muted uppercase">
                  <th className="px-4 py-2.5 font-medium">Script (opening line)</th>
                  <th className="px-4 py-2.5 text-right font-medium text-ig">IG views</th>
                  <th className="px-4 py-2.5 text-right font-medium text-ig">IG eng.</th>
                  <th className="px-4 py-2.5 text-right font-medium text-tt">TT views</th>
                  <th className="px-4 py-2.5 text-right font-medium text-tt">TT eng.</th>
                </tr>
              </thead>
              <tbody>
                {a.crossPosts.map((c) => (
                  <tr key={c.tiktok.id} className="border-b border-line last:border-0">
                    <td className="max-w-[420px] truncate px-4 py-2 text-ink-2">{firstLine(c.instagram.caption, 80)}</td>
                    <td className="px-4 py-2 text-right font-semibold text-ink">{fmtNum(c.instagram.views)}</td>
                    <td className="px-4 py-2 text-right text-ink-2">{fmtNum(c.instagram.engagement)}</td>
                    <td className="px-4 py-2 text-right font-semibold text-ink">{fmtNum(c.tiktok.views)}</td>
                    <td className="px-4 py-2 text-right text-ink-2">{fmtNum(c.tiktok.engagement)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Section>
  )
}

function TopPost({ post, align }: { post: EnrichedPost | null; align: 'left' | 'right' }) {
  if (!post) return <div className="px-4 text-muted sm:px-8">{NA}</div>
  return (
    <a href={post.url ?? undefined} target="_blank" rel="noreferrer" className={`group flex gap-3 px-4 sm:px-8 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      <PostThumb post={post} className="h-20 w-[60px] shrink-0" />
      <div className="min-w-0">
        <div className="tabular font-serif text-2xl text-ink">{fmtNum(post.views)} <span className="font-sans text-[12px] text-muted">views</span></div>
        <p className="line-clamp-2 text-[12.5px] text-ink-2 group-hover:text-accent">{firstLine(post.caption, 90)}</p>
      </div>
    </a>
  )
}
