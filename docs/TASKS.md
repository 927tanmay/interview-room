# Interview Room: tasks

The build broken into phases and steps, from [PLAN.md](PLAN.md). Each step is
done, checked, reported, and then the next one starts. Every step follows the
rules in [UX.md](UX.md). Deadline: Mon 5 Oct 2026, 12:29 IST.

**Order: Light first.** The whole app is built and checked end to end with
Light (Gemma 3 1B) through phases 1 to 6. Heavy (Gemma 4 E2B) and the deep
review come after, in phase H, so the 3.13 GB model is only downloaded once
the rest works.

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
- **Gap for Video vs Phone:** `<AiVoiceAvatar>` runs its own copy of the hook
  inside, and the 3D view that takes the hook's refs is not exported. The
  workers belong to each hook instance and are terminated on unmount.
  **Workaround (decided; the package is not changed this weekend):** Phone
  screen runs the headless hook, Video runs `<AiVoiceAvatar>`, both fed the
  same interview logic. The choice is the first thing on the setup screen,
  loading starts once it is picked, and it cannot change after that. App
  mounts the engine once (`VoiceHost`) and keeps it mounted from that choice
  to the end of the interview; screens change around it. An
  `AiVoiceAvatarView` export is for after the challenge.
- **Model caching (checked in 0.7.0):** both package workers (Whisper in the
  ML worker, Kokoro in its own) point transformers.js at the OPFS cache
  (`react-ai-voice-avatar-models`). A file is written in full, then a `.ok`
  marker with its size; a file is only served if the marker exists and the
  size matches. So a reload mid-download loses only the file that was not
  finished. Not in OPFS: the Silero VAD files and the ONNX runtime WASM, which
  load from jsdelivr (`@ricky0123/vad-web@0.0.30`, `onnxruntime-web@1.29.0`)
  and rely on the browser's HTTP cache.
- **No reduced-motion handling** in the package; the app has to provide it.

---

## Phase 0: Groundwork (Sat)

- [x] **0.1 Commit the docs and the package upgrade.** MODEL-TESTS.md runs 4
  and 5, PLAN.md modes, this file, react-ai-voice-avatar 0.6.0 → 0.7.0. No
  co-authored-by line, no push.
- [x] **0.2 App shell.** Replace the Vite starter with four screens (home,
  setup, interview, report) and a small app state to move between them. Dev
  server with the cross-origin isolation headers (COOP/COEP) that
  multithreaded WASM needs, so dev matches Render. Setup starts with Video
  interview (default) or Phone screen; `VoiceHost` is mounted once from that
  choice to the end of the interview; the video engine is lazy-loaded. Glass
  design per UX.md.
  Check: `npm run dev`, click through the empty screens, `npm run build` and
  `npm run lint` pass.

## Phase 1: Home page and models (Sat)

- [x] **1.1 Device check.** WebGPU present, adapter, `shader-f16`
  (`navigator.gpu.requestAdapter()`). Heavy needs `shader-f16`; Light does not.
  Check: on this M4 both modes are allowed; with `shader-f16` faked off, Heavy
  is disabled with a reason.
- [x] **1.2 Home page.** Pick Light (Gemma 3 1B, 859 MB) or Heavy (Gemma 4
  E2B, 3.11 GB), with sizes and what each mode gives. Unsupported Heavy falls
  back to Light and says why.
