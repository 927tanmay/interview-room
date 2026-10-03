import { BANK } from '../interview/bank'
import { InterviewEngine, LONG_PAUSE_MS, type EngineSnapshot } from '../interview/engine'
import { DEFAULT_SETTINGS, INTERVIEWERS, type InterviewSettings } from '../interview/settings'
import { wordCount } from '../interview/text'

// Dev only: a whole interview run through the real engine with a fake clock,
// fed the same signals the voice sends (interviewer finished, speech ended,
// transcript), so the report gets exactly what a real run records. No models.
//
// The candidate's answers are written to exercise the report: fillers, "we"
// far more than "I", numbers, a long pause, an answer past the target time, a
// skipped question, a follow-up reply, and talking over the interviewer.

export const FAKE_SETTINGS: InterviewSettings = { ...DEFAULT_SETTINGS, round: 'full', track: 'frontend', answerMinutes: 1 }

const DETECTOR_WAIT_MS = 1400
const WHISPER_MS = 600

type Stretch = { text: string; wpm?: number; gapMs?: number }

export function fakeInterview(startAt = Date.now()): EngineSnapshot {
  let now = startAt
  let timers: { fn: () => void; at: number; id: number }[] = []
  let nextId = 1
  let snapshot: EngineSnapshot | null = null
  const spoken: string[] = []

  const questions = ['b-improved', 'fe-useeffect', 'b-feedback', 'h-leaving'].map((id) => BANK.find((q) => q.id === id)!)
  const engine = new InterviewEngine(
    {
      questions,
      track: FAKE_SETTINGS.track,
      level: FAKE_SETTINGS.level,
      interviewer: INTERVIEWERS[FAKE_SETTINGS.interviewer].name,
      mood: FAKE_SETTINGS.mood,
    },
    {
      speak: (text) => spoken.push(text),
      now: () => now,
      setTimer: (fn, ms) => {
        const t = { fn, at: now + ms, id: nextId++ }
        timers.push(t)
        return t.id
      },
      clearTimer: (id) => (timers = timers.filter((t) => t.id !== id)),
      onChange: (s) => (snapshot = s),
    },
  )

  const advance = (ms: number) => {
    const until = now + ms
    for (;;) {
      const due = timers.filter((t) => t.at <= until).sort((a, b) => a.at - b.at)[0]
      if (!due) break
      now = due.at
      timers = timers.filter((t) => t !== due)
      due.fn()
    }
    now = until
  }
  // The interviewer's line plays, roughly at speaking pace.
  const interviewerSpeaks = () => {
    advance(Math.max(1500, wordCount(spoken.at(-1) ?? '') * 380))
    engine.interviewerFinished()
  }
  // The candidate's answer: stretches of speech with gaps between them.
  const answer = (firstWordAfterMs: number, stretches: Stretch[]) => {
    advance(firstWordAfterMs)
    stretches.forEach((s, i) => {
      if (i > 0) {
        // The previous transcript arrived DETECTOR_WAIT_MS + WHISPER_MS after
        // the speech ended; the rest of the gap passes before they talk again.
        advance(Math.max(0, (s.gapMs ?? 1600) - DETECTOR_WAIT_MS - WHISPER_MS))
      }
      engine.userStartedSpeaking()
      const speechMs = Math.round((wordCount(s.text) / (s.wpm ?? 140)) * 60_000)
      advance(speechMs)
      engine.speechEnded(now)
      advance(DETECTOR_WAIT_MS + WHISPER_MS)
      engine.heard(s.text, speechMs)
    })
    // The long pause ends the answer, and the next line plays.
    advance(LONG_PAUSE_MS.normal)
    interviewerSpeaks()
  }

  engine.start()
  interviewerSpeaks()
  answer(900, [{ text: "Hi, I'm doing well, thanks. A bit nervous but excited." }])

  // 1. b-improved: "we" far more than "I", fillers, numbers, a long pause, past
  //    the 1 minute target.
  answer(2600, [
    {
      text: 'So, basically, at my last internship we had this dashboard that was, like, really slow. We noticed that the main page took about 9 seconds to load on a normal laptop, and our support team kept getting complaints from customers about it.',
      wpm: 125,
    },
    {
      text: 'We looked into it as a team, and, you know, we found that the page was fetching the same data four times and we were also rendering a huge table with all the rows at once. So we decided to add caching with React Query and we virtualised the table.',
      wpm: 120,
      gapMs: 4200,
    },
    {
      text: 'We also kind of split the bundle so the charts loaded later. After that, the page loaded in around 2 seconds, and the complaints basically stopped. I think it was a good project for our team, and we learned a lot about performance.',
      wpm: 120,
      gapMs: 1800,
    },
  ])
  // The follow-up (written, no Gemma here) and a short reply.
  answer(1800, [
    {
      text: 'I mean, I was the one who profiled it in the React Profiler and found the repeated fetches. I wrote the caching layer myself.',
      wpm: 155,
    },
  ])

  // 2. fe-useeffect: a fair technical answer, within time; misses cleanup.
  answer(1400, [
    {
      text: 'useEffect lets you run side effects after React renders the component. For example fetching data from an API, or setting up a subscription or a timer.',
      wpm: 140,
    },
    {
      text: 'The dependency array controls when it runs again. If you pass an empty array it only runs once after the first render, and if you leave it out it runs after every render.',
      wpm: 140,
      gapMs: 2200,
    },
  ])
  answer(3800, [{ text: "If it unmounts during a fetch, I think you'd get a warning. You can use an abort controller in the cleanup.", wpm: 125 }])

  // 3. b-feedback: skipped.
  advance(2500)
  engine.skip()

  // 4. h-leaving: they start talking just before the question ends (the voice
  //    stops when they talk over it), short and a little fast.
  advance(Math.max(1500, wordCount(spoken.at(-1) ?? '') * 380) - 400)
  engine.userStartedSpeaking()
  {
    const text =
      "I'm looking for a role where I can own features end to end and work on a product with real users. My current team is great and I've learned a lot there, but the scope is quite narrow."
    const speechMs = Math.round((wordCount(text) / 175) * 60_000)
    advance(400)
    engine.interviewerFinished()
    advance(speechMs - 400)
    engine.speechEnded(now)
    advance(DETECTOR_WAIT_MS + WHISPER_MS)
    engine.heard(text, speechMs)
    advance(LONG_PAUSE_MS.normal)
    interviewerSpeaks()
  }
  answer(2000, [{ text: 'More ownership, and working closely with designers and users.', wpm: 140 }])

  // Candidate questions, then the closing line.
  answer(1500, [{ text: 'What does a typical week look like for someone joining the team?' }])

  if (!snapshot) throw new Error('fake interview produced no snapshot')
  return snapshot
}
