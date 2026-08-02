// All sound is synthesized with the Web Audio API — no asset files, and every
// call is safe to make anywhere: it silently does nothing when audio is
// unavailable, locked, or muted in settings.
import { useGame } from './store'

let ctx: AudioContext | null = null
let rainSource: AudioBufferSourceNode | null = null
let rainGain: GainNode | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  try {
    if (!ctx) ctx = new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

const soundOn = () => useGame.getState().state.settings.sound

function blip(
  freqFrom: number,
  freqTo: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.15,
) {
  if (!soundOn()) return
  const c = getCtx()
  if (!c) return
  try {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freqFrom, c.currentTime)
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), c.currentTime + duration)
    gain.gain.setValueAtTime(volume, c.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start()
    osc.stop(c.currentTime + duration + 0.02)
  } catch {
    // audio is garnish, never a crash
  }
}

export const playSnap = () => blip(320, 60, 0.12, 'square', 0.2)
export const playPet = () => blip(660, 920, 0.1, 'sine', 0.07)
export const playTease = () => blip(220, 140, 0.06, 'square', 0.05)
export const playCatch = () => {
  blip(520, 880, 0.14, 'sine', 0.15)
  window.setTimeout(() => blip(660, 1040, 0.12, 'sine', 0.12), 90)
}
export const playOuch = () => blip(200, 70, 0.25, 'sawtooth', 0.14)
export const playSplash = () => blip(700, 200, 0.2, 'triangle', 0.1)
export const playToast = () => {
  blip(880, 1320, 0.16, 'sine', 0.1)
  window.setTimeout(() => blip(1100, 1650, 0.14, 'sine', 0.08), 110)
}

/** Soft brown-noise loop while it rains. */
export function setRainAmbience(on: boolean) {
  const c = getCtx()
  if (!c) return
  try {
    if (on && soundOn()) {
      if (rainSource) return
      const buffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate)
      const data = buffer.getChannelData(0)
      let last = 0
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1
        last = (last + 0.02 * white) / 1.02
        data[i] = last * 3.5
      }
      rainSource = c.createBufferSource()
      rainSource.buffer = buffer
      rainSource.loop = true
      const filter = c.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 600
      rainGain = c.createGain()
      rainGain.gain.value = 0.045
      rainSource.connect(filter)
      filter.connect(rainGain)
      rainGain.connect(c.destination)
      rainSource.start()
    } else {
      rainSource?.stop()
      rainSource?.disconnect()
      rainGain?.disconnect()
      rainSource = null
      rainGain = null
    }
  } catch {
    rainSource = null
    rainGain = null
  }
}

/** Browsers lock audio until a user gesture — unlock on the first tap. */
export function initAudioUnlock() {
  if (typeof window === 'undefined') return
  window.addEventListener('pointerdown', () => void getCtx(), { once: true })
}
