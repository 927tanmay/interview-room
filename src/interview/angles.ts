import type { BankQuestion } from './bank'
import { toYou } from './text'

// What the follow-up probes, chosen by rules (PLAN.md: follow-up angles).
// Gemma is told the angle and only words it; it never decides what to ask.

export type Angle =
  | { kind: 'expand' }
  | { kind: 'ownership' }
  | { kind: 'outcome' }
  | { kind: 'missing'; label: string }
  | { kind: 'deeper' }
  | { kind: 'edgecase' }
  | { kind: 'motivation' }

const words = (text: string) => text.toLowerCase().match(/[a-z']+/g) ?? []
const count = (ws: string[], set: string[]) => ws.filter((w) => set.includes(w)).length

const OUTCOME = /\b(result|resulted|outcome|in the end|finally|dropped|reduced|increased|improved|faster|slower|saved|shipped|launched|fixed|resolved|went up|went down)\b|\d/

// Key points matched by code, with the same padding as the bank's phrases.
export function missingKeyPoints(question: BankQuestion, answer: string): string[] {
  const text = ` ${answer.toLowerCase()} `
  return question.keyPoints.filter((k) => !k.match.some((m) => text.includes(m))).map((k) => k.label)
}

export function chooseAngle(question: BankQuestion, answer: string): Angle {
  const ws = words(answer)
  if (ws.length < 25) return { kind: 'expand' }

  if (question.round === 'behavioural') {
    const we = count(ws, ['we', 'our', 'us', 'team'])
    const i = count(ws, ['i', "i'm", "i've", "i'd", 'my', 'me'])
    if (we >= 3 && i < we) return { kind: 'ownership' }
    if (!OUTCOME.test(answer.toLowerCase())) return { kind: 'outcome' }
  }

  const missing = missingKeyPoints(question, answer)
  if (missing.length) return { kind: 'missing', label: missing[0] }

  if (question.round === 'technical') return { kind: 'edgecase' }
  if (question.round === 'hr') return { kind: 'motivation' }
  return { kind: 'deeper' }
}

// The note Gemma gets on the candidate's turn (evals/interviewer.html, run 3).
export function angleNote(angle: Angle): string {
  switch (angle.kind) {
    case 'expand':
      return 'The answer was very short. Ask them to walk you through it in more detail.'
    case 'ownership':
      return 'They kept saying "we". Ask what they personally did, as opposed to the team.'
    case 'outcome':
      return 'They never said how it turned out. Ask for the result, ideally a number or something measurable.'
    case 'missing':
      return `They did not cover ${angle.label}. Ask about that.`
    case 'deeper':
      return 'The answer was complete. Ask one deeper question: a trade-off they made, or how they knew it worked.'
    case 'edgecase':
      return 'Ask a "what happens if" question about an edge case of what they explained.'
    case 'motivation':
      return 'Ask one question about what they want or value, based on what they said.'
  }
}

// Spoken when Gemma's line does not survive the guard.
export function writtenFollowUp(angle: Angle, question: BankQuestion): string {
  switch (angle.kind) {
    case 'expand':
      return 'Could you walk me through that in a bit more detail?'
    case 'ownership':
      return 'What did you do yourself, as opposed to the team?'
    case 'outcome':
      return 'How did it turn out? Was there anything you could measure?'
    case 'missing':
      return `Could you say a bit about ${toYou(angle.label)}?`
    case 'deeper':
      return question.followUps[1] ?? question.followUps[0]
    case 'edgecase':
    case 'motivation':
      return question.followUps[0]
  }
}
