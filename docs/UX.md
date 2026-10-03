# Interview Room: UX rules

These apply to every screen and every step in [TASKS.md](TASKS.md). When a
step is checked, it is checked against this page too.

## Who it is for

My friend, practicing interviews alone. No login, no clutter, nothing
gamified: no streaks, badges, confetti or levels. Calm and plain, like a real
interview room.

## Downloads

- Before anything downloads, show what will be downloaded and how big
  (VAD, Whisper, Kokoro, and the chosen mode's Gemma), and the total.
- Show real progress per model from the actual bytes, never a fake bar.
- Say that it is kept on this device after the first time, so the next visit
  starts without the wait.
- Start loading while they are on the setup screen, not after they press
  Start. Order: the home page shows the sizes and they pick Light or Heavy;
  the first choice on the setup screen is **Video interview** (default) or
  **Phone screen**; picking it starts the download, and they fill in the rest
  of the setup while it runs.
- No switching between video and phone once loading has started. To change,
  go back to the home page.

## Microphone

- Explain why the mic is needed in our own words *before* the browser asks:
  the interviewer has to hear the answers, and the audio is turned into text
  on this device.
- If permission is refused or the mic is lost, show what to do (how to allow
  it in the browser, then retry), never a dead screen.

## Privacy

- Say clearly, and keep visible on every screen, that nothing they say
  leaves the browser. The only network use is downloading the models the
  first time.
- Do not claim more than is true. If something does go over the network,
  the wording changes.

## Device check

- Check WebGPU first thing on the home screen. If the browser or device
  cannot run the models, say so plainly there (which browser to use, or that
  this device is too weak), instead of failing halfway through a download or
  an interview.
- Heavy needs `shader-f16`; if it is missing, Heavy is unavailable with the
  reason shown, and Light is offered.

## Interview screen

- Always exactly one clear state: **Listening**, **Thinking** or
  **Speaking** (plus Paused when paused). Shown in words, not only colour or
  animation.
- The current question is always on screen as text.
- Show what Whisper heard, as it arrives, so they know they were understood.
- People pause to think. Never treat a short silence as the end of an answer.
  The answer ends when they press **I'm done**, or after a long pause (much
  longer than a gap between sentences).
- Always available: **Repeat question**, **Skip**, **End interview**.
- Phone screen: an illuminating orb that responds to whoever is speaking
  (like Gemini Live), calm rather than flashy, still under reduced motion.

## Report

- Specific to what they said: quote their own words.
- **No scores out of 100, no ratings, no percentages**, even ones with a
  formula behind them. Only measured numbers (time, words, words per minute,
  filler counts), each saying how it was measured, plus quotes of what they
  said.
- A plain comparison where it helps: "Most behavioural answers aim for about
  2 minutes; this one was 3 min 40 s."
- Anything a model judged (STAR parts, missed points) is never presented as a
  measurement. It appears only if the evals show the model gets it right, and
  then as "possible gaps" in plain words.

## Look and feel

- Premium and calm. Dark theme, which suits an interview room. One accent
  colour, used for the primary action and the current state; everything else
  is neutral.
- Rounded everything (cards, buttons, inputs, chips) from one radius scale:
  `--radius-sm` 8px (inputs, small controls), `--radius-md` 12px (buttons),
  `--radius-lg` 20px (cards and panels), `--radius-pill` (status chips). No
  other radius values.
- Soft glass panels (backdrop blur, light border, subtle shadow) over a soft
  gradient background. **Blur only on a few big panels**, at most two per
  screen; everything inside them is a plain surface. The GPU is busy with the
  models and the avatar, and nothing is blurred over the avatar's canvas.
- Text and captions stay readable on glass: body text, muted text and the
  state chip keep WCAG AA contrast (4.5:1) over every part of the app's
  background (measured: 6.0:1 or better with the glass at 72% opacity). Glass
  only ever sits on that background: never over the avatar, images or
  anything bright. If that changes, the glass opacity goes up.
- Fall back to solid panels when `backdrop-filter` is not supported or the
  user prefers reduced transparency (`prefers-reduced-transparency`).
- No flashy animations: small, smooth transitions only (colour, opacity,
  under ~200 ms), and none at all with `prefers-reduced-motion`.

## Accessibility

- Everything works with the keyboard: every control reachable with Tab, a
  visible focus ring, and focus moved to the heading when the screen changes.
- Captions (the question and what the interviewer says) are on by default.
- Respect `prefers-reduced-motion`: no avatar gestures or idle movement
  beyond lip sync (or a still avatar), no animated transitions. The package
  does not handle this itself, so the app does.
