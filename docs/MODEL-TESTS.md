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

## Decisions so far

- **Gemma 3 1B is the live interviewer**: follow-ups and reactions, guided by
  rules, guarded by code.
- **Code computes every score**: pace, fillers, length, STAR parts, key points.
- **Judgement needs a bigger model.** Next: run this suite on Gemma 4 E2B
  (`onnx-community/gemma-4-E2B-it-ONNX`, about 3.1 GB for the text parts) to
  see whether it can judge STAR answers and code, and whether it is fast enough
  to interview live on an M2 Pro or M4.

## Caching note

transformers.js keeps downloads in the Cache API, which in Chrome refuses any
single entry of 256 MiB or more, so the 859 MB Gemma file is downloaded again on
every visit. react-ai-voice-avatar works around this by caching model files in
OPFS; the app's own Gemma worker needs the same.
