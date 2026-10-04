import { useReducer } from 'react'
import { appReducer, initialState } from '../app/state'
import type { LoadState } from '../voice/loading'
import { Setup } from '../screens/Setup'

// Dev only (`?dev=setup`): the setup screen with a sample loading state and no
// engine mounted, so the layout can be checked without downloading anything.
//   ?dev=setup               after Continue, models loading
//   ?dev=setup&load=ready    after Continue, everything ready
//   ?dev=setup&step=choose   the first step (display and interviewer)
const params = new URLSearchParams(location.search)

const LOADING: LoadState = {
  whisper: { pct: 100, phase: 'ready', cached: true },
  kokoro: { pct: 100, phase: 'ready', cached: true },
  gemma: { pct: 42, phase: 'downloading', cached: false },
  avatar: { pct: 0, phase: 'waiting', cached: false },
}

const READY: LoadState = {
  whisper: { pct: 100, phase: 'ready', cached: true },
  kokoro: { pct: 100, phase: 'ready', cached: true },
  gemma: { pct: 100, phase: 'ready', cached: true },
  avatar: { pct: 100, phase: 'ready', cached: true },
}

export default function SetupPreview() {
  const choose = params.get('step') === 'choose'
  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    mode: 'light',
    display: choose ? null : 'video',
    screen: 'setup',
  })
  return (
    <Setup
      mode="light"
      display={state.display}
      settings={state.settings}
      load={params.get('load') === 'ready' ? READY : LOADING}
      onChooseDisplay={(display, interviewer) => dispatch({ type: 'chooseDisplay', display, interviewer })}
      onSettingsChange={(patch) => dispatch({ type: 'updateSettings', patch })}
      onStart={() => {}}
      onBack={() => {}}
    />
  )
}
