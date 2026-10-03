import type { Mode } from '../app/state'

// Phone screen: the headless hook (react-ai-voice-avatar/headless) runs the
// engine, no three.js. Placeholder (step 0.2); step 2.1 adds the hook and a
// calm level indicator driven by its audio level.
export function PhoneEngine({ mode }: { mode: Mode }) {
  return (
    <div className="stage stage-phone" aria-hidden="true" data-mode={mode}>
      <p className="placeholder">Voice only</p>
    </div>
  )
}
