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
- Scores out of 100 for Fluency, Structure, Conciseness, Pace, each with its
  formula shown.
- Charts: answer length vs target, pace vs the 120-160 wpm band, filler words by
  type, STAR grid (question x S/T/A/R), key points covered.
- Per answer: transcript with fillers highlighted and the over-time part shaded,
  numbers, the follow-up asked, the sample answer, and Gemma's review.
- **Deep review by Gemma 4 E2B** (after the interview, on the device): STAR
  judgement, what was missing compared with the sample answer, and the weakest
  answer rewritten in the candidate's own words.
- Progress across sessions (IndexedDB): fillers per minute, pace, STAR coverage,
  answer length over time. Export and delete.

### Models (all open-weight, all in the browser)

| Job | Model | Size | Status |
|---|---|---|---|
| Speech detection | Silero VAD | ~2 MB | via the package |
| Hearing | Whisper base (en) | ~150 MB | via the package |
| Voice | Kokoro-82M (fp32) | ~310 MB | via the package |
| Interviewer (live, ~1 s replies) | Gemma 3 1B (q4) | 859 MB | tested: good follow-ups with a guard |
| Reviewer (after the interview) | Gemma 4 E2B (q4f16, text parts) | ~3.1 GB | **to test** |

If Gemma 4 E2B replies fast enough on an M2 Pro, it can also be the live
interviewer and Gemma 3 1B becomes the light option for weaker laptops.

### Who does what

| Part | Done by |
|---|---|
| Microphone, VAD, Whisper, Kokoro, avatar, barge-in | react-ai-voice-avatar |
| Interview order, timing, what to probe, recovery | The app's engine (plain code) |
| Follow-ups, reactions, rephrasing, questions from a JD | Gemma 3 1B (app's own worker, through `onSubmit`) |
| Judgement, gaps, rewritten answer | Gemma 4 E2B |
| Every number and score | Plain code, formulas shown |

---

## 2. Priorities

**P0, must ship (Sat):** setup, mic check, interview engine with follow-ups and
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

The answer is finished after ~2.5 s of silence or when the candidate presses
"I'm done".

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
The fixes to react-ai-voice-avatar (long-answer transcription, empty
`onSubmit`) go into the existing package. The post says so: the app is new,
the library it depends on got two fixes this weekend.

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
1. Gemma 4 E2B download for testing (~3.1 GB).
2. Entire CLI: install and connect to Claude Code now, so the rest of the build
   is captured.
3. Backboard model comparison: worth an hour, or skip.
