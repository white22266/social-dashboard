import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ReactNode } from 'react'
import { INK_MUTED } from '../lib/palette'


export interface BarDatum {
  label: string
  value: number | null
  n: number
  lowSample?: boolean
  note?: string
}

export function TooltipCard({ title, rows }: { title: ReactNode; rows: [string, ReactNode][] }) {
  return (
    <div className="max-w-[280px] rounded-lg border border-line bg-card px-3 py-2.5 text-[12.5px] shadow-[0_8px_24px_rgba(27,35,48,0.08)]">
      <div className="mb-1.5 font-semibold text-ink">{title}</div>
      {rows.map(([k, v]) => (
        <div key={k} className="tabular flex justify-between gap-4 text-ink-2">
          <span className="text-muted">{k}</span>
          <span className="font-medium text-ink">{v}</span>
        </div>
      ))}
    </div>
  )
}

/** Horizontal bars, one series. Low-sample bars are drawn lighter and flagged in the tooltip. */
export function HBarChart({ data, format, color, valueLabel }: {
  data: BarDatum[]
  format: (v: number | null) => string
  color: string
  valueLabel: string
}) {
  const rows = data.filter((d) => d.value !== null).map((d) => ({ ...d, plot: d.value ?? 0 }))
  const hidden = data.length - rows.length
  const height = Math.max(120, rows.length * 38 + 24)
  return (
    <>
    <div style={{ height }} role="img" aria-label={`${valueLabel} by category`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 64, bottom: 0, left: 4 }} barCategoryGap={8}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={176}
            tickLine={false}
            axisLine={false}
            tick={({ x, y, payload }) => (
              <text x={Number(x) - 6} y={Number(y)} dy={4} textAnchor="end" fontSize={12} fill="#4a5261">
                {String(payload.value).length > 26 ? String(payload.value).slice(0, 25) + '…' : payload.value}
              </text>
            )}
          />
          <Tooltip
            cursor={{ fill: 'rgba(27,35,48,0.04)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as BarDatum
              return (
                <TooltipCard
                  title={d.label}
                  rows={[
                    [valueLabel, format(d.value)],
                    ['Posts', `${d.n}${d.lowSample ? ' · low sample' : ''}`],
                    ...(d.note ? ([['Note', d.note]] as [string, string][]) : []),
                  ]}
                />
              )
            }}
          />
          <Bar dataKey="plot" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
            {rows.map((d) => (
              <Cell key={d.label} fill={color} fillOpacity={d.lowSample ? 0.35 : 1} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              content={({ x, y, width, height, value, index }) => (
                <text x={Number(x) + Number(width) + 6} y={Number(y) + Number(height) / 2} dy={4} fontSize={11.5} fill="#1b2330" className="tabular">
                  {format(value as number | null)}
                  <tspan fill={INK_MUTED}>{`  n=${rows[index ?? 0]?.n}`}</tspan>
                </text>
              )}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
    {hidden > 0 && <p className="mt-1 text-[11.5px] text-muted">{hidden} group{hidden > 1 ? 's' : ''} without data not shown.</p>}
    </>
  )
}

export function ChartFrame({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-card p-5">
      <div className="mb-4">
        <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-muted">{subtitle}</p>}
      </div>
      {children}
      {footer && <div className="mt-3 border-t border-line pt-3 text-[12px] text-muted">{footer}</div>}
    </div>
  )
}

export function LowSampleLegend() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-4 rounded-sm bg-ink/30" /> lighter bar = fewer than 5 posts
    </span>
  )
}
