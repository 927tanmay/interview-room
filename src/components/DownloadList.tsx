import { DOWNLOADS, downloadsFor, formatBytes, totalBytes } from '../app/downloads'
import type { Mode } from '../app/state'

// What the chosen mode downloads the first time, shown before anything starts
// (UX.md: downloads): a bar of how the total splits across the models, then
// each model with what it does and its size, then the total. The avatar is
// listed apart, since only a video interview needs it. Shades of the one
// accent colour tell the models apart; the list carries the same facts in
// text, so the bar is decoration for screen readers.
export function DownloadList({ mode }: { mode: Mode }) {
  const items = [...downloadsFor(mode)].sort((a, b) => b.bytes - a.bytes)
  const total = totalBytes(items)
  const avatar = DOWNLOADS.find((d) => d.id === 'avatar')!
  const shade = (i: number) => Math.max(0.22, 1 - i * 0.2)

  return (
    <section className="downloads" aria-labelledby="downloads-title">
      <div className="downloads-head">
        <h3 id="downloads-title">What {mode === 'light' ? 'Light' : 'Heavy'} downloads</h3>
        <span className="downloads-total">{formatBytes(total)}</span>
      </div>
      <div className="downloads-bar" aria-hidden="true">
        {items.map((d, i) => (
          <span key={d.id} style={{ flexGrow: d.bytes, opacity: shade(i) }} />
        ))}
      </div>
      <ul className="downloads-list">
        {items.map((d, i) => (
          <li key={d.id}>
            <span className="downloads-swatch" style={{ opacity: shade(i) }} aria-hidden="true" />
            <span className="downloads-name">
              {d.name}
              <span className="downloads-job">{d.job}</span>
            </span>
            <span className="downloads-size">{formatBytes(d.bytes)}</span>
          </li>
        ))}
        <li className="downloads-extra">
          <span className="downloads-swatch" aria-hidden="true" />
          <span className="downloads-name">
            {avatar.name}
            <span className="downloads-job">Video interview only</span>
          </span>
          <span className="downloads-size">+{formatBytes(avatar.bytes)}</span>
        </li>
      </ul>
    </section>
  )
}
