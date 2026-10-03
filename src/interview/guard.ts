// What every Gemma line goes through before it is spoken (PLAN.md section 4).
// Ported from evals/interviewer.html with the two fixes run 5 showed: a
// question may end in "." or be an instruction ("Describe…"), and a reaction
// that is really a new question is rejected. Returns null when nothing usable
// survives, and the caller speaks a written line instead.

const PRAISE =
  /good start|good example|great answer|great question|excellent|amazing|impressive|well done|nice work|that's great|that is great|let.s start/i

// Openings that make a sentence a question or a request to answer.
const ASKS =
  /^(what|how|why|when|where|which|who|whose|can|could|would|will|do|did|does|is|are|was|were|have|has|tell me|walk me|talk me|describe|explain|give me|share)\b/i

const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()

function sentences(text: string): string[] {
  const t = text.replace(/[“”"*_#[\]`]/g, '').replace(/\s+/g, ' ').trim()
  return (t.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? []).map((s) => s.trim()).filter(Boolean)
}

const isAsk = (s: string) => s.endsWith('?') || ASKS.test(s)

// The model speaking as the candidate ("Rahul: I'm seeking…") or narrating
// ("He explained the steps…") rather than asking.
const ROLE_PLAY = /^[A-Z][a-z]+:|^(he|she|they) (explained|said|described|answered)\b/

export function guardFollowUp(raw: string, asked = '', answer = ''): string | null {
  if (ROLE_PLAY.test(raw.trim())) return null
  const answerNorm = norm(answer)
  const ss = sentences(raw)
    .filter((s) => !PRAISE.test(s))
    .filter((s) => norm(s) !== norm(asked) && !(answer && norm(s).length > 12 && answerNorm.includes(norm(s))))
  const qi = ss.findIndex(isAsk)
  if (qi === -1) return null
  // A question word ending in "." becomes a spoken question.
  let question = ss[qi]
  if (question.endsWith('.') && !/^(tell me|walk me|talk me|describe|explain|give me|share)\b/i.test(question)) {
    question = `${question.slice(0, -1)}?`
  }
  // Keep at most one short lead-in sentence before the question.
  const lead = qi > 0 && !isAsk(ss[qi - 1]) ? `${ss[qi - 1]} ` : ''
  const line = `${lead}${question}`
  return line.split(/\s+/).length > 40 ? question : line
}

export function guardReaction(raw: string): string | null {
  if (ROLE_PLAY.test(raw.trim())) return null
  const ss = sentences(raw).filter((s) => !PRAISE.test(s) && !isAsk(s))
  return ss[0] ?? null
}
