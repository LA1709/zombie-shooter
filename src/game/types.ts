import type { GameStatus, ZombieVariant } from './config'

export interface Controls {
  moveAxis: number
  pointerX: number | null
  dashPressed: boolean
}

export interface Player {
  x: number
  hp: number
  facing: 1 | -1
  fireTimer: number
  dashTimer: number
  dashCooldown: number
  dashDirection: 1 | -1
  invulnerability: number
  muzzleFlash: number
  grabTimer: number
  overdriveTimer: number
}

export type ZombieState = 'walking' | 'grabbing'

export interface Zombie {
  id: number
  x: number
  z: number
  hp: number
  maxHp: number
  speed: number
  damage: number
  variant: ZombieVariant
  scale: number
  seed: number
  walkPhase: number
  attackCooldown: number
  hitFlash: number
  targetOffset: number
  state: ZombieState
  grabTimer: number
}

export type BarrelReward = 'medkit' | 'overdrive' | 'score'

export interface Barrel {
  id: number
  x: number
  z: number
  hp: number
  maxHp: number
  reward: BarrelReward
  seed: number
  hitFlash: number
}

export type AimTarget =
  | { kind: 'zombie'; zombie: Zombie }
  | { kind: 'barrel'; barrel: Barrel }

export interface Tracer {
  targetX: number
  targetZ: number
  life: number
  maxLife: number
  crit: boolean
}

export interface Particle {
  x: number
  z: number
  y: number
  vx: number
  vz: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  kind: 'spark' | 'gore' | 'dash' | 'dust'
}

export interface FloatingText {
  x: number
  z: number
  y: number
  text: string
  life: number
  maxLife: number
  color: string
}

export interface Banner {
  key: number
  title: string
  subtitle: string
  time: number
}

export interface GameSnapshot {
  status: GameStatus
  score: number
  best: number
  wave: number
  kills: number
  hp: number
  maxHp: number
  combo: number
  multiplier: number
  dashReady: boolean
  dashProgress: number
  grabbed: boolean
  grabTime: number
  overdrive: number
  enemiesRemaining: number
  enemiesTotal: number
  banner: Pick<Banner, 'key' | 'title' | 'subtitle'> | null
  muted: boolean
}

export type WorldEventType =
  | 'shoot'
  | 'hit'
  | 'kill'
  | 'hurt'
  | 'dash'
  | 'wave'
  | 'barrel'
  | 'grab'
  | 'overrun'
  | 'gameover'

export interface WorldEvent {
  type: WorldEventType
  crit?: boolean
}

export interface WaveConfig {
  count: number
  hp: number
  speed: number
  spawnInterval: number
  damage: number
}
