import { Vector3 } from 'three'

export const STAGE_SCALE = [0.55, 0.75, 1, 1.15]

/** Rosette slots for up to 5 traps: azimuth around the pot, outward tilt, stem length. */
export const STEM_LAYOUT = [
  { azimuth: 0.4, tilt: 0.12, len: 1 },
  { azimuth: 2.5, tilt: 0.5, len: 0.85 },
  { azimuth: 4.5, tilt: 0.48, len: 0.9 },
  { azimuth: 1.5, tilt: 0.62, len: 0.75 },
  { azimuth: 5.6, tilt: 0.6, len: 0.8 },
]

/** World position of the plant group inside the diorama (pot group + plant offset). */
export const PLANT_WORLD_BASE = new Vector3(0, 0.38, 0.05)

/** Where an insect hovers to tempt trap `index` — diorama-world coordinates. */
export function trapApproachPoint(index: number, stage: number, out = new Vector3()): Vector3 {
  const slot = STEM_LAYOUT[index % STEM_LAYOUT.length]
  const scale = STAGE_SCALE[Math.min(stage, STAGE_SCALE.length - 1)]
  const reach = 0.34 * slot.len + 0.1
  const bentX = -Math.sin(slot.tilt) * reach
  const bentY = Math.cos(slot.tilt) * reach
  const x = bentX * Math.cos(slot.azimuth)
  const z = -bentX * Math.sin(slot.azimuth)
  out.set(x * scale, bentY * scale + 0.08, z * scale + 0.14)
  return out.add(PLANT_WORLD_BASE)
}
