import type { GemmaClient } from '../gemma/GemmaClient'
import type { ChatMessage } from '../gemma/protocol'

// A stand-in interviewer so the voice loop can be heard end to end:
// opening question -> candidate speaks -> Whisper -> Gemma -> Kokoro.
// Phase 3 replaces it with the real engine (answers collected across pauses,
// follow-up angles chosen by rules, the guard, written fallbacks).

export const OPENING = "Hi, I'm Ananya. Thanks for joining. Tell me about a project you're proud of."

// The persona from evals/interviewer.html (run 3), friendly mood. Gemma 3 has
// no system role, so it rides on the first user turn, as in the evals.
const PERSONA = `You are Ananya, a senior engineer interviewing a candidate for a junior frontend developer role. This is a spoken mock interview: every word you write is read aloud.

How you speak:
- Like a real person across the table: plain, natural spoken English. Contractions are fine.
- At most two short sentences, under 30 words in total.
- No quotation marks, no markdown, no lists, no emojis.
- Never say "good start", "great answer" or similar praise. Never teach, never answer for them, never give feedback.

Your manner: warm and encouraging. Ask one follow-up question about what they just said.`

export function createPlaceholderBrain(gemma: GemmaClient) {
  const turns: ChatMessage[] = [
    { role: 'user', content: `${PERSONA}\n\nThe candidate has just sat down. Ask your first question.` },
    { role: 'assistant', content: OPENING },
  ]

  return {
    onSubmit(text: string): AsyncIterable<string> | string {
      const said = text.trim()
      if (!said) return ''
      // Speech that lands before the last reply finished joins the same turn.
      const last = turns.at(-1)!
      if (last.role === 'user') last.content += ` ${said}`
      else turns.push({ role: 'user', content: said })
      return speakAndRemember(gemma.stream([...turns], { maxNewTokens: 60 }))
    },
  }

  async function* speakAndRemember(reply: AsyncIterable<string>): AsyncGenerator<string> {
    let full = ''
    for await (const chunk of reply) {
      // Spoken aloud: no markdown symbols, no quote marks.
      const clean = chunk.replace(/[*_#`"“”]/g, '')
      full += clean
      yield clean
    }
    if (full.trim()) turns.push({ role: 'assistant', content: full.trim() })
  }
}
