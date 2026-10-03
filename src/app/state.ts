import { DEFAULT_SETTINGS, normalise, type InterviewerId, type InterviewSettings } from '../interview/settings'

// App-level state: which screen is showing and what the candidate chose.
// Screens are switched here rather than by URL; there is nothing to link to
// inside an interview.

export type Mode = 'light' | 'heavy'
// How the interviewer appears. Same interview either way; only the display
// changes. 'video' shows the 3D avatar, 'phone' is voice only.
export type Display = 'video' | 'phone'
export type Screen = 'home' | 'setup' | 'interview' | 'report'

export type AppState = {
  screen: Screen
  mode: Mode | null
  // Null until picked on the setup screen. Picking it (with the interviewer,
  // whose avatar and voice load with it) starts loading the models, and it
  // cannot change after that (UX.md: downloads).
  display: Display | null
  settings: InterviewSettings
}

export type AppAction =
  | { type: 'chooseMode'; mode: Mode }
  | { type: 'chooseDisplay'; display: Display; interviewer: InterviewerId }
  | { type: 'updateSettings'; patch: Partial<InterviewSettings> }
  | { type: 'startInterview' }
  | { type: 'finishInterview' }
  | { type: 'practiceAgain' }
  | { type: 'goHome' }

export const initialState: AppState = { screen: 'home', mode: null, display: null, settings: DEFAULT_SETTINGS }

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'chooseMode':
      return { ...state, mode: action.mode, display: null, screen: 'setup' }
    case 'chooseDisplay':
      return state.display
        ? state
        : { ...state, display: action.display, settings: { ...state.settings, interviewer: action.interviewer } }
    case 'updateSettings': {
      // The interviewer is locked once the models start loading.
      const { interviewer: _locked, ...patch } = action.patch
      const next = state.display ? patch : action.patch
      return { ...state, settings: normalise({ ...state.settings, ...next }) }
    }
    case 'startInterview':
      return state.mode && state.display ? { ...state, screen: 'interview' } : state
    case 'finishInterview':
      return { ...state, screen: 'report' }
    case 'practiceAgain':
      return { ...state, display: null, screen: 'setup' }
    case 'goHome':
      return { ...state, display: null, screen: 'home' }
  }
}

// The voice engine (react-ai-voice-avatar) owns its workers and kills them on
// unmount, so it is mounted once, from the display choice until the interview
// ends, and the screens change around it.
export function isVoiceMounted(state: AppState): state is AppState & { display: Display; mode: Mode } {
  return (
    state.display !== null &&
    state.mode !== null &&
    (state.screen === 'setup' || state.screen === 'interview')
  )
}
