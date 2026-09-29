/**
 * Emit every computed metric as JSON. This is the only material the AI commentary may use,
 * and scripts/ai_refresh.py rejects commentary containing numbers that are not in this file.
 * Usage: npx tsx scripts/facts.ts > facts.json
 */
import data from '../src/data/social-data.json' with { type: 'json' }
import notes from '../src/data/annotations.json' with { type: 'json' }
import { analyze, DAY_LABELS, durationBucketOf, groupBy, timeBucketOf, type GroupRow } from '../src/lib/analytics'
import { median } from '../src/lib/stats'
import type { Annotations, Dataset, EnrichedPost, Platform } from '../src/lib/types'

const ds = data as Dataset
const ann = notes as Annotations
const a = analyze(ds, ann)
const r1 = (v: number | null | undefined) => (v === null || v === undefined ? null : Math.round(v * 10) / 10)
const label = (list: { id: string; label: string }[], id: string) => list.find((x) => x.id === id)?.label ?? id
const firstLine = (c: string) => (c.trim().split('\n').find((l) => l.trim()) ?? '').slice(0, 140)

const postRef = (p: EnrichedPost | null) =>
  p && { id: p.id, platform: p.platform, views: p.views, engagement: p.engagement, per1000: r1(p.engagementPer1000), opening: firstLine(p.caption) }

const rows = (list: GroupRow[], labels: { id: string; label: string }[] | null) =>
  list.map((g) => ({
    key: g.key,
    label: labels ? label(labels, g.key) : g.key,
    posts: g.n,
    lowSample: g.lowSample,
    medianViews: r1(g.medianViews),
    avgViews: r1(g.avgViews),
    medianEngagement: r1(g.medianEngagement),
    avgEngagement: r1(g.avgEngagement),
    medianPer1000: r1(g.medianPer1000),
    pooledPer1000: r1(g.pooledPer1000),
    best: postRef(g.best),
    weakest: postRef(g.weakest),
  }))

const round = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'number' ? r1(v) : v]))

const platforms = Object.keys(a.byPlatform) as Platform[]
const per = <T,>(fn: (pl: Platform, items: EnrichedPost[]) => T) =>
  Object.fromEntries(platforms.map((pl) => [pl, fn(pl, a.posts.filter((p) => p.platform === pl))]))

// Instagram-specific derived facts used by the commentary
const ig = a.posts.filter((p) => p.platform === 'instagram')
const igViews = ig.map((p) => p.views ?? 0).sort((x, y) => y - x)
const igTotal = igViews.reduce((s, v) => s + v, 0)
const likes = ig.map((p) => p.likes ?? 0)
const likeTotal = likes.reduce((s, v) => s + v, 0)
const years = [...new Set(ig.map((p) => p.publishedAt?.slice(0, 4)).filter(Boolean))].sort() as string[]
const byYear = Object.fromEntries(
  years.map((y) => {
    const items = ig.filter((p) => p.publishedAt?.startsWith(y))
    return [y, {
      posts: items.length,
      medianViews: r1(median(items.map((p) => p.views))),
      medianPer1000: r1(median(items.map((p) => p.engagementPer1000))),
      medianLikes: r1(median(items.map((p) => p.likes))),
      byTime: rows(groupBy(items, timeBucketOf), null),
      byDuration: rows(groupBy(items, durationBucketOf), null),
    }]
  }),
)
const t = (p: EnrichedPost) => Date.parse(p.publishedAt!)
const igWithViews = ig.filter((p) => p.views !== null && p.publishedAt)
const clustered = igWithViews.filter((p) => igWithViews.some((q) => q !== p && Math.abs(t(p) - t(q)) < 3 * 3600_000))
const isolated = igWithViews.filter((p) => !clustered.includes(p))
const peer = [...a.peerRatio.entries()].sort((x, y) => y[1] - x[1])
const bench = a.benchmarksByPlatform

