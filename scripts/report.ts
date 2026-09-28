/** Print the calculated metrics to the terminal: npx tsx scripts/report.ts */
import data from '../src/data/social-data.json' with { type: 'json' }
import notes from '../src/data/annotations.json' with { type: 'json' }
import { analyze, type GroupRow } from '../src/lib/analytics'
import type { Annotations, Dataset, EnrichedPost } from '../src/lib/types'

const a = analyze(data as Dataset, notes as Annotations)
const r = (v: number | null, d = 1) => (v === null ? 'null' : Number(v.toFixed(d)).toLocaleString('en-US'))
const short = (p: EnrichedPost | null) =>
  p ? `${p.id} v=${r(p.views, 0)} e=${r(p.engagement, 0)} "${p.caption.split('\n')[0].slice(0, 50)}"` : '-'

console.log('\n=== OVERALL'); console.table(a.overall)
console.log('=== BY PLATFORM'); console.table(a.byPlatform)
console.log('=== FREQUENCY'); console.table({ overall: a.frequencyOverall, ...a.frequencyByPlatform })
console.log('=== BENCHMARKS'); console.table(a.benchmarksByPlatform)

const table = (title: string, rows: GroupRow[]) => {
  console.log(`=== ${title}`)
  console.table(rows.sort((x, y) => (y.medianViews ?? -1) - (x.medianViews ?? -1)).map((g) => ({
    key: g.key, n: g.n, low: g.lowSample ? '*' : '', medV: r(g.medianViews), avgV: r(g.avgViews, 0),
    medE: r(g.medianEngagement), avgE: r(g.avgEngagement), pooled1k: r(g.pooledPer1000), med1k: r(g.medianPer1000),
    ig: g.platforms.instagram ?? 0, tt: g.platforms.tiktok ?? 0,
  })))
}
table('TOPICS (all)', a.topics)
for (const [pl, rows] of Object.entries(a.topicsByPlatform)) table(`TOPICS ${pl}`, rows)
for (const g of a.topicsByPlatform.instagram) console.log(`  IG ${g.key}\n    best: ${short(g.best)}\n    weak: ${short(g.weakest)}`)
table('HOOKS (all)', a.hooks)
for (const [pl, rows] of Object.entries(a.hooksByPlatform)) table(`HOOKS ${pl}`, rows)
for (const [pl, rows] of Object.entries(a.quadrants)) table(`QUADRANTS ${pl}`, rows)
for (const [pl, rows] of Object.entries(a.days)) table(`DAYS ${pl}`, rows)
for (const [pl, rows] of Object.entries(a.times)) table(`TIMES ${pl}`, rows)
for (const [pl, rows] of Object.entries(a.durations)) table(`DURATION ${pl}`, rows)

console.log('=== CROSS-POSTS (same caption on both platforms)')
for (const c of a.crossPosts) console.log(`  IG ${r(c.instagram.views, 0).padStart(7)} v / ${r(c.instagram.engagement, 0).padStart(5)} e  |  TT ${r(c.tiktok.views, 0).padStart(4)} v / ${r(c.tiktok.engagement, 0)} e  | ${c.instagram.caption.split('\n')[0].slice(0, 60)}`)

console.log('=== PEER RATIO (views vs same platform+topic median)')
const ranked = a.posts.filter((p) => a.peerRatio.has(p.id)).sort((x, y) => a.peerRatio.get(y.id)! - a.peerRatio.get(x.id)!)
for (const p of [...ranked.slice(0, 8), ...ranked.slice(-5)]) console.log(`  ${r(a.peerRatio.get(p.id)!, 2).padStart(6)}x ${p.topic.padEnd(18)} ${short(p)}`)

console.log('=== TOP 8 BY VIEWS'); for (const p of [...a.posts].sort((x, y) => (y.views ?? -1) - (x.views ?? -1)).slice(0, 8)) console.log('  ' + short(p), p.topic, p.hook, 'per1k=' + r(p.engagementPer1000))
console.log('=== TOP 8 BY ENG/1000 (views >= platform median)')
for (const p of a.posts.filter((p) => p.views !== null && p.views >= (a.benchmarksByPlatform[p.platform].medianViews ?? 0)).sort((x, y) => (y.engagementPer1000 ?? -1) - (x.engagementPer1000 ?? -1)).slice(0, 8))
  console.log('  ' + short(p), p.platform, 'per1k=' + r(p.engagementPer1000), p.topic)
console.log('=== BOTTOM 8 IG BY VIEWS'); for (const p of a.posts.filter((p) => p.platform === 'instagram' && p.views !== null).sort((x, y) => x.views! - y.views!).slice(0, 8)) console.log('  ' + short(p), p.topic, p.hook, 'dur=' + r(p.durationSec, 0))
