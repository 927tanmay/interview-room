import { lazy, Suspense } from 'react'
import { ScreenFrame } from '../components/ScreenFrame'
import { useInterview } from '../interview/session'

const SessionLog = import.meta.env.DEV ? lazy(() => import('../dev/SessionLog')) : null

// Placeholder until phase 5, which fills it in: specific to what they said,
// quoting their answers, measured numbers only (UX.md: report). Dev builds
// show the raw session log for checking a run (TASKS.md 4.3).
export function Report({ onPracticeAgain, onHome }: { onPracticeAgain: () => void; onHome: () => void }) {
  const state = useInterview()
  return (
    <ScreenFrame title="Your interview">
      <section aria-labelledby="answers-title" className="panel">
        <h2 id="answers-title">Your answers</h2>
        <p className="placeholder">Each answer, in your words, with what was measured (phase 5).</p>
      </section>

      {SessionLog && state && (
        <Suspense fallback={null}>
          <SessionLog snapshot={state} />
        </Suspense>
      )}

      <div className="actions">
        <button type="button" onClick={onHome}>
          Home
        </button>
        <button type="button" className="primary" onClick={onPracticeAgain}>
          Practice again
        </button>
      </div>
    </ScreenFrame>
  )
}
