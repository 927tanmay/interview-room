import type { QuestionOutcome } from '../interview/engine'

// One dot per question: answered, skipped (or left in silence / "I don't
// know"), the current one, and those still to come.
export function ProgressDots({ total, index, outcomes }: { total: number; index: number; outcomes: QuestionOutcome[] }) {
  if (total === 0) return null
  const label = index >= 0 && index < total ? `Question ${index + 1} of ${total}` : `${total} questions`
  return (
    <ol className="dots" aria-label={label}>
      {Array.from({ length: total }, (_, i) => {
        const state =
          i === index ? 'current' : i < index ? (outcomes[i] === 'answered' ? 'done' : 'skipped') : 'todo'
        const words = { current: 'current', done: 'answered', skipped: 'skipped', todo: 'not yet asked' }[state]
        return (
          <li key={i} className={`dot dot-${state}`}>
            <span className="sr-only">
              Question {i + 1}, {words}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
