import { BANK, type Level, type Round, type Track } from './bank'
import type { Mood } from './lines'

// What the candidate chooses on the setup screen (TASKS.md 4.1).

export type InterviewerId = 'ananya' | 'aarav'

// The two interviewers: the package's avatar preset and a Kokoro voice each.
export const INTERVIEWERS: Record<InterviewerId, { name: string; avatar: 'ananya' | 'aarav'; voice: string }> = {
  ananya: { name: 'Ananya', avatar: 'ananya', voice: 'af_heart' },
  aarav: { name: 'Aarav', avatar: 'aarav', voice: 'am_michael' },
}

// System design is parked (PLAN.md), so it is not offered yet.
export type RoundChoice = Exclude<Round, 'system-design'> | 'full'

export type InterviewSettings = {
  round: RoundChoice
  track: Track
  level: Level
  // Questions in a single round; a full loop is always 5.
  count: number
  // Target length of one answer, for the timer and the report.
  answerMinutes: number
  interviewer: InterviewerId
  mood: Mood
  candidateName: string
}

export const DEFAULT_SETTINGS: InterviewSettings = {
  round: 'full',
  track: 'frontend',
  level: 'junior',
  count: 4,
  answerMinutes: 2,
  interviewer: 'ananya',
  mood: 'friendly',
  candidateName: '',
}

export const FULL_LOOP_COUNT = 5

// How many questions the bank has for this round, track and level.
export function availableCount(round: Exclude<RoundChoice, 'full'>, track: Track, level: Level): number {
  return BANK.filter(
    (q) => q.round === round && q.levels.includes(level) && (q.tracks.includes('any') || q.tracks.includes(track)),
  ).length
}

// Keeps a choice valid when another one changes (e.g. fewer questions exist
// for an intern backend technical round).
export function normalise(s: InterviewSettings): InterviewSettings {
  if (s.round === 'full') return s
  const max = Math.min(5, availableCount(s.round, s.track, s.level))
  return s.count > max ? { ...s, count: max } : s
}
