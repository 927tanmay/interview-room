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

// Some angles can be checked in the words themselves: a follow-up that was
// meant to ask for the outcome has to ask about one, and one meant to ask what
// the candidate did has to ask about them. Seen in a real run: asked for the
// outcome, Gemma asked "How did you handle…", which the answer had covered.
const ANGLE_WORDS: Partial<Record<string, RegExp>> = {
  outcome: /\b(result|results|turn(ed|s)? out|outcome|impact|measur\w*|happened (next|after)|end(ed)? up|in the end|chang(e|ed|es)|difference|improv\w*|effect|metric|number)\b/i,
  ownership: /\b(personally|yourself|your (own )?(part|role|contribution)|did you|you did|you do|you yourself|you take|you took)\b/i,
}

// A follow-up about a missing key point has to name it: `mention` is that
// point's match phrases (the bank's own words for it). Seen in a real run:
// asked about the missing "parsing and rendering", Gemma asked about DNS
// again, which the answer had covered.
export function guardFollowUp(
  raw: string,
  asked = '',
  answer = '',
  angle?: string,
  mention?: string[],
): string | null {
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
  const mustSay = angle ? ANGLE_WORDS[angle] : undefined
  if (mustSay && !mustSay.test(question)) return null
  const padded = ` ${question.toLowerCase()} `
  if (mention?.length && !mention.some((m) => padded.includes(m))) return null
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
