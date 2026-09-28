export type Platform = 'instagram' | 'tiktok'

/** One post as stored in src/data/social-data.json. Missing metrics are null, never 0. */
export interface Post {
  id: string
  platform: Platform
  url: string | null
  caption: string
  publishedAt: string | null
  contentType: string | null
  views: number | null
  altViews: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  saves: number | null
  durationSec: number | null
  hashtags: string[]
  thumbnail: string | null
  flags: string[]
  crossPostOf: string | null
  crossPostedAs: string[]
}

export interface AccountMeta {
  handle: string
  profileUrl: string
  source: string
  postsOnProfile: number | null
  followers: number | null
  postsCollected: number
}

export interface DatasetMeta {
  collectedAt: string
  analysisTimezone: string
  duplicatesRemoved: number
  accounts: Record<Platform, AccountMeta>
  fieldNotes: Record<string, string>
}

export interface Dataset {
  meta: DatasetMeta
  posts: Post[]
}

export interface Category {
  id: string
  label: string
  description: string
}

export interface Annotations {
  topics: Category[]
  hooks: Category[]
  posts: Record<string, { topic: string; hook: string }>
}

export type QuadrantId = 'reach-engage' | 'reach-only' | 'engage-only' | 'neither'

export interface EnrichedPost extends Post {
  topic: string
  hook: string
  /** true when topic/hook came from keyword rules rather than annotations.json */
  autoClassified: boolean
  /** likes + comments + shares, using only reported components; null if none reported */
  engagement: number | null
  /** engagement / views * 1000; null when views are null or 0 */
  engagementPer1000: number | null
  /** Instagram engagement excludes shares (not public) */
  engagementIncludesShares: boolean
  dayOfWeek: number | null
  hour: number | null
  quadrant: QuadrantId | null
}
