import { useState } from 'react'
import type { EngineSnapshot, Exchange } from '../interview/engine'

// Dev only: everything the engine recorded in the last interview, as JSON to
// copy and paste back when something breaks (TASKS.md 4.3). Times are seconds
// from the start of each question.
function exchange(e: Exchange, start: number) {
  return {
    kind: e.kind,
    said: e.said,
    angle: e.angle?.kind,
    byGemma: e.byGemma,
    answer: e.parts.map((p) => ({ t: +((p.at - start) / 1000).toFixed(1), speechMs: p.speechMs, text: p.text })),
  }
}

function sessionLog(s: EngineSnapshot) {
  return {
    phase: s.phase,
    notes: s.notes,
    smallTalk: s.smallTalk && exchange(s.smallTalk, s.smallTalk.parts[0]?.at ?? 0),
    questions: s.records.map((r) => ({
      id: r.question.id,
      outcome: r.outcome,
      seconds: r.endedAt ? +((r.endedAt - r.startedAt) / 1000).toFixed(1) : null,
      exchanges: r.exchanges.map((e) => exchange(e, r.startedAt)),
    })),
    candidateQuestions: s.candidateQuestions && exchange(s.candidateQuestions, s.candidateQuestions.parts[0]?.at ?? 0),
  }
}

export default function SessionLog({ snapshot }: { snapshot: EngineSnapshot }) {
  const [copied, setCopied] = useState('')
  const text = JSON.stringify(sessionLog(snapshot), null, 2)
  return (
    <details className="panel session-log">
      <summary>Session log (dev only)</summary>
      <div className="actions" style={{ justifyContent: 'flex-start' }}>
        <button
          type="button"
          onClick={() =>
            navigator.clipboard.writeText(text).then(
              () => setCopied('Copied.'),
              () => setCopied('Copy failed: select the text below instead.'),
            )
          }
        >
          Copy session log
        </button>
        <span className="muted" role="status">
          {copied}
        </span>
      </div>
      <pre>{text}</pre>
    </details>
  )
}
