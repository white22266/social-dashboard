import type { ReactNode } from 'react'

export default function StatCard({ label, value, detail, size = 'md', accent }: {
  label: string
  value: ReactNode
  detail?: ReactNode
  size?: 'md' | 'lg'
  accent?: 'ig' | 'tt'
}) {
  const bar = accent === 'ig' ? 'before:bg-ig' : accent === 'tt' ? 'before:bg-tt' : 'before:bg-transparent'
  return (
    <div className={`relative flex flex-col rounded-xl border border-line bg-card p-5 before:absolute before:inset-x-5 before:top-0 before:h-[2px] before:rounded-b ${bar}`}>
      <div className="eyebrow">{label}</div>
      <div className={`tabular mt-3 font-serif leading-none font-medium tracking-tight text-ink ${size === 'lg' ? 'text-[2.6rem] sm:text-5xl' : 'text-[2.1rem]'}`}>
        {value}
      </div>
      {detail && <div className="mt-3 text-[13px] leading-snug text-ink-2">{detail}</div>}
    </div>
  )
}
