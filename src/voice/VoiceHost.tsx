import { lazy, Suspense, useCallback, useEffect, useRef, type Dispatch } from 'react'
import { attachGemma, heard } from '../interview/session'
import { INTERVIEWERS, type InterviewerId } from '../interview/settings'
import { resetVoice } from './voiceStore'
import { DOWNLOADS } from '../app/downloads'
import type { Display, Mode } from '../app/state'
import { GemmaClient } from '../gemma/GemmaClient'
import { isOnDevice, itemsFor, type LoadAction } from './loading'
import { PhoneVoice } from './PhoneVoice'

// Only fetched when the candidate picks the video interview, so three.js and
// the avatar never load for a phone screen.
const VideoVoice = lazy(() => import('./VideoVoice'))

// The one place the models live. App mounts this once, at a fixed spot in its
// tree, from the display choice on the setup screen until the interview ends;
// it is hidden on setup (loading in the background) and shown as the stage on
// the interview screen. It owns the app's Gemma worker; the voice engine (the
// package's hook, or <AiVoiceAvatar> for video) runs inside the child.
export function VoiceHost({
  display,
  mode,
  interviewer,
  visible,
  onLoad,
}: {
  display: Display
  mode: Mode
  interviewer: InterviewerId
  visible: boolean
  onLoad: Dispatch<LoadAction>
}) {
  const { avatar, voice } = INTERVIEWERS[interviewer]
  const gemma = useRef<GemmaClient | null>(null)
  // What the package calls with each stretch of speech Whisper transcribed.
  // The interview engine collects it and always replies '' (keep listening);
  // it speaks its own lines.
  const onSubmit = useCallback(
    (text: string, details?: { speechMs?: number }) => heard(text, details?.speechMs),
    [],
  )
  // The candidate talked over the interviewer: stop generating the rest.
  const onInterrupt = useCallback(() => gemma.current?.stop(), [])

  useEffect(() => () => resetVoice(), [])

  useEffect(() => {
    onLoad({ type: 'reset', items: itemsFor(display) })
    for (const id of ['whisper', 'kokoro', 'gemma'] as const) {
      void isOnDevice(id, mode).then((cached) => onLoad({ type: 'cached', id, cached }))
    }
  }, [display, mode, onLoad])

  useEffect(() => {
    const client = new GemmaClient()
    gemma.current = client
    attachGemma(client)
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
      attachGemma(null)
      client.dispose()
    }
  }, [mode, onLoad])

  return (
    // Off stage rather than display:none while hidden: the 3D canvas needs a
    // real size, or react-three-fiber never mounts the avatar (and with it the
    // engine that loads Whisper and Kokoro).
    <div className={visible ? 'voice-host' : 'voice-host voice-host--offstage'} aria-hidden={!visible || undefined}>
      {display === 'video' ? (
        <Suspense fallback={<div className="stage stage-video" aria-hidden="true" />}>
          <VideoVoice
            onLoad={onLoad}
            visible={visible}
            onSubmit={onSubmit}
            onInterrupt={onInterrupt}
            voice={voice}
            avatar={avatar}
          />
        </Suspense>
      ) : (
        <PhoneVoice onLoad={onLoad} onSubmit={onSubmit} onInterrupt={onInterrupt} voice={voice} />
      )}
    </div>
  )
}
