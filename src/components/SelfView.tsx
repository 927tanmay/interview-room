import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// The self-view, drawn in the bottom corner of the stage (the visible
// VoiceHost), clear of the avatar's face and of the captions.
export function SelfView({ stream }: { stream: MediaStream | null }) {
  const video = useRef<HTMLVideoElement>(null)
  const [target, setTarget] = useState<Element | null>(null)

  useEffect(() => {
    setTarget(document.querySelector('.voice-host:not(.voice-host--offstage)'))
  }, [])

  useEffect(() => {
    if (video.current) video.current.srcObject = stream
  }, [stream, target])

  if (!stream || !target) return null
  return createPortal(
    <div className="self-view">
      <video ref={video} autoPlay muted playsInline aria-label="Your camera, shown only on this screen" />
    </div>,
    target,
  )
}
