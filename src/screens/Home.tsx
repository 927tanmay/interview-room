import { useEffect, useRef, useState } from 'react'
import ananya from '../assets/ananya.webp'
import type { DeviceCheck } from '../app/device'
import { downloadsFor, formatBytes, HEAVY_AVAILABLE, totalBytes } from '../app/downloads'
import type { Mode } from '../app/state'
import { DownloadList } from '../components/DownloadList'

const UNSUPPORTED: Record<Extract<DeviceCheck, { status: 'unsupported' }>['reason'], { title: string; body: string }> = {
  insecure: {
    title: 'This page needs a secure connection',
    body: 'The models only run on a page opened over https. Open Interview Room from its https link.',
  },
  'no-webgpu': {
    title: "This browser can't run the interviewer",
    body: 'Interview Room runs its models on your graphics chip through WebGPU, which this browser does not offer. Open it in a recent Chrome or Edge on a laptop or desktop.',
  },
  'no-adapter': {
    title: "Your graphics chip isn't available to the browser",
    body: 'This browser supports WebGPU but could not reach the graphics chip. Make sure hardware acceleration is on in the browser settings, update the browser, then reload.',
  },
  'software-gpu': {
    title: 'This device is too slow for the interviewer',
    body: 'The browser is drawing without a real graphics chip, so each reply would take minutes. Try a laptop or desktop with hardware acceleration turned on.',
  },
}

const POINTS = [
  { icon: 'voice', title: 'Talks with you', body: 'A spoken interview, out loud, with pauses to think.' },
  { icon: 'follow', title: 'Follows up on what you said', body: 'One question back on your own answer, like a real interviewer.' },
  { icon: 'device', title: 'Never leaves your laptop', body: 'Everything runs in this browser. Nothing you say is uploaded.' },
] as const

// The home page: what this is, what you get (a still of the interview room),
// and the one choice to make, Light or Heavy, with what it downloads.
// Choosing does not download anything; that starts on the setup page once
// video or phone is picked (UX.md: downloads).
export function Home({ device, onChooseMode }: { device: DeviceCheck; onChooseMode: (mode: Mode) => void }) {
  const ready = device.status === 'ready'
  const [mode, setMode] = useState<Mode>('light')
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])


  return (
    <div className="home">
      <section className="hero" aria-labelledby="screen-title">
        <div className="hero-text">
          <DeviceChip device={device} />
          <h1 id="screen-title" ref={heading} tabIndex={-1}>
            Interview Room
          </h1>
          <p className="hero-lede">Practice a real interview out loud, then look back at what you said.</p>
          {/* Phone-sized touch screens only (CSS). */}
          <p className="phone-note">
            Built for a laptop. On a phone it would download{' '}
            {formatBytes(totalBytes(downloadsFor('light')))} and probably can't run it.
          </p>
          <ul className="hero-points">
            {POINTS.map((p) => (
              <li key={p.icon}>
                <Icon name={p.icon} />
                <span className="point-title">{p.title}</span>
                <span className="point-body">{p.body}</span>
              </li>
            ))}
          </ul>
        </div>

        <figure className="hero-room glass" aria-label="A still of the interview room: Ananya asking a question">
          <img src={ananya} alt="" width={600} height={801} />
          <span className="state hero-state">Listening</span>
          <figcaption className="hero-question">
            <span className="label">Question 2 of 5</span>
            Tell me about a time you improved something that was not working well.
          </figcaption>
        </figure>
      </section>

      {device.status === 'unsupported' && (
        <div className="notice home-notice" role="alert">
          <p className="notice-title">{UNSUPPORTED[device.reason].title}</p>
          <p>{UNSUPPORTED[device.reason].body}</p>
        </div>
      )}

      <form
        className="mode-panel glass"
        onSubmit={(e) => {
          e.preventDefault()
          if (ready) onChooseMode(mode)
        }}
      >
        <div className="mode-main">
          <fieldset className="mode-cards" disabled={!ready}>
            <legend>Choose how it runs</legend>
            <ModeCard
              value="light"
              checked={mode === 'light'}
              onChange={setMode}
              name="Light"
              model="Gemma 3 1B"
              detail="Runs on most laptops. Plainer follow-ups."
              size={formatBytes(totalBytes(downloadsFor('light')))}
            />
            <ModeCard
              value="heavy"
              checked={mode === 'heavy'}
              onChange={setMode}
              name="Heavy"
              model="Gemma 4 E2B"
              detail="Sharper follow-ups. Needs a stronger graphics chip."
              size={formatBytes(totalBytes(downloadsFor('heavy')))}
              unavailable={
                !HEAVY_AVAILABLE
                  ? 'Coming soon'
                  : ready && !device.heavy
                    ? 'Not available on this device (needs shader-f16)'
                    : undefined
              }
            />
          </fieldset>

          <DownloadList mode={mode} />

          <div className="mode-footer">
            <p className="muted mode-note">
              Downloaded once, then kept on this device. Nothing downloads until you pick video or phone on the
              next step.
            </p>
            <button type="submit" className="primary big" disabled={!ready}>
              Continue with {mode === 'light' ? 'Light' : 'Heavy'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function DeviceChip({ device }: { device: DeviceCheck }) {
  const text =
    device.status === 'checking'
      ? 'Checking this browser…'
      : device.status === 'unsupported'
        ? "Can't run on this browser"
        : 'Ready on this device'
  return (
    <p className={`device-chip device-${device.status}`} role="status" aria-live="polite">
      <span className="device-dot" aria-hidden="true" />
      {text}
    </p>
  )
}

function ModeCard({
  value,
  checked,
  onChange,
  name,
  model,
  detail,
  size,
  unavailable,
}: {
  value: Mode
  checked: boolean
  onChange: (mode: Mode) => void
  name: string
  model: string
  detail: string
  size: string
  unavailable?: string
}) {
  return (
    <label className={`mode-card${unavailable ? ' mode-card-off' : ''}`}>
      <input
        type="radio"
        name="mode"
        value={value}
        checked={checked}
        disabled={!!unavailable}
        onChange={() => onChange(value)}
        aria-describedby={`mode-${value}-detail`}
      />
      <span className="mode-check" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="12" height="12">
          <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="mode-top">
        <span className="mode-name">{name}</span>
        {unavailable && <span className="mode-badge">{unavailable}</span>}
      </span>
      <span className="mode-size">{size}</span>
      <span className="mode-model" id={`mode-${value}-detail`}>
        {model}
        <span className="mode-detail">
          {' '}
          · {detail}
          {unavailable && unavailable !== 'Coming soon' && ` ${unavailable}.`}
        </span>
      </span>
    </label>
  )
}

function Icon({ name }: { name: 'voice' | 'follow' | 'device' }) {
  const paths = {
    // A speech bubble with sound lines.
    voice: 'M4 5.5h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM7 10.5h.01M10 10.5h.01M13 10.5h.01',
    // A reply arrow.
    follow: 'M9 6L4 11l5 5M4 11h9a6 6 0 0 1 6 6',
    // A laptop with a lock.
    device: 'M4 6h16v10H4zM2 19h20M12 9.5a1.6 1.6 0 0 1 1.6 1.6v.9h-3.2v-.9A1.6 1.6 0 0 1 12 9.5zM10 12h4v2.5h-4z',
  }
  return (
    <svg className="point-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d={paths[name]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
