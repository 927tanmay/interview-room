# Model tests

How the interviewer model was chosen and how its prompts were shaped. The
suite lives in [`evals/interviewer.html`](../evals/interviewer.html).

## Running the suite

```bash
npx serve evals
```

Then open `http://localhost:3000/interviewer.html` in Chrome (WebGPU needed).
Query params pick the model and suite:

```
?model=onnx-community/gemma-3-1b-it-ONNX&dtype=q4&suite=all
```

The page downloads the model on every load (it does not use the app's OPFS
cache), so expect a few minutes for a large model.

## Run 1: Gemma 3 1B, plain prompts (3 Oct 2026)

Setup: `onnx-community/gemma-3-1b-it-ONNX`, q4 (859 MB), WebGPU, greedy
decoding, transformers.js 4.2.0, Chrome on an Apple M4. First load including
download: 266 s. Replies took 1.0 to 2.3 s for the full text (about 25 to 40
tokens per second).

| Test | Result | Verdict |
|---|---|---|
| Opening question | "Tell me about a time you had to debug a complex UI issue. Focus on the steps you took and the tools you used." | Good |
| Follow-up to a rambling answer | "That's a good start, but it's a bit vague. Can you describe the specific steps you took to diagnose the issue, beyond just looking at it?" | Good question, filler praise |
| Follow-up to a strong STAR answer | "How did you approach prioritizing the changes, considering the impact on the overall user experience?" | Good |
| Questions from a job description | 4 relevant questions (refactoring a React component, working with designers, Jest, conflicting design feedback), as bullets | Good, format ignored |
| STAR judge, rambling answer | All four parts false; tip contradicts itself | Wrong: the situation was stated |
| STAR judge, strong answer | Wrote sentences instead of true/false | Failed the format |
| Code review, off-by-one bug | "incorrect", with an invented reason; missed the real bug | Wrong |
| Code review, correct code | "correct", then invented a bug | Wrong |

**Conclusion:** Gemma 3 1B reacts well to what the candidate said, but cannot
judge answers or code.

## Run 2: interviewer persona, single instruction block

Persona per mood (friendly, neutral, tough), the previous question and answer
pasted into one user message, and an instruction to ask one follow-up.

Problems found:
- "That's a good start" in almost every reply, including tough mode and after a
  strong answer.
- Replies wrapped in quote marks, with markdown asterisks.
- After a very short answer, no question at all.
- On an HR question in tough mode, it repeated the question and invented a
  "15% increase in session duration" project.
- None of the three replies to a "we did..." answer asked what the candidate
  did personally.

## Run 3: guided follow-ups, multi-turn, with a guard

Changes:
1. The conversation is passed as real turns (interviewer question as the
   assistant turn, the answer as the user turn), so the model writes the
   interviewer's next turn instead of re-enacting a transcript.
2. App rules choose what to probe (expand, ownership, outcome, specifics,
   deeper, edge case, motivation) and pass it as a short note on the
   candidate's turn. Gemma only words it.
3. A guard in code strips quotes and markdown, drops praise and any sentence
   echoed from the question or answer, and keeps exactly one question. If
   nothing survives, a written line for that angle is spoken.

| Mood / angle | Spoken after the guard |
|---|---|
| friendly / specifics | Can you describe the specific steps you took to diagnose the issue? |
| neutral / outcome | (written fallback) |
| tough / specifics | Can you elaborate on the specific steps you took to diagnose the issue? |
| friendly / ownership | That sounds like a significant improvement. What specifically did you do to implement the caching? |
| neutral / ownership | Okay. What specific steps did you take to implement the caching? |
| tough / ownership | What specific action did you take to improve the dashboard speed? |
| neutral / deeper | Okay. Can you elaborate on the specific code changes you made? |
| tough / deeper | How did you prioritize the changes? |
| friendly / expand | (written fallback: the model answered as the candidate) |
| tough / expand | (written fallback: the model answered as the candidate) |
| neutral / edgecase | Okay. If the data fails to load, what happens? |
| tough / motivation | (written fallback: the model answered as the candidate) |

8 of 12 follow-ups were usable Gemma lines; the other 4 fell back cleanly, so
the candidate never hears a broken line. Each took about 1.0 to 1.3 s.

Short reactions ("Thanks, that's clear.", "Okay, let's move on.") and one-line
tips were usable. Example tip for the "we" answer: "provide a specific metric
like 'the dashboard improved by X% in terms of response time'."

## Run 4: Gemma 3 1B again, full suite (3 Oct 2026)

