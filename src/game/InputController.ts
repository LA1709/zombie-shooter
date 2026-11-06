import type { Controls } from './types'
import { clamp } from './math'

const ROAD_SCREEN_HALF = 0.44

export class InputController {
  private readonly canvas: HTMLCanvasElement
  private readonly onPause: () => void
  private left = false
  private right = false
  private dashQueued = false
  private pointerActive = false
  private pointerTarget: number | null = null

  constructor(canvas: HTMLCanvasElement, onPause: () => void) {
    this.canvas = canvas
    this.onPause = onPause

    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
    window.addEventListener('blur', this.handleBlur)
    window.addEventListener('pointermove', this.handlePointerMove, {
      passive: false,
    })
    window.addEventListener('pointerup', this.handlePointerUp)
    window.addEventListener('pointercancel', this.handlePointerUp)
    canvas.addEventListener('pointerdown', this.handlePointerDown)
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    window.removeEventListener('blur', this.handleBlur)
    window.removeEventListener('pointermove', this.handlePointerMove)
    window.removeEventListener('pointerup', this.handlePointerUp)
    window.removeEventListener('pointercancel', this.handlePointerUp)
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown)
  }

  consumeControls(): Controls {
    const controls: Controls = {
      moveAxis: Number(this.right) - Number(this.left),
      pointerX: this.pointerActive ? this.pointerTarget : null,
      dashPressed: this.dashQueued,
    }
    this.dashQueued = false
    return controls
  }

  queueDash(): void {
    this.dashQueued = true
  }

  clearTransient(): void {
    this.dashQueued = false
    this.pointerActive = false
    this.pointerTarget = null
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (this.isTypingTarget(event.target)) return

    switch (event.code) {
      case 'KeyA':
      case 'ArrowLeft':
        this.left = true
        event.preventDefault()
        break
      case 'KeyD':
      case 'ArrowRight':
        this.right = true
        event.preventDefault()
        break
      case 'Space':
        if (!event.repeat) this.dashQueued = true
        event.preventDefault()
        break
      case 'KeyP':
      case 'Escape':
        if (!event.repeat) this.onPause()
        event.preventDefault()
        break
      default:
        break
    }
  }

  private handleKeyUp = (event: KeyboardEvent): void => {
    switch (event.code) {
      case 'KeyA':
      case 'ArrowLeft':
        this.left = false
        break
      case 'KeyD':
      case 'ArrowRight':
        this.right = false
        break
      default:
        break
    }
  }

  private handleBlur = (): void => {
    this.left = false
    this.right = false
    this.pointerActive = false
    this.pointerTarget = null
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    this.pointerActive = true
    this.updatePointerTarget(event)
    event.preventDefault()
  }

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.pointerActive) return
    this.updatePointerTarget(event)
    event.preventDefault()
  }

  private handlePointerUp = (): void => {
    this.pointerActive = false
    this.pointerTarget = null
  }

  private updatePointerTarget(event: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect()
    if (rect.width <= 0) return
    const normalized = (event.clientX - rect.left) / rect.width
    this.pointerTarget = clamp(
      (normalized - 0.5) / ROAD_SCREEN_HALF,
      -1,
      1,
    )
  }

  private isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    return (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    )
  }
}
