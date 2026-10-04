import { useEffect, useState } from 'react'
import { createReport } from '../report/report'
import { listReports, saveReport } from '../report/store'
import { Report } from '../screens/Report'
import { FAKE_SETTINGS, fakeInterview } from './fakeInterview'

// Dev only (`?dev=report`): the report screen with a fake interview run
// through the real engine (fakeInterview.ts), saved in IndexedDB like a real
// one. Opens the newest saved report, so a reload shows the same one (and the
// marks on it); "New fake interview" makes another.
export default function ReportPreview() {
  const [ids, setIds] = useState<{ id: string; label: string }[]>([])
  const [id, setId] = useState<string | null>(null)
  const [saved, setSaved] = useState<boolean | null>(null)

  const refresh = async () => {
    const all = await listReports()
    setIds(all.map((r) => ({ id: r.id, label: `${new Date(r.createdAt).toLocaleString()} · ${r.records.length} questions` })))
    return all
  }

  const makeFake = async () => {
    const report = createReport(fakeInterview(), FAKE_SETTINGS, 'light', 'phone')
    setSaved(await saveReport(report))
    setId(report.id)
    await refresh()
  }

  useEffect(() => {
    void refresh().then((all) => {
      if (all[0]) setId(all[0].id)
      else void makeFake()
    })
  }, [])

  return (
    <>
      <div className="panel">
        <div className="actions" style={{ justifyContent: 'flex-start' }}>
          <button type="button" onClick={() => void makeFake()}>
            New fake interview
          </button>
          <select value={id ?? ''} onChange={(e) => setId(e.target.value)} aria-label="Saved reports">
            {ids.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <span className="muted" role="status">
            {saved === null ? '' : saved ? 'Saved in IndexedDB.' : 'Not saved: IndexedDB unavailable, kept in memory.'}
          </span>
        </div>
      </div>
      <Report
        reportId={id}
        onPracticeAgain={() => void makeFake()}
        onPracticeQuestion={(q) => alert(`Would practice: ${q.question}`)}
        onHome={() => location.assign('/')}
      />
    </>
  )
}
