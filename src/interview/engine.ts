import { chooseAngle, writtenFollowUp, type Angle } from './angles'
import type { BankQuestion, Level, Track } from './bank'
import { classify, isNoSpeech } from './intents'
import { lines, pick, type Mood } from './lines'
import { lowerFirst, toYou } from './text'

// The interview engine: plain code, no React, no audio (PLAN.md section 4).
// It decides what happens next; Gemma only words some of the lines (`write`),
// and anything Gemma cannot word well falls back to a written line.
//
// Input arrives one stretch of speech at a time (the package calls onSubmit at
// every pause). The engine keeps collecting until the candidate presses
// "I'm done" or stays quiet for a long pause, so thinking pauses never cut an
// answer short (UX.md: interview screen). It always replies '' to the package
// (say nothing, keep listening) and speaks its own lines through `speak`.
//
// When something goes wrong it says so out loud (PLAN.md: when something goes
// wrong): silence, "repeat that", "what do you mean", "I don't know", garbled
// audio, a pause, Gemma failing, the tab hidden, the microphone lost.

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

// One thing the interviewer said and what the candidate said back. For a
// follow-up, which angle it probed and whether Gemma worded it.
export type Exchange = { kind: ExchangeKind; said: string; parts: AnswerPart[]; angle?: Angle; byGemma?: boolean }

// How a question ended when it did not end with an answer.
export type QuestionOutcome = 'answered' | 'skipped' | 'silent' | 'dont-know'

export type QuestionRecord = {
  question: BankQuestion
  exchanges: Exchange[]
  outcome: QuestionOutcome
  startedAt: number
  endedAt?: number
}

export type Phase = 'not-started' | 'small-talk' | 'answering' | 'follow-up' | 'design' | 'candidate-questions' | 'done'

// Why the interview is paused: the candidate asked, pressed Pause, hid the
// tab, or the microphone went away.
export type PauseReason = 'asked' | 'button' | 'hidden' | 'mic'

export type EngineSnapshot = {
  phase: Phase
  // True while the engine is working out what to say (e.g. Gemma wording).
  busy: boolean
  paused: PauseReason | null
  questionIndex: number
  total: number
  question: BankQuestion | null
  interviewerLine: string
  // Everything heard since the interviewer last asked something, across pauses.
  currentAnswer: string
  records: QuestionRecord[]
  smallTalk: Exchange | null
  candidateQuestions: Exchange | null
  // Things the report should mention, e.g. Gemma failing mid-interview.
  notes: string[]
}

export type WriteRequest = { kind: 'follow-up'; question: BankQuestion; answer: string; angle: Angle }

