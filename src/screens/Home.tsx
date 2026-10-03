import { ScreenFrame } from '../components/ScreenFrame'
import type { Mode } from '../app/state'

// Placeholder (step 0.2). Steps 1.1, 1.2 and 1.6 fill in the device check, the
// real download list and the fallback to Light.
export function Home({ onChooseMode }: { onChooseMode: (mode: Mode) => void }) {
  return (
    <ScreenFrame title="Interview Room">
      <p className="lede">
        A mock interviewer that listens to your answers, asks a follow-up on what
        you said, and gives you a report at the end.
      </p>

      <section aria-labelledby="device-title" className="panel">
        <h2 id="device-title">Your device</h2>
        <p className="placeholder">Device check goes here (step 1.1).</p>
      </section>

      <section aria-labelledby="mode-title" className="panel">
        <h2 id="mode-title">Choose a mode</h2>
        <p className="muted">
          Nothing downloads yet: that starts once you choose a video interview or a phone screen
          on the next page. The models are kept on this device after the first time.
        </p>
        <div className="mode-options">
          <button type="button" className="mode-option" onClick={() => onChooseMode('light')}>
            <span className="mode-name">Light</span>
            <span className="mode-detail">Gemma 3 1B, 859 MB. For slower laptops or connections.</span>
          </button>
          <button type="button" className="mode-option" onClick={() => onChooseMode('heavy')}>
            <span className="mode-name">Heavy</span>
            <span className="mode-detail">Gemma 4 E2B, 3.11 GB. Better follow-ups and a deeper review.</span>
          </button>
        </div>
        <p className="placeholder">Full download list with sizes goes here (step 1.2).</p>
      </section>
    </ScreenFrame>
  )
}
