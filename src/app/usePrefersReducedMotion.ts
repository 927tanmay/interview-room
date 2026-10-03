import { useSyncExternalStore } from 'react'

// UX.md: respect reduced motion, including for the avatar. Follows the system
// setting live, so turning it on mid-interview stops the gestures.
const query = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(query)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}
