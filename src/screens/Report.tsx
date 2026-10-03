import { lazy, Suspense } from 'react'
import { ScreenFrame } from '../components/ScreenFrame'
import { useReport } from '../report/store'

const SessionLog = import.meta.env.DEV ? lazy(() => import('../dev/SessionLog')) : null

// Placeholder until the self-review and report steps fill it in: specific to
// what they said, quoting their answers, measured numbers only (UX.md:
// report). Reads the saved report, so it survives a reload. Dev builds show
// the raw session log and the measured numbers for checking a run.
export function Report({
  reportId,
  onPracticeAgain,
  onHome,
}: {
  reportId: string | null
  onPracticeAgain: () => void
  onHome: () => void
}) {
  const { report, loading } = useReport(reportId)
  return (
    <ScreenFrame title="Your interview">
      <section aria-labelledby="answers-title" className="panel">
        <h2 id="answers-title">Your answers</h2>
        <p className="placeholder">
          {loading
            ? 'Loading your report…'
            : report
              ? `${report.records.length} questions. Each answer, in your words, with what was measured.`
              : 'This report could not be found on this device.'}
        </p>
      </section>

      {SessionLog && report && (
        <Suspense fallback={null}>
          <SessionLog report={report} />
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
