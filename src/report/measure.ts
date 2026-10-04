import { answerText, type AnswerPart, type Exchange, type QuestionRecord } from '../interview/engine'
import { wordCount } from '../interview/text'

// What the report measures from the transcript and the voice detector's
// timings: plain code, no Gemma, instant. Nothing here judges an answer; it
// counts and times, and the report says how each number was found.
//
// Positions (`start`, `end`) are character offsets into the answer text as
// `answerText` joins it (stretches of speech separated by one space), so the
// report can highlight them in the quote.

export type Span = { start: number; end: number; text: string }

// Pace band for a spoken answer, in words per minute.
export const PACE = { low: 120, high: 160 }

// A gap between two stretches of speech longer than this is a long pause.
export const LONG_GAP_MS = 3000

// Below this much speech a words-per-minute figure is too noisy to show.
const MIN_SPEECH_FOR_PACE_MS = 5000
const MIN_WORDS_FOR_PACE = 15

// ------------------------------------------------------------------ fillers

// Filler phrases Whisper keeps. It drops most "um" and "uh", so those are not
// counted (the report says so). Each phrase also has a meaning that is not a
// filler ("what kind of database", "do you know"); `unless` is checked against
// the words just before it, `only` against the match itself.
const FILLERS: { phrase: string; re: RegExp; unless?: RegExp }[] = [
  { phrase: 'you know', re: /\byou know\b/gi, unless: /\b(do|did|don't|didn't|if|whether|would|will|as|what|let)\s+$/i },
  { phrase: 'I mean', re: /\bi mean\b/gi, unless: /\b(what|which)\s+$/i },
  { phrase: 'basically', re: /\bbasically\b/gi },
  {
    phrase: 'kind of',
    re: /\bkind of\b/gi,
    unless: /\b(what|which|a|the|this|that|these|those|any|some|same|every|one|my|our|your|their|of)\s+$/i,
  },
  {
    phrase: 'sort of',
    re: /\bsort of\b/gi,
    unless: /\b(what|which|a|the|this|that|these|those|any|some|same|every|one|my|our|your|their|of)\s+$/i,
  },
  // Only with a comma straight after: "it was, like, really slow".
  { phrase: 'like', re: /\blike(?=,)/gi, unless: /\b(would|i'd|we'd|you'd|look|looks|feel|feels|felt|seem|seems)\s+$/i },
  // Whisper often puts the comma before it instead: "it goes to the, like we
  // write it…" (a real run). Counted when a new clause follows, so "things,
  // like React" is not.
  { phrase: 'like', re: /(?<=,\s*)like(?=\s+(i|i'm|we|you|it|it's|they|he|she|so|suppose|um|uh)\b)/gi },
  // Opening a sentence: "Like I took the feedback…".
  { phrase: 'like', re: /(?<=^|[.!?]\s+)like(?=\s+(i|i'm|we|you|it|it's|they|he|she|so)\b)/gi },
]

export type FillerHit = Span & { phrase: string }

export function findFillers(text: string): FillerHit[] {
  const t = normalise(text)
  const hits: FillerHit[] = []
  for (const f of FILLERS) {
    for (const m of t.matchAll(f.re)) {
      const start = m.index
      const before = t.slice(Math.max(0, start - 20), start)
      if (f.unless?.test(before)) continue
      hits.push({ phrase: f.phrase, start, end: start + m[0].length, text: text.slice(start, start + m[0].length) })
    }
  }
  return hits.sort((a, b) => a.start - b.start)
}

// ------------------------------------------------------------------ "I" and "we"

const I_WORDS = /\b(i'm|i've|i'd|i'll|myself|mine|my|me|i)\b/gi
const WE_WORDS = /\b(we're|we've|we'd|we'll|ourselves|ours|our|us|we)\b/gi

// How often the candidate says "I" (I, me, my...) and "we" (we, us, our...),
// leaving out the "I" inside the filler "I mean".
export function countPronouns(text: string, fillers: FillerHit[] = findFillers(text)): { i: number; we: number } {
  const t = normalise(text)
  const inFiller = (at: number) => fillers.some((f) => at >= f.start && at < f.end)
  const count = (re: RegExp) => [...t.matchAll(re)].filter((m) => !inFiller(m.index)).length
  return { i: count(I_WORDS), we: count(WE_WORDS) }
}

// ------------------------------------------------------------------ numbers

const UNITS =
  '%|percent|per cent|x|times|ms|milliseconds?|seconds?|secs?|minutes?|mins?|hours?|days?|weeks?|months?|years?|k|kb|mb|gb|tb|users?|requests?|people|customers?|lakhs?|crores?|dollars?|rupees?|bugs?|tickets?|errors?'
const NUMBER_WORD =
  'two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|lakh|crore|half|twice|dozen'
// A figure: "$5", "40%", "2.5 seconds", "9 x", "two hundred thousand users".
const NUMBER = new RegExp(
  `(?:[$₹€£]\\s?)?\\b\\d+(?:[.,]\\d+)*(?:\\s?(?:${UNITS})\\b|%)?` +
    `|\\b(?:one(?=[\\s-]+(?:hundred|thousand|million|billion|lakh|crore))|${NUMBER_WORD})(?:[\\s-]+(?:and\\s+)?(?:${NUMBER_WORD}))*(?:\\s(?:${UNITS})\\b)?`,
  'gi',
)
// A year on its own ("back in 2023") is not a figure about the work.
const YEAR = /^(19|20)\d\d$/
// Nor is a vague amount: "one or two members" (a real run).
const VAGUE = /\b(one or two|two or three|three or four|a couple of|a few)\b/gi

export function findNumbers(text: string): Span[] {
  const t = normalise(text)
  const vague = [...t.matchAll(VAGUE)].map((m) => [m.index, m.index + m[0].length])
  const spans: Span[] = []
  for (const m of t.matchAll(NUMBER)) {
    if (YEAR.test(m[0])) continue
    if (vague.some(([a, b]) => m.index < b && m.index + m[0].length > a)) continue
    spans.push({ start: m.index, end: m.index + m[0].length, text: text.slice(m.index, m.index + m[0].length) })
  }
  return spans
}

// ------------------------------------------------------------------ timing

export type Timing = {
  // From the interviewer finishing the question to the first word. Null when
  // either time is missing. Zero when the candidate started before the
  // interviewer finished (`talkedOver`).
  firstWordMs: number | null
  talkedOver: boolean
  // Gaps between stretches of speech longer than LONG_GAP_MS. `afterPart` is
  // the index of the stretch before the gap; `at` is the character offset in
  // the answer where the next stretch starts.
  longGaps: { afterPart: number; at: number; ms: number }[]
  // First word to last word. Null when the voice detector's times are missing.
  durationMs: number | null
  // Time actually spent talking (the detector's `speechMs`, summed).
  speechMs: number | null
  // Words per minute of speech. Null when there is too little to go on.
  wpm: number | null
}

// Character offset where each stretch starts in the joined answer text.
function partOffsets(parts: AnswerPart[]): number[] {
  const offsets: number[] = []
  let at = 0
  for (const p of parts) {
    offsets.push(at)
    at += p.text.length + 1
  }
  return offsets
}

export function measureTiming(exchange: Exchange): Timing {
  const parts = exchange.parts
  const first = parts[0]
  const offsets = partOffsets(parts)

  let firstWordMs: number | null = null
  let talkedOver = false
  if (first?.startedAt !== undefined && exchange.askedEndedAt !== undefined) {
    const gap = first.startedAt - exchange.askedEndedAt
    talkedOver = gap < 0
    firstWordMs = Math.max(0, gap)
  }

  const longGaps: Timing['longGaps'] = []
  for (let i = 1; i < parts.length; i++) {
    const end = parts[i - 1].endedAt
    const start = parts[i].startedAt
    if (end === undefined || start === undefined) continue
    if (start - end > LONG_GAP_MS) longGaps.push({ afterPart: i - 1, at: offsets[i], ms: start - end })
  }

  const timed = parts.length > 0 && parts.every((p) => p.startedAt !== undefined && p.endedAt !== undefined)
  const durationMs = timed ? parts.at(-1)!.endedAt! - first.startedAt! : null

  const withSpeech = parts.filter((p) => p.speechMs !== undefined)
  const speechMs = withSpeech.length ? withSpeech.reduce((s, p) => s + p.speechMs!, 0) : null
  const spokenWords = withSpeech.reduce((s, p) => s + wordCount(p.text), 0)
  const wpm =
    speechMs !== null && speechMs >= MIN_SPEECH_FOR_PACE_MS && spokenWords >= MIN_WORDS_FOR_PACE
      ? Math.round((spokenWords / speechMs) * 60000)
      : null

  return { firstWordMs, talkedOver, longGaps, durationMs, speechMs, wpm }
}

export function paceBand(wpm: number | null): 'slow' | 'in-band' | 'fast' | null {
  if (wpm === null) return null
  return wpm < PACE.low ? 'slow' : wpm > PACE.high ? 'fast' : 'in-band'
}

// Where an answer passed its target time, as a character offset into the
// answer, so the report can shade the rest. Null when it stayed within the
// target or the detector's times are missing. Inside a stretch, the point is
// placed by the share of its words (speech is roughly even within a stretch).
export function overTargetAt(exchange: Exchange, targetMs: number): number | null {
  const parts = exchange.parts
  if (!parts.length || parts.some((p) => p.startedAt === undefined || p.endedAt === undefined)) return null
  const limit = parts[0].startedAt! + targetMs
  if (parts.at(-1)!.endedAt! <= limit) return null
  const offsets = partOffsets(parts)
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]
    if (limit <= p.startedAt!) return offsets[i]
    if (limit < p.endedAt!) {
      const share = (limit - p.startedAt!) / (p.endedAt! - p.startedAt!)
      const words = [...p.text.matchAll(/\S+/g)]
      const word = words[Math.min(words.length - 1, Math.floor(share * words.length))]
      return offsets[i] + (word?.index ?? 0)
    }
  }
  return null
}

