import { useEffect, useState } from 'react'
import { checkDevice, type DeviceCheck } from './device'

// Runs the device check once when the app opens.
export function useDeviceCheck(): DeviceCheck {
  const [result, setResult] = useState<DeviceCheck>({ status: 'checking' })

  useEffect(() => {
    let live = true
    checkDevice().then((r) => {
      if (live) setResult(r)
    })
    return () => {
      live = false
    }
  }, [])

  return result
}
