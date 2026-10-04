import { wordCount } from './text'

// What a short stretch of speech means when it is not an answer (PLAN.md:
// when something goes wrong). Only short stretches are checked, so "sorry,
// let me put that differently" in the middle of an answer stays an answer.

export type Intent = 'repeat' | 'clarify' | 'dont-know' | 'skip' | 'pause' | 'resume' | 'stop' | 'garbled'

const MAX_WORDS = 10

const PATTERNS: [Exclude<Intent, 'garbled'>, RegExp][] = [
  ['stop', /\b(stop the interview|end the interview|let's stop|lets stop|i want to stop|can we stop|i'd like to stop|end it here)\b/],
  ['pause', /\b(can we pause|could we pause|pause (please|for a (minute|moment|second))|hold on|give me a (minute|moment|second)|one (minute|moment|sec|second)|wait a (minute|moment|second))\b|^pause\b/],
  ['resume', /\b(i'm ready|i am ready|ready now|let's continue|lets continue|let's carry on|carry on|we can continue|resume|okay go on|let's go on)\b/],
  ['repeat', /\b(repeat (that|the question|it)|say (that|it) again|come again|one more time|pardon|didn't (catch|hear) (that|it|you)|can you repeat|could you repeat)\b|^sorry\??\.?$/],
  ['clarify', /\b(what do you mean|what does that mean|could you (clarify|rephrase)|can you (clarify|rephrase)|not sure what you('re| are) asking|what exactly are you asking|rephrase)\b/],
  // Seen in a real run: "Well, can you please skip this question?"
  ['skip', /\b(skip (this|that|the) (one|question)|skip (it|this|that)|can (we|i) skip|could (we|i) skip|let's skip|lets skip|(go|move) (on )?to the next (one|question)|next question please|can we move on|could we move on|let's move on|lets move on)\b/],
  // A few words may come first: "Sorry, I don't know about that." (a real run).
  ['dont-know', /^((um+|uh+|so|sorry|honestly|actually|well|oh|hmm) )*(i don't know|i do not know|i don't really know|i dunno|no idea|i have no idea|pass|i'm not sure|i am not sure|not sure|i can't think of (one|anything|an example))\b/],
]

// What Whisper often makes of noise, breathing or silence.
const NOISE = new Set([
  'you',
  'thank you',
  'thanks',
  'thanks for watching',
  'thank you for watching',
  'thank you very much',
  'bye',
  'um',
  'uh',
  'hmm',
  'subtitles by the amara org community',
])

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Nothing said at all: empty, punctuation, or Whisper's markers for no speech
// ([BLANK_AUDIO], (music), *coughs*).
export function isNoSpeech(text: string): boolean {
  const raw = text.trim()
  return !raw || /^[\W_]+$/.test(raw) || /^[[(*].*[\])*]$/.test(raw)
}

// No speech, or what Whisper often invents from noise ("Thank you.", "you").
export function isGarbled(text: string): boolean {
  return isNoSpeech(text) || NOISE.has(normalise(text))
}

export function classify(text: string): Intent | null {
  if (isGarbled(text)) return 'garbled'
  if (wordCount(text) > MAX_WORDS) return null
  const t = normalise(text)
  for (const [intent, re] of PATTERNS) if (re.test(t)) return intent
  return null
}
