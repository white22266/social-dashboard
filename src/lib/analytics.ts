import type { Annotations, Dataset, EnrichedPost, Platform, Post, QuadrantId } from './types'
import { classifyHook, classifyTopic } from './classify'
import { maxBy, mean, median, minBy, present, sum } from './stats'

/** Groups smaller than this are shown but marked as low-sample. */
export const MIN_SAMPLE = 5
const DAY_MS = 86_400_000

// ---------------------------------------------------------------- enrichment

function engagementOf(p: Post): number | null {
  return sum([p.likes, p.comments, p.shares])
}

function localParts(iso: string | null, timeZone: string) {
  if (!iso) return { dayOfWeek: null, hour: null }
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: 'numeric', hourCycle: 'h23' })
    .formatToParts(new Date(iso))
  const wd = parts.find((x) => x.type === 'weekday')?.value ?? ''
  const hour = Number(parts.find((x) => x.type === 'hour')?.value)
  return { dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wd), hour }
}

export function enrichPosts(data: Dataset, notes: Annotations): EnrichedPost[] {
  const posts: EnrichedPost[] = data.posts.map((p) => {
    const note = notes.posts[p.id]
    const engagement = engagementOf(p)
    return {
      ...p,
      topic: note?.topic ?? classifyTopic(p.caption),
      hook: note?.hook ?? classifyHook(p.caption),
      autoClassified: !note,
      engagement,
      engagementPer1000: engagement !== null && p.views ? (engagement / p.views) * 1000 : null,
      engagementIncludesShares: p.shares !== null,
      ...localParts(p.publishedAt, data.meta.analysisTimezone),
      quadrant: null,
    }
  })
  for (const platform of platformsIn(posts)) {
    const bench = benchmarks(posts.filter((p) => p.platform === platform))
    for (const p of posts) {
      if (p.platform !== platform || p.views === null || p.engagement === null) continue
      const reach = p.views >= bench.medianViews!
      const engage = p.engagement >= bench.medianEngagement!
      p.quadrant = reach ? (engage ? 'reach-engage' : 'reach-only') : engage ? 'engage-only' : 'neither'
    }
  }
  return posts
}

export function platformsIn(posts: { platform: Platform }[]): Platform[] {
  return (['instagram', 'tiktok'] as Platform[]).filter((pl) => posts.some((p) => p.platform === pl))
}

// ---------------------------------------------------------------- summaries

export interface Frequency {
  firstPost: string | null
  lastPost: string | null
  spanDays: number | null
  postsPerWeek: number | null
  activeWeeks: number
  postsPerActiveWeek: number | null
  medianGapDays: number | null
  longestGapDays: number | null
  daysSinceLastPost: number | null
}

export function frequency(posts: Post[], asOf: string): Frequency {
  const times = present(posts.map((p) => (p.publishedAt ? Date.parse(p.publishedAt) : null))).sort((a, b) => a - b)
  if (!times.length) {
    return { firstPost: null, lastPost: null, spanDays: null, postsPerWeek: null, activeWeeks: 0, postsPerActiveWeek: null, medianGapDays: null, longestGapDays: null, daysSinceLastPost: null }
  }
  const gaps = times.slice(1).map((t, i) => (t - times[i]) / DAY_MS)
  const spanDays = (times[times.length - 1] - times[0]) / DAY_MS
  const weeks = new Set(times.map((t) => Math.floor((t - Date.UTC(1970, 0, 5)) / (7 * DAY_MS))))
  return {
    firstPost: new Date(times[0]).toISOString(),
    lastPost: new Date(times[times.length - 1]).toISOString(),
    spanDays,
    postsPerWeek: spanDays > 0 ? times.length / (spanDays / 7) : null,
    activeWeeks: weeks.size,
    postsPerActiveWeek: times.length / weeks.size,
    medianGapDays: median(gaps),
    longestGapDays: gaps.length ? Math.max(...gaps) : null,
    daysSinceLastPost: (Date.parse(asOf) - times[times.length - 1]) / DAY_MS,
  }
}

export interface Summary {
  posts: number
  postsWithViews: number
  totalViews: number | null
  avgViews: number | null
  medianViews: number | null
  medianLikes: number | null
  medianComments: number | null
  medianShares: number | null
  sharesReported: number
  totalLikes: number | null
  totalComments: number | null
  totalShares: number | null
  totalEngagement: number | null
  avgEngagement: number | null
  medianEngagement: number | null
  /** sum(engagement) / sum(views) * 1000 over posts that have both */
  pooledPer1000: number | null
  /** median of per-post engagement per 1,000 views */
  medianPer1000: number | null
  zeroViewPosts: number
}

