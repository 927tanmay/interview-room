import type { ReactNode } from 'react'
import { formatSeconds } from '../report/format'
import type { FillerHit, Span } from '../report/measure'

// The candidate's own words with what was measured marked in place: filler
// phrases, numbers, long pauses (as a small marker where they picked up), and
// everything past the target time shaded. Marked by more than colour: fillers
// are dotted-underlined, numbers bold, the overrun striped and labelled.
export function AnswerQuote({
  text,
  fillers = [],
  numbers = [],
  overAt = null,
  gaps = [],
}: {
  text: string
  fillers?: FillerHit[]
  numbers?: Span[]
  overAt?: number | null
  gaps?: { at: number; ms: number }[]
}) {
  const cuts = new Set<number>([0, text.length])
  for (const s of [...fillers, ...numbers]) {
    cuts.add(s.start)
    cuts.add(s.end)
  }
  if (overAt !== null) cuts.add(overAt)
  for (const g of gaps) cuts.add(g.at)
  const points = [...cuts].filter((c) => c >= 0 && c <= text.length).sort((a, b) => a - b)

  const out: ReactNode[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const gap = gaps.find((g) => g.at === a)
    if (gap) {
      out.push(
        <span key={`gap-${a}`} className="quote-gap">
          pause {formatSeconds(gap.ms)}
        </span>,
      )
    }
    if (overAt !== null && a === overAt) {
      out.push(
        <span key={`over-${a}`} className="quote-over-mark">
          past your target from here
        </span>,
      )
    }
    const piece = text.slice(a, b)
    const filler = fillers.some((f) => a >= f.start && b <= f.end)
    const number = numbers.some((n) => a >= n.start && b <= n.end)
    const past = overAt !== null && a >= overAt
    const cls = [filler && 'quote-filler', number && 'quote-number', past && 'quote-past'].filter(Boolean).join(' ')
    out.push(
      cls ? (
        <span key={a} className={cls} title={filler ? 'Filler phrase' : undefined}>
          {piece}
        </span>
      ) : (
        piece
      ),
    )
  }
  return <p className="quote">{out}</p>
}
