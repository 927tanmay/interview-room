import { useEffect, useState } from 'react'

// How long the current answer has run against the candidate's target (UX.md:
// interview screen). Amber from 80% of the target, red past it. Counts from
// their first words, so thinking before speaking is not on the clock.
const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function AnswerTimer({ startedAt, targetMinutes, paused }: { startedAt: number | null; targetMinutes: number; paused: boolean }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (startedAt === null || paused) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [startedAt, paused])

  const target = targetMinutes * 60_000
  const elapsed = startedAt === null ? 0 : now - startedAt
  const state = elapsed > target ? 'over' : elapsed >= target * 0.8 ? 'near' : 'ok'
  const fill = Math.min(1, elapsed / target)

  return (
    <div className={`answer-timer timer-${state}`}>
      <span className="timer-text">
        {startedAt === null ? `Target ${fmt(target)}` : `${fmt(elapsed)} / ${fmt(target)}`}
      </span>
      <span className="timer-bar" aria-hidden="true">
        <span style={{ width: `${fill * 100}%` }} />
      </span>
      {/* Announced once, not every second. */}
      <span className="sr-only" aria-live="polite">
        {state === 'over' ? `Past your ${targetMinutes} minute target.` : ''}
      </span>
    </div>
  )
}
