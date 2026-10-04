# Interview Room: plan

A spoken mock interviewer for software engineers that runs entirely in the
browser. Silero VAD detects speech, Whisper hears, Gemma is the interviewer and
the reviewer, Kokoro speaks, and a lip-synced avatar is the face. Nothing the
candidate says leaves the laptop, and nothing needs installing: open a link.

Built on [react-ai-voice-avatar](https://github.com/927tanmay/react-ai-voice-avatar),
which I maintain. This app is new, started 3 Oct 2026 for the DEV Hacktoberfest
Weekend Challenge: Build for a Friend.

Deadline: Mon 5 Oct 2026, 12:29 IST (06:59 UTC).

---

## 1. What we are building

### Interview setup
- Track: **Frontend**, **Backend**, **ML**.
- Round: **Behavioural**, **Technical** (for the track), **HR**, or **Full
  loop** (intro, 2 behavioural, 2 technical, 1 HR). **System design** is
  parked (section 4).
- Level: intern / junior / mid / senior.
- Interviewer: Ananya or Aarav (the two avatars), mood friendly / neutral / tough.
- **Video interview** (the 3D avatar, default) or **Phone screen** (voice only,
  through `react-ai-voice-avatar/headless`). The same interview either way;
  only the display changes. It is the first choice on the setup screen,
  loading starts once it is picked, and it cannot change after that. The
  avatar is lazy-loaded, so three.js only downloads for a video interview.
- Questions from the built-in bank. Later (P1, not built): the candidate's own
  list (paste or upload .txt / .csv), or a pasted job description.
- Number of questions and target answer length.

### The interview
- Avatar, current question card, live captions, answer timer (amber, then red
  past the target), progress dots, I'm done / Pause / Skip / End.
- One follow-up per question, aimed by rules, worded by Gemma.
- The interviewer handles silence, "repeat that", "what do you mean", "I don't
  know", garbled audio, a lost microphone, and model failures, out loud.
- Later (P1, not built): a live privacy meter, network requests made since
  the interview started (target: 0).

### The report (built, 4 Oct)

Changed direction on 4 Oct: **the candidate reviews their own answers against
what a strong answer covers, and the app never judges.** Feedback is built
from their own marks plus measured numbers. No model is involved.

- **Self-review first**, one answer at a time (about 1-2 minutes in all): the
  question, their words and the follow-up, "how did that one feel?" (good /
  okay / rough), then 3-5 strong-answer points beside the answer, each marked
  covered, partly or missed. Keyboard shortcuts, progress dots, a skip to the
  numbers. Every question outside system design has tagged points in
  `bank.ts` (result, your role, example, trade-off, edge case…).
- **No scores, no ratings, no percentages.** Only what was measured, each with
  how it was measured: answer length (voice detector, first word to last),
  pace (words over speaking time, against 120-160), time to first word,
  pauses over 3 s, filler phrases, "I" against "we", numbers mentioned.
  Missing timings show as "not measured". Skipped or silent answers are shown
  as such.
- **Up to three things to work on**, picked by plain rules: the kind of point
  marked missed most often, an answer that felt good but was mostly missed,
  the furthest over target; then fillers and pace. Each says where it came
  from and links to the answer.
- **Gentle second looks** where marks and numbers disagree: result marked
  covered with no number heard; own role covered with far more "we" than "I".
- **Per answer:** their words with fillers, numbers and pauses marked and the
  part past the target shaded; the follow-up and reply; the numbers; their
  marks; **Practice this one again**.
- Plain SVG charts with the numbers on them. Saved in IndexedDB; prints to
  PDF.
- **Phase 2 (not started, waiting for a go):** a small embedding model that
  highlights the closest sentence for a point, only after the candidate has
  marked it.
- **Deep review by Gemma 4 E2B** (code review, possible gaps, rewritten
  answer) stays with Heavy mode, phase H.
- Later (P1): progress across sessions (fillers per minute, pace, answer
  length over time), export and delete.

### Models (all open-weight, all in the browser)

| Job | Model | Size | Status |
|---|---|---|---|
| Speech detection | Silero VAD (legacy) | 1.8 MB | via the package |
| Hearing | Whisper base (fp32 on WebGPU) | 295 MB | via the package; mishears some technical terms (switching model is a P2) |
| Voice | Kokoro-82M (fp32) | 326 MB | via the package |
| Gemma, **Light** mode | Gemma 3 1B (q4) | 880 MB | tested: good follow-ups with a guard, cannot judge |
| Gemma, **Heavy** mode | Gemma 4 E2B (q4f16, text parts) | 3.13 GB | tested in the eval: better follow-ups, reviews code correctly. **Shown as "coming soon"** in the app until it works end to end |
| Runtime | ONNX Runtime WebAssembly | ~67 MB | package (1.29.0) + Gemma worker |
| Avatar (video only) | three.js code + one avatar | ~7 MB | via the package |

Sizes include tokenizer and config files, measured 3 Oct 2026 (source of truth:
`src/app/downloads.ts`). First visit: about 1.6 GB in Light, 3.8 GB in Heavy.

Two modes, chosen by the candidate on the home page. **Only the chosen mode's
Gemma is downloaded**; the other is never fetched unless the candidate switches
mode. **For now Heavy shows as "coming soon"** and cannot be picked
(`HEAVY_AVAILABLE` in `src/app/downloads.ts`); the home page shows Light's
download breakdown. Once Heavy is on: if the system cannot run it, the app
says why and offers Light.
"Cannot run Heavy" means the WebGPU adapter lacks `shader-f16` (needed for
q4f16) or loading Gemma 4 E2B fails. Light (q4) does not need `shader-f16`.

- **Heavy:** Gemma 4 E2B is both the live interviewer and the reviewer. One
  model, loaded once.
- **Light:** Gemma 3 1B is the live interviewer. For weaker laptops or slow
  connections (4 min first load vs 14 min on my connection).

In both modes, every number in the report is measured by code, and the
judging of each answer is the candidate's own (the self-review). Neither model
judges STAR reliably. See [MODEL-TESTS.md](MODEL-TESTS.md), runs 4 and 5.

### Who does what

| Part | Done by |
|---|---|
| Microphone, VAD, Whisper, Kokoro, avatar, barge-in | react-ai-voice-avatar |
| Interview order, timing, what to probe, recovery | The app's engine (plain code) |
| Wording the follow-up the rules chose | The mode's Gemma (app's own worker), checked by the guard |
| Judging each answer | The candidate, in the self-review |
| What to work on | Plain rules over their marks and the numbers |
| Every number (length, pace, first word, pauses, fillers, I/we, numbers) | Plain code, with how it was measured |
| Code review, possible gaps, rewritten answer | Gemma 4 E2B (Heavy mode, phase H, not built) |

