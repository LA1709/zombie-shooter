export const GAME = {
  fixedStep: 1 / 60,
  maxFrameDelta: 0.1,
  player: {
    maxHp: 100,
    speed: 2.2,
    startSquad: 4,
    squadMax: 12,
    startWeaponLevel: 1,
    dashSpeed: 5.8,
    dashDuration: 0.16,
    dashCooldown: 2.8,
    hurtInvulnerability: 0.7,
    fireInterval: 0.17,
    damage: 28,
    critChance: 0.12,
    critMultiplier: 2,
    overdriveMultiplier: 0.62,
  },
  world: {
    roadHalfWidth: 1,
    spawnDepth: 30,
    spawnDepthJitter: 3,
    attackDepth: 4.5,
    maxParticles: 260,
    barrelMaxActive: 3,
    barrelMaxAlignment: 0.38,
    zombieLaneSwitchChance: 0.3,
    zombieLaneSwitchIntervalMin: 1.1,
    zombieLaneSwitchIntervalMax: 2.1,
  },
  barrel: {
    baseHp: 72,
    hpPerWave: 14,
    blastRadiusX: 0.55,
    blastRadiusZ: 3.8,
    stopGap: 0.9,
    blastDamage: 38,
    blastDamagePerWave: 6,
    multiplierMin: 2,
    multiplierMax: 5,
    multiplierDuration: 9,
    gateSoldierMin: 1,
    gateSoldierMax: 3,
    gatePenaltyMax: 2,
  },
  contact: {
    grabDuration: 0.85,
    grabDepth: 1.9,
    grabDamageMultiplier: 1.5,
    grabMoveSlow: 0.55,
    breakKnockbackDepth: 5.4,
    breakCooldown: 1.4,
    overrunDuration: 1.45,
  },
  wave: {
    firstCount: 20,
    countStep: 4,
    firstHp: 62,
    hpStep: 10,
    firstSpeed: 5.2,
    speedStep: 0.1,
    maxSpeedBonus: 2.3,
    firstSpawnInterval: 0.32,
    spawnIntervalStep: 0.015,
    minSpawnInterval: 0.2,
    firstDamage: 4,
    damageStep: 0.35,
    breakDuration: 2.6,
    healPerWave: 12,
  },
} as const

export const COLORS = {
  lime: '#c8ff3d',
  orange: '#ff9f1c',
  gold: '#ffd23f',
  blood: '#c93838',
  cyan: '#5de4ee',
} as const

export type GameStatus = 'ready' | 'playing' | 'paused' | 'overrun' | 'gameover'

export type ZombieVariant = 0 | 1 | 2 | 3

export const LANE_X = [-0.62, 0, 0.62] as const
export type LaneIndex = 0 | 1 | 2
