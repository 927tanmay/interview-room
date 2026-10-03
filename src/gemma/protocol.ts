import type { Mode } from '../app/state'

// The app's own Gemma, in a Web Worker so generation never blocks the page.
// Only the chosen mode's model is loaded (PLAN.md: models). Same loader as
// evals/interviewer.html: the plain text-generation pipeline, which loads only
// the text parts of Gemma 4 E2B (MODEL-TESTS.md, run 5).
export const GEMMA_MODELS: Record<Mode, { id: string; dtype: 'q4' | 'q4f16' }> = {
  light: { id: 'onnx-community/gemma-3-1b-it-ONNX', dtype: 'q4' },
  heavy: { id: 'onnx-community/gemma-4-E2B-it-ONNX', dtype: 'q4f16' },
}

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export type GemmaRequest =
  | { type: 'load'; mode: Mode }
  | { type: 'generate'; id: number; messages: ChatMessage[]; maxNewTokens: number }
  | { type: 'stop' }

export type GemmaEvent =
  | { type: 'progress'; file: string; loaded: number; total: number }
  | { type: 'ready'; loadMs: number; warmMs: number }
  | { type: 'token'; id: number; text: string }
  | { type: 'result'; id: number; text: string; ms: number; tokens: number; stopped: boolean }
  | { type: 'error'; stage: 'load' | 'generate'; id?: number; message: string }
  // A model file could not be kept for next time. Gemma still loads; it will
  // just download again on the next visit.
  | { type: 'storage'; message: string }
