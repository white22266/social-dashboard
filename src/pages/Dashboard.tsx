import { useMemo } from 'react'
import rawData from '../data/social-data.json'
import rawNotes from '../data/annotations.json'
import { BASED_ON_COLLECTED_AT, GENERATED_BY, headline } from '../data/insights'
import { analyze } from '../lib/analytics'
import type { Annotations, Dataset } from '../lib/types'
import { fmtDate } from '../lib/format'
import Overview from '../components/Overview'
import PlatformComparison from '../components/PlatformComparison'
import KeyStats from '../components/KeyStats'
import BestWorstPosts from '../components/BestWorstPosts'
import TopicPerformance from '../components/TopicPerformance'
import ReachEngagementMatrix from '../components/ReachEngagementMatrix'
import ContentPatterns from '../components/ContentPatterns'
import HookAnalysis from '../components/HookAnalysis'
import Recommendations from '../components/Recommendations'
import RefreshControl from '../components/RefreshControl'

const data = rawData as Dataset
const notes = rawNotes as Annotations

const NAV = [
  ['overview', 'Overview'],
  ['platforms', 'IG vs TikTok'],
  ['key-stats', 'Key stats'],
  ['posts', 'Best & worst'],
  ['topics', 'Topics'],
  ['matrix', 'Reach × engagement'],
  ['patterns', 'Patterns'],
  ['hooks', 'Hooks'],
  ['next', 'What next'],
]

export default function Dashboard() {
  const a = useMemo(() => analyze(data, notes), [])
  const topicLabel = (id: string) => notes.topics.find((t) => t.id === id)?.label ?? id
  const stale = data.meta.collectedAt.slice(0, 10) !== BASED_ON_COLLECTED_AT
  const autoCount = a.posts.filter((p) => p.autoClassified).length

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] items-center gap-6 px-4 sm:px-8">
          <a href="#top" className="shrink-0 py-3 font-serif text-[17px] font-medium text-ink">AINCHORS · Content Review</a>
          <div className="-mr-4 flex gap-1 overflow-x-auto py-2 pr-4 sm:mr-0 sm:pr-0">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="shrink-0 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium whitespace-nowrap text-ink-2 hover:bg-paper-deep hover:text-ink">
                {label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <main id="top" className="mx-auto max-w-[1240px] px-4 sm:px-8">
        <header className="pt-14 pb-14 sm:pt-20 sm:pb-20">
          <div className="eyebrow">Content performance review · Instagram & TikTok</div>
          <h1 className="mt-5 max-w-4xl font-serif text-[2.7rem] leading-[1.05] font-medium tracking-tight text-ink sm:text-[4.2rem]">
            {headline.title}
          </h1>
          <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-ink-2">
            An evidence-first review of every public post from @{data.meta.accounts.instagram.handle}: what performs, what doesn't, and what to test next.
          </p>
          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-3 text-[13px]">
            <div><dt className="text-muted">Collected</dt><dd className="font-medium text-ink">{fmtDate(data.meta.collectedAt)}</dd></div>
            <div><dt className="text-muted">Source</dt><dd className="font-medium text-ink">Apify public scrapers</dd></div>
            <div><dt className="text-muted">Posts</dt><dd className="font-medium text-ink">{a.overall.posts} ({a.byPlatform.instagram?.posts ?? 0} IG · {a.byPlatform.tiktok?.posts ?? 0} TikTok)</dd></div>
            <div><dt className="text-muted">Time zone</dt><dd className="font-medium text-ink">Kuala Lumpur (UTC+8)</dd></div>
            <div><dt className="text-muted">AI analysis</dt><dd className="font-medium text-ink">{GENERATED_BY} · {fmtDate(BASED_ON_COLLECTED_AT)}</dd></div>
          </dl>
          <div className="mt-7 flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2">
            <RefreshControl collectedAt={data.meta.collectedAt} />
          </div>
          {(stale || autoCount > 0) && (
            <div className="mt-8 max-w-3xl rounded-xl border border-warn/40 bg-warn-soft px-5 py-4 text-[13.5px] text-ink">
              {stale && <p><strong>The AI commentary is from an earlier refresh.</strong> All numbers and charts are current ({fmtDate(data.meta.collectedAt)}), but the written analysis still describes the {fmtDate(BASED_ON_COLLECTED_AT)} data because the last AI rewrite did not pass the fact check.</p>}
              {autoCount > 0 && <p className={stale ? 'mt-2' : ''}>{autoCount} new posts were classified by keyword rules. Check their topics and hooks in <code>src/data/annotations.json</code>.</p>}
            </div>
          )}
        </header>

        <Overview a={a} data={data} />
        <PlatformComparison a={a} data={data} topicLabel={topicLabel} />
        <KeyStats a={a} />
        <BestWorstPosts a={a} topicLabel={topicLabel} />
        <TopicPerformance a={a} topics={notes.topics} />
        <ReachEngagementMatrix a={a} topicLabel={topicLabel} />
        <ContentPatterns a={a} topicLabel={topicLabel} />
        <HookAnalysis a={a} hooks={notes.hooks} />
        <Recommendations />

        <footer className="border-t border-line-strong py-12 text-[13px] text-ink-2">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div>
              <div className="eyebrow mb-3">Definitions</div>
              <ul className="space-y-1.5">
                <li><strong className="text-ink">Engagement</strong> = likes + comments + shares, counting only the values each platform reports.</li>
                <li><strong className="text-ink">Engagement / 1,000</strong> = engagement ÷ views × 1,000. "Pooled" uses totals; "typical" is the median of per-post rates.</li>
                <li><strong className="text-ink">Views</strong>: Instagram Reel play count, and TikTok play count.</li>
              </ul>
            </div>
            <div>
              <div className="eyebrow mb-3">Data rules</div>
              <ul className="space-y-1.5">
                {Object.entries(data.meta.fieldNotes).map(([k, v]) => <li key={k}><strong className="text-ink capitalize">{k}</strong>: {v}</li>)}
                <li>Duplicates removed by platform + post id ({data.meta.duplicatesRemoved} found).</li>
              </ul>
            </div>
            <div>
              <div className="eyebrow mb-3">Refreshing the data</div>
              <p>Re-run the Apify scrapers into <code>data-raw/</code>, then run <code>python3 scripts/normalize.py</code>. Charts and numbers update automatically; the written commentary in <code>src/data/insights.ts</code> does not.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