---

## 2. Priorities

**P0, must ship (Sat):** home page with the Light / Heavy choice, setup, mic
check, interview engine with follow-ups and recovery, interview room,
self-review and measured report with charts, first-load download screen,
question bank for all three tracks. **Done**, plus the Render deploy and a UI
polish pass on home and setup (4 Oct).

**P1, should ship (Sun morning):** Heavy and the Gemma 4 deep review, progress
history, own question upload, questions from a JD, privacy meter, fully
offline (self-host the VAD files and ONNX runtime). **Not built yet.**

**P2, if time:** tough mood interrupts long answers, Markdown export (print to
PDF is done), pseudo-code round, a better Whisper (TASKS.md: P2).

---

## 3. Timeline (IST)

| When | What |
|---|---|
| Sat morning | Gemma 4 E2B test. Engine, Gemma worker, question bank. |
| Sat afternoon | Interview room + setup, first full spoken interview end to end. |
| Sat evening | Report and charts. Push to GitHub, first Render deploy. |
| Sun morning | P1 features, polish, fix what the first runs show. |
| Sun afternoon | README, screenshots, demo video. |
| **Actual, Sun 4 Oct** | Render deploy; the self-review report (steps 1-7); first real run and its fixes; home and setup polish; README with screenshots. |
| Sun evening | Friend tries it; note what he says. |
| Mon morning | Post written and published by ~11:00 (deadline 12:29). |

---

## 4. Conversation flow

```
mic check -> greeting -> small talk (1 turn)
  -> for each question:
       ask -> listen (collect the whole answer across pauses)
       -> pick a follow-up angle (rules) -> Gemma words it -> guard -> listen
       -> short reaction -> next question
  -> "Any questions for me?" -> closing -> report
```

The answer is finished when the candidate presses "I'm done", or after a long
pause, much longer than a gap between sentences (see [UX.md](UX.md); the
length is tuned in step 4.3). A short silence never ends an answer.

### Follow-up angles (picked by rules)

