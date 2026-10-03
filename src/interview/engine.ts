import { chooseAngle, writtenFollowUp, type Angle } from './angles'
import type { BankQuestion, Level, Track } from './bank'
import { lines, pick, type Mood } from './lines'

// The interview engine: plain code, no React, no audio (PLAN.md section 4).
// It decides what happens next; Gemma only words some of the lines (`write`),
// and anything Gemma cannot word well falls back to a written line.
//
// Input arrives one stretch of speech at a time (the package calls onSubmit at
// every pause). The engine keeps collecting until the candidate presses
// "I'm done" or stays quiet for a long pause, so thinking pauses never cut an
// answer short (UX.md: interview screen). It always replies '' to the package
// (say nothing, keep listening) and speaks its own lines through `speak`.

export type InterviewPlan = {
  questions: BankQuestion[]
  track: Track
  level: Level
  interviewer: string
  mood: Mood
  candidateName?: string
}

export type ExchangeKind = 'small-talk' | 'question' | 'follow-up' | 'probe' | 'clarification' | 'candidate-questions'

export type AnswerPart = { text: string; speechMs?: number; at: number }

// One thing the interviewer said and what the candidate said back.
// For a follow-up, which angle it probed and whether Gemma worded it.
export type Exchange = { kind: ExchangeKind; said: string; parts: AnswerPart[]; angle?: Angle; byGemma?: boolean }

export type QuestionRecord = {
  question: BankQuestion
  exchanges: Exchange[]
  skipped: boolean
  startedAt: number
  endedAt?: number
}

export type Phase = 'not-started' | 'small-talk' | 'answering' | 'follow-up' | 'design' | 'candidate-questions' | 'done'

export type EngineSnapshot = {
  phase: Phase
  // True while the engine is working out what to say (e.g. Gemma wording).
  busy: boolean
  questionIndex: number
  total: number
  question: BankQuestion | null
  interviewerLine: string
  // Everything heard since the interviewer last spoke, across pauses.
  currentAnswer: string
  records: QuestionRecord[]
  smallTalk: Exchange | null
  candidateQuestions: Exchange | null
}

export type WriteRequest = { kind: 'follow-up'; question: BankQuestion; answer: string; angle: Angle }

export type EngineDeps = {
  speak: (text: string) => void
  // Gemma's wording, already guarded. Null means use the written line.
  write?: (req: WriteRequest) => Promise<string | null>
  now: () => number
  setTimer: (fn: () => void, ms: number) => unknown
  clearTimer: (handle: unknown) => void
  onChange?: (snapshot: EngineSnapshot) => void
}

// How long the candidate must stay quiet after their last words before the
// answer counts as finished. Counted from when the transcript arrives, which is
// already ~1.5 s after they stop (the voice detector's own wait plus Whisper).
// Longer for system design, where people think aloud. Tuned in step 4.3.
export const LONG_PAUSE_MS = { normal: 5000, design: 7000 }

// A system design question is a conversation (PLAN.md: system design round,
// parked): the question, 4 probes and at most 2 clarifying answers, or about
// 10 minutes, then the interviewer wraps up and moves on.
const DESIGN_MAX_EXCHANGES = 7
const DESIGN_MAX_CLARIFICATIONS = 2
const DESIGN_BUDGET_MS = 10 * 60 * 1000

export class InterviewEngine {
  private phase: Phase = 'not-started'
  private busy = false
  private index = -1
  private interviewerLine = ''
  private records: QuestionRecord[] = []
  private smallTalk: Exchange | null = null
  private candidateQuestions: Exchange | null = null
  private current: Exchange | null = null
  private pauseTimer: unknown = null
  private reactions = 0
  private probeIndex = 0
  private clarifications = 0
  private readonly plan: InterviewPlan
  private readonly deps: EngineDeps

  constructor(plan: InterviewPlan, deps: EngineDeps) {
    this.plan = plan
    this.deps = deps
  }

  // --- Inputs ---------------------------------------------------------------

  start() {
    if (this.phase !== 'not-started') return
    this.smallTalk = this.say('small-talk', lines.greeting(this.plan.interviewer, this.plan.candidateName))
    this.phase = 'small-talk'
    this.emit()
  }

  // A stretch of speech, transcribed. Returns the reply for the package: always
  // '' (keep listening); the engine speaks for itself.
  heard(text: string, speechMs?: number): '' {
    const said = text.trim()
    if (!said || this.phase === 'done' || this.phase === 'not-started' || !this.current) return ''
    this.current.parts.push({ text: said, speechMs, at: this.deps.now() })
    this.armPause()
    this.emit()
    return ''
  }

  // The candidate started talking again: their answer is not finished.
  userStartedSpeaking() {
    this.clearPause()
  }

  // "I'm done".
  done() {
    this.clearPause()
    void this.finishAnswer()
  }

  repeat() {
    if (this.phase === 'done' || this.phase === 'not-started') return
    this.deps.speak(this.interviewerLine)
  }

  skip() {
    const record = this.records[this.index]
    if (!record || this.phase === 'done' || this.phase === 'candidate-questions') return
    this.clearPause()
    record.skipped = true
    this.nextQuestion(lines.skip)
  }

  end() {
    if (this.phase === 'done') return
    this.clearPause()
    this.closeRecord()
    this.phase = 'done'
    this.speakLine(lines.ended)
    this.emit()
  }

