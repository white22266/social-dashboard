import { useState } from 'react'
import type { Analysis } from '../lib/analytics'
import type { EnrichedPost } from '../lib/types'
import { fmtDate, fmtNum, fmtRate, PLATFORM_LABEL } from '../lib/format'
import { postNotes, type Line } from '../data/insights'
import PostCard from './PostCard'
import { Claim, Pill, Section, Segmented } from './ui'

type Tab = 'views' | 'engagement' | 'lowest' | 'surprise-high' | 'surprise-low'

const TABS: { value: Tab; label: string; blurb: string }[] = [
  { value: 'views', label: 'Highest views', blurb: 'The five posts with the most views across both platforms.' },
  { value: 'engagement', label: 'Highest engagement', blurb: 'Best engagement per 1,000 views among posts that reached at least their platform median. This stops a 3-view post with 1 like from topping the list.' },
  { value: 'lowest', label: 'Lowest performing', blurb: 'The weakest Instagram reels by views. TikTok zero-view videos are summarised separately below.' },
  { value: 'surprise-high', label: 'Unexpected highs', blurb: 'Posts that beat the median of their own topic on the same platform by 5× or more. TikTok is excluded because its topic medians are 0–1 views.' },
  { value: 'surprise-low', label: 'Unexpected lows', blurb: 'Posts that should have done better: proven scripts that flopped on TikTok, and big-reach posts that earned almost no response.' },
]

function autoNotes(p: EnrichedPost, a: Analysis): Line[] {
  const lines: Line[] = []
  const bench = a.benchmarksByPlatform[p.platform]
  const ratio = a.peerRatio.get(p.id)
  if (p.views !== null && bench.medianViews) {
    lines.push({ kind: 'observation', text: `${fmtNum(p.views)} views is ${fmtRate(p.views / bench.medianViews)}× the ${PLATFORM_LABEL[p.platform]} median (${fmtNum(bench.medianViews)}).` })
  }
  if (ratio !== undefined) lines.push({ kind: 'observation', text: `${fmtRate(ratio)}× the median of other ${PLATFORM_LABEL[p.platform]} posts on the same topic.` })
  return lines
}

export default function BestWorstPosts({ a, topicLabel }: { a: Analysis; topicLabel: (id: string) => string }) {
  const [tab, setTab] = useState<Tab>('views')
  const withViews = a.posts.filter((p) => p.views !== null)

  const lists: Record<Tab, EnrichedPost[]> = {
    views: [...withViews].sort((x, y) => y.views! - x.views!).slice(0, 5),
    engagement: withViews
      .filter((p) => p.engagementPer1000 !== null && p.views! >= (a.benchmarksByPlatform[p.platform].medianViews ?? 0) && p.views! >= 100 && !p.flags.includes('views_field_conflict'))
      .sort((x, y) => y.engagementPer1000! - x.engagementPer1000!)
      .slice(0, 5),
    lowest: withViews.filter((p) => p.platform === 'instagram').sort((x, y) => x.views! - y.views! || (x.engagement ?? 0) - (y.engagement ?? 0)).slice(0, 5),
    'surprise-high': withViews
      .filter((p) => (a.peerRatio.get(p.id) ?? 0) >= 5)
      .sort((x, y) => a.peerRatio.get(y.id)! - a.peerRatio.get(x.id)!)
      .slice(0, 6),
    'surprise-low': [
      ...a.crossPosts.filter((c) => (c.instagram.views ?? 0) >= 5000 && (c.tiktok.views ?? 0) <= 5).map((c) => c.tiktok).slice(0, 2),
      ...withViews
        .filter((p) => p.platform === 'instagram' && p.views! >= 2000 && p.engagementPer1000 !== null)
        .sort((x, y) => x.engagementPer1000! - y.engagementPer1000!)
        .slice(0, 3),
    ],
  }
  const current = TABS.find((t) => t.value === tab)!
  const zeroTikTok = a.posts.filter((p) => p.platform === 'tiktok' && p.views === 0)
  const zeroOnIg = Math.max(0, ...a.crossPosts.filter((c) => c.tiktok.views === 0).map((c) => c.instagram.views ?? 0))

  return (
    <Section
      id="posts"
      number="04"
      eyebrow="Best & worst content"
      title="The posts that explain the numbers"
      intro={<>Each card separates <strong className="font-semibold text-accent">what the data shows</strong> from <strong className="font-semibold text-warn">a possible explanation</strong>. Captions and metrics cannot prove why a video worked, because the video itself was not analysed.</>}
    >
      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <Segmented label="Post list" value={tab} options={TABS.map(({ value, label }) => ({ value, label }))} onChange={setTab} />
      </div>
      <p className="mt-3 mb-6 max-w-3xl text-[13.5px] text-muted">{current.blurb}</p>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {lists[tab].map((p, i) => {
          const notes = postNotes[p.id] ?? autoNotes(p, a)
          const crossOf = p.crossPostOf ? a.posts.find((x) => x.id === p.crossPostOf) : null
          return (
            <PostCard
              key={p.id}
              post={p}
              topicLabel={topicLabel(p.topic)}
              badge={<Pill tone="accent">#{i + 1}</Pill>}
            >
              {crossOf && tab === 'surprise-low' && (
                <Claim kind="observation">Same script on Instagram: {fmtNum(crossOf.views)} views, {fmtNum(crossOf.engagement)} engagements.</Claim>
              )}
              {notes.map((l, j) => <Claim key={j} kind={l.kind}>{l.text}</Claim>)}
            </PostCard>
          )
        })}
      </div>

      {tab === 'lowest' && zeroTikTok.length > 0 && (
        <div className="mt-6 rounded-xl border border-line bg-card p-5">
          <div className="flex flex-wrap items-baseline gap-3">
            <h3 className="font-serif text-xl text-ink">{zeroTikTok.length} TikTok videos reported 0 views</h3>
            <span className="text-[12.5px] text-muted">
              posted {fmtDate(zeroTikTok.map((p) => p.publishedAt!).sort()[0], { day: 'numeric', month: 'short' })}–{fmtDate(zeroTikTok.map((p) => p.publishedAt!).sort().at(-1)!)}
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-[14px] text-ink-2">
            They span {new Set(zeroTikTok.map((p) => p.topic)).size} topics
            {zeroOnIg ? <>, including a script that reached {fmtNum(zeroOnIg)} views on Instagram</> : null}. Their weakness is shared by the whole account, so ranking them against each other says nothing about the content.
          </p>
        </div>
      )}
    </Section>
  )
}