export function summarize(posts: EnrichedPost[]): Summary {
  const withBoth = posts.filter((p) => p.views && p.engagement !== null)
  const pooledViews = sum(withBoth.map((p) => p.views))
  const pooledEng = sum(withBoth.map((p) => p.engagement))
  return {
    posts: posts.length,
    postsWithViews: posts.filter((p) => p.views !== null).length,
    totalViews: sum(posts.map((p) => p.views)),
    avgViews: mean(posts.map((p) => p.views)),
    medianViews: median(posts.map((p) => p.views)),
    medianLikes: median(posts.map((p) => p.likes)),
    medianComments: median(posts.map((p) => p.comments)),
    medianShares: median(posts.map((p) => p.shares)),
    sharesReported: posts.filter((p) => p.shares !== null).length,
    totalLikes: sum(posts.map((p) => p.likes)),
    totalComments: sum(posts.map((p) => p.comments)),
    totalShares: sum(posts.map((p) => p.shares)),
    totalEngagement: sum(posts.map((p) => p.engagement)),
    avgEngagement: mean(posts.map((p) => p.engagement)),
    medianEngagement: median(posts.map((p) => p.engagement)),
    pooledPer1000: pooledViews ? ((pooledEng ?? 0) / pooledViews) * 1000 : null,
    medianPer1000: median(posts.map((p) => p.engagementPer1000)),
    zeroViewPosts: posts.filter((p) => p.views === 0).length,
  }
}

export function benchmarks(posts: EnrichedPost[]) {
  const scored = posts.filter((p) => p.views !== null && p.engagement !== null)
  return {
    medianViews: median(scored.map((p) => p.views)),
    medianEngagement: median(scored.map((p) => p.engagement)),
    scored: scored.length,
  }
}

// ---------------------------------------------------------------- groups

export interface GroupRow {
  key: string
  n: number
  lowSample: boolean
  medianViews: number | null
  avgViews: number | null
  medianEngagement: number | null
  avgEngagement: number | null
  pooledPer1000: number | null
  medianPer1000: number | null
  best: EnrichedPost | null
  weakest: EnrichedPost | null
  platforms: Partial<Record<Platform, number>>
}

export function rankByReach(p: EnrichedPost): number | null {
  // views first, engagement breaks ties (many TikTok posts share the same low view count)
  return p.views === null ? null : p.views + (p.engagement ?? 0) / 1e6
}

export function groupBy(posts: EnrichedPost[], key: (p: EnrichedPost) => string | null): GroupRow[] {
  const groups = new Map<string, EnrichedPost[]>()
  for (const p of posts) {
    const k = key(p)
    if (k === null) continue
    groups.set(k, [...(groups.get(k) ?? []), p])
  }
  return [...groups.entries()].map(([k, items]) => {
    const s = summarize(items)
    const platforms: Partial<Record<Platform, number>> = {}
    for (const p of items) platforms[p.platform] = (platforms[p.platform] ?? 0) + 1
    return {
      key: k,
      n: items.length,
      lowSample: items.length < MIN_SAMPLE,
      medianViews: s.medianViews,
      avgViews: s.avgViews,
      medianEngagement: s.medianEngagement,
      avgEngagement: s.avgEngagement,
      pooledPer1000: s.pooledPer1000,
      medianPer1000: s.medianPer1000,
      best: maxBy(items, rankByReach),
      weakest: minBy(items, rankByReach),
      platforms,
    }
  })
}

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const TIME_BUCKETS = [
  { id: 'morning', label: 'Morning', range: '06:00–11:59', test: (h: number) => h >= 6 && h < 12 },
  { id: 'afternoon', label: 'Afternoon', range: '12:00–16:59', test: (h: number) => h >= 12 && h < 17 },
  { id: 'evening', label: 'Evening', range: '17:00–20:59', test: (h: number) => h >= 17 && h < 21 },
  { id: 'night', label: 'Night', range: '21:00–05:59', test: (h: number) => h >= 21 || h < 6 },
]

export const DURATION_BUCKETS = [
  { id: 'lt20', label: '< 20s', test: (s: number) => s < 20 },
  { id: '20-39', label: '20–39s', test: (s: number) => s >= 20 && s < 40 },
  { id: '40-59', label: '40–59s', test: (s: number) => s >= 40 && s < 60 },
  { id: '60plus', label: '60s +', test: (s: number) => s >= 60 },
]

export const timeBucketOf = (p: EnrichedPost) =>
  p.hour === null ? null : TIME_BUCKETS.find((b) => b.test(p.hour!))!.id