// ------------------------------------------------------------------ one answer

export type ExchangeMeasure = {
  text: string
  words: number
  fillers: FillerHit[]
  pronouns: { i: number; we: number }
  numbers: Span[]
  timing: Timing
}

export function measureExchange(exchange: Exchange): ExchangeMeasure {
  const text = answerText(exchange)
  const fillers = findFillers(text)
  return {
    text,
    words: wordCount(text),
    fillers,
    pronouns: countPronouns(text, fillers),
    numbers: findNumbers(text),
    timing: measureTiming(exchange),
  }
}

// How a question went, for the report. Anything but 'answered' is shown as
// such and not measured. 'empty' is a question the interview ended on before
// anything was said.
export type AnswerStatus = 'answered' | 'skipped' | 'silent' | 'dont-know' | 'empty'

export type QuestionMeasure = {
  questionId: string
  status: AnswerStatus
  targetMs: number
  answer: ExchangeMeasure | null
  overTargetMs: number | null
  overTargetAt: number | null
  followUp: { said: string; reply: ExchangeMeasure | null } | null
}

export function measureQuestion(record: QuestionRecord, targetMs: number): QuestionMeasure {
  const main = record.exchanges[0]
  const followUp = record.exchanges.find((e) => e.kind === 'follow-up') ?? null
  const hasWords = !!main && wordCount(answerText(main)) > 0
  const status: AnswerStatus = record.outcome !== 'answered' ? record.outcome : hasWords ? 'answered' : 'empty'
  const answer = status === 'answered' && main ? measureExchange(main) : null
  const duration = answer?.timing.durationMs ?? null
  return {
    questionId: record.question.id,
    status,
    targetMs,
    answer,
    overTargetMs: duration !== null && duration > targetMs ? duration - targetMs : null,
    overTargetAt: answer ? overTargetAt(main, targetMs) : null,
    followUp:
      status === 'answered' && followUp
        ? { said: followUp.said, reply: followUp.parts.length ? measureExchange(followUp) : null }
        : null,
  }
}

