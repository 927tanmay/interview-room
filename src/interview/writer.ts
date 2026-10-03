import type { GemmaClient } from '../gemma/GemmaClient'
import { angleNote } from './angles'
import type { WriteRequest } from './engine'
import { guardFollowUp } from './guard'
import { followUpMessages, type PersonaOptions } from './prompts'

// If Gemma has not answered by then, the written line is spoken instead: a
// long silence after an answer feels worse than a plainer question. Replies
// took 1.0 to 1.6 s in the evals.
const WRITE_TIMEOUT_MS = 6000

// Gemma words the follow-up the rules chose; the guard decides whether it can
// be spoken. Null means "use the written line".
export function makeWriter(gemma: GemmaClient, persona: PersonaOptions) {
  return async (req: WriteRequest): Promise<string | null> => {
    const messages = followUpMessages(persona, req.question.question, req.answer, angleNote(req.angle))
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => {
        gemma.stop()
        resolve(null)
      }, WRITE_TIMEOUT_MS)
    })
    try {
      const reply = await Promise.race([gemma.generate(messages, { maxNewTokens: 60 }), timeout])
      if (!reply || reply.stopped) return null
      return guardFollowUp(reply.text, req.question.question, req.answer)
    } finally {
      clearTimeout(timer)
    }
  }
}
