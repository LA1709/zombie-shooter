import type { LaneIndex } from './config'
import type { Controls } from './types'
import { clamp } from './math'

export class InputController {
  private readonly canvas: HTMLCanvasElement
  private readonly onPause: () => void
  private laneShiftQueued = 0
  private pointerActive = false
  private pointerLane: LaneIndex | null = null

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
      laneShift: this.laneShiftQueued,
      targetLane: this.pointerActive ? this.pointerLane : null,
    }
    this.laneShiftQueued = 0
    return controls
  }

  clearTransient(): void {
    this.laneShiftQueued = 0
    this.pointerActive = false
    this.pointerLane = null
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (this.isTypingTarget(event.target)) return

    switch (event.code) {
      case 'KeyA':
      case 'ArrowLeft':
        if (!event.repeat) this.queueLaneShift(-1)
        event.preventDefault()
        break
      case 'KeyD':
      case 'ArrowRight':
        if (!event.repeat) this.queueLaneShift(1)
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

  private handleKeyUp = (_event: KeyboardEvent): void => {}

  private handleBlur = (): void => {
    this.laneShiftQueued = 0
    this.pointerActive = false
    this.pointerLane = null
  }

  private queueLaneShift(direction: number): void {
    this.laneShiftQueued = clamp(this.laneShiftQueued + direction, -2, 2)
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
    this.pointerLane = null
  }

  private updatePointerTarget(event: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect()
    if (rect.width <= 0) return
    const normalized = clamp(
      (event.clientX - rect.left) / rect.width,
      0,
      1,
    )
    this.pointerLane = (normalized < 0.36
      ? 0
      : normalized < 0.64
        ? 1
        : 2) as LaneIndex
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
