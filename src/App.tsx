import { lazy, Suspense, useReducer } from 'react'
import { appReducer, initialState, isEngineMounted } from './app/state'
import { useDeviceCheck } from './app/useDeviceCheck'
import { PrivacyNote } from './components/PrivacyNote'
import { EngineHost } from './engine/EngineHost'
import { loadReducer } from './engine/loading'
import { Home } from './screens/Home'
import { Interview } from './screens/Interview'
import { Report } from './screens/Report'
import { Setup } from './screens/Setup'

// Dev-only test panels (`?dev=gemma`); the import is dropped from production.
const GemmaTest = import.meta.env.DEV ? lazy(() => import('./dev/GemmaTest')) : null
const devPanel = import.meta.env.DEV ? new URLSearchParams(location.search).get('dev') : null

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const [load, dispatchLoad] = useReducer(loadReducer, {})
  const device = useDeviceCheck()

  if (GemmaTest && devPanel === 'gemma') {
    return (
      <div className="app">
        <main>
          <Suspense fallback={null}>
            <GemmaTest />
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
            load={load}
            onChooseDisplay={(display) => dispatch({ type: 'chooseDisplay', display })}
            onStart={() => dispatch({ type: 'startInterview' })}
            onBack={() => dispatch({ type: 'goHome' })}
          />
        )}
        {state.screen === 'interview' && state.display && (
          <Interview
            display={state.display}
            onEnd={() => dispatch({ type: 'finishInterview' })}
          />
        )}
        {state.screen === 'report' && (
          <Report
            onPractiseAgain={() => dispatch({ type: 'practiseAgain' })}
            onHome={() => dispatch({ type: 'goHome' })}
          />
        )}
      </main>

      {/* Same position in the tree on setup and interview, so changing screen
          never remounts the engine (and never kills its workers). */}
      {isEngineMounted(state) && (
        <EngineHost
          display={state.display}
          mode={state.mode}
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
