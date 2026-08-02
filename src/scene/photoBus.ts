/**
 * Frame-exact bridge for the photo mode: the rig inside the Canvas registers
 * a capture function (render + read pixels in the same breath, so no
 * preserveDrawingBuffer cost), and the HUD button calls it at tap time.
 */
export const photoBus: { capture: (() => string) | null } = {
  capture: null,
}