export type EngineDeps = {
  speak: (text: string) => void
  // Gemma's wording, already guarded. Null means use the written line; a
  // thrown error means Gemma itself failed.
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

// Silence after the interviewer finishes asking, before anything is said.
export const SILENCE_MS = { nudge: 12000, moveOn: 25000 }

// A system design question is a conversation (PLAN.md: system design round,
// parked): the question, 4 probes and at most 2 clarifying answers, or about
// 10 minutes, then the interviewer wraps up and moves on.
const DESIGN_MAX_EXCHANGES = 7
const DESIGN_MAX_CLARIFICATIONS = 2
const DESIGN_BUDGET_MS = 10 * 60 * 1000

// After this many Gemma failures in a row, stop asking it and use written
// follow-ups for the rest of the interview.
const GEMMA_MAX_FAILURES = 2

export class InterviewEngine {
  private phase: Phase = 'not-started'
  private busy = false
  private paused: PauseReason | null = null
  private index = -1
  private interviewerLine = ''
  private records: QuestionRecord[] = []
  private smallTalk: Exchange | null = null
  private candidateQuestions: Exchange | null = null
  private current: Exchange | null = null
  private answerTimer: unknown = null
  private silenceTimer: unknown = null
  // 0: nothing said yet; 1: nudged once.
  private silenceStage = 0
  private reactions = 0
  private probeIndex = 0
  private clarifications = 0
  private dontKnows = 0
  private gemmaFailures = 0
  private gemmaOff = false
  private notes: string[] = []
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
    if (!this.live() || !this.current) return ''
    this.clearSilence()
    const intent = classify(said)
    const atStart = this.current.parts.length === 0

    if (this.paused) {
      if (intent === 'resume') this.resume()
      return ''
    }
    if (intent === 'stop') {
      this.end()
      return ''
    }
    if (intent === 'pause') {
      this.pause('asked')
      return ''
    }

    if (intent === 'garbled') {
      // Small talk and "any questions for me?" can be a plain "thank you".
      const casual = this.phase === 'small-talk' || this.phase === 'candidate-questions'
      if (isNoSpeech(said) || !casual) {
        if (atStart && !isNoSpeech(said)) this.speakAside(lines.notCaught)
        return ''
      }
    } else if (atStart && this.asking()) {
      if (intent === 'repeat') {
        this.repeat()
        return ''
      }
      if (intent === 'clarify') {
        this.rephrase()
        return ''
      }
      if (intent === 'dont-know' && (this.phase === 'answering' || this.phase === 'follow-up')) {
        this.dontKnow()
        return ''
      }
    }

    this.current.parts.push({ text: said, speechMs, at: this.deps.now() })
    this.armAnswerTimer()
    this.emit()
    return ''
  }

  // The candidate started talking again: their answer is not finished.
  userStartedSpeaking() {
    this.clearAnswerTimer()
    this.clearSilence()
  }

  // The interviewer's voice finished: start counting silence if nothing has
  // been said back yet.
  interviewerFinished() {
    if (!this.live() || this.paused || this.busy || !this.current || this.current.parts.length) return
    this.clearSilence()
    if (this.silenceStage === 0) {
      this.silenceTimer = this.deps.setTimer(() => this.onSilence(), SILENCE_MS.nudge)
    } else {
      this.silenceTimer = this.deps.setTimer(() => this.onSilence(), SILENCE_MS.moveOn - SILENCE_MS.nudge)
    }
  }

  // "I'm done".
  done() {
    if (this.paused) return
    this.clearAnswerTimer()
    void this.finishAnswer()
  }

  // Says the current question (or the last thing asked) again.
  repeat() {
    if (!this.live() || !this.current) return
    this.speakAside(this.askedText())
  }

  skip() {
    const record = this.records[this.index]
    if (!record || !this.live() || this.phase === 'candidate-questions') return
    record.outcome = 'skipped'
    this.nextQuestion(lines.skip)
  }

  pause(reason: PauseReason) {
    if (!this.live() || this.paused) return
    this.paused = reason
    this.clearAnswerTimer()
    this.clearSilence()
    if (reason === 'asked' || reason === 'button') this.speakAside(lines.paused)
    this.emit()
  }

  resume() {
    if (!this.paused) return
    this.paused = null
    this.silenceStage = 0
    // Whatever was said before the pause still counts; carry on from there.
    this.speakAside(this.current?.parts.length ? lines.resume : `${lines.resume} ${this.askedText()}`)
    if (this.current?.parts.length) this.armAnswerTimer()
    this.emit()
  }

  end() {
    if (this.phase === 'done') return
    this.clearAnswerTimer()
    this.clearSilence()
    this.paused = null
    this.closeRecord()
    this.phase = 'done'
    this.speakLine(lines.ended)
    this.emit()
  }

  snapshot(): EngineSnapshot {
    return {
      phase: this.phase,
      busy: this.busy,
      paused: this.paused,
      questionIndex: this.index,
      total: this.plan.questions.length,
      question: this.plan.questions[this.index] ?? null,
      interviewerLine: this.interviewerLine,
      currentAnswer: this.current ? answerText(this.current) : '',
      records: this.records,
      smallTalk: this.smallTalk,
      candidateQuestions: this.candidateQuestions,
      notes: this.notes,
    }
  }

  // --- Flow -----------------------------------------------------------------

  private async finishAnswer() {
    if (this.busy || this.paused || !this.current || this.current.parts.length === 0) return
    this.clearSilence()
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
    this.clearAnswerTimer()
    this.clearSilence()
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
    const record: QuestionRecord = { question, exchanges: [], outcome: 'answered', startedAt: this.deps.now() }
    this.records.push(record)
    this.probeIndex = 0
    this.clarifications = 0
    this.dontKnows = 0
    record.exchanges.push(this.say('question', [lead, intro, question.question].filter(Boolean).join(' ')))
    this.phase = isDesign ? 'design' : 'answering'
    this.emit()
  }

  private async followUp() {
    const record = this.records[this.index]
    const question = record.question
    const answer = answerText(record.exchanges.at(-1)!)
    const angle = chooseAngle(question, answer)
    let line: string | null = null
    if (this.deps.write && !this.gemmaOff) {
      this.busy = true
      this.emit()
      try {
        line = await this.deps.write({ kind: 'follow-up', question, answer, angle })
        this.gemmaFailures = 0
      } catch {
        line = null
        this.gemmaFailed()
      }
      this.busy = false
    }
    // The candidate may have ended, skipped or paused while Gemma was writing.
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
    this.clearAnswerTimer()
    this.clearSilence()
    this.closeRecord()
    this.phase = 'done'
    this.speakLine(lines.closing)
    this.emit()
  }

  // --- Recovery -------------------------------------------------------------

  private onSilence() {
    this.silenceTimer = null
    if (!this.live() || this.paused || !this.current || this.current.parts.length) return
    if (this.silenceStage === 0) {
      this.silenceStage = 1
      this.speakAside(lines.silenceNudge)
      return
    }
    // Still nothing: move on without making a thing of it.
    switch (this.phase) {
      case 'small-talk':
        this.nextQuestion(lines.start[this.plan.mood])
        return
      case 'answering':
      case 'design':
        this.records[this.index].outcome = 'silent'
        this.nextQuestion(lines.silenceMoveOn)
        return
      case 'follow-up':
        this.nextQuestion(lines.silenceMoveOn)
        return
      case 'candidate-questions':
        this.closeInterview()
        return
    }
  }

  // "What do you mean?": say what the question is after, in other words. For
  // technical questions the intent would give the answer away, so only invite
  // a plain explanation.
  private rephrase() {
    const question = this.plan.questions[this.index]
    if (this.current?.kind === 'question' && question) {
      const line =
        question.round === 'technical'
          ? `${lines.rephraseTechnical} ${question.question}`
          : `${lines.rephrase} I'd like to hear ${lowerFirst(toYou(question.intent))}`
      this.speakAside(line)
      return
    }
    this.speakAside(`${lines.rephrase} ${this.askedText()}`)
  }

  // "I don't know": one nudge, then move on.
  private dontKnow() {
    this.dontKnows++
    if (this.dontKnows === 1) {
      this.speakAside(lines.dontKnowNudge)
      return
    }
    if (this.phase === 'answering') this.records[this.index].outcome = 'dont-know'
    this.nextQuestion(lines.skip)
  }

  private gemmaFailed() {
    this.gemmaFailures++
    if (this.gemmaFailures >= GEMMA_MAX_FAILURES && !this.gemmaOff) {
      this.gemmaOff = true
      this.notes.push('Gemma stopped responding during the interview, so the remaining follow-ups were written ones.')
    }
  }

  // --- Helpers --------------------------------------------------------------

  private live() {
    return this.phase !== 'done' && this.phase !== 'not-started'
  }

  // Waiting for the candidate to answer something the interviewer asked.
  private asking() {
    return this.phase !== 'small-talk' && this.phase !== 'candidate-questions'
  }

  // What "repeat" says: the bank question itself for a question, otherwise
  // the line that was asked.
  private askedText(): string {
    const question = this.plan.questions[this.index]
    if (this.current?.kind === 'question' && question) return question.question
    return this.current?.said ?? this.interviewerLine
  }

  private say(kind: ExchangeKind, text: string): Exchange {
    const exchange: Exchange = { kind, said: text, parts: [] }
    this.current = exchange
    this.silenceStage = 0
    this.speakLine(text)
    return exchange
  }

  // Spoken without starting a new exchange (repeats, nudges, recovery).
  private speakAside(text: string) {
    this.speakLine(text)
    this.emit()
  }

  private speakLine(text: string) {
    this.interviewerLine = text
    this.deps.speak(text)
  }

  private closeRecord() {
    const record = this.records[this.index]
    if (record && record.endedAt === undefined) record.endedAt = this.deps.now()
  }

  private armAnswerTimer() {
    this.clearAnswerTimer()
    const ms = this.phase === 'design' ? LONG_PAUSE_MS.design : LONG_PAUSE_MS.normal
    this.answerTimer = this.deps.setTimer(() => {
      this.answerTimer = null
      void this.finishAnswer()
    }, ms)
  }

  private clearAnswerTimer() {
    if (this.answerTimer !== null) this.deps.clearTimer(this.answerTimer)
    this.answerTimer = null
  }

  private clearSilence() {
    if (this.silenceTimer !== null) this.deps.clearTimer(this.silenceTimer)
    this.silenceTimer = null
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
