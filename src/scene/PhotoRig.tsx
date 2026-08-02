import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { photoBus } from './photoBus'

/** Lives inside the Canvas and lends the HUD a way to photograph the scene. */
export function PhotoRig() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    photoBus.capture = () => {
      // Render right before reading — the drawing buffer is only valid
      // immediately after a render, and this avoids preserveDrawingBuffer.
      gl.render(scene, camera)
      return gl.domElement.toDataURL('image/png')
    }
    return () => {
      photoBus.capture = null
    }
  }, [gl, scene, camera])
  return null
}
