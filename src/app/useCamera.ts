import { useCallback, useEffect, useRef, useState } from 'react'

// "Show my camera": a small mirrored self-view in a corner of the stage, like
// a video call. Local only: the stream goes to a <video> on this page and
// nowhere else; nothing is recorded, saved or sent.
//
// The camera is its own video-only stream, separate from the microphone the
// voice package opens, so turning it on or off (or a refusal) never touches
// the interview. It is only asked for when the candidate turns it on, and its
// tracks are stopped when they turn it off and when the interview screen goes.

type CameraState = { status: 'off' | 'starting' | 'on'; stream: MediaStream | null; error: string | null }

const ERRORS: Record<string, string> = {
  NotAllowedError: 'Camera access was not allowed. You can allow it from the address bar, then try again.',
  SecurityError: 'Camera access was not allowed. You can allow it from the address bar, then try again.',
  NotFoundError: 'No camera was found.',
  OverconstrainedError: 'No camera was found.',
  NotReadableError: 'The camera is in use by another app.',
}

export function useCamera() {
  const [state, setState] = useState<CameraState>({ status: 'off', stream: null, error: null })
  const streamRef = useRef<MediaStream | null>(null)
  const mounted = useRef(true)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  // The interview screen going away (the interview ended) stops the camera.
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      stop()
    }
  }, [stop])

  const toggle = useCallback(async () => {
    if (state.status === 'starting') return
    if (state.status === 'on') {
      stop()
      setState({ status: 'off', stream: null, error: null })
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setState({ status: 'off', stream: null, error: 'This browser cannot show the camera.' })
      return
    }
    setState({ status: 'starting', stream: null, error: null })
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      })
      // Turned off, or the screen left, while the browser was asking.
      if (!mounted.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      streamRef.current = stream
      // The camera unplugged or taken by another app: back to off.
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (streamRef.current !== stream) return
        stop()
        setState({ status: 'off', stream: null, error: 'The camera stopped.' })
      })
      setState({ status: 'on', stream, error: null })
    } catch (e) {
      const name = e instanceof DOMException ? e.name : ''
      if (mounted.current) setState({ status: 'off', stream: null, error: ERRORS[name] ?? "The camera couldn't start." })
    }
  }, [state.status, stop])

  // When the interview finishes (the screen stays up for "See your report").
  const turnOff = useCallback(() => {
    stop()
    setState((s) => (s.status === 'off' ? s : { status: 'off', stream: null, error: null }))
  }, [stop])

  return { ...state, on: state.status === 'on', toggle, turnOff }
}
