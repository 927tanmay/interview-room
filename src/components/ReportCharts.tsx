import { formatDuration, formatSeconds } from '../report/format'
import { PACE, type InterviewMeasures } from '../report/measure'

// The report's charts: plain SVG, no chart library, every bar labelled with
// its number, and a text summary for screen readers (UX.md: report). Only
// measured numbers, no scores.

type Row = {
  label: string
  // Null: not measured (the row says so instead of drawing a bar).
  value: number | null
  text: string
  // Part of the bar past a marker (drawn striped), e.g. past the target time.
  past?: number
}

const W = 360
const VALUE_W = 100
const ROW_H = 34
const BAR_H = 16
const TOP = 26

function BarChart({
  title,
  summary,
  rows,
  max,
  marker,
  band,
  labelWidth: LABEL_W = 56,
}: {
  labelWidth?: number
  title: string
  summary: string
  rows: Row[]
  max: number
  marker?: { value: number; label: string }
  band?: { from: number; to: number; label: string }
}) {
  const plotW = W - LABEL_W - VALUE_W
  const x = (v: number) => LABEL_W + (Math.min(v, max) / max) * plotW
  const height = TOP + rows.length * ROW_H + 6
  const id = title.replace(/\W+/g, '-').toLowerCase()
  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-labelledby={`${id}-desc`}>
        <desc id={`${id}-desc`}>{summary}</desc>
        <defs>
          <pattern id={`${id}-stripes`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" className="chart-past-bg" />
            <rect width="3" height="6" className="chart-past-stripe" />
          </pattern>
        </defs>
        {band && (
          <g>
            <rect x={x(band.from)} y={TOP - 6} width={x(band.to) - x(band.from)} height={rows.length * ROW_H + 4} className="chart-band" />
            <text x={(x(band.from) + x(band.to)) / 2} y={TOP - 10} textAnchor="middle" className="chart-note">
              {band.label}
            </text>
          </g>
        )}
        {rows.map((r, i) => {
          const y = TOP + i * ROW_H
          const end = r.value === null ? LABEL_W : x(r.value)
          const pastStart = r.value !== null && r.past ? x(r.value - r.past) : end
          return (
            <g key={r.label}>
              <text x={0} y={y + BAR_H - 3} className="chart-label">
                {r.label}
              </text>
              {r.value !== null && (
                <>
                  <rect x={LABEL_W} y={y} width={Math.max(2, pastStart - LABEL_W)} height={BAR_H} rx="4" className="chart-bar" />
                  {r.past ? (
                    <rect x={pastStart} y={y} width={Math.max(2, end - pastStart)} height={BAR_H} rx="4" fill={`url(#${id}-stripes)`} className="chart-past" />
                  ) : null}
                </>
              )}
              <text x={end + 8} y={y + BAR_H - 3} className={r.value === null ? 'chart-value chart-muted' : 'chart-value'}>
                {r.text}
              </text>
            </g>
          )
        })}
        {marker && (
          <g>
            <line x1={x(marker.value)} x2={x(marker.value)} y1={TOP - 6} y2={TOP + rows.length * ROW_H - 4} className="chart-marker" />
            <text x={x(marker.value)} y={TOP - 10} textAnchor="middle" className="chart-note">
              {marker.label}
            </text>
          </g>
        )}
      </svg>
    </figure>
  )
}

// "Q1", "Q2"... for each answered question, in interview order.
function answered(m: InterviewMeasures) {
  return m.questions.map((q, i) => ({ q, label: `Q${i + 1}` })).filter((x) => x.q.status === 'answered' && x.q.answer)
}

export function LengthChart({ m }: { m: InterviewMeasures }) {
  const list = answered(m)
  if (!list.length) return null
  const target = list[0].q.targetMs
  const rows: Row[] = list.map(({ q, label }) => {
    const d = q.answer!.timing.durationMs
    return { label, value: d, text: d === null ? 'not measured' : formatDuration(d), past: q.overTargetMs ?? undefined }
  })
  const longest = Math.max(target, ...rows.map((r) => r.value ?? 0))
  return (
    <BarChart
      title="Answer length"
      summary={`Target ${formatDuration(target)}. ${rows.map((r) => `${r.label}: ${r.text}`).join('; ')}.`}
      rows={rows}
      max={longest * 1.08}
      marker={{ value: target, label: `target ${formatDuration(target)}` }}
    />
  )
}

export function PaceChart({ m }: { m: InterviewMeasures }) {
  const list = answered(m)
  if (!list.length) return null
  const rows: Row[] = list.map(({ q, label }) => {
    const wpm = q.answer!.timing.wpm
    return { label, value: wpm, text: wpm === null ? 'too short to measure' : `${wpm} wpm` }
  })
  const max = Math.max(200, ...rows.map((r) => (r.value ?? 0) + 20))
  return (
    <BarChart
      title="Pace (words a minute)"
      summary={`Easy-to-follow band ${PACE.low} to ${PACE.high}. ${rows.map((r) => `${r.label}: ${r.text}`).join('; ')}.`}
      rows={rows}
      max={max}
      band={{ from: PACE.low, to: PACE.high, label: `${PACE.low}–${PACE.high}` }}
    />
  )
}

export function FirstWordChart({ m }: { m: InterviewMeasures }) {
  const list = answered(m)
  if (!list.length) return null
  const rows: Row[] = list.map(({ q, label }) => {
    const t = q.answer!.timing
    const text = t.firstWordMs === null ? 'not measured' : t.talkedOver ? 'before it ended' : formatSeconds(t.firstWordMs)
    return { label, value: t.firstWordMs, text }
  })
  const max = Math.max(6000, ...rows.map((r) => (r.value ?? 0) * 1.1))
  return (
    <BarChart
      title="Time to your first word"
      summary={`After the interviewer finished asking. ${rows.map((r) => `${r.label}: ${r.text}`).join('; ')}.`}
      rows={rows}
      max={max}
    />
  )
}

export function FillerChart({ m }: { m: InterviewMeasures }) {
  if (!m.fillers.length) {
    return (
      <figure className="chart">
        <figcaption>Filler phrases</figcaption>
        <p className="muted">None counted in {m.words} words.</p>
      </figure>
    )
  }
  const rows: Row[] = m.fillers.map((f) => ({ label: f.phrase, value: f.count, text: String(f.count) }))
  return (
    <BarChart
      title="Filler phrases"
      summary={`${rows.map((r) => `${r.label}: ${r.text}`).join('; ')}, in ${m.words} words.`}
      rows={rows}
      max={Math.max(...rows.map((r) => r.value!)) * 1.15}
      labelWidth={78}
    />
  )
}
