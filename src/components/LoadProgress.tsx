import { formatBytes } from '../app/downloads'
import type { Mode } from '../app/state'
import { downloadFor, overallProgress, type LoadItem, type LoadItemId, type LoadState } from '../voice/loading'

function statusText(item: LoadItem, bytes: number): string {
  switch (item.phase) {
    case 'waiting':
      return 'Waiting'
    case 'downloading':
      return `Downloading, ${formatBytes((bytes * item.pct) / 100)} of ${formatBytes(bytes)}`
    case 'from-device':
      return 'Loading from this device'
    case 'ready':
      return 'Ready'
    case 'failed':
      return "Didn't finish loading"
  }
}

// What failed, in plain words. The package's own message goes to the console,
// not on screen.
const FAILED: Record<LoadItemId, string> = {
  whisper: "Speech recognition (Whisper) didn't finish loading, so the interviewer can't hear you yet.",
  kokoro:
    "The interviewer's voice (Kokoro) didn't finish loading. The interview won't start on a backup voice, so try again to get the real one.",
  gemma: "The interviewer (Gemma) didn't finish loading.",
  avatar: "The 3D avatar didn't finish loading.",
}

// One line for screen readers that changes only when a model changes phase,
// not on every percent.
function summary(state: LoadState): string {
  const items = Object.values(state)
  if (items.some((i) => i.phase === 'failed')) return 'A model could not load.'
  const ready = items.filter((i) => i.phase === 'ready').length
  if (ready === items.length) return 'Everything is ready.'
  return `${ready} of ${items.length} models ready.`
}

// Loading while the candidate fills in the setup: one compact area with the
// overall progress and what is loading now; each model's status on request.
// Once everything is ready it shrinks to one line.
export function LoadProgress({ mode, state, onRetry }: { mode: Mode; state: LoadState; onRetry: () => void }) {
  const ids = Object.keys(state) as LoadItemId[]
  const items = ids.map((id) => ({ id, item: state[id]!, d: downloadFor(id, mode) }))
  const ready = items.filter((x) => x.item.phase === 'ready').length
  const failed = items.filter((x) => x.item.phase === 'failed')
  const anyDownloading = items.some((x) => !x.item.cached)
  const pct = overallProgress(mode, state)
  const now = items.find((x) => x.item.phase === 'downloading' || x.item.phase === 'from-device') ?? items.find((x) => x.item.phase !== 'ready')

  if (items.length > 0 && ready === items.length) {
    return (
      <p className="load-done" aria-live="polite">
        <span className="load-tick" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="12" height="12">
            <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        Models ready <span className="muted">· kept on this device</span>
      </p>
    )
  }

  return (
    <div className="load-progress">
      <p className="sr-only" aria-live="polite">
        {summary(state)}
      </p>
      <div className="load-head">
        <span className="load-title">{failed.length ? 'A model could not load' : 'Loading models'}</span>
        <span className="load-count muted">
          {ready} of {items.length} ready · {pct}%
        </span>
      </div>
      <progress max={100} value={pct} aria-label={`Models: ${pct}% loaded`} />
      {failed.length > 0 && (
        <div className="load-failed" role="alert">
          {failed.map(({ id }) => (
            <p key={id}>{FAILED[id]}</p>
          ))}
          <p className="muted">
            This is usually a dropped connection. Files that finished are kept on this device, so trying again picks
            up where it stopped.
          </p>
          <button type="button" className="primary" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}
      {!failed.length && now && (
        <p className="muted load-now">
          {now.d.name} · {statusText(now.item, now.d.bytes)}
        </p>
      )}
      <details className="load-details">
        <summary>Each model</summary>
        <ul className="load-list">
          {items.map(({ id, item, d }) => (
            <li key={id} className={`load-${item.phase}`}>
              <span className="download-name">{d.name}</span>
              <span className="load-status">{statusText(item, d.bytes)}</span>
            </li>
          ))}
        </ul>
        <p className="muted load-note">
          {anyDownloading
            ? 'Everything is kept on this device after this, so next time it loads in seconds. '
            : 'Everything is already on this device. '}
          The ONNX runtime loads alongside; the voice detector (2 MB) loads when the microphone starts.
        </p>
      </details>
    </div>
  )
}
