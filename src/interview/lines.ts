// Written lines the interviewer speaks without Gemma: greetings, transitions,
// reactions and closings. Plain and short, read aloud by Kokoro. No praise
// (PLAN.md section 4: the guard drops it from Gemma's lines too).

export type Mood = 'friendly' | 'neutral' | 'tough'

export const lines = {
  greeting: (interviewer: string, name?: string) =>
    `Hi${name ? ` ${name}` : ''}, I'm ${interviewer}. Thanks for joining. Before we start, how's your day going?`,

  start: {
    friendly: "Thanks. Let's get started.",
    neutral: "Okay, let's begin.",
    tough: "Right. Let's begin.",
  } satisfies Record<Mood, string>,

  // Spoken after the follow-up has been answered, before the next question.
  reaction: {
    friendly: ['Thanks, that’s helpful.', 'Got it, thank you.', 'Thanks for walking me through that.'],
    neutral: ['Okay.', 'Got it.', 'Thanks.'],
    tough: ['Okay.', 'Noted.', 'Moving on.'],
  } satisfies Record<Mood, string[]>,

  next: 'Next question.',
  systemDesignIntro: "Let's do a design question. Think out loud, and ask me anything you'd want to clarify.",
  // Spoken before the facts when the candidate asks a clarifying question.
  clarify: ['Sure.', 'Fair question.', 'Okay.'],
  designWrapUp: "Let's stop there. That's a good place to wrap up this one.",

  skip: "No problem, let's move on.",
  candidateQuestions: "That's all my questions. Do you have any questions for me?",
  candidateQuestionReply: "That's a good one to ask a real interviewer. I'll note it in your report.",
  closing: 'Thanks for your time today. Your report is ready.',
  ended: 'Okay, we can stop here. Your report is ready.',
}

// Rotates through a list so the same reaction is not heard twice in a row.
export function pick(list: readonly string[], index: number): string {
  return list[index % list.length]
}
