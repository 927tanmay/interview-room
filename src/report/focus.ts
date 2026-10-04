import type { PointTag } from '../interview/bank'
import type { QuestionRecord } from '../interview/engine'
import { formatDuration, plural, times } from './format'
import { PACE, paceBand, type InterviewMeasures, type QuestionMeasure } from './measure'
import { measures as measureReport, reviewFor, type InterviewReport } from './report'

// What the report suggests working on, picked by plain rules from the
// candidate's own marks and the measured numbers (PLAN.md: report). Nothing
// here judges an answer: every item says where it came from (their marks,
// their feel, or a measurement) and which answers it is about.
//
// Up to three things to work on, one per rule, in this order:
//   1. the kind of point they marked missed most often ("you left out the
//      result in 3 of 4 answers"); ties go to the one missed in the larger
//      share of the answers where it came up,
//   2. an answer that felt good but where they marked most points missed,
//   3. the answer furthest over the target time.
// Free places are filled from the numbers alone: filler phrases, then pace.
//
// Gentle disagreements, where their mark and the numbers do not quite agree:
//   - the result marked covered, but no number was heard in the answer,
//   - their own role marked covered, but "we" far more often than "I".

export type FocusSource = 'marks' | 'feel-and-marks' | 'measured'

export type FocusItem = {
  rule: 'missed-tag' | 'felt-good-missed' | 'over-target' | 'fillers' | 'pace'
  title: string
  detail: string
  source: FocusSource
  // How the item was found, in plain words, for the line under it.
  from: string
  // The answers it is about, for links to their cards.
  questionIds: string[]
}

export type Disagreement = {
  rule: 'result-no-number' | 'role-we'
  questionId: string
  question: string
  detail: string
}

export const MAX_FOCUS = 3

// A "we" count this many times the "I" count (and at least WE_MIN) is "far more".
const WE_RATIO = 2
const WE_MIN = 4
// The smallest overrun worth a focus item: 15% of the target, at least 10 s.
const OVER_SHARE = 0.15
const OVER_MIN_MS = 10_000
// Filler phrases per 100 words (main answers and follow-up replies) to suggest
// working on them, and the fewest that count.
const FILLERS_PER_100 = 2
const FILLERS_MIN = 5

// How each kind of point reads in a sentence, and as a thing to work on.
const TAG_WORDS: Record<PointTag, { noun: string; title: string }> = {
  situation: { noun: 'the situation', title: 'Set the scene first' },
  'own-role': { noun: 'your own part', title: 'Say what you did yourself' },
  action: { noun: 'what you did', title: 'Walk through your steps' },
  result: { noun: 'the result', title: 'End with the result' },
  lesson: { noun: 'what you changed afterwards', title: 'Say what you took from it' },
  example: { noun: 'a concrete example', title: 'Give a concrete example' },
  concept: { noun: 'the core idea', title: 'Lead with the core idea' },
  'edge-case': { noun: 'what can go wrong', title: 'Cover the edge cases' },
  'trade-off': { noun: 'the trade-offs', title: 'Mention the trade-offs' },
  motivation: { noun: 'what you are moving towards', title: 'Say what you want next' },
  framing: { noun: 'the framing', title: 'Keep the framing positive' },
}

export function pickFocus(report: InterviewReport, m: InterviewMeasures = measureReport(report)): FocusItem[] {
  const items: FocusItem[] = []
  const add = (item: FocusItem | null) => {
    if (item && items.length < MAX_FOCUS) items.push(item)
  }
  add(missedTag(report, m))
  add(feltGoodMissed(report, m))
  add(overTarget(report, m))
  add(fillers(m))
  add(pace(m))
  return items
}

export function findDisagreements(report: InterviewReport, m: InterviewMeasures = measureReport(report)): Disagreement[] {
  const out: Disagreement[] = []
  report.records.forEach((record, i) => {
    const q = m.questions[i]
    if (q.status !== 'answered' || !q.answer) return
    const covered = coveredTags(report, record)
    const reply = q.followUp?.reply ?? null
    const numbers = q.answer.numbers.length + (reply?.numbers.length ?? 0)
    if (covered.has('result') && numbers === 0) {
      out.push({
        rule: 'result-no-number',
        questionId: record.question.id,
        question: record.question.question,
        detail:
          "You marked the result as covered, but we didn't hear a number in this answer. If you gave one, Whisper may have missed it; if not, a before-and-after figure (time, users, errors) makes a result easier to believe.",
      })
    }
    const i_ = q.answer.pronouns.i + (reply?.pronouns.i ?? 0)
    const we = q.answer.pronouns.we + (reply?.pronouns.we ?? 0)
    if (covered.has('own-role') && we >= WE_MIN && we >= WE_RATIO * i_) {
      out.push({
        rule: 'role-we',
        questionId: record.question.id,
        question: record.question.question,
        detail: `You marked your own role as covered, and you said "we" ${times(we)} and "I" ${times(i_)}. It is worth a second look: an interviewer listens for what you did yourself.`,
      })
    }
  })
  return out
}

