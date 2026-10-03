import type { DeviceCheck } from '../app/device'
import { downloadsFor, formatBytes, totalBytes } from '../app/downloads'
import type { Mode } from '../app/state'
import { DownloadList } from '../components/DownloadList'
import { ScreenFrame } from '../components/ScreenFrame'

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

// Step 1.5 adds the fallback to Light when Heavy fails to load.
export function Home({ device, onChooseMode }: { device: DeviceCheck; onChooseMode: (mode: Mode) => void }) {
  const ready = device.status === 'ready'
  const heavyAllowed = ready && device.heavy
  const lightTotal = formatBytes(totalBytes(downloadsFor('light')))
  const heavyTotal = formatBytes(totalBytes(downloadsFor('heavy')))

  return (
    <ScreenFrame title="Interview Room">
      <p className="lede">
        A mock interviewer that listens to your answers, asks a follow-up on what you said, and
        gives you a report at the end.
      </p>

      <section aria-labelledby="device-title" className="panel" aria-live="polite">
        <h2 id="device-title">Your device</h2>
        {device.status === 'checking' && <p className="muted">Checking what this browser can run…</p>}
        {device.status === 'ready' && (
          <p className="muted">
            {device.heavy
              ? 'Ready. This browser can run both modes on your graphics chip.'
              : "Ready for Light mode. Heavy mode needs half-precision support on the graphics chip (shader-f16), which this one doesn't have."}
          </p>
        )}
        {device.status === 'unsupported' && (
          <div className="notice">
            <p className="notice-title">{UNSUPPORTED[device.reason].title}</p>
            <p>{UNSUPPORTED[device.reason].body}</p>
          </div>
        )}
      </section>

      <section aria-labelledby="mode-title" className="panel">
        <h2 id="mode-title">Choose a mode</h2>
        <p className="muted">
          Nothing downloads yet: that starts once you choose a video interview or a phone screen
          on the next page. The models are kept on this device after the first time.
        </p>
        <div className="mode-options">
          <button
            type="button"
            className="mode-option"
            disabled={!ready}
            onClick={() => onChooseMode('light')}
          >
            <span className="mode-name">Light</span>
            <span className="mode-detail">
              Gemma 3 1B. For slower laptops or connections. About {lightTotal} the first
              time.
            </span>
          </button>
          <button
            type="button"
            className="mode-option"
            disabled={!heavyAllowed}
            aria-describedby={ready && !heavyAllowed ? 'heavy-unavailable' : undefined}
            onClick={() => onChooseMode('heavy')}
          >
            <span className="mode-name">Heavy</span>
            <span className="mode-detail">
              Gemma 4 E2B. Better follow-ups and a deeper review. About {heavyTotal} the first
              time.
            </span>
            {ready && !heavyAllowed && (
              <span id="heavy-unavailable" className="mode-detail">
                Not available on this device (needs shader-f16).
              </span>
            )}
          </button>
        </div>
        <DownloadList />
      </section>
    </ScreenFrame>
  )
}
