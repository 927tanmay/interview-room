import { createModelCache, isModelCacheSupported } from 'react-ai-voice-avatar/model-cache'
import { DOWNLOADS } from '../app/downloads'
import type { Display, Mode } from '../app/state'
import { GEMMA_MODELS } from '../gemma/protocol'

// Loading progress for the setup screen (UX.md: downloads). One row per model
// that reports real progress: Whisper and Kokoro (from the package), the
// mode's Gemma (from our worker), and the avatar for a video interview. The
// voice detector and the ONNX runtime are small, load from jsDelivr and report
// no progress, so the setup screen mentions them without a bar.

export type LoadItemId = 'whisper' | 'kokoro' | 'gemma' | 'avatar'

export type LoadPhase = 'waiting' | 'downloading' | 'from-device' | 'ready' | 'failed'

export type LoadItem = { pct: number; phase: LoadPhase; cached: boolean; message?: string }

export type LoadState = Partial<Record<LoadItemId, LoadItem>>

export type LoadAction =
  | { type: 'reset'; items: LoadItemId[] }
  | { type: 'cached'; id: LoadItemId; cached: boolean }
  | { type: 'progress'; id: LoadItemId; pct: number }
  | { type: 'ready'; id: LoadItemId }
  | { type: 'failed'; id: LoadItemId; message: string }
  // Try again: the failed models start over (finished files are in OPFS).
  | { type: 'retry'; ids: LoadItemId[] }

export function itemsFor(display: Display): LoadItemId[] {
  return display === 'video' ? ['whisper', 'kokoro', 'gemma', 'avatar'] : ['whisper', 'kokoro', 'gemma']
}

export function loadReducer(state: LoadState, action: LoadAction): LoadState {
  if (action.type === 'reset') {
    return Object.fromEntries(
      action.items.map((id) => [id, { pct: 0, phase: 'waiting', cached: false } satisfies LoadItem]),
    )
  }
  if (action.type === 'retry') {
    const next = { ...state }
    for (const id of action.ids) if (next[id]) next[id] = { pct: 0, phase: 'waiting', cached: false }
    return next
  }
  const item = state[action.id]
  if (!item || item.phase === 'ready' || item.phase === 'failed') return state
  switch (action.type) {
    case 'cached':
      return { ...state, [action.id]: { ...item, cached: action.cached } }
    case 'progress': {
      // Progress is reported for cache reads too, so the phase comes from
      // whether the files were already on this device, not from the event.
      const pct = Math.max(item.pct, Math.min(100, action.pct))
      return { ...state, [action.id]: { ...item, pct, phase: item.cached ? 'from-device' : 'downloading' } }
    }
    case 'ready':
      return { ...state, [action.id]: { ...item, pct: 100, phase: 'ready' } }
    case 'failed':
      return { ...state, [action.id]: { ...item, phase: 'failed', message: action.message } }
  }
}

// The download behind a loading row.
export function downloadFor(id: LoadItemId, mode: Mode) {
  const key = id === 'gemma' ? (mode === 'heavy' ? 'gemma-heavy' : 'gemma-light') : id
  return DOWNLOADS.find((d) => d.id === key)!
}

// All the models together, weighted by size, from the bytes the loaders
// report (UX.md: downloads, real progress only).
export function overallProgress(mode: Mode, state: LoadState): number {
  let total = 0
  let done = 0
  for (const id of Object.keys(state) as LoadItemId[]) {
    const bytes = downloadFor(id, mode).bytes
    total += bytes
    done += (bytes * state[id]!.pct) / 100
  }
  return total ? Math.min(100, Math.round((done / total) * 100)) : 0
}

export function failedIds(state: LoadState): LoadItemId[] {
  return (Object.keys(state) as LoadItemId[]).filter((id) => state[id]!.phase === 'failed')
}

export function allReady(state: LoadState): boolean {
  const items = Object.values(state)
  return items.length > 0 && items.every((i) => i.phase === 'ready')
}

// The weight files that decide whether a model is already on this device. Keys
// are the Hugging Face URLs transformers.js asks the cache for; the package and
// our Gemma worker share one OPFS store.
const HF = 'https://huggingface.co/'
const KEY_FILES: Record<Exclude<LoadItemId, 'avatar'>, (mode: Mode) => string[]> = {
  whisper: () => [
    `${HF}onnx-community/whisper-base/resolve/main/onnx/encoder_model.onnx`,
    `${HF}onnx-community/whisper-base/resolve/main/onnx/decoder_model_merged.onnx`,
  ],
  kokoro: () => [`${HF}onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/onnx/model.onnx`],
  gemma: (mode) => {
    const { id, dtype } = GEMMA_MODELS[mode]
    return mode === 'heavy'
      ? [
          `${HF}${id}/resolve/main/onnx/embed_tokens_${dtype}.onnx_data`,
          `${HF}${id}/resolve/main/onnx/decoder_model_merged_${dtype}.onnx_data`,
        ]
      : [`${HF}${id}/resolve/main/onnx/model_${dtype}.onnx_data`]
  },
}

export async function isOnDevice(id: Exclude<LoadItemId, 'avatar'>, mode: Mode): Promise<boolean> {
  if (!isModelCacheSupported()) return false
  const cache = createModelCache()
  try {
    const hits = await Promise.all(KEY_FILES[id](mode).map((url) => cache.match(url)))
    return hits.every(Boolean)
  } catch {
    return false
  }
}
