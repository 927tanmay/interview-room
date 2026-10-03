import { useReducer } from 'react'
import { appReducer, initialState, isEngineMounted } from './app/state'
import { PrivacyNote } from './components/PrivacyNote'
import { EngineHost } from './engine/EngineHost'
import { Home } from './screens/Home'
import { Interview } from './screens/Interview'
import { Report } from './screens/Report'
import { Setup } from './screens/Setup'

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return (
    <div className={`app app--${state.screen}`}>
      <main>
        {state.screen === 'home' && (
          <Home onChooseMode={(mode) => dispatch({ type: 'chooseMode', mode })} />
        )}
        {state.screen === 'setup' && state.mode && (
          <Setup
            mode={state.mode}
            display={state.display}
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
        />
      )}

      <footer>
        <PrivacyNote />
      </footer>
    </div>
  )
}

export default App
