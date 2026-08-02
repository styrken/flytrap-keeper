import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { playCatch, playOuch, playToast } from '../audio'
import { useGame } from '../store'

/**
 * SNAP! — the arcade game on the desk computer that is definitely not for
 * games. A snake with the main game's own rules: you are a growing flytrap
 * tongue, the flies are food, the beetles are a mistake. Runs entirely in
 * the view; the sim only hears the final score and pays pocket money with
 * a daily lid.
 */
const GRID = 13
const CELL = 20
const TICK_MS = 150

type Cell = { x: number; y: number }
type Phase = 'ready' | 'running' | 'over'

const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y

export function ArcadeGame() {
  const { t } = useTranslation()
  const show = useGame((s) => s.showArcade)
  const setShow = useGame((s) => s.setShowArcade)
  const dispatch = useGame((s) => s.dispatch)
  const best = useGame((s) => s.state.arcade.best)

  const canvas = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<Phase>('ready')
  const [score, setScore] = useState(0)
  const [reward, setReward] = useState(0)

  const snake = useRef<Cell[]>([])
  const dir = useRef<Cell>({ x: 1, y: 0 })
  const nextDir = useRef<Cell>({ x: 1, y: 0 })
  const fly = useRef<Cell>({ x: 9, y: 6 })
  const beetles = useRef<Cell[]>([])
  const points = useRef(0)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const freeCell = useCallback((): Cell => {
    for (;;) {
      const cell = {
        x: Math.floor(Math.random() * GRID),
        y: Math.floor(Math.random() * GRID),
      }
      if (
        !snake.current.some((c) => same(c, cell)) &&
        !beetles.current.some((c) => same(c, cell)) &&
        !same(fly.current, cell)
      ) {
        return cell
      }
    }
  }, [])

  const start = useCallback(() => {
    snake.current = [
      { x: 6, y: 6 },
      { x: 5, y: 6 },
      { x: 4, y: 6 },
    ]
    dir.current = { x: 1, y: 0 }
    nextDir.current = { x: 1, y: 0 }
    beetles.current = []
    fly.current = { x: 9, y: 6 }
    beetles.current = [freeCell(), freeCell()]
    points.current = 0
    setScore(0)
    setReward(0)
    setPhase('running')
  }, [freeCell])

  const steer = useCallback((x: number, y: number) => {
    // no U-turns — the tongue is long, not double-jointed
    if (x === -dir.current.x && y === -dir.current.y) return
    nextDir.current = { x, y }
  }, [])

  // Keyboard: arrows and WASD while the dialog is open.
  useEffect(() => {
    if (!show) return
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key === 'arrowup' || key === 'w') steer(0, -1)
      else if (key === 'arrowdown' || key === 's') steer(0, 1)
      else if (key === 'arrowleft' || key === 'a') steer(-1, 0)
      else if (key === 'arrowright' || key === 'd') steer(1, 0)
      else if (key === ' ' || key === 'enter') {
        if (phase !== 'running') start()
        else return
      } else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [show, phase, start, steer])

  // The game loop.
  useEffect(() => {
    if (!show || phase !== 'running') return
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return

    const draw = () => {
      ctx.fillStyle = '#1c231a'
      ctx.fillRect(0, 0, GRID * CELL, GRID * CELL)
      // faint scanline grid for the retro feel
      ctx.fillStyle = 'rgba(255,255,255,0.025)'
      for (let y = 0; y < GRID; y += 2) ctx.fillRect(0, y * CELL, GRID * CELL, CELL)

      beetles.current.forEach((b) => {
        ctx.fillStyle = '#d2653c'
        ctx.fillRect(b.x * CELL + 3, b.y * CELL + 5, CELL - 6, CELL - 8)
        ctx.fillRect(b.x * CELL + 5, b.y * CELL + 2, 3, 4)
        ctx.fillRect(b.x * CELL + CELL - 8, b.y * CELL + 2, 3, 4)
      })

      const f = fly.current
      ctx.fillStyle = '#e8f0d8'
      ctx.fillRect(f.x * CELL + 6, f.y * CELL + 7, CELL - 12, CELL - 14)
      ctx.fillStyle = '#bcd4de'
      ctx.fillRect(f.x * CELL + 3, f.y * CELL + 4, 5, 4)
      ctx.fillRect(f.x * CELL + CELL - 8, f.y * CELL + 4, 5, 4)

      snake.current.forEach((c, i) => {
        ctx.fillStyle = i === 0 ? '#8fdd7a' : '#58b862'
        ctx.fillRect(c.x * CELL + 1, c.y * CELL + 1, CELL - 2, CELL - 2)
        if (i === 0) {
          ctx.fillStyle = '#1c231a'
          ctx.fillRect(c.x * CELL + 5, c.y * CELL + 5, 3, 3)
          ctx.fillRect(c.x * CELL + CELL - 8, c.y * CELL + 5, 3, 3)
        }
      })
    }

    const gameOver = () => {
      playOuch()
      setPhase('over')
      const finalScore = points.current
      if (finalScore > 0) {
        const before = useGame.getState().state.inventory.dewdrops
        dispatch({ type: 'arcadeScore', score: finalScore })
        const after = useGame.getState().state.inventory.dewdrops
        const paid = after - before
        setReward(paid)
        if (paid > 0) playToast()
      }
    }

    const step = () => {
      dir.current = nextDir.current
      const head = snake.current[0]
      const next = { x: head.x + dir.current.x, y: head.y + dir.current.y }
      const hitWall = next.x < 0 || next.y < 0 || next.x >= GRID || next.y >= GRID
      const hitSelf = snake.current.some((c) => same(c, next))
      const hitBeetle = beetles.current.some((c) => same(c, next))
      if (hitWall || hitSelf || hitBeetle) {
        gameOver()
        return
      }
      snake.current = [next, ...snake.current]
      if (same(next, fly.current)) {
        points.current += 1
        setScore(points.current)
        playCatch()
        fly.current = freeCell()
        // every fifth fly, the beetles wander somewhere new
        if (points.current % 5 === 0) beetles.current = [freeCell(), freeCell()]
      } else {
        snake.current = snake.current.slice(0, -1)
      }
      draw()
    }

    draw()
    const id = window.setInterval(step, TICK_MS)
    return () => window.clearInterval(id)
  }, [show, phase, dispatch, freeCell])

  if (!show) return null

  return (
    <div className="dialog-backdrop" onClick={() => setShow(false)}>
      <div className="dialog-card arcade-card" onClick={(e) => e.stopPropagation()}>
        <header className="dialog-head">
          <h2>🕹️ {t('arcade.title')}</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('settings.close')}
            onClick={() => setShow(false)}
          >
            ✕
          </button>
        </header>
        <p className="muted">{t('arcade.tagline')}</p>
        <div className="arcade-screen">
          <canvas
            ref={canvas}
            width={GRID * CELL}
            height={GRID * CELL}
            className="arcade-canvas"
            onTouchStart={(e) => {
              const touch = e.touches[0]
              touchStart.current = { x: touch.clientX, y: touch.clientY }
            }}
            onTouchEnd={(e) => {
              const from = touchStart.current
              touchStart.current = null
              if (!from) return
              const touch = e.changedTouches[0]
              const dx = touch.clientX - from.x
              const dy = touch.clientY - from.y
              if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return
              if (Math.abs(dx) > Math.abs(dy)) steer(Math.sign(dx), 0)
              else steer(0, Math.sign(dy))
            }}
          />
          {phase !== 'running' && (
            <div className="arcade-overlay">
              {phase === 'over' && (
                <p className="arcade-gameover">
                  {t('arcade.gameOver')}
                  {reward > 0 && <span className="arcade-reward">+{reward} 🫧</span>}
                </p>
              )}
              <button type="button" className="primary" onClick={start}>
                {phase === 'over' ? t('arcade.retry') : t('arcade.start')}
              </button>
            </div>
          )}
        </div>
        <div className="arcade-stats">
          <span>
            {t('arcade.score')}: <strong>{score}</strong>
          </span>
          <span>
            {t('arcade.best')}: <strong>{Math.max(best, score)}</strong>
          </span>
        </div>
        <p className="muted arcade-hint">{t('arcade.hint')}</p>
        <div className="arcade-dpad" aria-hidden="true">
          <button type="button" className="dpad-up" onClick={() => steer(0, -1)}>
            ▲
          </button>
          <button type="button" className="dpad-left" onClick={() => steer(-1, 0)}>
            ◀
          </button>
          <button type="button" className="dpad-right" onClick={() => steer(1, 0)}>
            ▶
          </button>
          <button type="button" className="dpad-down" onClick={() => steer(0, 1)}>
            ▼
          </button>
        </div>
      </div>
    </div>
  )
}
