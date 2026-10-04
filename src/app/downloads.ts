import type { Display, Mode } from './state'

// Everything a first visit downloads, with real sizes (UX.md: downloads).
// One list, so the home page, the setup progress (step 1.6) and the README
// agree. Sizes are decimal MB, as Hugging Face shows them, measured 3 Oct 2026:
// Hugging Face API file listings (model files plus their JSON/tokenizer), the
// jsDelivr metadata API for CDN files, and a minified build for the 3D code.

export type DownloadItem = {
  id: string
  job: string
  name: string
  bytes: number
  // Which modes and displays need it. Missing means all.
  modes?: Mode[]
  displays?: Display[]
}

const MB = 1e6

export const DOWNLOADS: DownloadItem[] = [
  // @ricky0123/vad-web@0.0.30 silero_vad_legacy.onnx (the package's default).
  { id: 'vad', job: 'Hears when you start and stop talking', name: 'Silero VAD', bytes: 1.8 * MB },
  // onnx-community/whisper-base, fp32 on WebGPU (transformers.js default):
  // encoder 82.5 + merged decoder 208.5 + tokenizer files.
  { id: 'whisper', job: 'Turns your speech into text', name: 'Whisper base', bytes: 295 * MB },
  // onnx-community/Kokoro-82M-v1.0-ONNX model.onnx (fp32) + one voice.
  { id: 'kokoro', job: "The interviewer's voice", name: 'Kokoro 82M', bytes: 326 * MB },
  // onnx-community/gemma-3-1b-it-ONNX model_q4 + tokenizer (20 MB).
  { id: 'gemma-light', job: 'The interviewer', name: 'Gemma 3 1B', bytes: 880 * MB, modes: ['light'] },
  // onnx-community/gemma-4-E2B-it-ONNX embed_tokens + decoder q4f16 (text
  // parts only) + tokenizer (19 MB).
  { id: 'gemma-heavy', job: 'The interviewer and reviewer', name: 'Gemma 4 E2B', bytes: 3130 * MB, modes: ['heavy'] },
  // ONNX Runtime WebAssembly: 14.0 MB for the voice detector, 25.8 MB shared
  // by the speech and voice workers, ~27 MB for the Gemma worker's own
  // runtime (transformers.js 4.3.0; confirmed at step 1.3).
  { id: 'runtime', job: 'Runs the models in the browser', name: 'ONNX Runtime', bytes: 67 * MB },
  // 3D code (three.js, the avatar component): +2.4 MB over the headless
  // build, plus one avatar model (Ananya 4.5 MB, Aarav 4.7 MB).
  { id: 'avatar', job: 'The interviewer on screen', name: '3D avatar', bytes: 7 * MB, displays: ['video'] },
]

// Heavy (Gemma 4 E2B) is shown on the home page but cannot be picked until it
// works end to end (TASKS.md: H). Flip this when it does.
export const HEAVY_AVAILABLE = false

export function downloadsFor(mode: Mode, display?: Display): DownloadItem[] {
  return DOWNLOADS.filter(
    (d) =>
      (!d.modes || d.modes.includes(mode)) &&
      (!d.displays || (display !== undefined && d.displays.includes(display))),
  )
}

export function totalBytes(items: DownloadItem[]): number {
  return items.reduce((sum, d) => sum + d.bytes, 0)
}

// "295 MB", "1.6 GB". Rounded: these are first-visit estimates, not receipts.
export function formatBytes(bytes: number): string {
  if (bytes < 10 * MB) return `${+(bytes / MB).toFixed(1)} MB`
  if (bytes < 1000 * MB) return `${Math.round(bytes / MB)} MB`
  return `${(bytes / 1000 / MB).toFixed(1)} GB`
}
