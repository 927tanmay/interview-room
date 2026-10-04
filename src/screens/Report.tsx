import { lazy, Suspense } from 'react'
import { AnswerQuote } from '../components/AnswerQuote'
import { FillerChart, FirstWordChart, LengthChart, PaceChart } from '../components/ReportCharts'
import { ScreenFrame } from '../components/ScreenFrame'
import { POINT_TAGS, type BankQuestion, type Round } from '../interview/bank'
import type { QuestionRecord } from '../interview/engine'
import { findDisagreements, nextTimeFor, pickFocus } from '../report/focus'
import { formatDuration, formatSeconds, plural, times } from '../report/format'
import { PACE, type ExchangeMeasure, type QuestionMeasure } from '../report/measure'
import { measures, reviewFor, reviewQueue, setReviewState, type InterviewReport, type Mark } from '../report/report'
import { saveReport, useReport } from '../report/store'
import { Review } from './Review'

const SessionLog = import.meta.env.DEV ? lazy(() => import('../dev/SessionLog')) : null

// After the interview: first the candidate's own look back at each answer
// (Review), which they can skip, then this report (PLAN.md: report; UX.md:
// report). Specific to what they said: their own words, with the measured
// numbers marked in place. No scores anywhere. What to work on comes from
// plain rules over their marks and the numbers (focus.ts), and each item says
// where it came from. Reads the saved report, so it survives a reload.

const ROUND: Record<Round, string> = {
  behavioural: 'Behavioural',
  technical: 'Technical',
  hr: 'HR',
  'system-design': 'System design',
}

const MARK: Record<Mark, { icon: string; word: string }> = {
  covered: { icon: '✓', word: 'Covered' },
  partly: { icon: '~', word: 'Partly' },
  missed: { icon: '✗', word: 'Missed' },
}

const NOT_MEASURED: Record<Exclude<QuestionMeasure['status'], 'answered'>, string> = {
  skipped: 'Skipped, so not measured.',
  silent: 'No answer: the interview moved on after a long silence. Not measured.',
  'dont-know': "You said you didn't know, and the interview moved on. Not measured.",
  empty: 'The interview ended before you answered. Not measured.',
}

const anchor = (questionId: string) => `answer-${questionId}`

