import { useEffect, useRef } from 'react'
import type { Display } from '../app/state'
import { ScreenFrame } from '../components/ScreenFrame'
import { useVoice, type VoiceStatus } from '../voice/voiceStore'
import type { PauseReason } from '../interview/engine'
import { interview, startInterview, useInterview } from '../interview/session'
import type { InterviewSettings } from '../interview/settings'

// One clear state, in words (UX.md: interview screen). 'idle' means the mic is
// open and waiting for speech, which to the candidate is listening too.
const STATE_LABEL: Record<VoiceStatus, string> = {
  loading: 'Getting ready',
  idle: 'Listening',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
}

const PAUSED: Record<PauseReason, string> = {
  asked: "Paused. Say I'm ready, or press Resume, when you want to carry on.",
  button: "Paused. Say I'm ready, or press Resume, when you want to carry on.",
  hidden: 'Paused because the tab was in the background. Press Resume to carry on.',
  mic: 'Paused because the microphone stopped. Reconnect it, then press Resume.',
}

// The interview runs here; the avatar or voice-only stage belongs to the
// engine, which App keeps mounted beside this screen. Step 4.2 adds the timer
// and progress dots.
export function Interview({
  display,
  settings,
  onEnd,
}: {
  display: Display
  settings: InterviewSettings
  onEnd: () => void
}) {
  const voice = useVoice()
  const state = useInterview()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    startInterview(settings)
  }, [settings])

  const finished = state?.phase === 'done'
  // The engine is busy while Gemma words a follow-up; the package is idle then.
  const label = state?.paused ? 'Paused' : state?.busy ? 'Thinking' : STATE_LABEL[voice.status]
  const progress =
    state && state.questionIndex >= 0 && state.questionIndex < state.total
      ? `Question ${state.questionIndex + 1} of ${state.total}`
      : null

  return (
    <ScreenFrame title={display === 'video' ? 'Video interview' : 'Phone screen'}>
      <p className="interview-meta">
        <span className="state" role="status">
          {finished ? 'Finished' : label}
        </span>
        {progress && <span className="muted">{progress}</span>}
      </p>

      {voice.micError && (
        <div className="notice">
          <p className="notice-title">The microphone isn't available</p>
          <p>
            Allow microphone access for this page (the icon in the address bar), check that a
            microphone is connected, then reload. ({voice.micError})
          </p>
        </div>
      )}

      {state?.paused && (
        <div className="notice">
          <p>{PAUSED[state.paused]}</p>
        </div>
      )}

      {state?.notes.map((note) => (
        <p key={note} className="muted">
          {note}
        </p>
      ))}

      {state?.question && (
        <section aria-labelledby="question-title">
          <h2 id="question-title" className="label">
            Question
          </h2>
          <p className="question">{state.question.question}</p>
        </section>
      )}

      <section aria-labelledby="said-title">
        <h2 id="said-title" className="label">
          Interviewer
        </h2>
        <p className="said">{state?.interviewerLine}</p>
      </section>

      <section aria-labelledby="heard-title">
        <h2 id="heard-title" className="label">
          What I heard
        </h2>
        <p className={state?.currentAnswer ? 'heard' : 'heard placeholder'} aria-live="polite">
          {state?.currentAnswer || 'Your words appear here as you speak. Take your time: pauses are fine.'}
        </p>
      </section>

      <div className="actions interview-controls">
        {finished ? (
          <button type="button" className="primary" onClick={onEnd}>
            See your report
          </button>
        ) : (
          <>
            <button
              type="button"
              className="primary"
              onClick={interview.done}
              disabled={!state?.currentAnswer || !!state?.paused}
            >
              I'm done
            </button>
            {state?.paused ? (
              <button type="button" onClick={interview.resume}>
                Resume
              </button>
            ) : (
              <button type="button" onClick={interview.pause}>
                Pause
              </button>
            )}
            <button type="button" onClick={interview.repeat}>
              Repeat question
            </button>
            <button type="button" onClick={interview.skip} disabled={!state?.question}>
              Skip
            </button>
            <button
              type="button"
              onClick={() => {
                interview.end()
                onEnd()
              }}
            >
              End interview
            </button>
          </>
        )}
      </div>
    </ScreenFrame>
  )
}
