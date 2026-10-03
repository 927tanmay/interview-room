import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../app/usePrefersReducedMotion'
import { useInterview } from '../interview/session'
import { getAudioLevel, useVoice } from '../voice/voiceStore'

export type OrbState = 'loading' | 'listening' | 'speaking' | 'thinking' | 'paused'

// The phone screen's interviewer (UX.md: look and feel): an orb that glows
// with whoever holds the floor, the candidate's voice while listening and the
// interviewer's while speaking, with a slow pulse while thinking. Only
// transform and opacity change per frame, so it stays light on a GPU that is
// busy with the models. Under reduced motion it holds still and only its
// brightness says the state.
export function Orb({ label }: { label: string }) {
  const voice = useVoice()
  const interview = useInterview()
  const reducedMotion = usePrefersReducedMotion()
  const ref = useRef<HTMLDivElement>(null)

  const state: OrbState = interview?.paused
    ? 'paused'
    : voice.status === 'loading'
      ? 'loading'
      : interview?.busy || voice.status === 'thinking'
        ? 'thinking'
        : voice.status === 'speaking'
          ? 'speaking'
          : 'listening'

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reducedMotion) {
      el.style.setProperty('--level', '0')
      return
    }
    let smooth = 0
    let frame = 0
    const tick = () => {
      const { level, source } = getAudioLevel()
      const wanted = source === 'idle' ? 0 : Math.min(1, level * 1.8)
      smooth += (wanted - smooth) * 0.2
      el.style.setProperty('--level', smooth.toFixed(3))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [reducedMotion])

  return (
    <div className="orb-wrap">
      <div ref={ref} className={`orb orb-${state}`} aria-hidden="true">
        <span className="orb-glow" />
        <span className="orb-core" />
      </div>
      <p className="orb-label">{label}</p>
    </div>
  )
}
