import { useEffect, useRef, useState } from 'react'
import type { Mode } from '../app/state'
import { GemmaClient, type GemmaReply } from '../gemma/GemmaClient'

// Dev only (`?dev=gemma`), never in the production build: checks the Gemma
// worker on its own. The first load downloads the model; later loads read it
// from the OPFS cache.
export default function GemmaTest() {
  const client = useRef<GemmaClient | null>(null)
  const files = useRef(new Map<string, { loaded: number; total: number }>())
  const [mode, setMode] = useState<Mode>('light')
  const [status, setStatus] = useState('not loaded')
  const [prompt, setPrompt] = useState('Ask me one interview question for a junior frontend developer.')
  const [streamed, setStreamed] = useState('')
  const [reply, setReply] = useState<GemmaReply | null>(null)

  useEffect(() => () => client.current?.dispose(), [])

  async function load() {
    client.current?.dispose()
    client.current = new GemmaClient()
    client.current.onStorageFailed = (m) => console.warn('[Gemma] not kept for next time:', m)
    files.current.clear()
    setStatus('loading')
    try {
      const r = await client.current.load(mode, (file, loaded, total) => {
        files.current.set(file, { loaded, total })
        let l = 0
        let t = 0
        files.current.forEach((f) => ((l += f.loaded), (t += f.total)))
        setStatus(`downloading ${(l / 1e6).toFixed(0)} / ${(t / 1e6).toFixed(0)} MB`)
      })
      setStatus(`ready: load ${(r.loadMs / 1000).toFixed(1)} s, warm-up ${r.warmMs} ms`)
    } catch (e) {
      setStatus(`load failed: ${e instanceof Error ? e.message : e}`)
    }
  }

  async function generate() {
    if (!client.current) return
    setStreamed('')
    setReply(null)
    try {
      const r = await client.current.generate([{ role: 'user', content: prompt }], {
        maxNewTokens: 80,
        onToken: (t) => setStreamed((s) => s + t),
      })
      setReply(r)
    } catch (e) {
      setStatus(`generate failed: ${e instanceof Error ? e.message : e}`)
    }
  }

  return (
    <section className="screen glass">
      <h1>Gemma worker test</h1>
      <p className="muted">Dev only. The first load downloads the model; later loads read it from OPFS.</p>
      <div className="actions" style={{ justifyContent: 'flex-start' }}>
        <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} aria-label="Mode">
          <option value="light">Light (Gemma 3 1B)</option>
          <option value="heavy">Heavy (Gemma 4 E2B)</option>
        </select>
        <button type="button" onClick={load}>
          Load
        </button>
      </div>
      <p id="gemma-status" role="status">
        {status}
      </p>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} style={{ width: '100%' }} />
      <div className="actions" style={{ justifyContent: 'flex-start' }}>
        <button type="button" className="primary" onClick={generate}>
          Generate
        </button>
        <button type="button" onClick={() => client.current?.stop()}>
          Stop
        </button>
      </div>
      <p id="gemma-stream">{streamed}</p>
      {reply && (
        <p id="gemma-reply" className="muted">
          {reply.ms} ms, {reply.tokens} tokens{reply.stopped ? ', stopped' : ''}
        </p>
      )}
    </section>
  )
}
