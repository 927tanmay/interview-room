import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Box3, type PerspectiveCamera } from 'three'

// Frames the avatar as an interviewer across the table: head, shoulders and
// upper chest, centred, whatever the stage's shape. The package draws the
// avatar life-size (about 1.7 m, feet at 0), so a fixed camera either shows the
// legs or cuts off the head. Measured from the model once it is in the scene,
// and again whenever the stage is resized (off stage on setup, then beside the
// interview).
export function HeadShot({ ready }: { ready: boolean }) {
  const { scene, camera, size, invalidate } = useThree()

  useEffect(() => {
    if (!ready || size.width === 0 || size.height === 0) return
    // Next frame: the mesh has just been added to the scene.
    const id = requestAnimationFrame(() => {
      const box = new Box3().setFromObject(scene)
      if (box.isEmpty()) return
      const height = box.max.y - box.min.y
      // From a little above the head to the upper chest.
      const top = box.max.y + height * 0.04
      const bottom = box.max.y - height * 0.36
      const centerY = (top + bottom) / 2
      const halfHeight = (top - bottom) / 2
      // Shoulders are about a quarter of the body height across.
      const halfWidth = height * 0.135

      const cam = camera as PerspectiveCamera
      const vHalf = (cam.fov * Math.PI) / 360
      const hHalf = Math.atan(Math.tan(vHalf) * cam.aspect)
      const distance = Math.max(halfHeight / Math.tan(vHalf), halfWidth / Math.tan(hHalf))

      const cx = (box.min.x + box.max.x) / 2
      const cz = (box.min.z + box.max.z) / 2
      cam.position.set(cx, centerY, cz + distance)
      cam.lookAt(cx, centerY, cz)
      cam.updateProjectionMatrix()
      invalidate()
    })
    return () => cancelAnimationFrame(id)
  }, [ready, scene, camera, size.width, size.height, invalidate])

  return null
}
