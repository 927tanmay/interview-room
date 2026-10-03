import type { Display } from '../app/state'
import { ScreenFrame } from '../components/ScreenFrame'

// Placeholder (step 0.2). Layout follows UX.md: one clear state in words, the
// question as text, what Whisper heard, and the controls always available.
// The avatar or voice-only stage is not here: it belongs to the engine, which
// App keeps mounted beside this screen. Steps 2.1, 3.x and 4.2 make it work.
export function Interview({ display, onEnd }: { display: Display; onEnd: () => void }) {
  return (
    <ScreenFrame title={display === 'video' ? 'Video interview' : 'Phone screen'}>
      <p className="state" role="status">
        Listening
      </p>

      <section aria-labelledby="question-title">
        <h2 id="question-title" className="label">
          Question
        </h2>
        <p className="question placeholder">The current question appears here.</p>
      </section>

      <section aria-labelledby="heard-title">
        <h2 id="heard-title" className="label">
          What I heard
        </h2>
        <p className="heard placeholder" aria-live="polite">
          Your words appear here as they are transcribed.
        </p>
      </section>

      <div className="actions interview-controls">
        <button type="button" className="primary">
          I'm done
        </button>
        <button type="button">Repeat question</button>
        <button type="button">Skip</button>
        <button type="button" onClick={onEnd}>
          End interview
        </button>
      </div>
    </ScreenFrame>
  )
}
