import { useEffect, useRef, useState } from 'react'
import type { Display, Mode } from '../app/state'
import { LoadProgress } from '../components/LoadProgress'
import { ScreenFrame } from '../components/ScreenFrame'
import { allReady, type LoadState } from '../engine/loading'

const DISPLAYS: { value: Display; name: string; detail: string }[] = [
  { value: 'video', name: 'Video interview', detail: 'The interviewer appears on screen and lip-syncs.' },
  { value: 'phone', name: 'Phone screen', detail: 'Voice only, like a recruiter call. Lighter on the laptop.' },
]

// Placeholder (step 0.2). The first choice is video or phone: confirming it
// mounts the engine, which starts loading the models while the candidate fills
// in the rest (UX.md: downloads). Steps 1.6, 2.4 and 4.1 fill in the sections.
export function Setup({
  mode,
  display,
  load,
  onChooseDisplay,
  onStart,
  onBack,
}: {
  mode: Mode
  display: Display | null
  load: LoadState
  onChooseDisplay: (display: Display) => void
  onStart: () => void
  onBack: () => void
}) {
  // Video is preselected; nothing loads until they press Continue.
  const [pending, setPending] = useState<Display>('video')
  const chosen = DISPLAYS.find((d) => d.value === display)
  const ready = !!chosen && allReady(load)

  // The form disappears on Continue; keep keyboard focus on what replaced it.
  const chosenRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (display) chosenRef.current?.focus()
  }, [display])

  return (
    <ScreenFrame title="Set up your interview">
      {chosen ? (
        <section aria-labelledby="display-title" className="panel">
          <h2 id="display-title" ref={chosenRef} tabIndex={-1}>
            {chosen.name}
          </h2>
          <p className="muted">
            {chosen.detail} To change this, go back to the home page.
          </p>
        </section>
      ) : (
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault()
            onChooseDisplay(pending)
          }}
        >
          <fieldset className="choice-group">
            <legend>How do you want to meet the interviewer?</legend>
            {DISPLAYS.map((d) => (
              <label key={d.value} className="choice">
                <input
                  type="radio"
                  name="display"
                  value={d.value}
                  checked={pending === d.value}
                  onChange={() => setPending(d.value)}
                />
                <span>
                  <span className="choice-name">{d.name}</span>
                  <span className="choice-detail">{d.detail}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <p className="muted">
            Continuing starts the download for {mode === 'heavy' ? 'Heavy' : 'Light'} mode.
            You can't switch between video and phone after that.
          </p>
          <div className="actions">
            <button type="submit" className="primary">
              Continue
            </button>
          </div>
        </form>
      )}

      {chosen && (
        <>
          <section aria-labelledby="download-title" className="panel">
            <h2 id="download-title">Models ({mode === 'heavy' ? 'Heavy' : 'Light'} mode)</h2>
            <LoadProgress mode={mode} state={load} />
          </section>

          <section aria-labelledby="options-title" className="panel">
            <h2 id="options-title">Interview</h2>
            <p className="placeholder">
              Track, round, level, interviewer, mood, number of questions and answer length go
              here (step 4.1).
            </p>
          </section>

          <section aria-labelledby="mic-title" className="panel">
            <h2 id="mic-title">Microphone</h2>
            <p>
              The interviewer needs to hear your answers. Your voice is turned into text on this
              device and is never sent anywhere.
            </p>
            <p className="placeholder">Mic check goes here (step 2.4).</p>
          </section>
        </>
      )}

      <div className="actions">
        <button type="button" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="primary"
          onClick={onStart}
          disabled={!ready}
          aria-describedby={chosen && !ready ? 'start-hint' : undefined}
        >
          Start interview
        </button>
      </div>
      {chosen && !ready && (
        <p id="start-hint" className="muted start-hint">
          Start is available once every model has loaded.
        </p>
      )}
    </ScreenFrame>
  )
}
