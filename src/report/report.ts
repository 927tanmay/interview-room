import type { Display, Mode } from '../app/state'
import type { EngineSnapshot, Exchange, QuestionRecord } from '../interview/engine'
import type { InterviewSettings } from '../interview/settings'
import { measureInterview, type InterviewMeasures } from './measure'

// One finished interview, as the report and the self-review use it, and as it
// is saved on the device (store.ts). It keeps the engine's records as they
// were, questions included, so an old report still reads the same after the
// bank changes. The measured numbers are not saved: they are worked out from
// the records each time (measure.ts, instant).

// How an answer felt to the candidate, asked before they see the points.
export type Feel = 'good' | 'okay' | 'rough'

// The candidate's own mark for one strong-answer point.
export type Mark = 'covered' | 'partly' | 'missed'

// One answer's self-review: the feel, then a mark per point (same order as the
// question's `points`; null until marked).
export type AnswerReview = { feel: Feel | null; marks: (Mark | null)[] }

// 'skipped': the candidate went straight to the numbers.
export type ReviewState = 'not-started' | 'in-progress' | 'done' | 'skipped'

export type InterviewReport = {
  id: string
  version: 1
  createdAt: number
  mode: Mode
  display: Display
  settings: InterviewSettings
  records: QuestionRecord[]
  // The hello at the start and "any questions for me?" at the end.
  smallTalk: Exchange | null
  candidateQuestions: Exchange | null
  // Things the interview noticed about itself, e.g. Gemma failing.
  notes: string[]
  // By question id.
  review: Record<string, AnswerReview>
  reviewState: ReviewState
}

export function createReport(
  snapshot: EngineSnapshot,
  settings: InterviewSettings,
  mode: Mode,
  display: Display,
  now = Date.now(),
): InterviewReport {
  return {
    id: `interview-${now}`,
    version: 1,
    createdAt: now,
    mode,
    display,
    settings,
    // A copy: the live engine keeps no reference into a saved report.
    records: structuredClone(snapshot.records),
    smallTalk: structuredClone(snapshot.smallTalk),
    candidateQuestions: structuredClone(snapshot.candidateQuestions),
    notes: [...snapshot.notes],
    review: {},
    reviewState: 'not-started',
  }
}

// The answers the candidate reviews, in order: answered ones whose question
// has strong-answer points. Skipped, silent and empty answers are shown in the
// report as such, not reviewed.
export function reviewQueue(report: InterviewReport, m: InterviewMeasures = measures(report)): QuestionRecord[] {
  return report.records.filter(
    (r, i) => m.questions[i].status === 'answered' && (r.question.points?.length ?? 0) > 0,
  )
}

export function measures(report: InterviewReport): InterviewMeasures {
  return measureInterview(report.records, report.settings.answerMinutes * 60_000)
}

export function reviewFor(report: InterviewReport, record: QuestionRecord): AnswerReview {
  return (
    report.review[record.question.id] ?? {
      feel: null,
      marks: (record.question.points ?? []).map(() => null),
    }
  )
}

// Updates return a new report (React state, and saved as a whole).

export function setFeel(report: InterviewReport, record: QuestionRecord, feel: Feel): InterviewReport {
  const current = reviewFor(report, record)
  return withReview(report, record, { ...current, feel })
}

export function setMark(report: InterviewReport, record: QuestionRecord, point: number, mark: Mark): InterviewReport {
  const current = reviewFor(report, record)
  const marks = current.marks.map((m, i) => (i === point ? mark : m))
  return withReview(report, record, { ...current, marks })
}

export function setReviewState(report: InterviewReport, reviewState: ReviewState): InterviewReport {
  return { ...report, reviewState }
}

function withReview(report: InterviewReport, record: QuestionRecord, review: AnswerReview): InterviewReport {
  return {
    ...report,
    review: { ...report.review, [record.question.id]: review },
    reviewState: report.reviewState === 'not-started' ? 'in-progress' : report.reviewState,
  }
}
