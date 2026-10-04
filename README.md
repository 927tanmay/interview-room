# Interview Room

A spoken mock interviewer for software engineers. You talk, it listens, asks a
follow-up on what you actually said, and gives you a report at the end.
Frontend, backend and ML tracks; behavioural, technical and HR rounds.

**Everything runs in your browser.** Speech recognition, the interviewer, its
voice and the avatar all run on your own device. Nothing you say is uploaded;
the only network use is downloading the models the first time (kept on your
device after that) and the Inter font from Google Fonts.

**Demo:** https://interview-room-iooj.onrender.com (Chrome or Edge on a laptop or desktop)

Built for the DEV Hacktoberfest Weekend Challenge: Build for a Friend.

## Run it locally

Needs Node 18+ and a browser with WebGPU (recent Chrome or Edge on a laptop or
desktop).

```bash
npm ci
npm run dev
```

Open http://localhost:5173. The first visit downloads about 1.6 GB (Light
mode) or 3.8 GB (Heavy mode); later visits load from the browser's storage in
seconds.

```bash
npm run build     # production build in dist/
npm run lint
```

## Models

All open-weight, all running in the browser through
[transformers.js](https://github.com/huggingface/transformers.js) and ONNX
Runtime Web.

| Job | Model | Size | Licence |
|---|---|---|---|
| Hears when you start and stop talking | Silero VAD | 1.8 MB | MIT |
| Turns your speech into text | Whisper base | 295 MB | MIT |
| The interviewer's voice | Kokoro 82M | 326 MB | Apache 2.0 |
| The interviewer, Light mode | Gemma 3 1B (q4) | 880 MB | Gemma Terms of Use |
| The interviewer, Heavy mode | Gemma 4 E2B (q4f16) | 3.1 GB | Apache 2.0 |

Light mode is for slower laptops and connections; Heavy needs WebGPU with
`shader-f16`. The app checks this on the home page.

## How it works

Plain code runs the interview: what to ask, when your answer is finished
(you can pause to think), what to follow up on, and what to do when something
goes wrong. Gemma only words the follow-up the rules chose, and a guard checks
every line before it is spoken. The report (being built) shows only what was
measured (time, words, pace, filler words) and quotes your own answers: no
scores.

The voice, lip-synced avatar and microphone handling come from
[react-ai-voice-avatar](https://github.com/927tanmay/react-ai-voice-avatar),
an npm package I maintain. This app is new; the package got two fixes during
the challenge weekend (version 0.7.0).

More detail: [docs/PLAN.md](docs/PLAN.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md),
[docs/MODEL-TESTS.md](docs/MODEL-TESTS.md).

## Licence

The code is [MIT](LICENSE). The models keep their own licences (table above).
