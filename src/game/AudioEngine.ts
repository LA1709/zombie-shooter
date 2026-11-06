import type { WorldEventType } from './types'

export class AudioEngine {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private muted = false

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(
        muted ? 0 : 0.2,
        this.context.currentTime,
        0.015,
      )
    }
  }

  unlock(): void {
    try {
      if (!this.context) {
        this.context = new AudioContext()
        this.master = this.context.createGain()
        this.master.gain.value = this.muted ? 0 : 0.2
        this.master.connect(this.context.destination)
        this.noiseBuffer = this.createNoiseBuffer(this.context)
      }

      if (this.context.state === 'suspended') {
        void this.context.resume()
      }
    } catch {
      // Audio is optional. Browsers can block or lack WebAudio.
      this.context = null
      this.master = null
      this.noiseBuffer = null
    }
  }

  play(sound: WorldEventType): void {
    if (this.muted || !this.context || !this.master) return
    if (this.context.state === 'suspended') void this.context.resume()

    switch (sound) {
      case 'shoot':
        this.noise(0.045, 2400, 0.026)
        this.tone(155, 72, 0.055, 'square', 0.028)
        break
      case 'hit':
        this.noise(0.035, 1500, 0.022)
        this.tone(540, 370, 0.03, 'triangle', 0.014)
        break
      case 'kill':
        this.noise(0.11, 520, 0.04)
        this.tone(110, 42, 0.13, 'sawtooth', 0.036)
        break
      case 'hurt':
        this.tone(125, 54, 0.22, 'sawtooth', 0.075)
        this.noise(0.16, 420, 0.06)
        break
      case 'dash':
        this.noise(0.16, 1100, 0.045)
        this.tone(280, 680, 0.14, 'sine', 0.026)
        break
      case 'wave':
        this.tone(392, 392, 0.11, 'triangle', 0.035)
        this.tone(523, 523, 0.15, 'triangle', 0.032, 0.1)
        this.tone(784, 784, 0.2, 'triangle', 0.024, 0.21)
        break
      case 'barrel':
        this.noise(0.24, 260, 0.085)
        this.tone(96, 36, 0.24, 'sawtooth', 0.07)
        this.tone(180, 64, 0.12, 'square', 0.03, 0.02)
        break
      case 'grab':
        this.tone(190, 88, 0.18, 'sawtooth', 0.052)
        this.noise(0.12, 360, 0.038)
        break
      case 'overrun':
        this.tone(92, 28, 0.9, 'sawtooth', 0.075)
        this.noise(0.5, 180, 0.045)
        this.tone(150, 42, 0.5, 'sawtooth', 0.04, 0.14)
        break
      case 'gameover':
        this.tone(210, 190, 0.24, 'sawtooth', 0.05)
        this.tone(150, 120, 0.32, 'sawtooth', 0.045, 0.2)
        this.tone(96, 42, 0.75, 'sawtooth', 0.055, 0.44)
        break
      default:
        break
    }
  }

  destroy(): void {
    if (this.context) {
      void this.context.close()
      this.context = null
      this.master = null
      this.noiseBuffer = null
    }
  }

  private tone(
    startFrequency: number,
    endFrequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0,
  ): void {
    if (!this.context || !this.master) return
    const now = this.context.currentTime + delay
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()

    oscillator.type = type
    oscillator.frequency.setValueAtTime(Math.max(1, startFrequency), now)
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFrequency),
      now + duration,
    )
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    oscillator.connect(gain)
    gain.connect(this.master)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.03)
  }

  private noise(duration: number, cutoff: number, volume: number): void {
    if (!this.context || !this.master || !this.noiseBuffer) return
    const now = this.context.currentTime
    const source = this.context.createBufferSource()
    const filter = this.context.createBiquadFilter()
    const gain = this.context.createGain()

    source.buffer = this.noiseBuffer
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(cutoff, now)
    filter.Q.value = 0.8
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.master)
    source.start(now)
    source.stop(now + duration + 0.02)
  }

  private createNoiseBuffer(context: AudioContext): AudioBuffer {
    const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1
    }
    return buffer
  }
}
