import { useReducer } from 'react'
import { appReducer, initialState } from '../app/state'
import type { LoadState } from '../voice/loading'
import { Setup } from '../screens/Setup'

// Dev only (`?dev=setup`): the setup screen after Continue, with a sample
// loading state and no engine mounted, so the layout can be checked without
// downloading anything.
const SAMPLE_LOAD: LoadState = {
  whisper: { pct: 100, phase: 'ready', cached: true },
  kokoro: { pct: 100, phase: 'ready', cached: true },
  gemma: { pct: 42, phase: 'downloading', cached: false },
  avatar: { pct: 0, phase: 'waiting', cached: false },
}

export default function SetupPreview() {
  const [state, dispatch] = useReducer(appReducer, { ...initialState, mode: 'light', display: 'video', screen: 'setup' })
  return (
    <Setup
      mode="light"
      display={state.display}
      settings={state.settings}
      load={SAMPLE_LOAD}
      onChooseDisplay={() => {}}
      onSettingsChange={(patch) => dispatch({ type: 'updateSettings', patch })}
      onStart={() => {}}
      onBack={() => {}}
    />
  )
}
