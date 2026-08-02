import { Vector3 } from 'three'

export const STAGE_SCALE = [0.55, 0.75, 1, 1.15]

/** Windowsill pot slots — plant i sits at POT_SLOTS[i]. */
export const POT_SLOTS: [number, number, number][] = [
  [0, 0.06, 0.05],
  [-0.82, 0.06, 0.1],
  [0.82, 0.06, 0.1],
]

/** Rosette slots for up to 5 flytrap traps: azimuth, outward tilt, stem length. */
export const STEM_LAYOUT = [
  { azimuth: 0.4, tilt: 0.12, len: 1 },
  { azimuth: 2.5, tilt: 0.5, len: 0.85 },
  { azimuth: 4.5, tilt: 0.48, len: 0.9 },
  { azimuth: 1.5, tilt: 0.62, len: 0.75 },
  { azimuth: 5.6, tilt: 0.6, len: 0.8 },
]

/** Where an insect hovers to tempt trap `trapIndex` of the plant in `slot`. */
export function trapApproachPoint(
  slot: number,
  trapIndex: number,
  stage: number,
  out = new Vector3(),
): Vector3 {
  const stem = STEM_LAYOUT[trapIndex % STEM_LAYOUT.length]
  const scale = STAGE_SCALE[Math.min(stage, STAGE_SCALE.length - 1)]
  const reach = 0.34 * stem.len + 0.1
  const bentX = -Math.sin(stem.tilt) * reach
  const bentY = Math.cos(stem.tilt) * reach
  const x = bentX * Math.cos(stem.azimuth)
  const z = -bentX * Math.sin(stem.azimuth)
  const base = POT_SLOTS[slot] ?? POT_SLOTS[0]
  out.set(x * scale + base[0], bentY * scale + 0.08 + base[1] + 0.32, z * scale + 0.14 + base[2])
  return out
}
