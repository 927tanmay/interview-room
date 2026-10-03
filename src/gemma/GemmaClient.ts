import type { Mode } from '../app/state'
import type { ChatMessage, GemmaEvent, GemmaRequest } from './protocol'

export type GemmaReply = { text: string; ms: number; tokens: number; stopped: boolean }

type Pending = {
  resolve: (reply: GemmaReply) => void
  reject: (error: Error) => void
  onToken?: (text: string) => void
}

// Page-side handle on the Gemma worker. One reply at a time: the interview
// never asks for two, and a new request stops the one before it.
export class GemmaClient {
  private worker: Worker
  private nextId = 1
  private pending = new Map<number, Pending>()
  private loadWaiters: { resolve: (r: { loadMs: number; warmMs: number }) => void; reject: (e: Error) => void }[] = []
  private onProgress?: (file: string, loaded: number, total: number) => void
  // Set by the host to tell the candidate the model will download again next
  // time (degraded, not fatal).
  onStorageFailed?: (message: string) => void

  constructor() {
    this.worker = new Worker(new URL('./gemma.worker.ts', import.meta.url), { type: 'module' })
    this.worker.onmessage = (e: MessageEvent<GemmaEvent>) => this.handle(e.data)
    this.worker.onerror = (e) => this.failAll(new Error(e.message || 'Gemma worker crashed'))
  }

  load(mode: Mode, onProgress?: (file: string, loaded: number, total: number) => void) {
    this.onProgress = onProgress
    const done = new Promise<{ loadMs: number; warmMs: number }>((resolve, reject) =>
      this.loadWaiters.push({ resolve, reject }),
    )
    this.send({ type: 'load', mode })
    return done
  }

  generate(messages: ChatMessage[], opts: { maxNewTokens: number; onToken?: (text: string) => void }) {
    if (this.pending.size) this.stop()
    const id = this.nextId++
    return new Promise<GemmaReply>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onToken: opts.onToken })
      this.send({ type: 'generate', id, messages, maxNewTokens: opts.maxNewTokens })
    })
  }

  stop() {
    this.send({ type: 'stop' })
  }

  dispose() {
    this.worker.terminate()
    this.failAll(new Error('Gemma worker stopped'))
  }

  private send(req: GemmaRequest) {
    this.worker.postMessage(req)
  }

  private handle(ev: GemmaEvent) {
    switch (ev.type) {
      case 'progress':
        this.onProgress?.(ev.file, ev.loaded, ev.total)
        break
      case 'storage':
        this.onStorageFailed?.(ev.message)
        break
      case 'ready':
        this.loadWaiters.splice(0).forEach((w) => w.resolve({ loadMs: ev.loadMs, warmMs: ev.warmMs }))
        break
      case 'token':
        this.pending.get(ev.id)?.onToken?.(ev.text)
        break
      case 'result': {
        const p = this.pending.get(ev.id)
        this.pending.delete(ev.id)
        p?.resolve({ text: ev.text, ms: ev.ms, tokens: ev.tokens, stopped: ev.stopped })
        break
      }
      case 'error': {
        const error = new Error(ev.message)
        if (ev.stage === 'load') this.loadWaiters.splice(0).forEach((w) => w.reject(error))
        else if (ev.id !== undefined) {
          this.pending.get(ev.id)?.reject(error)
          this.pending.delete(ev.id)
        }
        break
      }
    }
  }

  private failAll(error: Error) {
    this.loadWaiters.splice(0).forEach((w) => w.reject(error))
    this.pending.forEach((p) => p.reject(error))
    this.pending.clear()
  }
}
