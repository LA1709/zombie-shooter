import { GAME } from './config'
import { AudioEngine } from './AudioEngine'
import { GameWorld } from './GameWorld'
import { InputController } from './InputController'
import { Renderer } from './Renderer'
import { loadBestScore, loadMuted, saveBestScore, saveMuted } from './storage'
import type { Controls, GameSnapshot } from './types'
import { clamp } from './math'

type SnapshotListener = (snapshot: GameSnapshot) => void

export class GameEngine {
  private readonly world = new GameWorld()
  private readonly renderer: Renderer
  private readonly input: InputController
  private readonly audio = new AudioEngine()
  private readonly listeners = new Set<SnapshotListener>()
  private readonly handleVisibilityChange: () => void

  private snapshot: GameSnapshot
  private bestScore: number
  private muted: boolean
  private animationFrame = 0
  private lastFrameTime = 0
  private accumulator = 0
  private lastSnapshotTime = 0
  private destroyed = false

  constructor(canvas: HTMLCanvasElement) {
    this.bestScore = loadBestScore()
    this.muted = loadMuted()
    this.snapshot = this.world.getSnapshot(this.muted, this.bestScore)

    this.renderer = new Renderer(canvas)
    this.audio.setMuted(this.muted)
    this.input = new InputController(canvas, () => this.togglePause())

    this.handleVisibilityChange = () => {
      if (document.hidden && this.world.status === 'playing') {
        this.world.pause()
        this.refreshSnapshot()
      }
    }
    document.addEventListener('visibilitychange', this.handleVisibilityChange)

    this.animationFrame = requestAnimationFrame(this.tick)
  }

  getSnapshot(): GameSnapshot {
    return this.snapshot
  }

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener)
    listener(this.snapshot)
    return () => {
      this.listeners.delete(listener)
    }
  }

  start(): void {
    this.audio.unlock()
    this.input.clearTransient()
    this.accumulator = 0
    this.world.startRun()
    this.flushWorldEvents()
    this.refreshSnapshot()
  }

  togglePause(): void {
    if (this.world.status === 'playing') {
      this.world.pause()
      this.input.clearTransient()
      this.refreshSnapshot()
      return
    }

    if (this.world.status === 'paused') {
      this.audio.unlock()
      this.input.clearTransient()
      this.accumulator = 0
      this.world.resume()
      this.refreshSnapshot()
    }
  }

  toggleMute(): void {
    this.muted = !this.muted
    this.audio.setMuted(this.muted)
    if (!this.muted) this.audio.unlock()
    saveMuted(this.muted)
    this.refreshSnapshot()
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    cancelAnimationFrame(this.animationFrame)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    this.input.destroy()
    this.renderer.destroy()
    this.audio.destroy()
    this.listeners.clear()
  }

  private tick = (now: number): void => {
    if (this.destroyed) return
    this.animationFrame = requestAnimationFrame(this.tick)

    const delta = this.lastFrameTime
      ? clamp((now - this.lastFrameTime) / 1000, 0, GAME.maxFrameDelta)
      : 0
    this.lastFrameTime = now

    if (this.world.status === 'playing') {
      this.accumulator += delta
      this.accumulator = Math.min(this.accumulator, GAME.fixedStep * 6)

      let steps = 0
      let controls: Controls | null = null

      while (
        this.accumulator >= GAME.fixedStep &&
        steps < 6 &&
        this.world.status === 'playing'
      ) {
        if (!controls) controls = this.input.consumeControls()
        this.world.update(GAME.fixedStep, controls)
        controls = { ...controls, laneShift: 0 }
        this.accumulator -= GAME.fixedStep
        steps += 1
      }

      if (steps > 0) {
        this.flushWorldEvents()
      }
    } else if (this.world.status === 'overrun') {
      this.world.update(delta, {
        laneShift: 0,
        targetLane: null,
      })
      this.flushWorldEvents()
    }

    if (this.world.status !== this.snapshot.status) {
      this.refreshSnapshot()
    }

    this.renderer.render(this.world, delta)

    if (
      this.world.status === 'playing' &&
      now - this.lastSnapshotTime >= 100
    ) {
      this.lastSnapshotTime = now
      this.refreshSnapshot()
    }
  }

  private flushWorldEvents(): void {
    for (const event of this.world.drainEvents()) {
      switch (event.type) {
        case 'shoot':
          this.audio.play('shoot')
          break
        case 'hit':
          this.audio.play('hit')
          break
        case 'kill':
          this.audio.play('kill')
          break
        case 'hurt':
          this.audio.play('hurt')
          break
        case 'dash':
          this.audio.play('dash')
          break
        case 'wave':
          this.audio.play('wave')
          break
        case 'barrel':
          this.audio.play('barrel')
          break
        case 'grab':
          this.audio.play('grab')
          break
        case 'overrun':
          this.audio.play('overrun')
          break
        case 'gameover':
          this.audio.play('gameover')
          break
        default:
          break
      }
    }

    if (this.world.status === 'gameover') {
      if (this.world.score > this.bestScore) {
        this.bestScore = Math.round(this.world.score)
        saveBestScore(this.bestScore)
      }
      this.refreshSnapshot()
    }
  }

  private refreshSnapshot(): void {
    this.snapshot = this.world.getSnapshot(this.muted, this.bestScore)
    for (const listener of this.listeners) listener(this.snapshot)
  }
}
