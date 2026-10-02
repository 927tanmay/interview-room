# Interview Room: plan

A mock interviewer that runs entirely in the browser. Whisper hears, Gemma 3 1B
is the interviewer, Kokoro speaks, and a lip-synced avatar is the face. Nothing
the candidate says leaves the laptop.

Built on [react-ai-voice-avatar](https://github.com/927tanmay/react-ai-voice-avatar),
which I maintain. This app is new for the DEV Hacktoberfest Weekend Challenge.

## Who does what

| Part | Done by |
|---|---|
| Microphone, voice detection, Whisper, Kokoro, avatar, barge-in | react-ai-voice-avatar |
| Interview order, timing, what to probe, recovery | The app's interview engine (plain code) |
| Wording follow-ups, reactions, rephrasing, one tip per answer | Gemma 3 1B, in the app's own worker, through `onSubmit` |
| Every score and number in the report | Plain code, formulas shown to the user |

Gemma never decides the flow and never scores. Prompt tests showed a 1B model
words a follow-up well when told what to ask about, but judges STAR and code
badly. Every Gemma line passes a guard (strip quotes and markdown, drop praise
and echoed lines, keep exactly one question) and falls back to a written line
if the guard rejects it.

## Conversation flow

```
mic check -> greeting -> small talk (1 turn)
  -> for each question:
       ask -> listen (collect the whole answer across pauses)
       -> pick a follow-up angle (rules) -> Gemma words it -> listen
       -> short reaction -> next question
  -> "Any questions for me?" -> closing -> report
```

The answer is finished after ~2.5 s of silence or when the candidate presses
"I'm done". One follow-up per main question.

### Follow-up angles (picked by rules)

| Signal in the answer | Angle |
|---|---|
| Under ~25 words | Ask them to walk through it in more detail |
| Mostly "we", little "I" | Ask what they did themselves |
| No outcome words or numbers | Ask for the result, ideally measurable |
| A key point from the question bank is missing | Ask about that point |
| Full STAR answer | Ask about a trade-off, or how they knew it worked |
| Technical question | Ask a "what happens if" edge case |

### When something goes wrong, the interviewer says so

| Situation | Detected by | Interviewer says / does |
|---|---|---|
| Silence after a question (12 s) | Timer | "Take your time. Want me to repeat the question?" |
| Still silent (25 s) | Timer | "No problem, let's come back to that." Marks it skipped. |
| "Can you repeat that?", "Sorry?" | Phrase match | Repeats the question |
| "What do you mean?" | Phrase match | Rephrases the question (Gemma, using the question's intent) |
| "I don't know", "pass" | Phrase match | One nudge ("How would you go about finding out?"), then moves on |
| Garbled or one-word transcript | Length and known Whisper noise ("Thank you.", "you") | "Sorry, I didn't catch that. Could you say it again?" |
| Answer runs past the target | Timer | Tough: "Let me stop you there. In one sentence, what was the result?" Others: a gentle nudge after the answer |
| "Can we pause / stop?" | Phrase match | Pauses or ends the interview |
| Microphone lost | `micError` | Banner, and "I've lost your microphone. Check it, then press Resume." |
| Gemma fails mid-interview | Worker error | Carries on with written follow-ups; the report notes it |
| A model fails to load | `onError` | Plain explanation and a retry, before the interview starts |
| Tab hidden | `visibilitychange` | Pauses |

## Question bank

Each question carries context for the interviewer and for the report:

```ts
type BankQuestion = {
  id: string;
  type: 'behavioural' | 'technical' | 'hr';
  roles: string[];        // 'any', 'frontend', 'backend', 'data-analyst', ...
  levels: Level[];
  question: string;
  intent: string;         // what the interviewer is really checking
  keyPoints: { label: string; match: string[] }[];  // matched by code
  sampleAnswer: string;   // shown in the report as "what a strong answer covers"
  followUps: string[];    // written fallbacks
};
```

Gemma only sees the current question's intent and the angle for this turn, not
the whole bank. A 1B model loses track of a long context, and short, focused
prompts are what tested well.

Sources of questions:
1. The built-in bank (behavioural and HR for any role, technical for a few roles).
2. The candidate's own list: paste, or upload .txt or .csv. A CSV can carry a
   sample answer and key points per question.
3. A pasted job description: Gemma writes the questions. These have no key
   points, so the report uses the general measures only.

## Report (all computed on the device)

- Per answer: duration, speaking pace, filler words, STAR parts, key points
  covered, "we" vs "I", transcript with fillers highlighted and the part past
  the target shaded, the follow-up asked, one tip from Gemma, the sample answer.
- Charts: answer length vs target, pace vs a 120-160 wpm band, fillers by
  type, STAR grid.
- Progress across sessions, stored in IndexedDB, with export and delete.