| Signal in the answer | Angle |
|---|---|
| Under ~25 words | Ask them to walk through it in more detail |
| Mostly "we", little "I" | Ask what they did themselves |
| No outcome words or numbers | Ask for the result, ideally measurable |
| A key point from the bank is missing | Ask about that point |
| Full STAR answer | Ask about a trade-off, or how they knew it worked |
| Technical question | Ask a "what happens if" edge case |

Every Gemma line passes a guard: strip quotes and markdown, drop praise and
lines echoed from the question or answer, keep exactly one question. Outcome
and ownership follow-ups must ask about that; a missing-point follow-up must
use the bank's words for that point (added after the first real run, where
Gemma drifted off the point). If the guard rejects it, a written line for that
angle is spoken instead. (Test run: 8 of 12 Gemma lines passed; the rest fell
back cleanly.)

### When something goes wrong, the interviewer says so

| Situation | Detected by | Interviewer says / does |
|---|---|---|
| Silence after a question (12 s) | Timer | "Take your time. Want me to repeat the question?" |
| Still silent (25 s) | Timer | "No problem, let's come back to that." Marks it skipped. |
| "Can you repeat that?", "Sorry?" | Phrase match | Repeats the question |
| "What do you mean?" | Phrase match | Rephrases the question using its intent |
| "I don't know", "pass", "sorry, I don't know" | Phrase match | One nudge, then moves on |
| "Can we skip this one?", "let's move on" | Phrase match | Skips the question (a skipped follow-up keeps the answer) |
| Garbled or one-word transcript | Length, known Whisper noise | "Sorry, I didn't catch that. Could you say it again?" |
| Answer runs past the target | Timer | The timer turns red. (Tough interrupting: P2, not built.) |
| "Can we pause / stop?" | Phrase match | Pauses or ends |
| Microphone lost | `micError` | Banner, and says so |
| Gemma fails mid-interview | Worker error | Carries on with written follow-ups; the report notes it |
| A model fails to load | `onError` | Plain explanation and a retry |
| Tab hidden | `visibilitychange` | Pauses |

### System design round (parked, come back later)

Agreed scope, kept small:
- **Conversational, not one long answer.** Each question carries written
  facts (scale, users, constraints) and 4 probes in order (high-level design,
  deep dive, scale, trade-offs).
