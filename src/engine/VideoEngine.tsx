import type { Mode } from '../app/state'

// Video interview: <AiVoiceAvatar> runs the engine and draws the avatar.
// Default export for React.lazy. Placeholder (step 0.2); step 2.1 renders the
// avatar here, still for reduced motion.
export default function VideoEngine({ mode }: { mode: Mode }) {
  return (
    <div className="stage stage-video" aria-hidden="true" data-mode={mode}>
      <p className="placeholder">Avatar (step 2.1)</p>
    </div>
  )
}
