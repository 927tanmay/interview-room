/// <reference lib="webworker" />
import {
  env,
  InterruptableStoppingCriteria,
  pipeline,
  TextStreamer,
  type TextGenerationPipeline,
} from '@huggingface/transformers'
import { createModelCache, isModelCacheSupported } from 'react-ai-voice-avatar/model-cache'
import { GEMMA_MODELS, type GemmaEvent, type GemmaRequest } from './protocol'

const post = (event: GemmaEvent) => self.postMessage(event)

// Keep Gemma between visits. transformers.js caches in the Cache API, which in
// Chrome refuses any single file of 256 MiB or more, so Gemma would download
// again on every visit. The package's OPFS store has no such limit; a file is
// only reused once fully written (MODEL-TESTS.md: caching note).
if (isModelCacheSupported()) {
  env.useCustomCache = true
  env.customCache = createModelCache({
    onStoreFailed: (key, reason) => post({ type: 'storage', message: `${key}: ${reason}` }),
  })
}

let generator: TextGenerationPipeline | null = null
let loading = false
const stopper = new InterruptableStoppingCriteria()

async function load(mode: keyof typeof GEMMA_MODELS) {
  if (generator || loading) return
  loading = true
  const { id, dtype } = GEMMA_MODELS[mode]
  const t0 = performance.now()
  try {
    generator = (await pipeline('text-generation', id, {
      device: 'webgpu',
      dtype,
      progress_callback: (p) => {
        if (p.status === 'progress') post({ type: 'progress', file: p.file, loaded: p.loaded, total: p.total })
      },
    })) as TextGenerationPipeline
    const loadMs = performance.now() - t0

    // One token, so the WebGPU shaders are compiled before the first real
    // reply and the candidate does not wait for it mid-interview.
    const w0 = performance.now()
    await generator([{ role: 'user', content: 'Hi' }], { max_new_tokens: 1, do_sample: false })
    post({ type: 'ready', loadMs: Math.round(loadMs), warmMs: Math.round(performance.now() - w0) })
  } catch (e) {
    generator = null
    post({ type: 'error', stage: 'load', message: e instanceof Error ? e.message : String(e) })
  } finally {
    loading = false
  }
}

async function generate(req: Extract<GemmaRequest, { type: 'generate' }>) {
  if (!generator) {
    post({ type: 'error', stage: 'generate', id: req.id, message: 'Gemma is not loaded' })
    return
  }
  stopper.reset()
  const t0 = performance.now()
  try {
    const streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (text: string) => post({ type: 'token', id: req.id, text }),
    })
    const out = await generator(req.messages, {
      max_new_tokens: req.maxNewTokens,
      do_sample: false,
      streamer,
      stopping_criteria: stopper,
    })
    const last = (out as { generated_text: { content: string }[] }[])[0].generated_text.at(-1)
    const text = (last?.content ?? '').trim()
    post({
      type: 'result',
      id: req.id,
      text,
      ms: Math.round(performance.now() - t0),
      tokens: generator.tokenizer.encode(text).length,
      stopped: stopper.interrupted,
    })
  } catch (e) {
    post({ type: 'error', stage: 'generate', id: req.id, message: e instanceof Error ? e.message : String(e) })
  }
}

self.onmessage = (e: MessageEvent<GemmaRequest>) => {
  const req = e.data
  if (req.type === 'load') void load(req.mode)
  else if (req.type === 'generate') void generate(req)
  else if (req.type === 'stop') stopper.interrupt()
}