- A clarifying question from the candidate ("how many users?", "can I
  assume…") is answered with the question's facts; otherwise the next probe
  is asked. At most 2 clarifying answers; wrap up after the 4 probes, 7
  exchanges in all, or about 10 minutes.
- **No Gemma in this round**: facts and probes are written lines, so no
  invented numbers, same in Light and Heavy. **No judging** of the design (no
  "possible gaps", no review).
- Long pause before an answer counts as finished: 7 s (5 s elsewhere).
- Only when "System design" is chosen as the round; not in the full loop.
  Spoken only: no whiteboard or diagrams.
- Report: the exchanges (what was asked, what they said) with time and words
  per exchange. No scores.

Done so far: the 10 questions with facts and probes (`bank.ts`), and the
engine's design branch (`engine.ts`). Not offered in setup and not tested
until we come back to it.

---

## 5. Question bank

```ts
type BankQuestion = {
  id: string;
  round: 'behavioural' | 'technical' | 'system-design' | 'hr';
  tracks: ('any' | 'frontend' | 'backend' | 'ml')[];
  levels: Level[];
  question: string;
  intent: string;         // what the interviewer is really checking
  keyPoints: { label: string; match: string[] }[];  // matched by code
  sampleAnswer: string;   // "what a strong answer covers"
  followUps: string[];    // written fallbacks
};
```

Target: ~10 behavioural and ~6 HR for any track, ~10 technical per track,
and system design: 5 for any track plus 1-2 per track (URL shortener, photo
sharing, chat, news feed, notifications; autocomplete and a shared component
library for frontend; seat booking for backend; recommendations and fraud
detection for ML).
Gemma only sees the current question's intent and the angle for this turn.

---

## 6. Hacktoberfest checklist

### Rules
- [x] Brand-new repo, first commit 3 Oct 2026 (inside the window).
- [x] Repo public under 927tanmay before submitting
      (github.com/927tanmay/interview-room).
- [ ] README notes any commit made after Mon 5 Oct 06:59 UTC.
- [x] Credits in the README: react-ai-voice-avatar (I maintain it; said
      plainly, and that this app is new), transformers.js, Silero VAD, Whisper,
      Kokoro, Gemma, ONNX Runtime, three.js, Inter. Still to do in the post.
- [x] Model licences listed in the README (Gemma terms, Gemma 4 Apache-2.0,
      Whisper MIT, Kokoro Apache-2.0, Silero MIT).
- [ ] Post in English, using the template sections, tags `devchallenge,
      weekendchallenge, hf26challenge`.
- [x] Demo link (Render): https://interview-room-iooj.onrender.com
- [ ] A video.
- [ ] Prize Categories section lists every category entered.

### Package changes made during the weekend
The fixes to react-ai-voice-avatar went into the existing package as 0.7.0
(published 3 Oct 2026): long-answer transcription, empty `onSubmit` replies,
plus `speechMs` and the `model-cache` entry point. The app uses 0.7.0. The post
says so: the app is new, the library it depends on got these fixes this
weekend.

---

## 7. Judging criteria and what earns points

| Criterion | What we do for it |
|---|---|
| **Writing quality** (weighted most) | Specific title and opening about the friend and his problem. Plain words, written by me. A diagram of the five models, screenshots or a GIF of the interview and report. Honest limits: what the 1B model could not do and how the design works around it. Real numbers (latency, download size). |
| **Relevance** | Five open-weight models are the whole product, all local. Built for one real friend; his reaction in the post. "Why open matters": practice answers are private, $0 per interview, works offline, models can be swapped by size for the job. A closed API would mean uploading every spoken answer. |
| **Creativity** | A familiar problem done differently: an interviewer that listens and follows up, with a face and voice, from a link with nothing installed. "Rules decide, Gemma speaks." Two Gemmas sized for their jobs. The privacy meter. |
| **Technical execution** | Works from a URL on a Mac. Recovers out loud when things go wrong. Long answers handled. Cached for offline use. Tested prompts with measured fallback rate. Clean README. |
| **Partner technology** | Gemma, Render, Entire (below). |

### Partner categories

| Category | Prize | Enter? | How it is used |
|---|---|---|---|
| Best Use of Gemma (featured) | $200 | **Yes** | Gemma 3 1B interviews live, Gemma 4 E2B reviews, both in the browser. The core of the app. |
| Best Use of Render (featured) | $200 | **Yes** | Render hosts the front end as a static site with the cross-origin isolation headers multithreaded WASM needs; `render.yaml` blueprint and a Deploy to Render button in the README. ("Host an agent's front end" is listed as qualifying.) |
| Best Use of Entire | $100 | **Yes, if set up now** | Entire CLI records the Claude Code sessions as checkpoints with each commit; the post links them and uses them to explain decisions. |
| Best Use of ElevenLabs | $100 | No | No credits offered for this challenge, and using it in the app would break the private-voice promise. |
| Best Use of Backboard | $100 | Maybe | Only as a dev tool: compare open-weight models on the interviewer prompts through one Backboard key before choosing Gemma. Not in the app. |
| Sentry Agent Tracing | $100 | No | Sending traces off the device contradicts the privacy point. |
| Others (TabPFN, Tinker, Arduino, DigitalOcean, Backboard, Copilot, Mastra, MongoDB, SerpApi, Temporal, Tiger Data) | | No | Not genuinely used. |

One project can win only once per challenge, so the aim is the overall prize,
with Gemma and Render as the strongest categories.

### Free credits (claim at hacktoberfest.com/my/promos)
- **Render:** $50 credit. A static site is free on Render, so the credit is a
  buffer, not a need.
- **Backboard:** available; only needed if we enter Backboard (model comparison).
- ElevenLabs, Tinker: no credits for this challenge / not used.

---

## 8. Open decisions
1. ~~Gemma 4 E2B download for testing~~ Done: runs 4 and 5 in MODEL-TESTS.md;
   Light / Heavy modes chosen on the home page.
2. ~~Light mode after the interview~~ Decided: the self-review report, no
   model judging. A deep review stays with Heavy (phase H).
3. ~~Entire CLI~~ Done: checkpoints are pushed with each commit, with email
   redaction on.
4. Backboard model comparison: skipped for now.
5. Heavy: turn on once it works end to end (`HEAVY_AVAILABLE`), or leave as
   "coming soon" for the submission.
6. Better speech recognition after the challenge: `whisper-base.en` through
   `asrModel` first, then our own Whisper with the question's vocabulary
   (TASKS.md: P2).
