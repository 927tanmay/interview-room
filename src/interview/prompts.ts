import type { ChatMessage } from '../gemma/protocol'
import type { Level, Track } from './bank'
import type { Mood } from './lines'

// The guided follow-up prompt from evals/interviewer.html (run 3, the version
// that gave 8 of 12 usable lines on Gemma 3 1B and 12 of 12 on-angle lines on
// Gemma 4 E2B). The conversation is passed as real turns, so the model writes
// the interviewer's next turn instead of re-enacting a transcript; the angle
// rides along as a note on the candidate's turn. Gemma 3 has no system role,
// so the persona goes on the first user turn, which works for both models.

const MOODS: Record<Mood, string> = {
  friendly: 'Your manner: warm and encouraging. You may start with a few words that echo something specific they said.',
  neutral: 'Your manner: calm and professional. You may start with "Okay." or "Got it." and nothing more.',
  tough: 'Your manner: direct and sceptical, like a demanding hiring manager. No praise, no softening. Get straight to the question.',
}

const TRACK_ROLE: Record<Track, string> = {
  frontend: 'frontend developer',
  backend: 'backend developer',
  ml: 'machine learning engineer',
}

export type PersonaOptions = { interviewer: string; mood: Mood; track: Track; level: Level; candidateName?: string }

export function persona(o: PersonaOptions): string {
  const who = o.candidateName ?? 'the candidate'
  return `You are ${o.interviewer}, a senior engineer interviewing ${who} for a ${o.level} ${TRACK_ROLE[o.track]} role. This is a spoken mock interview: every word you write is read aloud.

How you speak:
- Like a real person across the table: plain, natural spoken English. Contractions are fine.
- At most two short sentences, under 30 words in total.
- No quotation marks, no markdown, no lists, no emojis.
- Never say "good start", "great answer" or similar praise. Never teach, never answer for them, never give feedback.

${MOODS[o.mood]}`
}

export function followUpMessages(o: PersonaOptions, question: string, answer: string, note: string): ChatMessage[] {
  const who = o.candidateName ?? 'The candidate'
  return [
    { role: 'user', content: `${persona(o)}\n\n${who} has just sat down. Ask your first question.` },
    { role: 'assistant', content: question },
    {
      role: 'user',
      content: `${answer}\n\n[Note for ${o.interviewer}, not said aloud: ${note} Refer to one detail they said. One question, under 30 words.]`,
    },
  ]
}