// ------------------------------------------------------------------ the interview

export type InterviewMeasures = {
  questions: QuestionMeasure[]
  answered: number
  // Totals across main answers and follow-up replies.
  words: number
  fillers: { phrase: string; count: number }[]
  pronouns: { i: number; we: number }
  longGaps: number
  // Main answers only.
  overTarget: number
  firstWordMs: number[]
}

export function measureInterview(records: QuestionRecord[], targetMs: number): InterviewMeasures {
  const questions = records.map((r) => measureQuestion(r, targetMs))
  const spoken = questions.flatMap((q) => [q.answer, q.followUp?.reply ?? null]).filter((m) => m !== null)
  const byPhrase = new Map<string, number>()
  for (const f of spoken.flatMap((m) => m.fillers)) byPhrase.set(f.phrase, (byPhrase.get(f.phrase) ?? 0) + 1)
  return {
    questions,
    answered: questions.filter((q) => q.status === 'answered').length,
    words: spoken.reduce((s, m) => s + m.words, 0),
    fillers: [...byPhrase].map(([phrase, count]) => ({ phrase, count })).sort((a, b) => b.count - a.count),
    pronouns: spoken.reduce((s, m) => ({ i: s.i + m.pronouns.i, we: s.we + m.pronouns.we }), { i: 0, we: 0 }),
    longGaps: spoken.reduce((s, m) => s + m.timing.longGaps.length, 0),
    overTarget: questions.filter((q) => q.overTargetMs !== null).length,
    firstWordMs: questions.map((q) => q.answer?.timing.firstWordMs ?? null).filter((ms) => ms !== null),
  }
}

// Curly apostrophes to straight ones, same length, so offsets still line up.
function normalise(text: string): string {
  return text.replace(/[’‘]/g, "'")
}
