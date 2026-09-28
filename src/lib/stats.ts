/** Null-aware statistics. Nulls are skipped, never treated as 0. */

export function present(values: (number | null | undefined)[]): number[] {
  return values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
}

export function sum(values: (number | null | undefined)[]): number | null {
  const v = present(values)
  return v.length ? v.reduce((a, b) => a + b, 0) : null
}

export function mean(values: (number | null | undefined)[]): number | null {
  const v = present(values)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

export function median(values: (number | null | undefined)[]): number | null {
  const v = present(values).sort((a, b) => a - b)
  if (!v.length) return null
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}

export function maxBy<T>(items: T[], key: (t: T) => number | null): T | null {
  let best: T | null = null
  let bestVal = -Infinity
  for (const item of items) {
    const v = key(item)
    if (v !== null && v > bestVal) {
      best = item
      bestVal = v
    }
  }
  return best
}

export function minBy<T>(items: T[], key: (t: T) => number | null): T | null {
  return maxBy(items, (t) => {
    const v = key(t)
    return v === null ? null : -v
  })
}
