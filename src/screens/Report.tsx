import { ScreenFrame } from '../components/ScreenFrame'

// Placeholder (step 0.2). Phase 5 fills it in: specific to what they said,
// quoting their answers, measured numbers only (UX.md: report).
export function Report({ onPractiseAgain, onHome }: { onPractiseAgain: () => void; onHome: () => void }) {
  return (
    <ScreenFrame title="Your interview">
      <section aria-labelledby="answers-title" className="panel">
        <h2 id="answers-title">Your answers</h2>
        <p className="placeholder">Each answer, in your words, with what was measured (phase 5).</p>
      </section>

      <div className="actions">
        <button type="button" onClick={onHome}>
          Home
        </button>
        <button type="button" className="primary" onClick={onPractiseAgain}>
          Practise again
        </button>
      </div>
    </ScreenFrame>
  )
}
