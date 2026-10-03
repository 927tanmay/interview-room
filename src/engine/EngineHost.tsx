import { lazy, Suspense, useEffect, useRef, type Dispatch } from 'react'
import { DOWNLOADS } from '../app/downloads'
import type { Display, Mode } from '../app/state'
import { GemmaClient } from '../gemma/GemmaClient'
import { isOnDevice, itemsFor, type LoadAction } from './loading'
import { PhoneEngine } from './PhoneEngine'

// Only fetched when the candidate picks the video interview, so three.js and
// the avatar never load for a phone screen.
const VideoEngine = lazy(() => import('./VideoEngine'))

// The one place the models live. App mounts this once, at a fixed spot in its
// tree, from the display choice on the setup screen until the interview ends;
// it is hidden on setup (loading in the background) and shown as the stage on
// the interview screen. It owns the app's Gemma worker; the voice engine (the
// package's hook, or <AiVoiceAvatar> for video) runs inside the child.
export function EngineHost({
  display,
  mode,
  visible,
  onLoad,
}: {
  display: Display
  mode: Mode
  visible: boolean
  onLoad: Dispatch<LoadAction>
}) {
  const gemma = useRef<GemmaClient | null>(null)

  useEffect(() => {
    onLoad({ type: 'reset', items: itemsFor(display) })
    for (const id of ['whisper', 'kokoro', 'gemma'] as const) {
      void isOnDevice(id, mode).then((cached) => onLoad({ type: 'cached', id, cached }))
    }
  }, [display, mode, onLoad])

  useEffect(() => {
    const client = new GemmaClient()
    gemma.current = client
    // Measured against the model's known size, not the files seen so far: the
    // small config and tokenizer files finish before the weights start, and a
    // running total would read 100% with 859 MB still to come.
    const expected = DOWNLOADS.find((d) => d.id === (mode === 'heavy' ? 'gemma-heavy' : 'gemma-light'))!.bytes
    const files = new Map<string, number>()
    client
      .load(mode, (file, loaded) => {
        files.set(file, loaded)
        let sum = 0
        files.forEach((l) => (sum += l))
        // Held below 100 until the worker says ready (warm-up still to run).
        onLoad({ type: 'progress', id: 'gemma', pct: Math.min(99, (sum / expected) * 100) })
      })
      .then(() => onLoad({ type: 'ready', id: 'gemma' }))
      .catch((e: Error) => {
        // dispose() during unmount rejects too; that is not a failure to show.
        if (gemma.current === client) onLoad({ type: 'failed', id: 'gemma', message: e.message })
      })
    return () => {
      gemma.current = null
      client.dispose()
    }
  }, [mode, onLoad])

  return (
    <div className="engine-host" hidden={!visible}>
      {display === 'video' ? (
        <Suspense fallback={<div className="stage stage-video" aria-hidden="true" />}>
          <VideoEngine mode={mode} />
        </Suspense>
      ) : (
        <PhoneEngine onLoad={onLoad} />
      )}
    </div>
  )
}
