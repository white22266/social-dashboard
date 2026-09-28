import type { Analysis } from '../lib/analytics'
import { median } from '../lib/stats'
import { fmtNum, fmtPct, fmtRate } from '../lib/format'
import StatCard from './StatCard'
import { Section } from './ui'

export default function KeyStats({ a }: { a: Analysis }) {
  const ig = a.posts.filter((p) => p.platform === 'instagram')
  const tt = a.posts.filter((p) => p.platform === 'tiktok')
  const igViews = ig.map((p) => p.views ?? 0).sort((x, y) => y - x)
  const igTotal = igViews.reduce((s, v) => s + v, 0)
  const top4 = igViews.slice(0, 4).reduce((s, v) => s + v, 0)
  const likes = ig.map((p) => p.likes ?? 0)
  const likeTotal = likes.reduce((s, v) => s + v, 0)
  const maxLikes = Math.max(0, ...likes)
  const over1k = ig.filter((p) => (p.views ?? 0) >= 1000).length
  const withViews = ig.filter((p) => p.views !== null).length
  const withComment = ig.filter((p) => (p.comments ?? 0) > 0).length

  const years = [...new Set(ig.map((p) => p.publishedAt?.slice(0, 4)).filter(Boolean))].sort() as string[]
  const [prev, last] = years.slice(-2)
  const rateFor = (y: string) => median(ig.filter((p) => p.publishedAt?.startsWith(y)).map((p) => p.engagementPer1000))

  return (
    <Section
      id="key-stats"
      number="03"
      eyebrow="Key stats"
      title="Six numbers worth remembering"
      intro="These numbers describe how concentrated, and how fragile, current performance is."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard size="lg" accent="ig" label="Instagram views from the top 4 reels" value={fmtPct(top4, igTotal)} detail={`${fmtNum(top4)} of ${fmtNum(igTotal)} views. The other ${withViews - 4} reels share the rest.`} />
        <StatCard size="lg" accent="ig" label="Instagram likes on a single post" value={fmtPct(maxLikes, likeTotal)} detail={`${fmtNum(maxLikes)} of ${fmtNum(likeTotal)} likes came from one reel.`} />
        {prev && last && (
          <StatCard
            size="lg"
            accent="ig"
            label={`Engagement / 1k views, ${last} vs ${prev}`}
            value={<>{fmtRate(rateFor(last))}<span className="text-muted text-2xl"> vs {fmtRate(rateFor(prev))}</span></>}
            detail={`Typical Instagram post. ${last} is the AI-skills period, ${prev} was lifestyle and mindset.`}
          />
        )}
        <StatCard size="lg" accent="ig" label="Instagram reels above 1,000 views" value={`${over1k} of ${withViews}`} detail={over1k ? `Breakouts happen about 1 post in ${Math.round(withViews / over1k)}; a typical reel gets ${fmtNum(a.byPlatform.instagram?.medianViews)} views.` : undefined} />
        <StatCard size="lg" accent="ig" label="Instagram posts with any comment" value={`${withComment} of ${ig.length}`} detail="Comments are rare, even on posts that ask for them." />
        <StatCard size="lg" accent="tt" label="TikTok videos with zero views" value={`${a.byPlatform.tiktok?.zeroViewPosts ?? 0} of ${tt.length}`} detail={`Only ${tt.filter((p) => (p.views ?? 0) >= 100).length} TikTok videos passed 100 views.`} />
      </div>
    </Section>
  )
}
