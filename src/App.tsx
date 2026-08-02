import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { Diorama } from './scene/Diorama'
import { Lights } from './scene/Lights'
import { Hud } from './ui/Hud'
import { LexiconDialog } from './ui/LexiconDialog'
import { Onboarding } from './ui/Onboarding'
import { QuestsDialog } from './ui/QuestsDialog'
import { ConflictDialog, SettingsDialog } from './ui/SettingsDialog'
import { ShopDialog } from './ui/ShopDialog'

export default function App() {
  return (
    <div className="app">
      <Canvas camera={{ position: [2.4, 1.7, 3.4], fov: 42 }} dpr={[1, 2]}>
        <color attach="background" args={['#ead9c2']} />
        <Lights />
        <Suspense fallback={null}>
          <Diorama />
        </Suspense>
        <OrbitControls
          target={[0, 0.7, 0]}
          enablePan={false}
          minDistance={1.8}
          maxDistance={7}
          minPolarAngle={0.7}
          maxPolarAngle={1.5}
          minAzimuthAngle={-0.85}
          maxAzimuthAngle={0.85}
        />
      </Canvas>
      <Hud />
      <Onboarding />
      <ShopDialog />
      <QuestsDialog />
      <LexiconDialog />
      <SettingsDialog />
      <ConflictDialog />
    </div>
  )
}