  snapshot(): EngineSnapshot {
    return {
      phase: this.phase,
      busy: this.busy,
      questionIndex: this.index,
      total: this.plan.questions.length,
      question: this.plan.questions[this.index] ?? null,
      interviewerLine: this.interviewerLine,
      currentAnswer: this.current ? answerText(this.current) : '',
      records: this.records,
      smallTalk: this.smallTalk,
      candidateQuestions: this.candidateQuestions,
    }
  }

  // --- Flow -----------------------------------------------------------------

  private async finishAnswer() {
    if (this.busy || !this.current || this.current.parts.length === 0) return
    switch (this.phase) {
      case 'small-talk':
        this.nextQuestion(lines.start[this.plan.mood])
        return
      case 'answering':
        await this.followUp()
        return
      case 'follow-up':
        this.nextQuestion(pick(lines.reaction[this.plan.mood], this.reactions++))
        return
      case 'design':
        this.designTurn()
        return
      case 'candidate-questions':
        this.closeInterview()
        return
    }
  }

  private nextQuestion(lead: string) {
    this.closeRecord()
    this.index++
    const question = this.plan.questions[this.index]
    if (!question) {
      this.candidateQuestions = this.say('candidate-questions', `${lead} ${lines.candidateQuestions}`)
      this.phase = 'candidate-questions'
      this.emit()
      return
    }
    const isDesign = question.round === 'system-design' && !!question.design
    const intro = isDesign ? lines.systemDesignIntro : this.index > 0 ? lines.next : ''
    const record: QuestionRecord = { question, exchanges: [], skipped: false, startedAt: this.deps.now() }
    this.records.push(record)
    this.probeIndex = 0
    this.clarifications = 0
    record.exchanges.push(this.say('question', [lead, intro, question.question].filter(Boolean).join(' ')))
    this.phase = isDesign ? 'design' : 'answering'
    this.emit()
  }

  private async followUp() {
    const record = this.records[this.index]
    const question = record.question
    const answer = answerText(record.exchanges.at(-1)!)
    const angle = chooseAngle(question, answer)
    this.busy = true
    this.emit()
    let line: string | null = null
    try {
      line = (await this.deps.write?.({ kind: 'follow-up', question, answer, angle })) ?? null
    } catch {
      line = null
    }
    this.busy = false
    // The candidate may have ended or skipped while Gemma was writing.
    if (this.phase !== 'answering' || this.records[this.index] !== record) return
    const exchange = this.say('follow-up', line ?? writtenFollowUp(angle, question))
    exchange.angle = angle
    exchange.byGemma = line !== null
    record.exchanges.push(exchange)
    this.phase = 'follow-up'
    this.emit()
  }

  // System design, one exchange at a time: answer a clarifying question from
  // the question's facts, or move to the next probe; wrap up when the probes
  // run out, after too many exchanges, or when the time budget is spent.
  private designTurn() {
    const record = this.records[this.index]
    const design = record.question.design!
    const last = answerText(record.exchanges.at(-1)!)
    const spent = this.deps.now() - record.startedAt
    const outOfRoom = record.exchanges.length >= DESIGN_MAX_EXCHANGES || spent >= DESIGN_BUDGET_MS

    if (!outOfRoom && looksLikeQuestion(last) && this.clarifications < DESIGN_MAX_CLARIFICATIONS) {
      const lead = pick(lines.clarify, this.clarifications++)
      record.exchanges.push(this.say('clarification', `${lead} ${design.assumptions}`))
    } else if (!outOfRoom && this.probeIndex < design.probes.length) {
      record.exchanges.push(this.say('probe', design.probes[this.probeIndex++]))
    } else {
      this.nextQuestion(lines.designWrapUp)
      return
    }
    this.emit()
  }

  private closeInterview() {
    this.closeRecord()
    this.phase = 'done'
    this.speakLine(lines.closing)
    this.emit()
  }

  // --- Helpers --------------------------------------------------------------

  private say(kind: ExchangeKind, text: string): Exchange {
    const exchange: Exchange = { kind, said: text, parts: [] }
    this.current = exchange
    this.speakLine(text)
    return exchange
  }

  private speakLine(text: string) {
    this.interviewerLine = text
    this.deps.speak(text)
  }

  private closeRecord() {
    const record = this.records[this.index]
    if (record && record.endedAt === undefined) record.endedAt = this.deps.now()
  }

  private armPause() {
    this.clearPause()
    const ms = this.phase === 'design' ? LONG_PAUSE_MS.design : LONG_PAUSE_MS.normal
    this.pauseTimer = this.deps.setTimer(() => {
      this.pauseTimer = null
      void this.finishAnswer()
    }, ms)
  }

  private clearPause() {
    if (this.pauseTimer !== null) this.deps.clearTimer(this.pauseTimer)
    this.pauseTimer = null
  }

  private emit() {
    this.deps.onChange?.(this.snapshot())
  }
}

export function answerText(exchange: Exchange): string {
  return exchange.parts.map((p) => p.text).join(' ')
}

// Did the candidate ask the interviewer something (a clarifying question in a
// design round) rather than answer? Whisper usually punctuates questions; the
// openings catch the ones it does not.
export function looksLikeQuestion(text: string): boolean {
  const t = text.trim().toLowerCase()
  if (!t) return false
  if (t.endsWith('?')) return true
  return /^(can i assume|should i assume|do we|do i|how many|how much|what is the|what's the|is it|are there|are we|should we|can we|will we|does it|do you)\b/.test(t)
}
