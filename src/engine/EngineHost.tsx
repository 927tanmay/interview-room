import { lazy, Suspense } from 'react'
import type { Display, Mode } from '../app/state'
import { PhoneEngine } from './PhoneEngine'

// Only fetched when the candidate picks the video interview, so three.js and
// the avatar never load for a phone screen.
const VideoEngine = lazy(() => import('./VideoEngine'))

// The one place the voice engine lives. App mounts it once, at a fixed spot in
// its tree, from the display choice on the setup screen until the interview
// ends; it is hidden on setup (loading in the background) and shown as the
// stage on the interview screen. Both engines get the same interview logic;
// only what they draw differs. Placeholders until step 2.1.
export function EngineHost({ display, mode, visible }: { display: Display; mode: Mode; visible: boolean }) {
  return (
    <div className="engine-host" hidden={!visible}>
      {display === 'video' ? (
        <Suspense fallback={<div className="stage stage-video" aria-hidden="true" />}>
          <VideoEngine mode={mode} />
        </Suspense>
      ) : (
        <PhoneEngine mode={mode} />
      )}
    </div>
  )
}