const facts = {
  collectedAt: ds.meta.collectedAt,
  timezone: ds.meta.analysisTimezone,
  accounts: ds.meta.accounts,
  definitions: {
    engagement: 'likes + comments + shares (Instagram shares are not public, so Instagram engagement = likes + comments)',
    per1000: 'engagement / views * 1000',
    pooledPer1000: 'sum(engagement) / sum(views) * 1000 over posts with views',
    medianPer1000: 'median of per-post engagement per 1000 views ("typical post")',
    lowSample: 'fewer than 5 posts',
  },
  overall: round({ ...a.overall }),
  byPlatform: Object.fromEntries(platforms.map((pl) => [pl, round({ ...a.byPlatform[pl] })])),
  frequency: { overall: round({ ...a.frequencyOverall }), ...Object.fromEntries(platforms.map((pl) => [pl, round({ ...a.frequencyByPlatform[pl] })])) },
  benchmarks: Object.fromEntries(platforms.map((pl) => [pl, round({ ...bench[pl] })])),
  topicsByPlatform: per((pl) => rows(a.topicsByPlatform[pl], ann.topics)),
  topicsAll: rows(a.topics, ann.topics),
  hooksByPlatform: per((pl) => rows(a.hooksByPlatform[pl], ann.hooks)),
  quadrants: per((pl, items) => {
    const scored = items.filter((p) => p.quadrant)
    return a.quadrants[pl].map((g) => {
      const members = scored.filter((p) => p.quadrant === g.key)
      const topics = Object.entries(members.reduce<Record<string, number>>((m, p) => ((m[p.topic] = (m[p.topic] ?? 0) + 1), m), {}))
        .sort((x, y) => y[1] - x[1]).map(([k, n]) => ({ topic: label(ann.topics, k), posts: n }))
      const years = members.reduce<Record<string, number>>((m, p) => ((m[p.publishedAt!.slice(0, 4)] = (m[p.publishedAt!.slice(0, 4)] ?? 0) + 1), m), {})
      return { quadrant: g.key, posts: g.n, pctOfScored: Math.round((g.n / scored.length) * 100), byYear: years, topics, examples: members.sort((x, y) => (y.views ?? 0) - (x.views ?? 0)).slice(0, 4).map(postRef) }
    })
  }),
  days: per((pl) => rows(a.days[pl], DAY_LABELS.map((d) => ({ id: d, label: d })))),
  times: per((pl) => rows(a.times[pl], null)),
  durations: per((pl) => rows(a.durations[pl], null)),
  instagramByYear: byYear,
  instagramClustering: {
    within3hOfAnotherPost: { posts: clustered.length, medianViews: r1(median(clustered.map((p) => p.views))), medianPer1000: r1(median(clustered.map((p) => p.engagementPer1000))) },
    standAlone: { posts: isolated.length, medianViews: r1(median(isolated.map((p) => p.views))), medianPer1000: r1(median(isolated.map((p) => p.engagementPer1000))) },
  },
  instagramAiVsOther: (() => {
    const isAi = (p: EnrichedPost) => p.topic.startsWith('ai-') || p.topic === 'course-promo'
    const grp = (items: EnrichedPost[]) => ({ posts: items.length, medianViews: r1(median(items.map((p) => p.views))), medianPer1000: r1(median(items.map((p) => p.engagementPer1000))) })
    const scored = ig.filter((p) => p.views !== null)
    return { aiRelatedTopics: grp(scored.filter(isAi)), otherTopics: grp(scored.filter((p) => !isAi(p))) }
  })(),
  keyStats: {
    instagramShareOfAllViewsPct: a.overall.totalViews ? Math.round(((a.byPlatform.instagram?.totalViews ?? 0) / a.overall.totalViews) * 100) : null,
    instagramTop4ViewsSharePct: igTotal ? Math.round((igViews.slice(0, 4).reduce((s, v) => s + v, 0) / igTotal) * 100) : null,
    instagramTopPostLikesSharePct: likeTotal ? Math.round((Math.max(...likes) / likeTotal) * 100) : null,
    instagramReelsOver1000Views: ig.filter((p) => (p.views ?? 0) >= 1000).length,
    instagramPostsWithAnyComment: ig.filter((p) => (p.comments ?? 0) > 0).length,
    tiktokZeroViewVideos: a.byPlatform.tiktok?.zeroViewPosts ?? 0,
    tiktokVideosOver100Views: a.posts.filter((p) => p.platform === 'tiktok' && (p.views ?? 0) >= 100).length,
  },
  crossPosts: a.crossPosts.map((c) => ({ opening: firstLine(c.instagram.caption), instagram: postRef(c.instagram), tiktok: postRef(c.tiktok) })),
  crossPostMedians: {
    instagramMedianViews: r1(median(a.crossPosts.map((c) => c.instagram.views))),
    tiktokMedianViews: r1(median(a.crossPosts.map((c) => c.tiktok.views))),
  },
  topByViews: [...a.posts].filter((p) => p.views !== null).sort((x, y) => y.views! - x.views!).slice(0, 10)
    .map((p) => ({ ...postRef(p), timesPlatformMedian: r1(p.views! / (bench[p.platform].medianViews || 1)), timesTopicMedian: r1(a.peerRatio.get(p.id)) })),
  topByPer1000AboveMedian: a.posts.filter((p) => p.views !== null && p.views >= (bench[p.platform].medianViews ?? 0) && p.views >= 100 && !p.flags.includes('views_field_conflict'))
    .sort((x, y) => (y.engagementPer1000 ?? 0) - (x.engagementPer1000 ?? 0)).slice(0, 8)
    .map((p) => ({ ...postRef(p), comments: p.comments, timesPlatformMedianRate: r1((p.engagementPer1000 ?? 0) / (a.byPlatform[p.platform].medianPer1000 || 1)) })),
  lowestInstagram: ig.filter((p) => p.views !== null).sort((x, y) => x.views! - y.views!).slice(0, 8).map((p) => ({ ...postRef(p), publishedAt: p.publishedAt })),
  unexpectedHighs: peer.slice(0, 8).map(([id, ratio]) => ({ ...postRef(a.posts.find((p) => p.id === id)!), timesTopicMedian: r1(ratio) })),
  flaggedPosts: a.posts.filter((p) => p.flags.includes('views_field_conflict')).map((p) => ({ ...postRef(p), legacyViews: p.altViews })),
  posts: a.posts.map((p) => ({
    id: p.id, platform: p.platform, publishedAt: p.publishedAt, topic: p.topic, hook: p.hook, contentType: p.contentType,
    views: p.views, likes: p.likes, comments: p.comments, shares: p.shares, saves: p.saves, durationSec: r1(p.durationSec),
    per1000: r1(p.engagementPer1000), quadrant: p.quadrant, opening: firstLine(p.caption),
  })),
  categories: { topics: ann.topics, hooks: ann.hooks },
}
console.log(JSON.stringify(facts, null, 1))