A re-run of `suite=all` to check that runs 1 and 3 hold. Same model and dtype,
transformers.js 4.3.0 (the version the page imports), WebGPU with shader-f16 in
Chromium 152 on an Apple M4 with 16 GB. First load including download: 241.6 s.

| Test | Result | Same as before? |
|---|---|---|
| Opening question | "Okay, let's start. Tell me about a time you had to quickly debug a complex UI issue." | Yes, slightly different wording |
| STAR judge, rambling answer | All four false, wrapped in a ```json fence. The tip says the situation *was* described | Yes, still wrong |
| STAR judge, strong answer | Sentences in place of true/false | Yes, still fails the format |
| Questions from a job description | Same 4 questions, as bullets after a preamble line | Yes |
| Code review, off-by-one | "incorrect", invented reason, real bug missed | Yes, still wrong |
| Code review, correct palindrome | "correct", then calls the empty string a bug | Yes, still wrong |
| Guided follow-ups (12) | **8 of 12 usable, the same 8 lines word for word**; the same 4 fell back (neutral/outcome, both expand, tough/motivation) | Yes |
| Reactions (3) | All usable after the guard | Yes |
| Tips (3) | Usable, but none say "you": all start "Focusing on…" | Yes |

Timings: follow-ups 1.04 to 1.50 s, judge and review prompts 1.6 to 2.6 s,
everything 0.95 to 2.62 s.

**The results hold.** Gemma 3 1B words guided follow-ups reliably and quickly;
it still cannot judge STAR answers or code.

## Run 5: Gemma 4 E2B, full suite (3 Oct 2026)

Setup: `onnx-community/gemma-4-E2B-it-ONNX`, q4f16, same browser, machine and
page as run 4, greedy decoding, thinking off (no `<|think|>` in the prompt).

**Loading:** the plain `pipeline('text-generation', ...)` works in
transformers.js 4.3.0. The config's architecture is the multimodal
`Gemma4ForConditionalGeneration`, but the text-generation pipeline maps
`gemma4` to `Gemma4ForCausalLM`, which loads the text parts only:
`embed_tokens_q4f16` (1,591 MB) and `decoder_model_merged_q4f16` (1,520 MB),
3.11 GB in total. The network log confirmed that the vision and audio encoders
were never requested. First load including download: **848.5 s** (about 14
minutes on my connection).

### Judging and review

| Test | Result | Verdict |
|---|---|---|
| Opening question | "Can you describe a time you had to debug a tricky frontend issue and how you resolved it?" | Good |
| STAR judge, rambling answer | All four **true**; the tip says details and results are missing | Wrong: it calls everything true |
| STAR judge, strong answer | All four true, valid booleans (in a ```json fence) | Right, but see above |
| Questions from a job description | 4 relevant questions, one per line, no preamble | Good, format followed |
| Code review, off-by-one | "incorrect. The loop condition is incorrect, causing the last element of the list to be skipped" | **Right**, real bug found (empty list not mentioned) |
| Code review, correct palindrome | "correct. Bug: none. An empty string or a single-character string is correctly handled" | **Right** |

### Follow-ups, reactions, tips

| Mood / angle | Gemma 4 E2B (raw) | Guard |
|---|---|---|
| friendly / specifics | What steps did you take to diagnose and fix that build issue? | Pass |
| neutral / outcome | What was the final result of that fix? | Pass (1B fell back) |
| tough / specifics | What exactly did you do to fix the build? | Pass |
| friendly / ownership | That sounds like a significant performance improvement. What specific part of the data layer did you personally focus on optimizing? | Pass |
| neutral / ownership | That sounds like a significant project. What specific part did you personally take the lead on during that rewrite. | Rejected: ends in "." |
| tough / ownership | What exactly did you do to implement the caching in React Query? | Pass |
| neutral / deeper | That sounds like a significant performance improvement. What was the biggest trade off you considered when implementing the lazy loading? | Pass |
| tough / deeper | What was the biggest trade off you had to consider when implementing that change. | Rejected: ends in "." |
| friendly / expand | Can you walk me through how you approached that bug fix. | Rejected: ends in "." (1B answered as the candidate) |
| tough / expand | Describe the steps you took to resolve that bug. | Rejected: an instruction, not a question |
| neutral / edgecase | What happens if the data fetching inside useEffect takes a long time? | Pass |
| tough / motivation | What are you looking for in your next role? | Pass (1B answered as the candidate) |

