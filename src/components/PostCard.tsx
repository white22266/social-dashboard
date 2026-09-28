import type { ReactNode } from 'react'
import type { EnrichedPost } from '../lib/types'
import { firstLine, fmtDate, fmtNum, fmtRate, NA, thumbSrc } from '../lib/format'
import { PlatformTag, Pill } from './ui'

export function PostThumb({ post, className = '' }: { post: EnrichedPost; className?: string }) {
  const src = thumbSrc(post.thumbnail)
  return (
    <div className={`overflow-hidden rounded-lg bg-paper-deep ${className}`}>
      {src ? (
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-[11px] text-muted">No image</div>
      )}
    </div>
  )
}

export default function PostCard({ post, topicLabel, badge, children, compact = false }: {
  post: EnrichedPost
  topicLabel: string
  badge?: ReactNode
  children?: ReactNode
  compact?: boolean
}) {
  const shares = post.shares === null ? <span title="Not available from Instagram's public data">n/a</span> : fmtNum(post.shares)
  return (
    <article className="flex gap-4 rounded-xl border border-line bg-card p-4 sm:gap-5 sm:p-5">
      <a href={post.url ?? undefined} target="_blank" rel="noreferrer" className="shrink-0" aria-label="Open post">
        <PostThumb post={post} className={compact ? 'h-24 w-[72px]' : 'h-32 w-24 sm:h-40 sm:w-[120px]'} />
      </a>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <PlatformTag platform={post.platform} />
          <Pill>{topicLabel}</Pill>
          {badge}
          <span className="text-[12px] text-muted">{fmtDate(post.publishedAt)}</span>
        </div>
        <p className="mt-2 line-clamp-2 font-serif text-[17px] leading-snug text-ink">{firstLine(post.caption, 160)}</p>
        <dl className="tabular mt-3 grid grid-cols-3 gap-x-4 gap-y-2 text-[12.5px] sm:grid-cols-6">
          <Stat k="Views" v={post.views === null ? NA : fmtNum(post.views)} strong />
          <Stat k="Likes" v={fmtNum(post.likes)} />
          <Stat k="Comments" v={fmtNum(post.comments)} />
          <Stat k="Shares" v={shares} />
          <Stat k="Eng. / 1k" v={fmtRate(post.engagementPer1000)} />
          <Stat k="Length" v={post.durationSec === null ? NA : `${Math.round(post.durationSec)}s`} />
        </dl>
        {post.flags.includes('views_field_conflict') && (
          <p className="mt-2 text-[12px] text-warn">
            Data caveat: Instagram reports conflicting view figures for this reel ({fmtNum(post.views)} plays vs {fmtNum(post.altViews)} legacy views).
          </p>
        )}
        {children && <div className="mt-3 space-y-1.5 border-t border-line pt-3">{children}</div>}
        {post.url && (
          <a href={post.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[12px] font-medium text-accent hover:underline">
            View post ↗
          </a>
        )}
      </div>
    </article>
  )
}

function Stat({ k, v, strong }: { k: string; v: ReactNode; strong?: boolean }) {
  return (
    <div>
      <dt className="text-[10.5px] tracking-wide text-muted uppercase">{k}</dt>
      <dd className={strong ? 'font-semibold text-ink' : 'text-ink-2'}>{v}</dd>
    </div>
  )
}
