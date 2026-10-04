import { useEffect, useRef, useState, type CSSProperties } from 'react'
import aarav from '../assets/aarav.webp'
import ananya from '../assets/ananya.webp'
import type { Display, Mode } from '../app/state'
import { ChoiceChips } from '../components/ChoiceChips'
import { LoadProgress } from '../components/LoadProgress'
import { MicCheck } from '../components/MicCheck'
import { ScreenFrame } from '../components/ScreenFrame'
import { allReady, failedIds, overallProgress, type LoadState } from '../voice/loading'
import type { BankQuestion, Level, Track } from '../interview/bank'
import type { Mood } from '../interview/lines'
import {
  availableCount,
  FULL_LOOP_COUNT,
  INTERVIEWERS,
  type InterviewerId,
  type InterviewSettings,
  type RoundChoice,
} from '../interview/settings'

const DISPLAYS: { value: Display; name: string; detail: string }[] = [
  { value: 'video', name: 'Video interview', detail: 'The interviewer appears on screen and lip-syncs.' },
  { value: 'phone', name: 'Phone screen', detail: 'Voice only, like a recruiter call. Lighter on the laptop.' },
]

const MOOD_DETAIL: Record<Mood, string> = {
  friendly: 'Warm and encouraging, like a good first-round interviewer.',
  neutral: 'Calm and professional, no small reassurances.',
  tough: 'Direct and sceptical, like a demanding hiring manager.',
}

const ROUND_DETAIL: Record<RoundChoice, string> = {
  full: `${FULL_LOOP_COUNT} questions: 2 behavioural, 2 technical, 1 HR.`,
  behavioural: 'Stories from your experience: what you did and how it turned out.',
  technical: 'Questions on your track, answered out loud.',
  hr: 'Motivation, strengths and how you like to work.',
}

