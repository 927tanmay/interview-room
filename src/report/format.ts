// Plain wording for measured numbers.

// "45 s", "2 min", "3 min 40 s".
export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000)
  const min = Math.floor(total / 60)
  const s = total % 60
  if (min === 0) return `${s} s`
  return s === 0 ? `${min} min` : `${min} min ${s} s`
}

// "1 time", "3 times".
export function times(n: number): string {
  return n === 1 ? '1 time' : `${n} times`
}

// "1 answer", "2 answers".
export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}
