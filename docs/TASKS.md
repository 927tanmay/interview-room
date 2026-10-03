# Interview Room: tasks

The build broken into phases and steps, from [PLAN.md](PLAN.md). Each step is
done, checked, reported, and then the next one starts. Deadline: Mon 5 Oct
2026, 12:29 IST.

What the package does for us (react-ai-voice-avatar 0.7.0), checked in its
code:
- Passing `onSubmit` stops it downloading its own LLM.
- Whisper is called with `chunk_length_s: 30, stride_length_s: 5`, so answers
  over 30 s are transcribed whole (fixed in 0.7.0).
- An empty reply from `onSubmit` (`undefined`, `null`, `''`, or an empty
  stream) ends the turn and the hook waits for more speech (fixed in 0.7.0).
  That is how one answer is collected across pauses.
- `onSubmit(text, { speechMs })` gives how long the candidate spoke in that
  stretch, without the silence around it.
- `react-ai-voice-avatar/model-cache` exports `createModelCache()`, the OPFS
  store the package keeps its own models in, usable inside a worker.
- Kokoro is fixed at fp32 in the package. Avatars: `avatarPreset: 'ananya' |
  'aarav'`.

---

## Phase 0: Groundwork (Sat)

- [ ] **0.1 Commit the docs and the package upgrade.** MODEL-TESTS.md runs 4
  and 5, PLAN.md modes, this file, react-ai-voice-avatar 0.6.0 → 0.7.0. No
  co-authored-by line, no push.
- [ ] **0.2 App shell.** Replace the Vite starter with four screens (home,
  setup, interview, report) and a small app state to move between them. Dev
  server with the cross-origin isolation headers (COOP/COEP) that
  multithreaded WASM needs, so dev matches Render.
  Check: `npm run dev`, click through the empty screens, `npm run build` and
  `npm run lint` pass.

## Phase 1: Home page and models (Sat)

- [ ] **1.1 Device check.** WebGPU present, adapter, `shader-f16`
  (`navigator.gpu.requestAdapter()`). Heavy needs `shader-f16`; Light does not.
  Check: on this M4 both modes are allowed; with `shader-f16` faked off, Heavy
  is disabled with a reason.
- [ ] **1.2 Home page.** Pick Light (Gemma 3 1B, 859 MB) or Heavy (Gemma 4
  E2B, 3.11 GB), with sizes and what each mode gives. Unsupported Heavy falls
  back to Light and says why.