// --- Rules -------------------------------------------------------------------

type TagCount = { tag: PointTag; answers: string[]; missed: string[]; partly: string[] }

// For each kind of point: in how many reviewed answers it came up, and in
// which they marked it missed or partly. An answer counts once per kind.
function tagCounts(report: InterviewReport, m: InterviewMeasures): TagCount[] {
  const byTag = new Map<PointTag, TagCount>()
  reviewed(report, m).forEach((record) => {
    const review = reviewFor(report, record)
    const seen = new Map<PointTag, 'missed' | 'partly' | 'ok'>()
    ;(record.question.points ?? []).forEach((p, i) => {
      const mark = review.marks[i]
      if (mark === null) return
      const prev = seen.get(p.tag)
      const now = mark === 'missed' ? 'missed' : mark === 'partly' ? 'partly' : 'ok'
      // The weakest mark for this kind of point in this answer.
      if (!prev || rank(now) < rank(prev)) seen.set(p.tag, now)
    })
    seen.forEach((mark, tag) => {
      const t = byTag.get(tag) ?? { tag, answers: [], missed: [], partly: [] }
      t.answers.push(record.question.id)
      if (mark === 'missed') t.missed.push(record.question.id)
      if (mark === 'partly') t.partly.push(record.question.id)
      byTag.set(tag, t)
    })
  })
  return [...byTag.values()]
}

function rank(mark: 'missed' | 'partly' | 'ok') {
  return mark === 'missed' ? 0 : mark === 'partly' ? 1 : 2
}

// 1. The kind of point missed most often: missed in at least half of the
//    answers where it came up. Ties go to the larger share missed, then to
//    the one that came up most.
function missedTag(report: InterviewReport, m: InterviewMeasures): FocusItem | null {
  const best = tagCounts(report, m)
    .filter((t) => t.missed.length > 0 && t.missed.length * 2 >= t.answers.length)
    .sort(
      (a, b) =>
        b.missed.length - a.missed.length ||
        b.missed.length / b.answers.length - a.missed.length / a.answers.length ||
        b.answers.length - a.answers.length,
    )[0]
  if (!best) return null
  const words = TAG_WORDS[best.tag]
  const partly = best.partly.length ? ` (and only partly in ${best.partly.length} more)` : ''
  return {
    rule: 'missed-tag',
    title: words.title,
    detail:
      best.answers.length === 1
        ? `You marked ${words.noun} as missed in the one answer where it came up.`
        : `You marked ${words.noun} as missed in ${best.missed.length} of ${plural(best.answers.length, 'answer')} where it came up${partly}.`,
    source: 'marks',
    from: 'From your own marks.',
    questionIds: best.missed,
  }
}

// 2. An answer that felt good, where they marked at least half of the points
//    missed. The one with the most missed.
function feltGoodMissed(report: InterviewReport, m: InterviewMeasures): FocusItem | null {
  const found = reviewed(report, m)
    .map((record) => {
      const review = reviewFor(report, record)
      const marked = review.marks.filter((x) => x !== null).length
      const missed = review.marks.filter((x) => x === 'missed').length
      return { record, feel: review.feel, marked, missed }
    })
    .filter((x) => x.feel === 'good' && x.marked > 0 && x.missed > 0 && x.missed * 2 >= x.marked)
    .sort((a, b) => b.missed - a.missed)[0]
  if (!found) return null
  return {
    rule: 'felt-good-missed',
    title: 'Look again at one that felt good',
    detail: `"${found.record.question.question}" felt good, but you marked ${found.missed} of ${found.marked} points as missed. Answers can feel smooth and still leave things out.`,
    source: 'feel-and-marks',
    from: 'From how it felt and your own marks.',
    questionIds: [found.record.question.id],
  }
}

// 3. The answer furthest over the target time, by enough to matter.
function overTarget(report: InterviewReport, m: InterviewMeasures): FocusItem | null {
  const over = m.questions.filter(
    (q) => q.overTargetMs !== null && q.overTargetMs >= Math.max(OVER_MIN_MS, OVER_SHARE * q.targetMs),
  )
  const worst = [...over].sort((a, b) => b.overTargetMs! - a.overTargetMs!)[0]
  if (!worst) return null
  const record = recordFor(report, worst)
  const others = over.length > 1 ? ` ${over.length - 1} other ${over.length === 2 ? 'answer' : 'answers'} also went over.` : ''
  return {
    rule: 'over-target',
    title: 'Keep answers nearer the target',
    detail: `Your answer to "${record.question.question}" ran ${formatDuration(worst.answer!.timing.durationMs!)}; the target you set was ${formatDuration(worst.targetMs)}.${others}`,
    source: 'measured',
    from: 'Measured from your first word to your last, using the voice detector.',
    questionIds: [worst.questionId, ...over.filter((q) => q !== worst).map((q) => q.questionId)],
  }
}

