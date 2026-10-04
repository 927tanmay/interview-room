import { lazy, Suspense, useReducer, useState } from 'react'
import { appReducer, initialState, isVoiceMounted } from './app/state'
import { useDeviceCheck } from './app/useDeviceCheck'
import { PrivacyNote } from './components/PrivacyNote'
import { currentSnapshot, stopInterview, takeDevTimeline } from './interview/session'
import { createReport } from './report/report'
import { saveReport } from './report/store'
import { VoiceHost } from './voice/VoiceHost'
import { reportVoiceError } from './voice/voiceEvents'
import { failedIds, loadReducer } from './voice/loading'
import { voiceControls } from './voice/voiceStore'
import { Home } from './screens/Home'
import { Interview } from './screens/Interview'
import { Report } from './screens/Report'
import { Setup } from './screens/Setup'

// Dev-only panels (`?dev=gemma`, `?dev=setup`, `?dev=room`, `?dev=avatar`,
// `?dev=report`); dropped from production.
const GemmaTest = import.meta.env.DEV ? lazy(() => import('./dev/GemmaTest')) : null
const SetupPreview = import.meta.env.DEV ? lazy(() => import('./dev/SetupPreview')) : null
const RoomPreview = import.meta.env.DEV ? lazy(() => import('./dev/RoomPreview')) : null
const AvatarPreview = import.meta.env.DEV ? lazy(() => import('./dev/AvatarPreview')) : null
const ReportPreview = import.meta.env.DEV ? lazy(() => import('./dev/ReportPreview')) : null
const devPanel = import.meta.env.DEV ? new URLSearchParams(location.search).get('dev') : null

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const [load, dispatchLoad] = useReducer(loadReducer, {})
  // Try again after a failed load: only what failed is loaded again.
  const [attempts, setAttempts] = useState({ voice: 0, gemma: 0 })
  // Dev only: feed the setup screen the package's own error reports, to test
  // the failure path without a broken network:
  //   __voiceError({ stage: 'worker', severity: 'fatal', message: 'Failed to fetch' })
  if (import.meta.env.DEV) {
    Object.assign(window, {
      __voiceError: (e: Parameters<typeof reportVoiceError>[0]) => reportVoiceError(e, dispatchLoad),
      __load: dispatchLoad,
    })
  }
  const retryFailed = () => {
    const failed = failedIds(load)
    if (!failed.length) return
    // Whisper, Kokoro and the avatar share one voice engine, so a fresh engine
    // loads all three; whichever already finished comes straight from the
    // device and stays shown as ready. Start waits for the failed ones, which
    // only turn ready once the new engine is fully up.
    const voice = failed.some((id) => id !== 'gemma')
    const gemma = failed.includes('gemma')
    dispatchLoad({ type: 'retry', ids: failed })
    setAttempts((a) => ({ voice: a.voice + (voice ? 1 : 0), gemma: a.gemma + (gemma ? 1 : 0) }))
  }
  const device = useDeviceCheck()

  const FullPanel = devPanel === 'room' ? RoomPreview : devPanel === 'avatar' ? AvatarPreview : null
  if (FullPanel) {
    return (
      <Suspense fallback={null}>
        <FullPanel />
      </Suspense>
    )
  }
  const DevPanel =
    devPanel === 'gemma' ? GemmaTest : devPanel === 'setup' ? SetupPreview : devPanel === 'report' ? ReportPreview : null
  if (DevPanel) {
    return (
      <div className={devPanel === 'setup' ? 'app app--setup' : 'app'}>
        <main>
          <Suspense fallback={null}>
            <DevPanel />
          </Suspense>
        </main>
      </div>
    )
  }

  return (
    <div className={`app app--${state.screen}`}>
      <main>
        {state.screen === 'home' && (
          <Home device={device} onChooseMode={(mode) => dispatch({ type: 'chooseMode', mode })} />
        )}
        {state.screen === 'setup' && state.mode && (
          <Setup
            mode={state.mode}
            display={state.display}
            settings={state.settings}
            practice={state.practice}
            load={load}
            onChooseDisplay={(display, interviewer) => dispatch({ type: 'chooseDisplay', display, interviewer })}
            onSettingsChange={(patch) => dispatch({ type: 'updateSettings', patch })}
            onStart={() => {
              // Opened inside the click: the browser needs a user gesture for
              // the microphone and for audio playback.
              void voiceControls()?.startListening()
              dispatch({ type: 'startInterview' })
            }}
            onBack={() => dispatch({ type: 'goHome' })}
            onRetry={retryFailed}
          />
        )}
        {state.screen === 'interview' && state.display && (
          <Interview
            display={state.display}
            settings={state.settings}
            practice={state.practice}
            onEnd={() => {
              // The report is made from the engine's records as they stand
              // and saved on the device; the screen reads it from memory at
              // once, so it does not wait for the save.
              const snapshot = currentSnapshot()
              if (!snapshot || !state.mode) return
              const report = createReport(snapshot, state.settings, state.mode, state.display!)
              if (import.meta.env.DEV) report.devTimeline = takeDevTimeline()
              void saveReport(report)
              stopInterview()
              dispatch({ type: 'finishInterview', reportId: report.id })
            }}
          />
        )}
        {state.screen === 'report' && (
          <Report
            reportId={state.reportId}
            onPracticeQuestion={(question) => dispatch({ type: 'practiceQuestion', question })}
            onPracticeAgain={() => dispatch({ type: 'practiceAgain' })}
            onHome={() => dispatch({ type: 'goHome' })}
          />
        )}
      </main>

      {/* Same position in the tree on setup and interview, so changing screen
          never remounts the engine (and never kills its workers). */}
      {isVoiceMounted(state) && (
        <VoiceHost
          display={state.display}
          mode={state.mode}
          interviewer={state.settings.interviewer}
          visible={state.screen === 'interview'}
          onLoad={dispatchLoad}
          voiceAttempt={attempts.voice}
          gemmaAttempt={attempts.gemma}
        />
      )}

      {/* On the home page the privacy line is part of the top section. */}
      {state.screen !== 'home' && (
        <footer>
          <PrivacyNote />
        </footer>
      )}
    </div>
  )
}

export default App