- [x] **1.3 Gemma worker.** A Web Worker that loads only the chosen mode's
  model through `pipeline('text-generation')` (the eval page's loader),
  generates with greedy decoding and can be stopped. Messages: load, progress,
  generate, result, error. Test panel: `?dev=gemma` (dev only).
  Checked with Light (MODEL-TESTS.md, run 6); Heavy is checked in phase H.
- [x] **1.4 OPFS cache for Gemma.** The Cache API refuses entries over 256 MiB,
  so Gemma is downloaded on every visit without this. In the Gemma worker:
  `env.useCustomCache = true; env.customCache = createModelCache()` from
  `react-ai-voice-avatar/model-cache`, guarded by `isModelCacheSupported()`.
  Checked with Light: all 6 files kept (880 MB), reload loads in 2.9 s instead
  of 270 s. Heavy in phase H.
- [x] **1.6 Download progress.** Done for Light + phone (`LoadProgress`,
  `src/voice/loading.ts`): real progress per model, "Loading from this
  device" when the weights are already in OPFS, Start enabled when all are
  ready. Everything cached: Continue to ready in 3.7 s. Avatar row: with the
  video engine in 2.1. Note: transformers.js reports progress for
  files read from the OPFS cache too, so a cached model must read "loading
  from this device", not "downloading". The home page lists what will download and
  how big before the candidate chooses; picking video or phone on the setup
  screen starts the download, and the setup screen shows real progress per
  model (VAD, Whisper, Kokoro, the mode's Gemma, the avatar for video) while
  they fill in the rest. Says the models are kept after the
  first time. Start is enabled once everything is loaded.

## Phase 2: Voice pipeline (Sat)

- [x] **2.1 Wire the hook.** In `VoiceHost`: `PhoneVoice` runs the headless
  hook, `VideoVoice` (lazy) runs `<AiVoiceAvatar>` (Ananya, Kokoro fp32);
  both take the same `onSubmit` (the app's Gemma, streamed) and publish the
  same state and controls through `src/voice/voiceStore.ts`. The engine is
  not remounted between setup and interview. A placeholder interviewer
  (`src/interview/placeholderBrain.ts`) answers until phase 3. Tested by
  Tanmay in Chrome, phone and video: spoken loop, barge-in, lip sync.
  While hidden on setup, the engine sits off stage at a real size (a
  `display:none` canvas never mounts the avatar).
  **Watch:** the OPFS cache was wiped twice in the Claude browser pane
  (2.6 GB, memory-backed quota); fine in desktop Chrome. Dev builds log every
  Gemma cache call (`[Gemma cache]`).
- [x] **2.2 Check: empty `onSubmit` reply goes back to listening** (fixed in
  0.7.0). Checked in the first real spoken run (4 Oct): answers were collected
  across pauses.
- [x] **2.3 Check: answers over 30 s come back whole** (fixed in 0.7.0).
  Tested by Tanmay in Chrome.
- [x] **2.4 Mic check.** Folded into 4.1 (setup page): explain why, then a
  level meter, a test sentence, see the transcript, hear the voice. Handles a
  denied or lost microphone.

## Phase 3: Interview engine (Sat)

- [x] **3.1 Question bank.** The `BankQuestion` type and data: ~10
  behavioural and ~6 HR for any track, ~10 technical each for frontend,
  backend and ML, with intent, key points, sample answer and written
  follow-ups. `src/interview/bank.ts`: 56 questions (10 behavioural, 6 HR,
  10 technical per track, 10 system design), `pickQuestions()` for a round or
  a full loop. Checked: unique ids, at least 3 questions per round for every
  track and level (system design: junior and up, none for interns), full
  loop is 2 behavioural, 2 technical, 1 HR with no repeats.
- [x] **3.2 Engine state machine.** Plain code, no UI: greeting, one small-talk
  turn, ask, collect the answer across pauses (done on "I'm done" or after a
  long pause, never a short silence), follow-up, reaction, next question, "any questions for me?",
  closing. Testable without a microphone through `sendText`.
- [x] **3.3 Follow-up angle rules.** Short answer, "we" without "I", no
  outcome, missing key point, full STAR, technical edge case (PLAN.md section
  4).
- [x] **3.4 Prompts and guard.** Port the guided prompts and guard from
  `evals/interviewer.html` with the two fixes run 5 showed: accept a question
  ending in "." or phrased as an instruction ("Describe…", "Walk me
  through…"), and reject a reaction that is really a new question. Written
  fallback line per angle.
  Done in `src/interview/`: `engine.ts` (plain code; the package always gets
  '' and the engine speaks its own lines; answers end on "I'm done" or 5 s
  of quiet after the last words), `angles.ts`, `prompts.ts`, `guard.ts`,
  `writer.ts` (Gemma with a 6 s limit, then the written line), `lines.ts`,
  `session.ts` (wires it to the voice, Gemma and the screen). Checked
  without a microphone (scratchpad test, 40 checks): the guard on the raw
  lines from runs 4 and 5 passes 8/12 for Gemma 3 1B (the same 8 good lines,
  praise stripped) and 12/12 for Gemma 4 E2B (the old guard 8/12); thinking
  pauses keep one answer; angles, fallbacks, repeat, skip, end.
  Still to hear in Chrome: a full spoken interview (that also checks 2.2).
- [ ] **3.5 Re-run the evals with the new guard on Light.** The eval page
  does not use the OPFS cache, so this downloads 880 MB again: ask first.
  Record the pass rate in MODEL-TESTS.md. (Heavy: phase H.)
- [x] **3.6 Recovery.** Silence at 12 s and 25 s, "repeat that", "what do you
  mean", "I don't know", garbled transcript, pause / stop, lost microphone,
  Gemma failure mid-interview (carry on with written lines), tab hidden.
  Done in `engine.ts` + `intents.ts` (phrases only checked on short stretches
  at the start of an answer, so real answers containing "sorry" or "I don't
  know" stay answers). Silence counts from the end of the interviewer's
  voice. "What do you mean" rephrases from the intent, except technical
  questions, where that would give the answer away. Two Gemma failures in a
  row switch to written follow-ups and add a note for the report. Pause and
  Resume buttons; a hidden tab or lost microphone pauses. 88 checks pass
  without a microphone.

## Phase 4: Setup and interview room (Sat afternoon)

- [x] **4.1 Setup page.** First step: video or phone, and the interviewer
  (Ananya: `ananya` avatar, Kokoro `af_heart`; Aarav: `aarav`, `am_michael`),
  fixed once Continue starts loading. While loading: track, level, round
  (full loop, behavioural, technical, HR; system design parked), number of
  questions (capped by what the bank has), target answer length (1-3 min),
  mood, optional name for the greeting. Mic check: why it is needed, then a
  level meter, what Whisper heard, and the interviewer's voice. Settings live
  in `src/interview/settings.ts` and reach the engine through the session.
  Dev preview without downloads: `?dev=setup`. Still to try in Chrome: the
  real flow with Aarav and a single round.
- [x] **4.2 Interview room.** State in words, progress dots (answered,
  skipped, current), answer timer per answer from the first words (amber from
  80% of the target, red past it, announced once to screen readers), question
  card, captions on by default with Hide captions, I'm done / Pause / Resume /
  Repeat / Skip / End. Phone screen: audio-reactive orb (mic level while
  listening, interviewer's voice while speaking, slow pulse while thinking,
  dim while paused; transform and opacity only; still under reduced motion).
  On phones the stage is capped so the question is on the first screen. Dev
  preview with the real engine and no models: `?dev=room` (drive it with
  `__room.heard(...)` in the console). Still to hear in Chrome.
- [x] **4.3 Milestone: first full spoken interview end to end** in Light.
  Done on the phone screen (4 Oct). What broke was fixed in 7.5. Video was
  run earlier in phase 2.

## Phase 5: Report (Sat evening)

No scores, ratings or percentages anywhere in the report (UX.md: report).

The report changed direction (4 Oct): the candidate reviews their own answers
against what a strong answer covers, and the app never judges. Feedback comes
from their marks plus measured numbers. Built as phase 1 of that plan, steps
1-7:

- [x] **5.1 Measurements in code** (`src/report/measure.ts`). Answer length
  from the voice detector's times, words per minute from `speechMs`, time to
  first word, pauses over 3 s, filler phrases, "I" against "we", numbers, and
  the point past the target. Missing times are "not measured", never guessed.
  The engine records when each stretch starts and ends (from the package's
  `onInferenceStart`) and when each question finished. Tested in the Node
  script.
- [x] **5.2 Plain comparisons.** "ran 1 min 13 s; the target you set was 1
  min", pace against 120-160.
- [x] **5.3 Charts.** Plain SVG with the numbers on them: answer length vs
  target, pace vs the band, time to first word, fillers by phrase.
- [x] **5.4 Per-answer card.** Their words with fillers, numbers and pauses
  marked and the part past the target shaded, the follow-up and reply, the
  numbers, their marks, and Practice this one again. Strong-answer points
  replace the sample answer.
- [x] **5.5 Strong-answer points.** 3-5 tagged points for every question
  except system design (206 in all).
- [x] **5.6 Self-review.** One answer at a time: how it felt, then each point
  marked covered, partly or missed. Keyboard shortcuts, progress dots, a skip
  to the numbers.
- [x] **5.7 Things to work on and second looks** (`src/report/focus.ts`). Up
  to three items by rule (most-missed kind of point, felt good but mostly
  missed, furthest over target, then fillers and pace), each saying where it
  came from. Gentle disagreements: result covered with no number heard; own
  role covered with far more "we" than "I".
- [x] **5.8 Saved on the device.** Reports and marks in IndexedDB. A fake
  interview to develop against: `?dev=report`. Prints cleanly to PDF.
- [ ] **5.9 Evidence finder (phase 2 of the report plan).** A small embedding
  model highlights the closest sentence for a point, only after marking. Not
  started: waiting for the go-ahead, and ask before downloading.
(The deep review is Heavy only: phase H.)

## Phase 6: Ship a first version (Sat evening)

- [x] **6.1 Offline after first load.** Marked done with phase 6. Note: the
  VAD files and ONNX runtime still come from jsDelivr (not self-hosted). App files cached, models already in
  OPFS; works with the network off. The VAD files and ONNX runtime WASM come
  from jsdelivr, outside OPFS: self-host them with `vadAssetPath` and
  `onnxWasmPath` so offline and the privacy meter do not depend on the CDN.
- [x] **6.2 Render.** `render.yaml` static site with COOP/COEP headers,
  deployed at https://interview-room-iooj.onrender.com from the public repo
  927tanmay/interview-room. Headers and cross-origin loads checked on the live
  site.
- [x] **6.3 Test the deployed link on the M2 Pro** (friend's laptop): mode
  picked, load time, reply speed, memory. Record in MODEL-TESTS.md.

## Phase H: Heavy mode and the deep review (after the Light build works)

- [ ] **H.1 Heavy in the worker.** Load Gemma 4 E2B (3.13 GB, ask before
  downloading), a reply, reload from the OPFS cache, warm load time. Storage
  quota matters here: the Claude browser pane gave this origin 2.6 GB, too
  little to keep Heavy. Check `navigator.storage.estimate()` before the
  download and, if the quota is too small, say so (it will download every
  visit) or ask for persistent storage.
- [ ] **H.2 Heavy load failure falls back to Light.** If Gemma 4 E2B fails to
  load (memory, WebGPU error, no space), say so and offer Light.
- [ ] **H.3 Guard evals on Heavy** with the step 3.4 guard; record in
  MODEL-TESTS.md.
- [ ] **H.4 Eval cases for the deep review.** Add to the suite: "possible gaps
  compared with the sample answer", "rewrite the weakest answer in their own
  words", and more STAR cases (answers with known parts present and missing).
  Agree the pass bar for STAR before the run. Run on Gemma 4 E2B (ask before
  downloading). STAR parts go into the report only if it passes; otherwise
  they stay out, or appear only as "possible gaps" in plain words.
- [ ] **H.5 Deep review (Heavy).** Code review, possible gaps vs the sample
  answer, rewritten weakest answer, worded as suggestions, not measurements.
  Light mode: decide first (PLAN.md open decision 2).

## Phase 7: P1 features (Sun morning)

- [ ] **7.1 Progress history** in IndexedDB: fillers per minute, pace,
  answer length over time (measured numbers only). Export and delete.
- [ ] **7.2 Own questions:** paste or upload .txt / .csv.
- [ ] **7.3 Questions from a job description** (Gemma writes them; Heavy
  followed the one-per-line format, Light needs cleanup).
- [ ] **7.4 Privacy meter:** network requests since the interview started.
- [x] **7.5 Fixes from the first runs.** Spoken skip; skipping a follow-up
  keeps the answer; "sorry, I don't know"; a missing-point follow-up must name
  the point; key point labels that read as speech; "like" after a comma;
  vague amounts are not numbers. Dev builds log voice timings.
- [x] **7.6 UI polish: home and setup.** Home: top section with three points
  and a still of the room, Light and Heavy as large cards (Heavy "coming
  soon": `HEAVY_AVAILABLE` in `src/app/downloads.ts`), what the chosen mode
  downloads always visible, device chip, one Continue in view. Setup: faces,
  compact loading that becomes "Models ready", filled chips, two columns,
  sticky bar with load progress. Inter from Google Fonts.

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
- Markdown export of the report (print to PDF is done).
- Pseudo-code round (Gemma 4 E2B got both code reviews right in run 5; needs
  more cases first).
