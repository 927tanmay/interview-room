import { useState } from 'react'
import type { Exchange } from '../interview/engine'
import { findDisagreements, pickFocus } from '../report/focus'
import { measures, type InterviewReport } from '../report/report'

// Dev only: everything the engine recorded in the interview, and what the
// report measured from it, as JSON to copy and paste back when something
// breaks (TASKS.md 4.3). Times are seconds from the start of each question.
function seconds(ms: number | undefined, start: number) {
  return ms === undefined ? undefined : +((ms - start) / 1000).toFixed(1)
}

function exchange(e: Exchange, start: number) {
  return {
    kind: e.kind,
    said: e.said,
    angle: e.angle?.kind,
    byGemma: e.byGemma,
    asked: seconds(e.askedAt, start),
    askedEnded: seconds(e.askedEndedAt, start),
    answer: e.parts.map((p) => ({
      t: seconds(p.at, start),
      from: seconds(p.startedAt, start),
      to: seconds(p.endedAt, start),
      speechMs: p.speechMs,
      text: p.text,
    })),
  }
}

function sessionLog(r: InterviewReport) {
  return {
    id: r.id,
    mode: r.mode,
    display: r.display,
    answerMinutes: r.settings.answerMinutes,
    notes: r.notes,
    smallTalk: r.smallTalk && exchange(r.smallTalk, r.smallTalk.askedAt),
    questions: r.records.map((q) => ({
      id: q.question.id,
      outcome: q.outcome,
      seconds: q.endedAt ? +((q.endedAt - q.startedAt) / 1000).toFixed(1) : null,
      exchanges: q.exchanges.map((e) => exchange(e, q.startedAt)),
    })),
    candidateQuestions: r.candidateQuestions && exchange(r.candidateQuestions, r.candidateQuestions.askedAt),
    review: r.review,
    reviewState: r.reviewState,
  }
}

// The measured numbers, shortened: offsets replaced by the words they point at.
function measured(r: InterviewReport) {
  const m = measures(r)
  const one = (x: NonNullable<(typeof m.questions)[number]['answer']>) => ({
    words: x.words,
    fillers: x.fillers.map((f) => f.text),
    pronouns: x.pronouns,
    numbers: x.numbers.map((n) => n.text),
    timing: { ...x.timing, longGaps: x.timing.longGaps.map((g) => g.ms) },
  })
  return {
    focus: pickFocus(r, m),
    disagreements: findDisagreements(r, m),
    ...m,
    questions: m.questions.map((q) => ({
      id: q.questionId,
      status: q.status,
      answer: q.answer && one(q.answer),
      overTargetMs: q.overTargetMs,
      overTargetFrom: q.answer && q.overTargetAt !== null ? `${q.answer.text.slice(q.overTargetAt, q.overTargetAt + 40)}…` : null,
      followUp: q.followUp && { said: q.followUp.said, reply: q.followUp.reply && one(q.followUp.reply) },
    })),
  }
}

function CopyBlock({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState('')
  return (
    <details className="panel session-log">
      <summary>{title} (dev only)</summary>
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
          Copy
        </button>
        <span className="muted" role="status">
          {copied}
        </span>
      </div>
      <pre>{text}</pre>
    </details>
  )
}

export default function SessionLog({ report }: { report: InterviewReport }) {
  return (
    <>
      <CopyBlock title="Session log" text={JSON.stringify(sessionLog(report), null, 2)} />
      <CopyBlock title="Measured" text={JSON.stringify(measured(report), null, 2)} />
    </>
  )
}
