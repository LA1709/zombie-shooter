import type { GameStatus, LaneIndex, ZombieVariant } from './config'

export interface Controls {
  laneShift: number
  targetLane: LaneIndex | null
}

export interface Player {
  x: number
  lane: LaneIndex
  squadCount: number
  weaponLevel: number
  weaponDamage: number
  weaponFireRate: number
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
  bulletMultiplier: number
  bulletMultiplierTimer: number
}

export type ZombieState = 'walking' | 'grabbing'

export interface Zombie {
  id: number
  x: number
  lane: LaneIndex
  canSwitchLane: boolean
  laneSwitchTimer: number
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
  isBoss?: boolean
}

export type GateKind = 'soldiers' | 'minus' | 'weapon' | 'heal' | 'multiplier'

export interface Barrel {
  id: number
  x: number
  lane: LaneIndex
  z: number
  hp: number
  maxHp: number
  multiplier: number
  kind: GateKind
  value: number
  seed: number
  hitFlash: number
}

export type AimTarget =
  | { kind: 'zombie'; zombie: Zombie }
  | { kind: 'barrel'; barrel: Barrel }

export interface Tracer {
  x: number
  z: number
  targetX: number
  targetZ: number
  targetKind: 'zombie' | 'barrel'
  targetId: number
  damage: number
  speed: number
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
  squadCount: number
  weaponLevel: number
  weaponDamage: number
  combo: number
  multiplier: number
  dashReady: boolean
  dashProgress: number
  lane: LaneIndex
  grabbed: boolean
  grabTime: number
  overdrive: number
  bulletMultiplier: number
  bulletMultiplierTime: number
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
