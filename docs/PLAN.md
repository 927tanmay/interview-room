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
- Round: **Behavioural**, **Technical** (for the track), **HR**, or **Full loop**
  (intro, 2 behavioural, 2 technical, 1 HR).
- Level: intern / junior / mid / senior.
- Interviewer: Ananya or Aarav (the two avatars), mood friendly / neutral / tough.
- **Video interview** (the 3D avatar, default) or **Phone screen** (voice only,
  through `react-ai-voice-avatar/headless`). The same interview either way;
  only the display changes. It is the first choice on the setup screen,
  loading starts once it is picked, and it cannot change after that. The
  avatar is lazy-loaded, so three.js only downloads for a video interview.
- Questions from: the built-in bank, the candidate's own list (paste or upload
  .txt / .csv), or a pasted job description (Gemma writes the questions).
- Number of questions and target answer length.

### The interview
- Avatar, current question card, live captions, answer timer (amber, then red
  past the target), progress dots, I'm done / Pause / Skip / End.
- One follow-up per question, aimed by rules, worded by Gemma.
- The interviewer handles silence, "repeat that", "what do you mean", "I don't
  know", garbled audio, a lost microphone, and model failures, out loud.
- A live privacy meter: network requests made since the interview started
  (target: 0).

### The report
- **No scores, no ratings, no percentages.** Only what was measured, plus their
  own words:
  - **Measured:** time per answer, words, words per minute, filler words by
    type (each with how it was measured).
  - **Quotes:** their answers, transcribed, with fillers highlighted and the
    part past the target time shaded.
  - **Plain comparisons where they help**, e.g. "Most behavioural answers aim
    for about 2 minutes; this one was 3 min 40 s." or "A comfortable speaking
    pace is about 120-160 words per minute; you spoke at 185."
- Charts of the measured numbers only: answer length vs target, pace vs the
  120-160 wpm band, filler words by type.
- Per answer: the transcript, the numbers, the follow-up asked, and the sample
  answer ("what a strong answer covers").
- **STAR parts and missed key points are not measurements.** They appear only
  if the Gemma 4 E2B eval (step 5.5) shows the review model gets them right;
  otherwise they are left out, or shown as **"possible gaps"** in plain words
  ("You may not have said how it turned out"), never as a tick grid or a
  number. Run 5: Gemma 4 E2B marked all four STAR parts present in a rambling
  answer, so as of now they are out.
- **Deep review by Gemma 4 E2B** (Heavy mode, after the interview, on the
  device): code review, possible gaps compared with the sample answer, and the
  weakest answer rewritten in the candidate's own words.
- Progress across sessions (IndexedDB): fillers per minute, pace, answer length
  over time. Export and delete.

### Models (all open-weight, all in the browser)

| Job | Model | Size | Status |
|---|---|---|---|
| Speech detection | Silero VAD (legacy) | 1.8 MB | via the package |
| Hearing | Whisper base (fp32 on WebGPU) | 295 MB | via the package |
| Voice | Kokoro-82M (fp32) | 326 MB | via the package |
| Gemma, **Light** mode | Gemma 3 1B (q4) | 880 MB | tested: good follow-ups with a guard, cannot judge |
| Gemma, **Heavy** mode | Gemma 4 E2B (q4f16, text parts) | 3.13 GB | tested: better follow-ups at the same speed on an M4, reviews code correctly |
| Runtime | ONNX Runtime WebAssembly | ~67 MB | package (1.29.0) + Gemma worker |
| Avatar (video only) | three.js code + one avatar | ~7 MB | via the package |

Sizes include tokenizer and config files, measured 3 Oct 2026 (source of truth:
`src/app/downloads.ts`). First visit: about 1.6 GB in Light, 3.8 GB in Heavy.

Two modes, chosen by the candidate on the home page. **Only the chosen mode's
Gemma is downloaded**; the other is never fetched unless the candidate switches
mode. If the system cannot run Heavy, the app falls back to Light and says why.
"Cannot run Heavy" means the WebGPU adapter lacks `shader-f16` (needed for
q4f16) or loading Gemma 4 E2B fails. Light (q4) does not need `shader-f16`.

- **Heavy:** Gemma 4 E2B is both the live interviewer and the reviewer. One
  model, loaded once.
- **Light:** Gemma 3 1B is the live interviewer. For weaker laptops or slow
  connections (4 min first load vs 14 min on my connection).

In both modes, every number in the report is measured by code. Neither model
judges STAR reliably yet, so STAR parts are left out unless step 5.5 shows
otherwise. See [MODEL-TESTS.md](MODEL-TESTS.md), runs 4 and 5.

