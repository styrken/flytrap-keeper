// All sound — effects and background music alike — is synthesized with the
// Web Audio API: no asset files, and every call is safe to make anywhere. It
// silently does nothing when audio is unavailable, locked, or muted in
// settings.
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
export const playBoing = () => blip(150, 520, 0.22, 'triangle', 0.12)
export const playCroak = () => {
  blip(150, 95, 0.14, 'square', 0.08)
  window.setTimeout(() => blip(125, 82, 0.2, 'square', 0.07), 150)
}
export const playMeow = () => {
  blip(460, 780, 0.16, 'triangle', 0.07)
  window.setTimeout(() => blip(740, 420, 0.22, 'triangle', 0.06), 150)
}
export const playPurr = () => blip(88, 62, 0.4, 'sawtooth', 0.045)
export const playChirp = () => {
  blip(1900, 2400, 0.08, 'sine', 0.06)
  window.setTimeout(() => blip(2200, 1700, 0.1, 'sine', 0.05), 110)
  window.setTimeout(() => blip(1800, 2600, 0.12, 'sine', 0.05), 260)
}
export const playSnuffle = () => {
  blip(180, 120, 0.09, 'sawtooth', 0.04)
  window.setTimeout(() => blip(200, 130, 0.11, 'sawtooth', 0.04), 130)
}
export const playBuzz = () => {
  blip(230, 210, 0.16, 'sawtooth', 0.045)
  window.setTimeout(() => blip(250, 200, 0.2, 'sawtooth', 0.04), 170)
}
export const playSplash = () => blip(700, 200, 0.2, 'triangle', 0.1)
export const playToast = () => {
  blip(880, 1320, 0.16, 'sine', 0.1)
  window.setTimeout(() => blip(1100, 1650, 0.14, 'sine', 0.08), 110)
}
/** The radio's three-note station jingle before the weather. */
export const playJingle = () => {
  blip(660, 660, 0.1, 'triangle', 0.09)
  window.setTimeout(() => blip(880, 880, 0.1, 'triangle', 0.09), 120)
  window.setTimeout(() => blip(990, 1320, 0.16, 'triangle', 0.08), 240)
}
/** A soft snow pouf — packing another ball onto the snowman. */
export const playPouf = () => blip(240, 90, 0.18, 'triangle', 0.09)

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

// --- Calm background music ---------------------------------------------------
// A tiny generative lullaby, synthesized like everything else: warm pad chords
// drifting through I–vi–IV–V in C major with sparse music-box plucks from the
// pentatonic scale, softened by a lowpass filter. Because the notes are placed
// with a little randomness the loop never repeats exactly. Plays only while
// both the master sound toggle and the music toggle are on.

const midiHz = (note: number) => 440 * 2 ** ((note - 69) / 12)

/** Cmaj7 → Am7 → Fmaj7 → G6, voiced close together for smooth motion. */
const PAD_CHORDS = [
  [48, 55, 64, 71],
  [45, 55, 64, 72],
  [41, 57, 64, 72],
  [43, 55, 62, 71],
]
/** C-major pentatonic, one high octave — the music-box register. */
const PLUCK_NOTES = [72, 74, 76, 79, 81, 84]
const CHORD_SECONDS = 8
const MUSIC_LEVEL = 0.055

let musicOut: GainNode | null = null
let musicFilter: BiquadFilterNode | null = null
let musicTimer: number | undefined
let nextChordAt = 0
let chordIndex = 0
let lastPluckIndex = -1

const musicOn = () => {
  const { sound, music } = useGame.getState().state.settings
  return sound && music
}

