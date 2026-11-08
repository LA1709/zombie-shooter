import { useCallback, useEffect, useRef, useState } from 'react'
import { GameEngine } from '../game/GameEngine'
import type { GameSnapshot } from '../game/types'
import { Hud } from './Hud'
import {
  GameOverScreen,
  OverrunFlash,
  PauseScreen,
  StartScreen,
  WaveBanner,
} from './Overlays'

export function GameStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [engine, setEngine] = useState<GameEngine | null>(null)
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const game = new GameEngine(canvas)
    setEngine(game)
    const unsubscribe = game.subscribe(setSnapshot)
    setSnapshot(game.getSnapshot())

    return () => {
      unsubscribe()
      game.destroy()
    }
  }, [])

  useEffect(() => {
    if (!engine) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Enter' || event.repeat) return
      if (
        document.activeElement instanceof HTMLButtonElement ||
        document.activeElement instanceof HTMLAnchorElement
      ) {
        return
      }

      const status = engine.getSnapshot().status
      if (status === 'ready' || status === 'gameover') {
        event.preventDefault()
        engine.start()
      } else if (status === 'paused') {
        event.preventDefault()
        engine.togglePause()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [engine])

  const start = useCallback(() => engine?.start(), [engine])
  const pause = useCallback(() => engine?.togglePause(), [engine])
  const mute = useCallback(() => engine?.toggleMute(), [engine])

  return (
    <main className="app">
      <div className="stage" data-status={snapshot?.status ?? 'loading'}>
        <canvas
          ref={canvasRef}
          className="game-canvas"
          role="img"
          aria-label="Deadlane game view"
        />
        <div className="stage__scanlines" aria-hidden="true" />
        <div className="stage__edge" aria-hidden="true" />

        {snapshot &&
          (snapshot.status === 'playing' || snapshot.status === 'paused') && (
            <Hud
              snapshot={snapshot}
              onPause={pause}
              onMute={mute}
            />
          )}

        {snapshot?.status === 'playing' && snapshot.banner && (
          <WaveBanner key={snapshot.banner.key} banner={snapshot.banner} />
        )}

        {snapshot?.status === 'ready' && (
          <StartScreen
            best={snapshot.best}
            muted={snapshot.muted}
            onStart={start}
            onMute={mute}
          />
        )}

        {snapshot?.status === 'paused' && (
          <PauseScreen
            snapshot={snapshot}
            onResume={pause}
            onRestart={start}
            onMute={mute}
          />
        )}

        {snapshot?.status === 'overrun' && <OverrunFlash />}

        {snapshot?.status === 'gameover' && (
          <GameOverScreen
            snapshot={snapshot}
            onRestart={start}
            onMute={mute}
          />
        )}
      </div>
    </main>
  )
}
