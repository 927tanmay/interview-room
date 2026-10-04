import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ScreenFrame } from '../components/ScreenFrame'
import { POINT_TAGS } from '../interview/bank'
import { answerText, type QuestionRecord } from '../interview/engine'
import {
  reviewFor,
  setFeel,
  setMark,
  setReviewState,
  type Feel,
  type InterviewReport,
  type Mark,
} from '../report/report'

// The self-review, one answer at a time (PLAN.md: report). First the question,
// their own words and how it felt; then what a strong answer usually covers,
// beside their answer, each point marked covered, partly or missed. The app
// never judges: these are the candidate's marks, and the report builds on
// them and on the measured numbers. About a minute or two for an interview.
//
// Keyboard: the shortcuts work while focus is inside this screen (WCAG 2.1.4),
// and every one has a button or radio that does the same.

const FEELS: { value: Feel; label: string; key: string }[] = [
  { value: 'good', label: 'Good', key: '1' },
  { value: 'okay', label: 'Okay', key: '2' },
  { value: 'rough', label: 'Rough', key: '3' },
]

const MARKS: { value: Mark; label: string; key: string }[] = [
  { value: 'covered', label: 'Covered', key: 'C' },
  { value: 'partly', label: 'Partly', key: 'P' },
  { value: 'missed', label: 'Missed', key: 'M' },
]

type Stage = 'feel' | 'points'

// Where to pick up: the first answer not fully reviewed.
function firstOpen(report: InterviewReport, queue: QuestionRecord[]): { index: number; stage: Stage } {
  for (let i = 0; i < queue.length; i++) {
    const r = reviewFor(report, queue[i])
    if (r.feel === null) return { index: i, stage: 'feel' }
    if (r.marks.some((m) => m === null)) return { index: i, stage: 'points' }
  }
  return { index: 0, stage: 'feel' }
}

