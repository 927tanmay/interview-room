import { lazy, Suspense } from 'react'
import { ScreenFrame } from '../components/ScreenFrame'
import { reviewQueue, setReviewState } from '../report/report'
import { saveReport, useReport } from '../report/store'
import { Review } from './Review'

const SessionLog = import.meta.env.DEV ? lazy(() => import('../dev/SessionLog')) : null

// After the interview: first the candidate's own look back at each answer
// (Review), which they can skip, then the report. The report itself is a
// placeholder until step 7: specific to what they said, quoting their answers,
// measured numbers only (UX.md: report). Reads the saved report, so it
// survives a reload, and saves every mark as it is made. Dev builds show the
// raw session log and the measured numbers for checking a run.
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
  const queue = report ? reviewQueue(report) : []
  const reviewing =
    report && queue.length > 0 && (report.reviewState === 'not-started' || report.reviewState === 'in-progress')

  if (reviewing) return <Review report={report} queue={queue} onChange={(next) => void saveReport(next)} />

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
        {report && queue.length > 0 && (
          <button type="button" onClick={() => void saveReport(setReviewState(report, 'in-progress'))}>
            {report.reviewState === 'skipped' ? 'Look back at your answers' : 'Change your marks'}
          </button>
        )}
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
