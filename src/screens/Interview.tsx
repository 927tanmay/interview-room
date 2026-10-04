import { useEffect, useRef, useState } from 'react'
import type { Display } from '../app/state'
import { AnswerTimer } from '../components/AnswerTimer'
import { ProgressDots } from '../components/ProgressDots'
import { ScreenFrame } from '../components/ScreenFrame'
import type { BankQuestion } from '../interview/bank'
import type { ExchangeKind, PauseReason } from '../interview/engine'
import { interview, startInterview, useInterview } from '../interview/session'
import type { InterviewSettings } from '../interview/settings'
import { useVoice, type VoiceStatus } from '../voice/voiceStore'

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

// Answers that count against the target length (not small talk or the
// candidate's own questions).
const TIMED: ExchangeKind[] = ['question', 'follow-up', 'probe', 'clarification']

// The interview room (TASKS.md 4.2). The avatar or the phone-screen orb is
// the voice engine's stage, which App keeps mounted beside this screen.
export function Interview({
  display,
  settings,
  onEnd,
  practice = null,
}: {
  display: Display
  settings: InterviewSettings
  onEnd: () => void
  practice?: BankQuestion | null
}) {
  const voice = useVoice()
  const state = useInterview()
  const started = useRef(false)
  const [captions, setCaptions] = useState(true)

  useEffect(() => {
    if (started.current) return
    started.current = true
    startInterview(settings, practice)
  }, [settings, practice])

  const finished = state?.phase === 'done'
  // The engine is busy while Gemma words a follow-up; the package is idle then.
  const label = finished ? 'Finished' : state?.paused ? 'Paused' : state?.busy ? 'Thinking' : STATE_LABEL[voice.status]
  const timed = !finished && !!state?.currentKind && TIMED.includes(state.currentKind)

  return (
    <ScreenFrame title={display === 'video' ? 'Video interview' : 'Phone screen'}>
      <div className="room-bar">
        <span className="state" role="status">
          {label}
        </span>
        {state && (
          <ProgressDots
            total={state.total}
            index={finished ? state.total : state.questionIndex}
            outcomes={state.records.map((r) => r.outcome)}
          />
        )}
        {timed && (
          <AnswerTimer startedAt={state.answerStartedAt} targetMinutes={settings.answerMinutes} paused={!!state.paused} />
        )}
      </div>

      {voice.micError && (
        <div className="notice">
          <p className="notice-title">The microphone isn't available</p>
          <p>
            Allow microphone access for this page (the icon in the address bar), check that a
            microphone is connected, then press Resume. ({voice.micError})
          </p>
        </div>
      )}

      {state?.paused && !voice.micError && (
        <div className="notice">
          <p>{PAUSED[state.paused]}</p>
        </div>
      )}

      {state?.notes.map((note) => (
        <p key={note} className="muted">
          {note}
        </p>
      ))}

      <section className="question-card" aria-labelledby="question-title">
        <h2 id="question-title" className="label">
          {state?.question ? `Question ${state.questionIndex + 1}` : finished ? 'All done' : 'Warming up'}
        </h2>
        <p className="question">
          {state?.question?.question ??
            (finished ? 'Thanks for practicing. Your report is ready.' : 'A quick hello before the first question.')}
        </p>
      </section>

      {captions && (
        <section className="captions" aria-label="Captions">
          <div>
            <h3 className="label">Interviewer</h3>
            <p className="said">{state?.interviewerLine}</p>
          </div>
          <div>
            <h3 className="label">What I heard</h3>
            <p className={state?.currentAnswer ? 'heard' : 'heard placeholder'} aria-live="polite">
              {state?.currentAnswer || 'Your words appear here as you speak. Take your time: pauses are fine.'}
            </p>
          </div>
        </section>
      )}

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
        <button type="button" className="quiet" aria-pressed={captions} onClick={() => setCaptions((c) => !c)}>
          {captions ? 'Hide captions' : 'Show captions'}
        </button>
      </div>
    </ScreenFrame>
  )
}