// Fill-in: filler phrases, when there are enough of them to matter.
function fillers(m: InterviewMeasures): FocusItem | null {
  const total = m.fillers.reduce((s, f) => s + f.count, 0)
  if (total < FILLERS_MIN || m.words === 0 || (total / m.words) * 100 < FILLERS_PER_100) return null
  const top = m.fillers.slice(0, 2).map((f) => `"${f.phrase}" ${times(f.count)}`)
  const byAnswer = m.questions
    .map((q) => ({ id: q.questionId, n: (q.answer?.fillers.length ?? 0) + (q.followUp?.reply?.fillers.length ?? 0) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
  return {
    rule: 'fillers',
    title: 'Fewer filler phrases',
    detail: `You said ${top.join(' and ')}, ${total} filler phrases in ${m.words} words. A short pause works just as well.`,
    source: 'measured',
    from: "Counted in the transcript. Whisper drops most \"um\" and \"uh\", so those aren't counted.",
    questionIds: byAnswer.map((x) => x.id),
  }
}

// Fill-in: pace, when most measured answers sit outside the band the same way.
function pace(m: InterviewMeasures): FocusItem | null {
  const timed = m.questions.filter((q) => q.answer?.timing.wpm != null)
  if (timed.length === 0) return null
  const fast = timed.filter((q) => paceBand(q.answer!.timing.wpm) === 'fast')
  const slow = timed.filter((q) => paceBand(q.answer!.timing.wpm) === 'slow')
  const [side, list] = fast.length >= slow.length ? (['fast', fast] as const) : (['slow', slow] as const)
  if (list.length * 2 <= timed.length) return null
  const wpms = list.map((q) => q.answer!.timing.wpm!).join(', ')
  return {
    rule: 'pace',
    title: side === 'fast' ? 'Slow down a little' : 'A little more pace',
    detail: `${list.length} of ${plural(timed.length, 'answer')} were ${side === 'fast' ? 'above' : 'below'} ${side === 'fast' ? PACE.high : PACE.low} words a minute (${wpms}). Most people are easy to follow at ${PACE.low} to ${PACE.high}.`,
    source: 'measured',
    from: 'Words divided by the time you were actually talking, from the voice detector.',
    questionIds: list.map((q) => q.questionId),
  }
}

// --- Helpers -------------------------------------------------------------------

// Answered questions with points and at least one mark.
function reviewed(report: InterviewReport, m: InterviewMeasures): QuestionRecord[] {
  return report.records.filter((r, i) => {
    if (m.questions[i].status !== 'answered' || !r.question.points?.length) return false
    return reviewFor(report, r).marks.some((x) => x !== null)
  })
}

function coveredTags(report: InterviewReport, record: QuestionRecord): Set<PointTag> {
  const review = reviewFor(report, record)
  return new Set((record.question.points ?? []).filter((_, i) => review.marks[i] === 'covered').map((p) => p.tag))
}

function recordFor(report: InterviewReport, q: QuestionMeasure): QuestionRecord {
  return report.records.find((r) => r.question.id === q.questionId)!
}

// --- Next time, per answer -----------------------------------------------------

// What to do next time, for each kind of point, worded as an action. The
// point's own text follows in brackets, so the line stays specific.
const NEXT_TIME: Record<PointTag, string> = {
  situation: 'Set the scene in a sentence or two',
  'own-role': 'Say what you did yourself',
  action: 'Walk through the steps you took',
  result: 'Say how it turned out, with a number if you have one',
  lesson: 'Close with what you took from it',
  example: 'Give a concrete example',
  concept: 'Lead with the core idea',
  'edge-case': 'Cover what happens when something goes wrong',
  'trade-off': 'Mention the trade-off',
  motivation: 'Say what you are moving towards',
  framing: 'Keep it fair and positive',
}

export type NextTimeLine = { text: string; detail: string; partly: boolean }

// The "next time" list on an answer card: one line per point the candidate
// marked missed, then partly. Empty when nothing was missed, or when they
// skipped the self-review (then the marks are not theirs to build on).
export function nextTimeFor(report: InterviewReport, record: QuestionRecord): NextTimeLine[] {
  if (report.reviewState === 'skipped') return []
  const review = reviewFor(report, record)
  const points = record.question.points ?? []
  const line = (i: number, partly: boolean): NextTimeLine => ({
    text: NEXT_TIME[points[i].tag],
    detail: lowerStart(points[i].text),
    partly,
  })
  const missed = points.flatMap((_, i) => (review.marks[i] === 'missed' ? [line(i, false)] : []))
  const partly = points.flatMap((_, i) => (review.marks[i] === 'partly' ? [line(i, true)] : []))
  return [...missed, ...partly]
}

// "A before-and-after result" -> "a before-and-after result", but leave
// names and acronyms alone ("DNS turns…", "React…").
function lowerStart(text: string): string {
  return /^(A |[A-Z][a-z])/.test(text) && !/^React\b/.test(text) ? text[0].toLowerCase() + text.slice(1) : text
}