8 of 12 passed the guard, the same count as the 1B, but the failures are a
different kind. **All 12 raw lines are on the right angle and in the
interviewer's voice.** None is praise, a role-play of the candidate or a
repeat of the question. The 4 rejections are punctuation only: the guard
requires a "?". The ownership lines now actually say "personally", which the
1B never did. Neutral mood sometimes opens with "That sounds like…" where it
should say only "Okay.".

Reactions: friendly and neutral were fine. **Tough re-asked the opening
question as a statement** ("Tell me about a time you had to debug a tricky
frontend issue."). The reaction guard let it through because it ends in ".".

Tips: all three are imperative and specific ("Focus on positive framing by
emphasizing growth opportunities…"). The "we" tip asks for problem and impact
but not the personal role, and it uses markdown asterisks.

Timings: follow-ups 0.98 to 1.57 s, everything 0.87 to 2.40 s, **about the same
as the 1B on this M4**, because its replies are shorter (9 to 22 tokens per
follow-up).

### What the suite does not cover yet
- The deep-review jobs themselves: what is missing compared with the sample
  answer, and rewriting the weakest answer in the candidate's words.
- Load time from a warm cache (the page downloads every time), and memory use
  with Whisper, Kokoro and the avatar loaded alongside.
- Speed on the M2 Pro (the friend's laptop). Token generation is mostly limited
  by memory bandwidth, and the M2 Pro has more than the M4 (200 vs 120 GB/s), so
  it is unlikely to be slower, but this is not measured.

### Comparison

| | Gemma 3 1B (q4) | Gemma 4 E2B (q4f16) |
|---|---|---|
| Download | 859 MB | 3.11 GB |
| First load (download included) | 242 s | 849 s |
| Follow-ups on angle (raw) | 8 / 12 | 12 / 12 |
| Follow-ups through the current guard | 8 / 12 | 8 / 12 (punctuation) |
| Follow-up latency, M4 | 1.0 to 1.5 s | 1.0 to 1.6 s |
| Code review | 0 / 2 | 2 / 2 |
| STAR judging | 0 / 2 | 1 / 2 (calls everything true) |
| JD questions in the asked format | No | Yes |

## Run 6: Gemma 3 1B in the app's worker, with the OPFS cache (3 Oct 2026)

The app's own Gemma worker (`src/gemma/gemma.worker.ts`), tested through the
dev panel (`?dev=gemma`) in the Claude desktop browser pane (Chromium 152) on
the M4. Same model and dtype as runs 1 to 4; the cache is
`createModelCache()` from react-ai-voice-avatar 0.7.0.

| | Result |
|---|---|
| First load (880 MB download) | 269.8 s, then a 1-token warm-up of 319 ms |
| Files kept in OPFS | 6, all with completion markers, 880 MB (weights 859 MB, tokenizer 20 MB, configs) |
| Reload, load from OPFS | **2.9 s**, warm-up 212 ms |
| Reply, 80 tokens | 1.8 to 2.7 s; first text after 212 ms, then about a token every 30 ms |
| Stop mid-reply | Stopped at 605 ms after 23 tokens, flagged `stopped` |
| Runtime | `onnxruntime-web@1.31.0-dev` asyncify WASM from jsDelivr (26.9 MB), not in OPFS or the Cache API |

The cached model gave the same greedy reply word for word as the downloaded
one. transformers.js reports progress for cache reads as well, so the
progress screen has to tell a cache read from a download.

This browser pane gave the origin a storage quota of 2.6 GB: enough for
Light, not for Heavy's 3.13 GB. Desktop Chrome normally allows much more,
but Heavy needs a quota check before downloading (TASKS.md, H.1).

## Decisions so far

- **The mode's Gemma is the live interviewer**: follow-ups and reactions,
  guided by rules, guarded by code.
- **No scores.** Code measures time, words, words per minute and fillers;
  the report shows those and quotes, nothing rated.
- **STAR parts are out for now.** Gemma 4 E2B (run 5) reviews code correctly
  but marked all four STAR parts present in a rambling answer. STAR goes into
  the report only if more eval cases (step 5.5) show it gets them right, and
  then as "possible gaps".
- **Two modes, one download each.** Heavy: Gemma 4 E2B interviews and
  reviews. Light: Gemma 3 1B interviews. Only the chosen mode's model is
  downloaded.

## Caching note

transformers.js keeps downloads in the Cache API, which in Chrome refuses any
single entry of 256 MiB or more, so the 859 MB Gemma file is downloaded again on
every visit. react-ai-voice-avatar works around this by caching model files in
OPFS, and since 0.7.0 exports that cache (`react-ai-voice-avatar/model-cache`)
for the app's own Gemma worker.