export function Report({
  reportId,
  onPracticeAgain,
  onPracticeQuestion,
  onHome,
}: {
  reportId: string | null
  onPracticeAgain: () => void
  onPracticeQuestion: (question: BankQuestion) => void
  onHome: () => void
}) {
  const { report, loading } = useReport(reportId)
  const queue = report ? reviewQueue(report) : []
  const reviewing =
    report && queue.length > 0 && (report.reviewState === 'not-started' || report.reviewState === 'in-progress')

  if (reviewing) return <Review report={report} queue={queue} onChange={(next) => void saveReport(next)} />

  const actions = (
    <div className="actions no-print">
      <button type="button" onClick={onHome}>
        Home
      </button>
      {report && report.records.length > 0 && (
        <button type="button" onClick={() => window.print()}>
          Save as PDF
        </button>
      )}
      <button type="button" className="primary" onClick={onPracticeAgain}>
        Practice again
      </button>
    </div>
  )

  if (!report) {
    return (
      <ScreenFrame title="Your interview">
        <p className="muted">{loading ? 'Loading your report…' : 'This report could not be found on this device.'}</p>
        {actions}
      </ScreenFrame>
    )
  }

  const m = measures(report)
  const focus = pickFocus(report, m)
  const disagreements = findDisagreements(report, m)
  const number = (questionId: string) => report.records.findIndex((r) => r.question.id === questionId) + 1
  const counts = {
    answered: m.answered,
    other: report.records.length - m.answered,
  }

  return (
    <ScreenFrame title="Your interview">
      <p className="lede report-meta">
        {new Date(report.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })} ·{' '}
        {plural(report.records.length, 'question')}
        {counts.other > 0 && ` (${counts.answered} answered)`} · {report.display === 'video' ? 'Video interview' : 'Phone screen'}
        , {report.mode === 'heavy' ? 'Heavy' : 'Light'} mode
      </p>

      {report.records.length === 0 ? (
        <p>The interview ended before the first question, so there is nothing to show yet.</p>
      ) : (
        <>
          {report.notes.map((note) => (
            <p key={note} className="notice">
              {note}
            </p>
          ))}

          <section aria-labelledby="focus-title" className="report-section">
            <h2 id="focus-title">Things to work on</h2>
            {focus.length === 0 ? (
              <p className="muted">
                {report.reviewState === 'skipped'
                  ? 'Nothing stood out in the numbers. Look back at your answers to get suggestions from your own marks.'
                  : 'Nothing stood out from your marks or the numbers. Pick one answer below and practice it again anyway.'}
              </p>
            ) : (
              <ol className="focus-list">
                {focus.map((f) => (
                  <li key={f.rule} className="panel focus-item">
                    <h3>{f.title}</h3>
                    <p>{f.detail}</p>
                    <p className="muted focus-from">
                      {f.from}{' '}
                      <span className="no-print">
                        {f.questionIds.map((id, i) => (
                          <span key={id}>
                            {i > 0 && ', '}
                            <a href={`#${anchor(id)}`}>Question {number(id)}</a>
                          </span>
                        ))}
                      </span>
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {disagreements.length > 0 && (
            <section aria-labelledby="second-look-title" className="report-section">
              <h2 id="second-look-title">Worth a second look</h2>
              <ul className="plain-list">
                {disagreements.map((d) => (
                  <li key={d.rule + d.questionId} className="panel">
                    <p className="label">
                      <a href={`#${anchor(d.questionId)}`}>Question {number(d.questionId)}</a>
                    </p>
                    <p>{d.detail}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {m.answered > 0 && (
            <section aria-labelledby="numbers-title" className="report-section">
              <h2 id="numbers-title">The numbers</h2>
              <div className="charts">
                <LengthChart m={m} />
                <PaceChart m={m} />
                <FirstWordChart m={m} />
                <FillerChart m={m} />
              </div>
              <p className="muted">
                Across all your answers and follow-up replies: {m.words} words, "I" {times(m.pronouns.i)}, "we"{' '}
                {times(m.pronouns.we)}, {plural(m.longGaps, 'pause')} over 3 seconds.
              </p>
            </section>
          )}

          <section aria-labelledby="answers-title" className="report-section">
            <h2 id="answers-title">Your answers</h2>
            {report.records.map((record, i) => (
              <AnswerCard
                key={record.question.id}
                index={i}
                report={report}
                record={record}
                q={m.questions[i]}
                onPractice={() => onPracticeQuestion(record.question)}
              />
            ))}
          </section>

          {queue.length > 0 && (
            <p className="no-print">
              <button type="button" onClick={() => void saveReport(setReviewState(report, 'in-progress'))}>
                {report.reviewState === 'skipped' ? 'Look back at your answers' : 'Change your marks'}
              </button>
            </p>
          )}

          <HowMeasured />
        </>
      )}

      {SessionLog && (
        <div className="no-print">
          <Suspense fallback={null}>
            <SessionLog report={report} />
          </Suspense>
        </div>
      )}

      {actions}
    </ScreenFrame>
  )
}

function AnswerCard({
  index,
  report,
  record,
  q,
  onPractice,
}: {
  index: number
  report: InterviewReport
  record: QuestionRecord
  q: QuestionMeasure
  onPractice: () => void
}) {
  const review = reviewFor(report, record)
  const points = record.question.points ?? []
  const marked = review.marks.some((x) => x !== null) || review.feel !== null
  const nextTime = nextTimeFor(report, record)
  const titleId = `${anchor(record.question.id)}-title`

  return (
    <article id={anchor(record.question.id)} className="panel answer-card" aria-labelledby={titleId}>
      <p className="label">
        Question {index + 1} · {ROUND[record.question.round]}
      </p>
      <h3 id={titleId} className="answer-question">
        {record.question.question}
      </h3>

      {q.status !== 'answered' || !q.answer ? (
        <p className="muted">{NOT_MEASURED[q.status as keyof typeof NOT_MEASURED]}</p>
      ) : (
        <>
          <AnswerQuote
            text={q.answer.text}
            fillers={q.answer.fillers}
            numbers={q.answer.numbers}
            overAt={q.overTargetAt}
            gaps={q.answer.timing.longGaps}
          />

          {q.followUp && (
            <div className="follow-up">
              <p className="label">Follow-up</p>
              <p className="said">{q.followUp.said}</p>
              {q.followUp.reply ? (
                <AnswerQuote
                  text={q.followUp.reply.text}
                  fillers={q.followUp.reply.fillers}
                  numbers={q.followUp.reply.numbers}
                  gaps={q.followUp.reply.timing.longGaps}
                />
              ) : (
                <p className="muted">No reply.</p>
              )}
            </div>
          )}

          <Measured q={q} answer={q.answer} />

          {points.length > 0 && (
            <div className="your-marks">
              <p className="label">Your marks</p>
              {marked ? (
                <>
                  {review.feel && <p>Felt {review.feel}.</p>}
                  <ul className="marks-list">
                    {points.map((p, i) => {
                      const mark = review.marks[i]
                      return (
                        <li key={i} className={mark ? `mark-${mark}` : 'mark-none'}>
                          <span className="mark-word">
                            <span aria-hidden="true">{mark ? MARK[mark].icon : '·'}</span> {mark ? MARK[mark].word : 'Not marked'}
                          </span>
                          <span>
                            <span className="point-tag">{POINT_TAGS[p.tag]}</span> {p.text}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </>
              ) : (
                <p className="muted">Not reviewed.</p>
              )}
            </div>
          )}

          {nextTime.length > 0 && (
            <div className="next-time">
              <p className="label">Next time</p>
              <ul>
                {nextTime.map((n, i) => (
                  <li key={i}>
                    {n.text} <span className="muted">({n.detail})</span>
                    {n.partly && <span className="next-partly"> · you covered part of this</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="actions no-print">
        <button type="button" onClick={onPractice}>
          Practice this one again
        </button>
      </div>
    </article>
  )
}

function Measured({ q, answer }: { q: QuestionMeasure; answer: ExchangeMeasure }) {
  const t = answer.timing
  const fillerCounts = new Map<string, number>()
  for (const f of answer.fillers) fillerCounts.set(f.phrase, (fillerCounts.get(f.phrase) ?? 0) + 1)
  const pace =
    t.wpm === null
      ? 'too short to measure'
      : `${t.wpm} words a minute${t.wpm < PACE.low ? ', below' : t.wpm > PACE.high ? ', above' : ', within'} ${PACE.low}–${PACE.high}`

  return (
    <dl className="measured">
      <div>
        <dt>Length</dt>
        <dd>
          {t.durationMs === null
            ? 'not measured'
            : `${formatDuration(t.durationMs)} (target ${formatDuration(q.targetMs)}${q.overTargetMs ? `, ${formatDuration(q.overTargetMs)} over` : ''})`}
        </dd>
      </div>
      <div>
        <dt>Pace</dt>
        <dd>{pace}</dd>
      </div>
      <div>
        <dt>First word</dt>
        <dd>
          {t.firstWordMs === null
            ? 'not measured'
            : t.talkedOver
              ? 'you started before the question ended'
              : `${formatSeconds(t.firstWordMs)} after the question`}
        </dd>
      </div>
      <div>
        <dt>Pauses over 3 s</dt>
        <dd>{t.longGaps.length ? t.longGaps.map((g) => formatSeconds(g.ms)).join(', ') : 'none'}</dd>
      </div>
      <div>
        <dt>Filler phrases</dt>
        <dd>
          {fillerCounts.size
            ? [...fillerCounts].map(([phrase, n]) => (n > 1 ? `"${phrase}" ×${n}` : `"${phrase}"`)).join(', ')
            : 'none counted'}
        </dd>
      </div>
      <div>
        <dt>"I" and "we"</dt>
        <dd>
          "I" {times(answer.pronouns.i)}, "we" {times(answer.pronouns.we)}
        </dd>
      </div>
      <div>
        <dt>Numbers</dt>
        <dd>{answer.numbers.length ? answer.numbers.map((n) => n.text).join(', ') : 'none heard'}</dd>
      </div>
    </dl>
  )
}

function HowMeasured() {
  return (
    <section aria-labelledby="how-title" className="report-section how-measured">
      <h2 id="how-title">How these were measured</h2>
      <ul>
        <li>
          <strong>Length:</strong> from your first word to your last, using the voice detector, across thinking
          pauses. The follow-up reply is not included.
        </li>
        <li>
          <strong>Pace:</strong> the words Whisper heard, divided by the time you were actually talking. Gaps between
          sentences don't count.
        </li>
        <li>
          <strong>First word:</strong> from when the interviewer finished asking (or finished a repeat you asked for)
          to your first word.
        </li>
        <li>
          <strong>Pauses:</strong> gaps of more than 3 seconds between stretches of speech.
        </li>
        <li>
          <strong>Filler phrases:</strong> "you know", "I mean", "basically", "kind of", "sort of", and "like" followed
          by a comma, counted in the transcript. Whisper drops most "um" and "uh", so those aren't counted.
        </li>
        <li>
          <strong>"I" and "we":</strong> I, me, my, I'm and so on, against we, us, our and so on.
        </li>
        <li>
          <strong>Numbers:</strong> figures and spoken numbers ("9 seconds", "two hundred users"); a year on its own is
          left out.
        </li>
        <li>
          <strong>Your marks</strong> are your own. The app doesn't judge your answers; the suggestions above come from
          plain rules over your marks and these numbers.
        </li>
        <li>
          The quotes are what Whisper (the base model) heard. It can mishear technical terms and names, so a quote may
          not be word for word.
        </li>
        <li>
          Everything here was worked out on this device, and nothing you said left the browser. The report is saved
          only in this browser.
        </li>
      </ul>
    </section>
  )
}