export function Review({
  report,
  queue,
  onChange,
}: {
  report: InterviewReport
  queue: QuestionRecord[]
  onChange: (report: InterviewReport) => void
}) {
  const [{ index, stage }, setStep] = useState(() => firstOpen(report, queue))
  const [current, setCurrent] = useState(0)
  const stepHeading = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  const record = queue[index]
  const review = reviewFor(report, record)
  const points = record.question.points ?? []
  const last = index === queue.length - 1

  // Focus moves to the step's heading when the step changes (not on the first
  // render, when the screen heading takes it).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    stepHeading.current?.focus()
  }, [index, stage])

  const go = (next: { index: number; stage: Stage }) => {
    setStep(next)
    if (next.stage === 'points') {
      const r = reviewFor(report, queue[next.index])
      const open = r.marks.findIndex((m) => m === null)
      setCurrent(open === -1 ? 0 : open)
    }
  }

  const chooseFeel = (feel: Feel) => {
    onChange(setFeel(report, record, feel))
    go({ index, stage: 'points' })
  }

  const mark = (point: number, value: Mark) => {
    const next = setMark(report, record, point, value)
    onChange(next)
    // On to the next point still unmarked, if any.
    const marks = reviewFor(next, record).marks
    const open = marks.findIndex((m, i) => m === null && i > point)
    const anyOpen = open !== -1 ? open : marks.findIndex((m) => m === null)
    setCurrent(anyOpen !== -1 ? anyOpen : point)
  }

  const nextAnswer = () => {
    if (last) onChange(setReviewState(report, 'done'))
    else go({ index: index + 1, stage: 'feel' })
  }

  const back = () => {
    if (stage === 'points') go({ index, stage: 'feel' })
    else if (index > 0) go({ index: index - 1, stage: 'points' })
  }

  const skip = () => onChange(setReviewState(report, 'skipped'))

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    const target = e.target as HTMLElement
    const onRadio = target instanceof HTMLInputElement && target.type === 'radio'
    const onButton = target instanceof HTMLButtonElement
    const key = e.key.toLowerCase()
    let handled = true
    if (stage === 'feel') {
      const feel = FEELS.find((f) => f.key === key)
      if (feel) chooseFeel(feel.value)
      else if (key === 'backspace' && index > 0) back()
      else handled = false
    } else {
      const m = MARKS.find((x) => x.key.toLowerCase() === key)
      if (m) mark(current, m.value)
      // Arrow keys on a radio move within its row, as radios do.
      else if ((key === 'arrowdown' || key === 'j') && !onRadio) setCurrent((c) => Math.min(points.length - 1, c + 1))
      else if ((key === 'arrowup' || key === 'k') && !onRadio) setCurrent((c) => Math.max(0, c - 1))
      else if (key === 'enter' && !onButton) nextAnswer()
      else if (key === 'backspace') back()
      else handled = false
    }
    if (handled) e.preventDefault()
  }

  const followUp = record.exchanges.find((e) => e.kind === 'follow-up')
  const reply = followUp ? answerText(followUp) : ''

  const answer = (
    <div className="answer-quote" tabIndex={0} aria-label="Your answer">
      <p>{answerText(record.exchanges[0])}</p>
      {followUp && (
        <>
          <p className="label">Follow-up: {followUp.said}</p>
          <p>{reply || <span className="muted">No reply.</span>}</p>
        </>
      )}
    </div>
  )

  return (
    <div onKeyDown={onKeyDown}>
      <ScreenFrame title="Look back at your answers">
        <div className="review-bar">
          <ol className="dots" aria-label={`Answer ${index + 1} of ${queue.length}`}>
            {queue.map((r, i) => (
              <li key={r.question.id} className={`dot ${i === index ? 'dot-current' : i < index ? 'dot-done' : ''}`}>
                <span className="sr-only">
                  Answer {i + 1}
                  {i === index ? ', current' : i < index ? ', reviewed' : ''}
                </span>
              </li>
            ))}
          </ol>
          <span className="muted">
            Answer {index + 1} of {queue.length} · {stage === 'feel' ? 'how it felt' : 'the points'}
          </span>
          <button type="button" className="quiet" onClick={skip}>
            Skip to the numbers
          </button>
        </div>

        <p className="label">Question</p>
        <p className="question">{record.question.question}</p>

        {stage === 'feel' ? (
          <>
            {answer}
            <h2 ref={stepHeading} tabIndex={-1} className="review-step">
              How did that one feel?
            </h2>
            <div className="feel-options" role="group" aria-label="How did that one feel?">
              {FEELS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={review.feel === f.value}
                  className={review.feel === f.value ? 'feel feel-chosen' : 'feel'}
                  onClick={() => chooseFeel(f.value)}
                >
                  {f.label} <kbd aria-hidden="true">{f.key}</kbd>
                </button>
              ))}
            </div>
            <p className="muted key-help">Your first impression is fine. Press 1, 2 or 3.</p>
          </>
        ) : (
          <div className="review-grid">
            <div>
              <p className="label">What you said</p>
              {answer}
              <p className="muted">
                Felt: {FEELS.find((f) => f.value === review.feel)?.label ?? 'not chosen'}.{' '}
                <button type="button" className="link" onClick={back}>
                  Change
                </button>
              </p>
            </div>
            <div>
              <h2 ref={stepHeading} tabIndex={-1} className="review-step">
                What a strong answer usually covers
              </h2>
              <p className="muted">Mark each one against what you said. It's your call; nothing here is scored.</p>
              <ol className="points">
                {points.map((p, i) => (
                  <li
                    key={i}
                    className={i === current ? 'point point-current' : 'point'}
                    onFocus={() => setCurrent(i)}
                    onClick={() => setCurrent(i)}
                  >
                    <span className="point-tag">{POINT_TAGS[p.tag]}</span>
                    <span className="point-text" id={`point-${record.question.id}-${i}`}>
                      {p.text}
                    </span>
                    <div className="chips marks" role="radiogroup" aria-labelledby={`point-${record.question.id}-${i}`}>
                      {MARKS.map((m) => (
                        <label key={m.value} className="chip">
                          <input
                            type="radio"
                            name={`mark-${record.question.id}-${i}`}
                            value={m.value}
                            checked={review.marks[i] === m.value}
                            onChange={() => mark(i, m.value)}
                          />
                          <span>{m.label}</span>
                        </label>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
              <p className="muted key-help">
                <kbd>C</kbd> covered, <kbd>P</kbd> partly, <kbd>M</kbd> missed for the highlighted point; <kbd>↑</kbd>{' '}
                <kbd>↓</kbd> to move; <kbd>Enter</kbd> for the next answer.
              </p>
            </div>
          </div>
        )}

        <div className="actions">
          <button type="button" onClick={back} disabled={stage === 'feel' && index === 0}>
            Back
          </button>
          {stage === 'points' && (
            <button type="button" className="primary" onClick={nextAnswer}>
              {last ? 'See the report' : 'Next answer'}
            </button>
          )}
        </div>
      </ScreenFrame>
    </div>
  )
}
