import { lazy, Suspense, useReducer } from 'react'
import { appReducer, initialState, isVoiceMounted } from './app/state'
import { useDeviceCheck } from './app/useDeviceCheck'
import { PrivacyNote } from './components/PrivacyNote'
import { VoiceHost } from './voice/VoiceHost'
import { loadReducer } from './voice/loading'
import { voiceControls } from './voice/voiceStore'
import { Home } from './screens/Home'
import { Interview } from './screens/Interview'
import { Report } from './screens/Report'
import { Setup } from './screens/Setup'

// Dev-only panels (`?dev=gemma`, `?dev=setup`, `?dev=room`, `?dev=avatar`); dropped from production.
const GemmaTest = import.meta.env.DEV ? lazy(() => import('./dev/GemmaTest')) : null
const SetupPreview = import.meta.env.DEV ? lazy(() => import('./dev/SetupPreview')) : null
const RoomPreview = import.meta.env.DEV ? lazy(() => import('./dev/RoomPreview')) : null
const AvatarPreview = import.meta.env.DEV ? lazy(() => import('./dev/AvatarPreview')) : null
const devPanel = import.meta.env.DEV ? new URLSearchParams(location.search).get('dev') : null

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const [load, dispatchLoad] = useReducer(loadReducer, {})
  const device = useDeviceCheck()

  const FullPanel = devPanel === 'room' ? RoomPreview : devPanel === 'avatar' ? AvatarPreview : null
  if (FullPanel) {
    return (
      <Suspense fallback={null}>
        <FullPanel />
      </Suspense>
    )
  }
  const DevPanel = devPanel === 'gemma' ? GemmaTest : devPanel === 'setup' ? SetupPreview : null
  if (DevPanel) {
    return (
      <div className="app">
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
          />
        )}
        {state.screen === 'interview' && state.display && (
          <Interview
            display={state.display}
            settings={state.settings}
            onEnd={() => dispatch({ type: 'finishInterview' })}
          />
        )}
        {state.screen === 'report' && (
          <Report
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
        />
      )}

      <footer>
        <PrivacyNote />
      </footer>
    </div>
  )
}

export default App
