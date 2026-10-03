// Can this browser run the models? Checked first thing on the home screen
// (UX.md: device check), so nobody finds out halfway through a download.
//
// Both modes need WebGPU. Heavy also needs `shader-f16`: Gemma 4 E2B runs as
// q4f16, half-precision maths on the GPU. Light (Gemma 3 1B, q4) does not.

export type DeviceCheck =
  | { status: 'checking' }
  | { status: 'unsupported'; reason: 'insecure' | 'no-webgpu' | 'no-adapter' | 'software-gpu' }
  | { status: 'ready'; heavy: boolean }

// Dev only: `?device=no-webgpu|no-adapter|software-gpu|no-f16` fakes a weaker
// device so every message can be seen on a laptop that has everything.
type Fake = 'no-webgpu' | 'no-adapter' | 'software-gpu' | 'no-f16'
function fakeFromUrl(): Fake | null {
  if (!import.meta.env.DEV) return null
  const value = new URLSearchParams(location.search).get('device')
  return value === 'no-webgpu' || value === 'no-adapter' || value === 'software-gpu' || value === 'no-f16'
    ? value
    : null
}

export async function checkDevice(): Promise<Exclude<DeviceCheck, { status: 'checking' }>> {
  const fake = fakeFromUrl()

  // WebGPU only exists on https or localhost.
  if (!window.isSecureContext) return { status: 'unsupported', reason: 'insecure' }
  if (fake === 'no-webgpu' || !navigator.gpu) return { status: 'unsupported', reason: 'no-webgpu' }

  let adapter: GPUAdapter | null = null
  try {
    adapter = await navigator.gpu.requestAdapter()
  } catch {
    adapter = null
  }
  if (fake === 'no-adapter' || !adapter) return { status: 'unsupported', reason: 'no-adapter' }

  // A software adapter (no real GPU, e.g. a VM or a blocklisted driver) would
  // load the models but take minutes per reply.
  if (fake === 'software-gpu' || adapter.info?.isFallbackAdapter) {
    return { status: 'unsupported', reason: 'software-gpu' }
  }

  const heavy = fake !== 'no-f16' && adapter.features.has('shader-f16')
  return { status: 'ready', heavy }
}
