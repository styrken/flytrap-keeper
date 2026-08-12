// What the 3D scene looks at: your own garden, or — while visiting — a
// friend's. Scene components read state through these hooks instead of
// useGame directly, so a visit swaps the whole diorama without touching the
// real save. While visiting, dispatch is a no-op: look, don't touch.
import { type Action, type GameState, toGameTime } from './sim'
import { useSocial } from './socialStore'
import { gameNow, useGame } from './store'

/** Read from the displayed garden — the visited one when a visit is on. */
export function useSceneState<T>(selector: (state: GameState) => T): T {
  const visitingState = useSocial((s) => s.visiting?.state ?? null)
  const ownValue = useGame((s) => selector(s.state))
  return visitingState ? selector(visitingState) : ownValue
}

export const useIsVisiting = (): boolean => useSocial((s) => s.visiting !== null)

const noop = () => {}

/** The real dispatcher at home; a polite refusal in someone else's room. */
export function useSceneDispatch(): (action: Action) => void {
  const visiting = useIsVisiting()
  const dispatch = useGame((s) => s.dispatch)
  return visiting ? noop : dispatch
}

/**
 * Dispatch that reports how many dewdrops the action actually paid out.
 * The sim silently pays nothing while a reward is on cooldown, so any float
 * label promising bubbles must ask this instead of quoting the config —
 * otherwise it promises drops the counter never receives. Always 0 while
 * visiting (dispatch is a no-op in someone else's room).
 */
export function useRewardDispatch(): (action: Action) => number {
  const visiting = useIsVisiting()
  const dispatch = useGame((s) => s.dispatch)
  if (visiting) return zeroReward
  return (action: Action) => {
    const before = useGame.getState().state.inventory.dewdrops
    dispatch(action)
    return useGame.getState().state.inventory.dewdrops - before
  }
}

const zeroReward = () => 0

/**
 * Game-clock "now" of the displayed garden (non-hook, safe in useFrame):
 * the visited garden runs on its owner's clock, speed mode and all.
 */
export function sceneNow(): number {
  const visiting = useSocial.getState().visiting
  return visiting ? toGameTime(visiting.state.time, Date.now()) : gameNow()
}
