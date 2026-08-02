import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { Diorama } from './scene/Diorama'
import { Hud } from './ui/Hud'

export default function App() {
  return (
    <div className="app">
      <Canvas camera={{ position: [2.4, 1.7, 3.4], fov: 42 }} dpr={[1, 2]}>
        <color attach="background" args={['#ead9c2']} />
        <ambientLight intensity={0.85} />
        <directionalLight position={[3, 5, 2]} intensity={1.4} />
        <directionalLight position={[-3, 2, -2]} intensity={0.35} />
        <Suspense fallback={null}>
          <Diorama />
        </Suspense>
        <OrbitControls
          target={[0, 0.7, 0]}
          enablePan={false}
          minDistance={2.2}
          maxDistance={5}
          minPolarAngle={0.7}
          maxPolarAngle={1.5}
          minAzimuthAngle={-0.85}
          maxAzimuthAngle={0.85}
        />
      </Canvas>
      <Hud />
    </div>
  )
}