// Setup (TASKS.md 4.1). First step: video or phone, and who interviews you;
// confirming it starts loading the models (the avatar and voice depend on the
// interviewer, so both are fixed from then on). The rest is filled in while
// the models load (UX.md: downloads).
export function Setup({
  mode,
  display,
  settings,
  practice = null,
  load,
  onChooseDisplay,
  onSettingsChange,
  onStart,
  onBack,
  onRetry = () => {},
}: {
  mode: Mode
  display: Display | null
  settings: InterviewSettings
  // "Practice this one again" from the report: only this question is asked.
  practice?: BankQuestion | null
  load: LoadState
  onChooseDisplay: (display: Display, interviewer: InterviewerId) => void
  onSettingsChange: (patch: Partial<InterviewSettings>) => void
  onStart: () => void
  onBack: () => void
  // Try again after a model failed to load: reloads only what failed.
  onRetry?: () => void
}) {
  // Video and Ananya are preselected; nothing loads until Continue.
  const [pendingDisplay, setPendingDisplay] = useState<Display>('video')
  const [pendingInterviewer, setPendingInterviewer] = useState<InterviewerId>(settings.interviewer)
  const chosen = DISPLAYS.find((d) => d.value === display)
  const ready = !!chosen && allReady(load)
  const speechReady = load.whisper?.phase === 'ready' && load.kokoro?.phase === 'ready'
  const interviewer = INTERVIEWERS[settings.interviewer].name

  // The form disappears on Continue; keep keyboard focus on what replaced it.
  const chosenRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (display) chosenRef.current?.focus()
  }, [display])

  const set = (patch: Partial<InterviewSettings>) => onSettingsChange(patch)
  const countMax = settings.round === 'full' ? FULL_LOOP_COUNT : Math.min(5, availableCount(settings.round, settings.track, settings.level))

  const pct = overallProgress(mode, load)
  const failed = failedIds(load).length > 0
  const faces = { ananya, aarav }

  return (
    <ScreenFrame title={practice ? 'Practice one question again' : 'Set up your interview'}>
      {practice && (
        <section aria-labelledby="practice-title" className="panel">
          <h2 id="practice-title">The question</h2>
          <p className="question">{practice.question}</p>
          <p className="muted">Just this one, with a follow-up, then a new report.</p>
        </section>
      )}
      {chosen ? (
        <div className="setup-top">
          <section aria-labelledby="display-title" className="panel interviewer-card">
            <span className="face">
              <img src={faces[settings.interviewer]} alt="" width={600} height={801} />
            </span>
            <div>
              <h2 id="display-title" ref={chosenRef} tabIndex={-1}>
                {chosen.name} with {interviewer}
              </h2>
              <p className="muted">
                {chosen.detail} To change this, go back to the home page.
              </p>
            </div>
          </section>
          <section aria-labelledby="download-title" className="panel">
            <h2 id="download-title" className="sr-only">
              Models ({mode === 'heavy' ? 'Heavy' : 'Light'} mode)
            </h2>
            <LoadProgress mode={mode} state={load} onRetry={onRetry} />
          </section>
        </div>
      ) : (
        <form
          id="display-form"
          className="panel step-form"
          onSubmit={(e) => {
            e.preventDefault()
            onChooseDisplay(pendingDisplay, pendingInterviewer)
          }}
        >
          <fieldset className="choice-group">
            <legend>How do you want to meet the interviewer?</legend>
            <div className="choice-row">
              {DISPLAYS.map((d) => (
                <label key={d.value} className="choice">
                  <input
                    type="radio"
                    name="display"
                    id={`display-${d.value}`}
                    value={d.value}
                    checked={pendingDisplay === d.value}
                    onChange={() => setPendingDisplay(d.value)}
                  />
                  <span>
                    <span className="choice-name">{d.name}</span>
                    <span className="choice-detail">{d.detail}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="choice-group">
            <legend>Who interviews you?</legend>
            <div className="choice-row">
              {(['ananya', 'aarav'] as const).map((id) => (
                <label key={id} className="choice person">
                  <input
                    type="radio"
                    name="interviewer"
                    id={`interviewer-${id}`}
                    value={id}
                    checked={pendingInterviewer === id}
                    onChange={() => setPendingInterviewer(id)}
                  />
                  <span className="face">
                    <img src={faces[id]} alt="" width={600} height={801} />
                  </span>
                  <span>
                    <span className="choice-name">{INTERVIEWERS[id].name}</span>
                    <span className="choice-detail">{id === 'ananya' ? 'Warm, measured voice.' : 'Calm, steady voice.'}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="muted">
            Continuing starts the download for {mode === 'heavy' ? 'Heavy' : 'Light'} mode. These two
            choices stay fixed after that.
          </p>
        </form>
      )}

      {chosen && (
        <>
          <section aria-labelledby="options-title" className="panel options">
            <h2 id="options-title">Your interview</h2>
            {!ready && <p className="muted">Fill this in while the models load.</p>}

            <div className="options-grid">
              {!practice && (
                <>
                  <ChoiceChips<Track>
                    name="track"
                    legend="Track"
                    options={[
                      { value: 'frontend', label: 'Frontend' },
                      { value: 'backend', label: 'Backend' },
                      { value: 'ml', label: 'Machine learning' },
                    ]}
                    value={settings.track}
                    onChange={(track) => set({ track })}
                  />
                  <ChoiceChips<Level>
                    name="level"
                    legend="Level"
                    options={[
                      { value: 'intern', label: 'Intern' },
                      { value: 'junior', label: 'Junior' },
                      { value: 'mid', label: 'Mid-level' },
                      { value: 'senior', label: 'Senior' },
                    ]}
                    value={settings.level}
                    onChange={(level) => set({ level })}
                  />
                  <ChoiceChips<RoundChoice>
                    name="round"
                    legend="Round"
                    options={[
                      { value: 'full', label: 'Full loop' },
                      { value: 'behavioural', label: 'Behavioural' },
                      { value: 'technical', label: 'Technical' },
                      { value: 'hr', label: 'HR' },
                    ]}
                    value={settings.round}
                    onChange={(round) => set({ round })}
                    hint={ROUND_DETAIL[settings.round]}
                  />
                  {settings.round !== 'full' && (
                    <ChoiceChips<number>
                      name="count"
                      legend="Questions"
                      options={[3, 4, 5].map((n) => ({ value: n, label: String(n), disabled: n > countMax }))}
                      value={settings.count}
                      onChange={(count) => set({ count })}
                    />
                  )}
                </>
              )}
              <ChoiceChips<number>
                name="answer-length"
                legend="Target length per answer"
                options={[1, 2, 3].map((n) => ({ value: n, label: `${n} min` }))}
                value={settings.answerMinutes}
                onChange={(answerMinutes) => set({ answerMinutes })}
                hint="Most behavioural answers aim for about 2 minutes. The timer turns amber near it and red past it."
              />
              <ChoiceChips<Mood>
                name="mood"
                legend="Interviewer's manner"
                options={[
                  { value: 'friendly', label: 'Friendly' },
                  { value: 'neutral', label: 'Neutral' },
                  { value: 'tough', label: 'Tough' },
                ]}
                value={settings.mood}
                onChange={(mood) => set({ mood })}
                hint={MOOD_DETAIL[settings.mood]}
              />
              <div className="text-field">
                <label htmlFor="candidate-name">What should {interviewer} call you? (optional)</label>
                <input
                  id="candidate-name"
                  type="text"
                  autoComplete="given-name"
                  maxLength={40}
                  value={settings.candidateName}
                  onChange={(e) => set({ candidateName: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section aria-labelledby="mic-title" className="panel">
            <h2 id="mic-title">Microphone</h2>
            <MicCheck interviewer={interviewer} ready={speechReady} />
          </section>
        </>
      )}

      {/* Always in view: one primary action, and while the models load it
          shows their progress instead of a dead button. */}
      <div className="setup-bar">
        <button type="button" onClick={onBack}>
          Back
        </button>
        {chosen && failed ? (
          <button type="button" className="primary big" onClick={onRetry}>
            Try again
          </button>
        ) : chosen ? (
          <button
            type="button"
            className={ready ? 'primary big' : 'primary big start-loading'}
            onClick={onStart}
            disabled={!ready}
            aria-describedby={!ready ? 'start-hint' : undefined}
            style={{ '--progress': `${pct}%` } as CSSProperties}
          >
            {ready ? (
              'Start interview'
            ) : (
              <>
                Loading<span className="wide-only"> models</span> · {pct}%
              </>
            )}
          </button>
        ) : (
          <button type="submit" form="display-form" className="primary big">
            Continue
          </button>
        )}
      </div>
      {chosen && !ready && !failed && (
        <p id="start-hint" className="sr-only">
          Start is available once every model has loaded.
        </p>
      )}
    </ScreenFrame>
  )
}