### Who does what

| Part | Done by |
|---|---|
| Microphone, VAD, Whisper, Kokoro, avatar, barge-in | react-ai-voice-avatar |
| Interview order, timing, what to probe, recovery | The app's engine (plain code) |
| Follow-ups, reactions, rephrasing, questions from a JD | The mode's Gemma (app's own worker, through `onSubmit`) |
| Code review, possible gaps, rewritten answer | Gemma 4 E2B (Heavy mode) |
| Every number (time, words, wpm, fillers) | Plain code, with how it was measured |

---

## 2. Priorities

**P0, must ship (Sat):** home page with the Light / Heavy choice (fallback to
Light when Heavy is unsupported), setup, mic check, interview engine with follow-ups and
recovery, interview room, per-answer metrics, report with charts and sample
answers, first-load download screen, offline after first load, question bank
for all three tracks.

**P1, should ship (Sun morning):** Gemma 4 deep review, progress history, own
question upload, questions from a JD, privacy meter, Render deploy.

**P2, if time:** tough mood interrupts long answers, Markdown / print export,
pseudo-code round (only if Gemma 4 judges code correctly in the test).

---

## 3. Timeline (IST)

| When | What |
|---|---|
| Sat morning | Gemma 4 E2B test. Engine, Gemma worker, question bank. |
| Sat afternoon | Interview room + setup, first full spoken interview end to end. |
| Sat evening | Report and charts. Push to GitHub, first Render deploy. |
| Sun morning | P1 features, polish, fix what the first runs show. |
| Sun afternoon | README, screenshots, demo video. |
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
lines echoed from the question or answer, keep exactly one question. If the
guard rejects it, a written line for that angle is spoken instead. (Test run:
8 of 12 Gemma lines passed; the rest fell back cleanly.)

### When something goes wrong, the interviewer says so

| Situation | Detected by | Interviewer says / does |
|---|---|---|
| Silence after a question (12 s) | Timer | "Take your time. Want me to repeat the question?" |
| Still silent (25 s) | Timer | "No problem, let's come back to that." Marks it skipped. |
| "Can you repeat that?", "Sorry?" | Phrase match | Repeats the question |
| "What do you mean?" | Phrase match | Rephrases the question using its intent |
| "I don't know", "pass" | Phrase match | One nudge, then moves on |
| Garbled or one-word transcript | Length, known Whisper noise | "Sorry, I didn't catch that. Could you say it again?" |
| Answer runs past the target | Timer | Tough: "Let me stop you there. In one sentence, what was the result?" |
| "Can we pause / stop?" | Phrase match | Pauses or ends |
| Microphone lost | `micError` | Banner, and says so |
| Gemma fails mid-interview | Worker error | Carries on with written follow-ups; the report notes it |
| A model fails to load | `onError` | Plain explanation and a retry |
| Tab hidden | `visibilitychange` | Pauses |

---

## 5. Question bank

```ts
type BankQuestion = {
  id: string;
  round: 'behavioural' | 'technical' | 'hr';
  tracks: ('any' | 'frontend' | 'backend' | 'ml')[];
  levels: Level[];
  question: string;
  intent: string;         // what the interviewer is really checking
  keyPoints: { label: string; match: string[] }[];  // matched by code
  sampleAnswer: string;   // "what a strong answer covers"
  followUps: string[];    // written fallbacks
};
```

Target: ~10 behavioural and ~6 HR for any track, ~10 technical per track.
Gemma only sees the current question's intent and the angle for this turn.

---

## 6. Hacktoberfest checklist

### Rules
- [x] Brand-new repo, first commit 3 Oct 2026 (inside the window).
- [ ] Repo public under 927tanmay before submitting.
- [ ] README notes any commit made after Mon 5 Oct 06:59 UTC.
- [ ] Credits in README and post: react-ai-voice-avatar (I maintain it; say so
      plainly, and that this app is new), transformers.js, Silero VAD, Whisper,
      Kokoro, Gemma, and any copied file (e.g. the OPFS cache from the package).
- [ ] Model licences listed (Gemma terms, Whisper MIT, Kokoro Apache-2.0,
      Silero MIT).
- [ ] Post in English, using the template sections, tags `devchallenge,
      weekendchallenge, hf26challenge`.
- [ ] Demo link (Render) and a video.
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
2. Light mode after the interview: no deep review, or an opt-in "Get deep
   review" button that downloads Gemma 4 E2B (3.11 GB) only when pressed.
3. Entire CLI: install and connect to Claude Code now, so the rest of the build
   is captured.
4. Backboard model comparison: worth an hour, or skip.
