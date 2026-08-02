import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { Diorama } from './scene/Diorama'
import { Lights } from './scene/Lights'
import { Player } from './scene/Player'
import { FLOOR_Y, HEAD_HEIGHT, SPAWN } from './scene/playerMovement'
import { useIsVisiting } from './sceneView'
import { FriendsDialog } from './ui/FriendsDialog'
import { Hud } from './ui/Hud'
import { TouchControls } from './ui/Joystick'
import { LexiconDialog } from './ui/LexiconDialog'
import { MoveHint } from './ui/MoveHint'
import { Onboarding } from './ui/Onboarding'
import { QuestsDialog } from './ui/QuestsDialog'
import { ConflictDialog, SettingsDialog } from './ui/SettingsDialog'
import { ShopDialog } from './ui/ShopDialog'
import { VisitHud } from './ui/VisitHud'

export default function App() {
  const visiting = useIsVisiting()
  return (
    <div className="app">
      <Canvas camera={{ position: [SPAWN.x, 1.35, SPAWN.z + 2.6], fov: 42 }} dpr={[1, 2]}>
        <color attach="background" args={['#ead9c2']} />
        <Lights />
        <Suspense fallback={null}>
          <Diorama />
        </Suspense>
        <Player />
        <OrbitControls
          makeDefault
          target={[SPAWN.x, FLOOR_Y + HEAD_HEIGHT, SPAWN.z]}
          enablePan={false}
          enableDamping
          dampingFactor={0.16}
          minDistance={1.7}
          maxDistance={7}
          minPolarAngle={0.7}
          maxPolarAngle={1.5}
          minAzimuthAngle={-1.45}
          maxAzimuthAngle={1.45}
        />
      </Canvas>
      {visiting ? <VisitHud /> : <Hud />}
      <TouchControls />
      <MoveHint />
      <Onboarding />
      <ShopDialog />
      <QuestsDialog />
      <LexiconDialog />
      <FriendsDialog />
      <SettingsDialog />
      <ConflictDialog />
    </div>
  )
}
