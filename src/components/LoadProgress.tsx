import { DOWNLOADS, formatBytes } from '../app/downloads'
import type { Mode } from '../app/state'
import type { LoadItem, LoadItemId, LoadState } from '../voice/loading'

function downloadFor(id: LoadItemId, mode: Mode) {
  const key = id === 'gemma' ? (mode === 'heavy' ? 'gemma-heavy' : 'gemma-light') : id
  return DOWNLOADS.find((d) => d.id === key)!
}

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
      return `Could not load: ${item.message ?? 'unknown error'}`
  }
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

// Real progress per model while the candidate fills in the setup (UX.md:
// downloads). Percentages come from the bytes the loaders report.
export function LoadProgress({ mode, state }: { mode: Mode; state: LoadState }) {
  const ids = Object.keys(state) as LoadItemId[]
  const anyDownloading = ids.some((id) => !state[id]!.cached)

  return (
    <div className="load-progress">
      <p className="sr-only" aria-live="polite">
        {summary(state)}
      </p>
      <ul className="load-list">
        {ids.map((id) => {
          const item = state[id]!
          const d = downloadFor(id, mode)
          return (
            <li key={id} className={`load-item load-${item.phase}`}>
              <div className="load-head">
                <span className="download-name">{d.name}</span>
                <span className="load-status">{statusText(item, d.bytes)}</span>
              </div>
              <progress max={100} value={item.pct} aria-label={`${d.name}: ${statusText(item, d.bytes)}`} />
            </li>
          )
        })}
      </ul>
      <p className="muted load-note">
        {anyDownloading
          ? 'Everything is kept on this device after this, so next time it loads in seconds. '
          : 'Everything is already on this device. '}
        The ONNX runtime loads alongside; the voice detector (2 MB) loads when the microphone
        starts.
      </p>
    </div>
  )
}