- [ ] **1.3 Gemma worker.** A Web Worker that loads only the chosen mode's
  model through `pipeline('text-generation')` (the eval page's loader),
  generates with greedy decoding and can be stopped. Messages: load, progress,
  generate, result, error.
  Check: a test button on the home page gets a reply in each mode.
- [ ] **1.4 OPFS cache for Gemma.** The Cache API refuses entries over 256 MiB,
  so Gemma is downloaded on every visit without this. In the Gemma worker:
  `env.useCustomCache = true; env.customCache = createModelCache()` from
  `react-ai-voice-avatar/model-cache`, guarded by `isModelCacheSupported()`.
  Check: second load makes no Hugging Face model requests; note warm load time
  for both models in MODEL-TESTS.md.
- [ ] **1.5 Heavy load failure falls back to Light.** If Gemma 4 E2B fails to
  load (memory, WebGPU error), say so and offer Light.
- [ ] **1.6 First-load screen.** One progress view for VAD, Whisper, Kokoro
  and the mode's Gemma, with sizes. Nothing downloads until the candidate
  presses Start.

## Phase 2: Voice pipeline (Sat)

- [ ] **2.1 Wire the hook.** `useAiVoiceAvatar` with `onSubmit` going to the
  Gemma worker, Kokoro on **fp32**, the avatar with the `ananya` / `aarav`
  preset. Check that Kokoro loads fp32 (worker log "Initializing Kokoro-82M on
  WebGPU (fp32)") and that the package does not fetch its own LLM.
- [ ] **2.2 Check: empty `onSubmit` reply goes back to listening** (fixed in
  0.7.0). Return `undefined` for a mid-answer pause; the status must leave
  "thinking" and the next stretch of speech must arrive.
- [ ] **2.3 Check: answers over 30 s come back whole** (fixed in 0.7.0). Speak
  for about 60 s without a pause; the transcript must cover all of it, and
  `speechMs` must be close to the real duration.
- [ ] **2.4 Mic check screen.** Level meter, say a test sentence, see the
  transcript, hear the voice. Handles a denied or lost microphone.

## Phase 3: Interview engine (Sat)

- [ ] **3.1 Question bank.** The `BankQuestion` type and data: ~10
  behavioural and ~6 HR for any track, ~10 technical each for frontend,
  backend and ML, with intent, key points, sample answer and written
  follow-ups.
- [ ] **3.2 Engine state machine.** Plain code, no UI: greeting, one small-talk
  turn, ask, collect the answer across pauses (done after ~2.5 s of silence or
  "I'm done"), follow-up, reaction, next question, "any questions for me?",
  closing. Testable without a microphone through `sendText`.
- [ ] **3.3 Follow-up angle rules.** Short answer, "we" without "I", no
  outcome, missing key point, full STAR, technical edge case (PLAN.md section
  4).
- [ ] **3.4 Prompts and guard.** Port the guided prompts and guard from
  `evals/interviewer.html` with the two fixes run 5 showed: accept a question
  ending in "." or phrased as an instruction ("Describe…", "Walk me
  through…"), and reject a reaction that is really a new question. Written
  fallback line per angle.
- [ ] **3.5 Re-run the evals with the new guard on both models.** Ask before
  downloading (859 MB + 3.11 GB). Record the pass rate in MODEL-TESTS.md.
- [ ] **3.6 Recovery.** Silence at 12 s and 25 s, "repeat that", "what do you
  mean", "I don't know", garbled transcript, pause / stop, lost microphone,
  Gemma failure mid-interview (carry on with written lines), tab hidden.

## Phase 4: Setup and interview room (Sat afternoon)

- [ ] **4.1 Setup page.** Track, round (or full loop), level, interviewer,
  mood, question source (built-in bank for now), number of questions, target
  answer length.
- [ ] **4.2 Interview room.** Avatar, question card, live captions, answer
  timer (amber, then red past the target), progress dots, I'm done / Pause /
  Skip / End.
- [ ] **4.3 Milestone: first full spoken interview end to end** in both modes.
  Note what breaks.

## Phase 5: Report (Sat evening)

- [ ] **5.1 Metrics in code.** Words, duration, pace (wpm from the sum of
  `speechMs` over the answer's stretches), fillers by type,
  STAR parts, key points covered, over-time part. Unit-checked on the eval
  fixtures.
- [ ] **5.2 Scores.** Fluency, Structure, Conciseness, Pace out of 100, each
  with its formula shown.
- [ ] **5.3 Charts.** Answer length vs target, pace vs 120-160 wpm band,
  fillers by type, STAR grid, key points.
- [ ] **5.4 Per-answer section.** Transcript with fillers highlighted and the
  over-time part shaded, numbers, the follow-up asked, sample answer, tip.
- [ ] **5.5 Eval cases for the deep review.** Add "what is missing compared
  with the sample answer" and "rewrite the weakest answer in their own words"
  to the suite; run on Gemma 4 E2B (ask before downloading).
- [ ] **5.6 Deep review (Heavy).** Code review, gaps vs the sample answer,
  rewritten weakest answer. Light mode: decide first (PLAN.md open decision 2).

## Phase 6: Ship a first version (Sat evening)

- [ ] **6.1 Offline after first load.** App files cached, models already in
  OPFS; works with the network off.
- [ ] **6.2 Render.** `render.yaml` static site with COOP/COEP headers and a
  Deploy to Render button. Ask before creating the GitHub repo, pushing, or
  deploying.
- [ ] **6.3 Test the deployed link on the M2 Pro** (friend's laptop): mode
  picked, load time, reply speed, memory. Record in MODEL-TESTS.md.

## Phase 7: P1 features (Sun morning)

- [ ] **7.1 Progress history** in IndexedDB: fillers per minute, pace, STAR
  coverage, answer length over time. Export and delete.
- [ ] **7.2 Own questions:** paste or upload .txt / .csv.
- [ ] **7.3 Questions from a job description** (Gemma writes them; Heavy
  followed the one-per-line format, Light needs cleanup).
- [ ] **7.4 Privacy meter:** network requests since the interview started.
- [ ] **7.5 Fixes from the first runs.**

## Phase 8: Submission (Sun afternoon to Mon 11:00)

- [ ] **8.1 README:** what it is, how to run, Light vs Heavy, credits
  (react-ai-voice-avatar, said plainly that I maintain it and the app is new;
  transformers.js, Silero VAD, Whisper, Kokoro, Gemma), licences (Gemma 3
  under the Gemma terms, Gemma 4 Apache 2.0, Whisper MIT, Kokoro Apache-2.0,
  Silero MIT), the package fixes made this weekend (0.7.0: long answers,
  empty replies, `speechMs`, `model-cache`).
- [ ] **8.2 Screenshots, GIF, demo video.**
- [ ] **8.3 Friend tries it;** note what they say.
- [ ] **8.4 Repo public, post written** (template sections, tags
  `devchallenge, weekendchallenge, hf26challenge`, prize categories), published
  by ~11:00 Mon.

## P2, only if time

- Tough mood interrupts long answers.
- Markdown / print export of the report.
- Pseudo-code round (Gemma 4 E2B got both code reviews right in run 5; needs
  more cases first).
