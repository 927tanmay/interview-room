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
  // Null until picked on the setup screen. Picking it starts loading the
  // models, and it cannot change after that (UX.md: downloads).
  display: Display | null
}

export type AppAction =
  | { type: 'chooseMode'; mode: Mode }
  | { type: 'chooseDisplay'; display: Display }
  | { type: 'startInterview' }
  | { type: 'finishInterview' }
  | { type: 'practiseAgain' }
  | { type: 'goHome' }

export const initialState: AppState = { screen: 'home', mode: null, display: null }

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'chooseMode':
      return { ...state, mode: action.mode, display: null, screen: 'setup' }
    case 'chooseDisplay':
      return state.display ? state : { ...state, display: action.display }
    case 'startInterview':
      return state.mode && state.display ? { ...state, screen: 'interview' } : state
    case 'finishInterview':
      return { ...state, screen: 'report' }
    case 'practiseAgain':
      return { ...state, display: null, screen: 'setup' }
    case 'goHome':
      return { ...state, display: null, screen: 'home' }
  }
}

// The voice engine (react-ai-voice-avatar) owns its workers and kills them on
// unmount, so it is mounted once, from the display choice until the interview
// ends, and the screens change around it.
export function isEngineMounted(state: AppState): state is AppState & { display: Display; mode: Mode } {
  return (
    state.display !== null &&
    state.mode !== null &&
    (state.screen === 'setup' || state.screen === 'interview')
  )
}
