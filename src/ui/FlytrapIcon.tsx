import { palette } from '../scene/palette'

const CREAM = '#f3efdf'
const TRAP_SHADE = '#4da457'

// [x, y, w, h, fill] on a 16x16 pixel grid — jaws open upward, teeth bared.
const PIXELS: [number, number, number, number, string][] = [
  [4, 1, 6, 1, palette.trap],
  [3, 2, 8, 1, palette.trap],
  [3, 3, 2, 1, palette.trap],
  [9, 3, 2, 1, palette.trap],
  [5, 3, 1, 1, CREAM],
  [7, 3, 1, 1, CREAM],
  [4, 4, 6, 1, palette.mouth],
  [4, 5, 6, 1, palette.trap],
  [5, 5, 1, 1, CREAM],
  [8, 5, 1, 1, CREAM],
  [4, 6, 6, 1, palette.trap],
  [4, 7, 6, 1, TRAP_SHADE],
  [7, 8, 1, 3, palette.stem],
  [5, 9, 2, 1, palette.trap],
  [4, 11, 8, 1, palette.potRim],
  [5, 12, 6, 3, palette.pot],
]

/** A blocky Venus flytrap in the game palette — no emoji font can misread it as a mousetrap. */
export function FlytrapIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="flytrap-icon"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {PIXELS.map(([x, y, w, h, fill], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
      ))}
    </svg>
  )
}