export const durationBucketOf = (p: EnrichedPost) =>
  p.durationSec === null ? null : DURATION_BUCKETS.find((b) => b.test(p.durationSec!))!.id
export const dayOf = (p: EnrichedPost) => (p.dayOfWeek === null ? null : DAY_LABELS[p.dayOfWeek])

// ---------------------------------------------------------------- stand-out posts

export interface CrossPostPair {
  instagram: EnrichedPost
  tiktok: EnrichedPost
}

export function crossPostPairs(posts: EnrichedPost[]): CrossPostPair[] {
  const byId = new Map(posts.map((p) => [p.id, p]))
  return posts
    .filter((p) => p.platform === 'tiktok' && p.crossPostOf && byId.has(p.crossPostOf))
    .map((t) => ({ instagram: byId.get(t.crossPostOf!)!, tiktok: t }))
    .sort((a, b) => (b.instagram.views ?? 0) - (a.instagram.views ?? 0))
}

/**
 * Views relative to the median of posts on the same platform with the same topic.
 * Only computed where that peer group has at least 3 posts with views and a median of 10+ views
 * (below that, e.g. TikTok's median of 1, ratios like "223×" are meaningless).
 */
export function peerRatio(posts: EnrichedPost[]) {
  const ratio = new Map<string, number>()
  const peers = new Map<string, EnrichedPost[]>()
  for (const p of posts) {
    if (p.views === null) continue
    const k = `${p.platform}|${p.topic}`
    peers.set(k, [...(peers.get(k) ?? []), p])
  }
  for (const group of peers.values()) {
    if (group.length < 3) continue
    const m = median(group.map((p) => p.views))
    if (m === null || m < 10) continue
    for (const p of group) ratio.set(p.id, p.views! / m)
  }
  return ratio
}

export interface Analysis {
  posts: EnrichedPost[]
  overall: Summary
  byPlatform: Record<Platform, Summary>
  frequencyOverall: Frequency
  frequencyByPlatform: Record<Platform, Frequency>
  benchmarksByPlatform: Record<Platform, ReturnType<typeof benchmarks>>
  topics: GroupRow[]
  topicsByPlatform: Record<Platform, GroupRow[]>
  hooks: GroupRow[]
  hooksByPlatform: Record<Platform, GroupRow[]>
  quadrants: Record<Platform, GroupRow[]>
  days: Record<Platform, GroupRow[]>
  times: Record<Platform, GroupRow[]>
  durations: Record<Platform, GroupRow[]>
  crossPosts: CrossPostPair[]
  peerRatio: Map<string, number>
  unclassifiedForQuadrant: EnrichedPost[]
}

export function analyze(data: Dataset, notes: Annotations): Analysis {
  const posts = enrichPosts(data, notes)
  const platforms = platformsIn(posts)
  const per = <T,>(fn: (items: EnrichedPost[]) => T) =>
    Object.fromEntries(platforms.map((pl) => [pl, fn(posts.filter((p) => p.platform === pl))])) as Record<Platform, T>
  return {
    posts,
    overall: summarize(posts),
    byPlatform: per(summarize),
    frequencyOverall: frequency(posts, data.meta.collectedAt),
    frequencyByPlatform: per((items) => frequency(items, data.meta.collectedAt)),
    benchmarksByPlatform: per(benchmarks),
    topics: groupBy(posts, (p) => p.topic),
    topicsByPlatform: per((items) => groupBy(items, (p) => p.topic)),
    hooks: groupBy(posts, (p) => p.hook),
    hooksByPlatform: per((items) => groupBy(items, (p) => p.hook)),
    quadrants: per((items) => groupBy(items, (p) => p.quadrant)),
    days: per((items) => groupBy(items, dayOf)),
    times: per((items) => groupBy(items, timeBucketOf)),
    durations: per((items) => groupBy(items, durationBucketOf)),
    crossPosts: crossPostPairs(posts),
    peerRatio: peerRatio(posts),
    unclassifiedForQuadrant: posts.filter((p) => p.quadrant === null),
  }
}

export const QUADRANTS: { id: QuadrantId; label: string; short: string }[] = [
  { id: 'reach-engage', label: 'Good reach + good engagement', short: 'Winners' },
  { id: 'reach-only', label: 'Good reach + low engagement', short: 'Seen, not acted on' },
  { id: 'engage-only', label: 'Low reach + good engagement', short: 'Hidden gems' },
  { id: 'neither', label: 'Low reach + low engagement', short: 'Underperformers' },
]
