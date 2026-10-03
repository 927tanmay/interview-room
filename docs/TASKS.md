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
  mounts the engine once (`EngineHost`) and keeps it mounted from that choice
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
  interview (default) or Phone screen; `EngineHost` is mounted once from that
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
  `src/engine/loading.ts`): real progress per model, "Loading from this
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

- [x] **2.1 Wire the hook.** In `EngineHost`: `PhoneEngine` runs the headless
  hook, `VideoEngine` (lazy) runs `<AiVoiceAvatar>` (Ananya, Kokoro fp32);
  both take the same `onSubmit` (the app's Gemma, streamed) and publish the
  same state and controls through `src/engine/voiceStore.ts`. The engine is
  not remounted between setup and interview. A placeholder interviewer
  (`src/interview/placeholderBrain.ts`) answers until phase 3. Tested by
  Tanmay in Chrome, phone and video: spoken loop, barge-in, lip sync.
  While hidden on setup, the engine sits off stage at a real size (a
  `display:none` canvas never mounts the avatar).
  **Watch:** the OPFS cache was wiped twice in the Claude browser pane
  (2.6 GB, memory-backed quota); fine in desktop Chrome. Dev builds log every
  Gemma cache call (`[Gemma cache]`).
- [ ] **2.2 Check: empty `onSubmit` reply goes back to listening** (fixed in
  0.7.0). Checked in step 3.2, the first place the app returns empty replies
  (collecting an answer across pauses).
- [x] **2.3 Check: answers over 30 s come back whole** (fixed in 0.7.0).
  Tested by Tanmay in Chrome.
- [ ] **2.4 Mic check.** Folded into 4.1 (setup page): explain why, then a
  level meter, a test sentence, see the transcript, hear the voice. Handles a
  denied or lost microphone.

## Phase 3: Interview engine (Sat)

- [ ] **3.1 Question bank.** The `BankQuestion` type and data: ~10
  behavioural and ~6 HR for any track, ~10 technical each for frontend,
  backend and ML, with intent, key points, sample answer and written
  follow-ups.
- [ ] **3.2 Engine state machine.** Plain code, no UI: greeting, one small-talk
  turn, ask, collect the answer across pauses (done on "I'm done" or after a
  long pause, never a short silence), follow-up, reaction, next question, "any questions for me?",
  closing. Testable without a microphone through `sendText`.
- [ ] **3.3 Follow-up angle rules.** Short answer, "we" without "I", no
  outcome, missing key point, full STAR, technical edge case (PLAN.md section
  4).
- [ ] **3.4 Prompts and guard.** Port the guided prompts and guard from
  `evals/interviewer.html` with the two fixes run 5 showed: accept a question
  ending in "." or phrased as an instruction ("Describe…", "Walk me
  through…"), and reject a reaction that is really a new question. Written
  fallback line per angle.
- [ ] **3.5 Re-run the evals with the new guard on Light.** The eval page
  does not use the OPFS cache, so this downloads 880 MB again: ask first.
  Record the pass rate in MODEL-TESTS.md. (Heavy: phase H.)
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
  **Phone screen display:** an illuminating, audio-reactive orb in the style
  of Gemini Live and the package's `examples/voice-only`: glows with the
  candidate's voice while listening and with the interviewer's while
  speaking (`onAudioLevelChange`, source `mic` / `tts`), a slow calm pulse
  while thinking. Accent colour only, GPU-light (CSS or one small canvas, no
  blur stacks), static glow under reduced motion.
- [ ] **4.3 Milestone: first full spoken interview end to end** in Light,
  both video and phone. Note what breaks.

## Phase 5: Report (Sat evening)

No scores, ratings or percentages anywhere in the report (UX.md: report).

- [ ] **5.1 Measurements in code.** Time per answer, words, words per minute
  (from the sum of `speechMs` over the answer's stretches), filler words by
  type, the part past the target time. Each with a one-line "how it was
  measured". Unit-checked on the eval fixtures.
- [ ] **5.2 Plain comparisons.** One short line where it helps, from stated
  norms: "Most behavioural answers aim for about 2 minutes", "a comfortable
  pace is about 120-160 words per minute". No verdicts beyond the comparison.
- [ ] **5.3 Charts.** Measured numbers only: answer length vs target, pace vs
  the 120-160 wpm band, fillers by type.
- [ ] **5.4 Per-answer section.** Their answer quoted, fillers highlighted and
  the over-time part shaded, the numbers, the follow-up asked, the sample
  answer.
(The deep review is Heavy only: phase H.)

## Phase 6: Ship a first version (Sat evening)

- [ ] **6.1 Offline after first load.** App files cached, models already in
  OPFS; works with the network off. The VAD files and ONNX runtime WASM come
  from jsdelivr, outside OPFS: self-host them with `vadAssetPath` and
  `onnxWasmPath` so offline and the privacy meter do not depend on the CDN.
- [ ] **6.2 Render.** `render.yaml` static site with COOP/COEP headers and a
  Deploy to Render button. Ask before creating the GitHub repo, pushing, or
  deploying.
- [ ] **6.3 Test the deployed link on the M2 Pro** (friend's laptop): mode
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