function schedulePad(c: AudioContext, out: AudioNode, when: number, notes: number[]) {
  // The long release overlaps the next chord, so pads melt into each other.
  const end = when + CHORD_SECONDS + 2.5
  notes.forEach((note, i) => {
    const osc = c.createOscillator()
    osc.type = i === 0 ? 'sine' : 'triangle'
    osc.frequency.value = midiHz(note)
    // A whisper of detune keeps the loop from sounding machine-perfect.
    osc.detune.value = (Math.random() - 0.5) * 6
    const gain = c.createGain()
    const peak = i === 0 ? 0.3 : 0.16
    gain.gain.setValueAtTime(0.0001, when)
    gain.gain.exponentialRampToValueAtTime(peak, when + 2.5)
    gain.gain.setValueAtTime(peak, when + CHORD_SECONDS - 0.5)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)
    osc.connect(gain)
    gain.connect(out)
    osc.start(when)
    osc.stop(end + 0.05)
  })
}

function schedulePlucks(c: AudioContext, out: AudioNode, when: number) {
  const count = 1 + Math.floor(Math.random() * 2)
  for (let i = 0; i < count; i++) {
    let idx = Math.floor(Math.random() * PLUCK_NOTES.length)
    if (idx === lastPluckIndex) idx = (idx + 1) % PLUCK_NOTES.length
    lastPluckIndex = idx
    const at = when + 0.5 + Math.random() * (CHORD_SECONDS - 2.5)
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = midiHz(PLUCK_NOTES[idx])
    const gain = c.createGain()
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.2, at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 2)
    osc.connect(gain)
    gain.connect(out)
    osc.start(at)
    osc.stop(at + 2.1)
  }
}

function startMusic(c: AudioContext) {
  if (musicOut) return
  musicFilter = c.createBiquadFilter()
  musicFilter.type = 'lowpass'
  musicFilter.frequency.value = 2200
  musicOut = c.createGain()
  musicOut.gain.setValueAtTime(0.0001, c.currentTime)
  musicOut.gain.exponentialRampToValueAtTime(MUSIC_LEVEL, c.currentTime + 3)
  musicFilter.connect(musicOut)
  musicOut.connect(c.destination)
  chordIndex = 0
  nextChordAt = c.currentTime + 0.15
  // Lookahead scheduler: top up a few seconds of music every second, so
  // playback survives background-tab timer throttling.
  const schedule = () => {
    if (!musicFilter) return
    while (nextChordAt < c.currentTime + 4) {
      schedulePad(c, musicFilter, nextChordAt, PAD_CHORDS[chordIndex])
      schedulePlucks(c, musicFilter, nextChordAt)
      chordIndex = (chordIndex + 1) % PAD_CHORDS.length
      nextChordAt += CHORD_SECONDS
    }
  }
  schedule()
  musicTimer = window.setInterval(schedule, 1000)
}

function stopMusic() {
  window.clearInterval(musicTimer)
  musicTimer = undefined
  const out = musicOut
  const filter = musicFilter
  musicOut = null
  musicFilter = null
  if (!out || !ctx) return
  try {
    // Fade out, then drop the whole subgraph; scheduled oscillators still
    // stop themselves at their programmed times.
    out.gain.cancelScheduledValues(ctx.currentTime)
    out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), ctx.currentTime)
    out.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6)
    window.setTimeout(() => {
      try {
        filter?.disconnect()
        out.disconnect()
      } catch {
        // already gone
      }
    }, 700)
  } catch {
    // audio is garnish, never a crash
  }
}

/** Start or stop the background music to match the current settings. */
export function syncMusic() {
  try {
    if (musicOn()) {
      const c = getCtx()
      if (c) startMusic(c)
    } else {
      stopMusic()
    }
  } catch {
    // audio is garnish, never a crash
  }
}

/**
 * Kick music off on the first tap (browsers lock audio until a gesture) and
 * follow the sound/music toggles from then on.
 */
export function initMusic() {
  if (typeof window === 'undefined') return
  window.addEventListener('pointerdown', () => syncMusic(), { once: true })
  useGame.subscribe((current, previous) => {
    const a = current.state.settings
    const b = previous.state.settings
    if (a.sound !== b.sound || a.music !== b.music) syncMusic()
  })
}

/** Browsers lock audio until a user gesture — unlock on the first tap. */
export function initAudioUnlock() {
  if (typeof window === 'undefined') return
  window.addEventListener('pointerdown', () => void getCtx(), { once: true })
}
