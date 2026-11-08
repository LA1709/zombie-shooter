import { GAME, COLORS, LANE_X } from './config'
import type { GameStatus, LaneIndex, ZombieVariant } from './config'
import type {
  AimTarget,
  Banner,
  Barrel,
  Controls,
  GateKind,
  FloatingText,
  GameSnapshot,
  Particle,
  Player,
  Tracer,
  WaveConfig,
  WorldEvent,
  Zombie,
} from './types'
import {
  clamp,
  moveToward,
  randomBetween,
  randomInt,
} from './math'

function createPlayer(): Player {
  return {
    x: 0,
    lane: 1,
    squadCount: 1,
    weaponLevel: GAME.player.startWeaponLevel,
    weaponDamage: GAME.player.damage,
    weaponFireRate: 1,
    hp: GAME.player.maxHp,
    facing: 1,
    fireTimer: 0,
    dashTimer: 0,
    dashCooldown: 0,
    dashDirection: 1,
    invulnerability: 1.2,
    muzzleFlash: 0,
    grabTimer: 0,
    overdriveTimer: 0,
    bulletMultiplier: 1,
    bulletMultiplierTimer: 0,
  }
}

export function getWaveConfig(wave: number): WaveConfig {
  const level = Math.max(0, wave - 1)
  const w = GAME.wave
  return {
    count: w.firstCount + level * w.countStep,
    hp: w.firstHp + level * w.hpStep,
    speed: w.firstSpeed + Math.min(w.maxSpeedBonus, level * w.speedStep),
    spawnInterval: Math.max(
      w.minSpawnInterval,
      w.firstSpawnInterval - level * w.spawnIntervalStep,
    ),
    damage: w.firstDamage + Math.floor(level * w.damageStep),
  }
}

export class GameWorld {
  status: GameStatus = 'ready'
  time = 0
  score = 0
  kills = 0
  wave = 0
  combo = 0
  comboTimer = 0
  player = createPlayer()
  zombies: Zombie[] = []
  barrels: Barrel[] = []
  particles: Particle[] = []
  tracers: Tracer[] = []
  texts: FloatingText[] = []
  banner: Banner | null = null
  aimTarget: AimTarget | null = null
  hurtFlash = 0
  shake = 0
  overrunTimer = 0

  private nextZombieId = 1
  private nextBarrelId = 1
  private nextBannerKey = 1
  private events: WorldEvent[] = []
  private waveConfig = getWaveConfig(1)
  private waveTotal = 0
  private waveRemaining = 0
  private spawnTimer = 0
  private wavePhase: 'spawning' | 'break' = 'spawning'
  private breakTimer = 0

  constructor() {
    this.resetToReady()
  }

  get multiplier(): number {
    return 1 + Math.min(9, Math.floor(this.combo / 4)) * 0.25
  }

  resetToReady(): void {
    this.clearRun()
    this.status = 'ready'
  }

  startRun(): void {
    this.clearRun()
    this.status = 'playing'
    this.beginWave()
  }

  pause(): void {
    if (this.status === 'playing') this.status = 'paused'
  }

  resume(): void {
    if (this.status === 'paused') this.status = 'playing'
  }

  drainEvents(): WorldEvent[] {
    const events = this.events
    this.events = []
    return events
  }

  getSnapshot(muted: boolean, best: number): GameSnapshot {
    return {
      status: this.status,
      score: Math.round(this.score),
      best,
      wave: this.wave,
      kills: this.kills,
      hp: Math.max(0, Math.ceil(this.player.hp)),
      maxHp: GAME.player.maxHp,
      squadCount: this.player.squadCount,
      weaponLevel: this.player.weaponLevel,
      weaponDamage: this.player.weaponDamage,
      combo: this.combo,
      multiplier: this.multiplier,
      dashReady: this.player.dashCooldown <= 0,
      dashProgress: clamp(
        1 - this.player.dashCooldown / GAME.player.dashCooldown,
        0,
        1,
      ),
      lane: this.player.lane,
      grabbed: this.player.grabTimer > 0,
      grabTime: this.player.grabTimer,
      overdrive: this.player.overdriveTimer,
      bulletMultiplier: this.player.bulletMultiplier,
      bulletMultiplierTime: this.player.bulletMultiplierTimer,
      enemiesRemaining: this.waveRemaining + this.zombies.length,
      enemiesTotal: this.waveTotal,
      banner:
        this.banner && this.banner.time > 0
          ? {
              key: this.banner.key,
              title: this.banner.title,
              subtitle: this.banner.subtitle,
            }
          : null,
      muted,
    }
  }

  update(dt: number, controls: Controls): void {
    if (this.status === 'overrun') {
      this.updateOverrun(dt)
      return
    }
    if (this.status !== 'playing') return

    this.time += dt
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.5)
    this.shake = Math.max(0, this.shake - dt * 32)
    this.player.muzzleFlash = Math.max(0, this.player.muzzleFlash - dt)
    if (this.banner) this.banner.time = Math.max(0, this.banner.time - dt)

    this.comboTimer -= dt
    if (this.comboTimer <= 0) {
      this.combo = 0
      this.comboTimer = 0
    }

    this.updateSpawning(dt)
    this.updateZombies(dt)
    this.updateProjectiles(dt)

    if (this.status !== 'playing') return

    this.updatePlayer(dt, controls)
    this.updateEffects(dt)

    this.zombies = this.zombies.filter((zombie) => zombie.hp > 0)
    this.barrels = this.barrels.filter((barrel) => barrel.hp > 0)
    this.checkWaveClear()
  }

  private clearRun(): void {
    this.time = 0
    this.score = 0
    this.kills = 0
    this.wave = 0
    this.combo = 0
    this.comboTimer = 0
    this.player = createPlayer()
    this.zombies = []
    this.barrels = []
    this.particles = []
    this.tracers = []
    this.texts = []
    this.banner = null
    this.aimTarget = null
    this.hurtFlash = 0
    this.shake = 0
    this.overrunTimer = 0
    this.events = []
    this.waveConfig = getWaveConfig(1)
    this.waveTotal = 0
    this.waveRemaining = 0
    this.spawnTimer = 0
    this.wavePhase = 'spawning'
    this.breakTimer = 0
  }

  private beginWave(): void {
    this.wave += 1
    this.waveConfig = getWaveConfig(this.wave)
    this.waveTotal = this.waveConfig.count
    const vanguardCount = Math.min(12, 7 + this.wave)
    this.waveRemaining = Math.max(0, this.waveConfig.count - vanguardCount)
    this.wavePhase = 'spawning'
    this.spawnTimer = 0.25
    this.setBanner(
      `WAVE ${this.wave}`,
      this.wave === 1 ? 'HOLD THE BRIDGE' : `${this.waveConfig.count} HOSTILES INBOUND`,
    )
    this.events.push({ type: 'wave' })

    this.spawnBarrelsForWave()

    for (let i = 0; i < vanguardCount; i += 1) {
      this.spawnZombie(randomBetween(10, 18))
    }

    if (this.wave % 5 === 0) {
      const boss: Zombie = {
        id: this.nextZombieId++,
        x: 0,
        lane: 1,
        canSwitchLane: false,
        laneSwitchTimer: 0,
        z: 18,
        hp: this.waveConfig.hp * 9,
        maxHp: this.waveConfig.hp * 9,
        speed: this.waveConfig.speed * 0.72,
        damage: this.waveConfig.damage * 2,
        variant: 2,
        scale: 2.7,
        seed: Math.random() * 1000,
        walkPhase: 0,
        attackCooldown: 1.2,
        hitFlash: 0,
        targetOffset: 0,
        state: 'walking',
        grabTimer: 0,
        isBoss: true,
      }
      this.zombies.push(boss)
      this.setBanner('WARNING', 'GIANT INBOUND')
      this.spawnDust(0, 18)
    }
  }

  private setBanner(title: string, subtitle: string): void {
    this.banner = {
      key: this.nextBannerKey++,
      title,
      subtitle,
      time: 1.9,
    }
  }

  private updateSpawning(dt: number): void {
    if (this.wavePhase === 'break') {
      this.breakTimer -= dt
      if (this.breakTimer <= 0) this.beginWave()
      return
    }

    if (this.waveRemaining <= 0) return

    this.spawnTimer -= dt
    while (this.spawnTimer <= 0 && this.waveRemaining > 0) {
      this.spawnZombie()
      this.waveRemaining -= 1
      this.spawnTimer +=
        this.waveConfig.spawnInterval * randomBetween(0.85, 1.15)
    }
  }

  private spawnZombie(zOverride?: number): void {
    const config = this.waveConfig
    const variant = randomInt(0, 3) as ZombieVariant
    const lane = randomInt(0, 2) as LaneIndex
    const canSwitchLane = variant === 2
    const hp = Math.round(config.hp * randomBetween(0.88, 1.12))
    let z =
      zOverride ??
      GAME.world.spawnDepth + randomBetween(0, GAME.world.spawnDepthJitter)

    const blockingBarrel = this.barrels.find(
      (barrel) =>
        barrel.hp > 0 &&
        barrel.lane === lane &&
        z < barrel.z + GAME.barrel.stopGap,
    )
    if (blockingBarrel) {
      z =
        blockingBarrel.z +
        GAME.barrel.stopGap +
        randomBetween(0.8, 2.4)
    }

    const zombie: Zombie = {
      id: this.nextZombieId++,
      x: LANE_X[lane] + randomBetween(-0.035, 0.035),
      lane,
      canSwitchLane,
      laneSwitchTimer: canSwitchLane
        ? randomBetween(
            GAME.world.zombieLaneSwitchIntervalMin,
            GAME.world.zombieLaneSwitchIntervalMax,
          )
        : 0,
      z,
      hp,
      maxHp: hp,
      speed: config.speed * randomBetween(0.9, 1.12),
      damage: config.damage,
      variant,
      scale: randomBetween(0.92, 1.08),
      seed: Math.random() * 1000,
      walkPhase: Math.random() * Math.PI * 2,
      attackCooldown: randomBetween(1.1, 2.0),
      hitFlash: 0,
      targetOffset: randomBetween(-0.035, 0.035),
      state: 'walking',
      grabTimer: 0,
    }
    this.zombies.push(zombie)
    if (zOverride !== undefined) this.spawnDust(zombie.x, zombie.z)
  }

  private shiftZombieLane(zombie: Zombie): void {
    if (!zombie.canSwitchLane) return
    if (zombie.lane < this.player.lane) {
      zombie.lane = clamp(zombie.lane + 1, 0, 2) as LaneIndex
    } else if (zombie.lane > this.player.lane) {
      zombie.lane = clamp(zombie.lane - 1, 0, 2) as LaneIndex
    }
    zombie.laneSwitchTimer = randomBetween(
      GAME.world.zombieLaneSwitchIntervalMin,
      GAME.world.zombieLaneSwitchIntervalMax,
    )
    this.spawnDust(zombie.x, zombie.z)
  }

  private getBlockingBarrel(zombie: Zombie): Barrel | null {
    let blockingBarrel: Barrel | null = null

    for (const barrel of this.barrels) {
      if (barrel.hp <= 0 || barrel.lane !== zombie.lane) continue
      if (barrel.z < zombie.z && (!blockingBarrel || barrel.z > blockingBarrel.z)) {
        blockingBarrel = barrel
      }
    }

    return blockingBarrel
  }

  private updateZombies(dt: number): void {
    for (const zombie of this.zombies) {
      if (zombie.hp <= 0) continue
      zombie.hitFlash = Math.max(0, zombie.hitFlash - dt)
      zombie.walkPhase += zombie.speed * dt * 2.1

      const blockingBarrel = this.getBlockingBarrel(zombie)
      const floorZ = blockingBarrel
        ? Math.max(
            GAME.world.attackDepth,
            blockingBarrel.z + GAME.barrel.stopGap,
          )
        : GAME.world.attackDepth

      if (zombie.z > floorZ) {
        zombie.z = Math.max(floorZ, zombie.z - zombie.speed * dt)

        if (zombie.canSwitchLane) {
          zombie.laneSwitchTimer -= dt
          if (zombie.laneSwitchTimer <= 0) this.shiftZombieLane(zombie)
        }

        const targetX = LANE_X[zombie.lane] + zombie.targetOffset
        zombie.x = moveToward(zombie.x, targetX, dt * 1.45)
        continue
      }

      if (blockingBarrel) {
        zombie.z = floorZ
        zombie.attackCooldown -= dt
        if (zombie.attackCooldown <= 0) {
          zombie.attackCooldown = randomBetween(0.75, 1.25)
          this.spawnDust(blockingBarrel.x, blockingBarrel.z)
        }

        if (zombie.canSwitchLane) {
          zombie.laneSwitchTimer -= dt
          if (zombie.laneSwitchTimer <= 0) this.shiftZombieLane(zombie)
        }

        const targetX = LANE_X[zombie.lane] + zombie.targetOffset
        zombie.x = moveToward(zombie.x, targetX, dt * 1.6)
        continue
      }

      const targetX = LANE_X[zombie.lane] + zombie.targetOffset
      zombie.x = moveToward(zombie.x, targetX, dt * 1.25)
      zombie.z = Math.max(0, zombie.z - zombie.speed * dt * 0.35)

      if (zombie.z <= GAME.world.attackDepth) {
        zombie.z = GAME.world.attackDepth
        this.breachZombie(zombie)
        if (this.status !== 'playing') return
      }
    }
  }

  private breachZombie(zombie: Zombie): void {
    zombie.hp = 0
    zombie.state = 'walking'
    const damage = Math.max(8, zombie.damage * 3)
    this.player.hp = Math.max(0, this.player.hp - damage)
    this.hurtFlash = 0.85
    this.shake = Math.max(this.shake, 11)
    this.combo = 0
    this.comboTimer = 0
    this.spawnSparks(zombie.x, zombie.z, COLORS.blood, 18)
    this.spawnGore(zombie.x, zombie.z, 10)
    this.texts.push({
      x: zombie.x,
      z: zombie.z,
      y: 2.2,
      text: `BREACH -${Math.round(damage)}`,
      life: 0.8,
      maxLife: 0.8,
      color: COLORS.blood,
    })
    this.events.push({ type: 'hurt' })

    if (this.player.hp <= 0) this.triggerOverrun()
  }

  private updatePlayer(dt: number, controls: Controls): void {
    const player = this.player
    player.fireTimer -= dt
    player.invulnerability = Math.max(0, player.invulnerability - dt)
    player.dashCooldown = Math.max(0, player.dashCooldown - dt)
    player.grabTimer = Math.max(0, player.grabTimer - dt)
    player.overdriveTimer = Math.max(0, player.overdriveTimer - dt)
    player.bulletMultiplierTimer = Math.max(
      0,
      player.bulletMultiplierTimer - dt,
    )
    if (player.bulletMultiplierTimer <= 0) player.bulletMultiplier = 1

    if (controls.targetLane !== null) {
      player.lane = controls.targetLane
    }

    let axis = 0
    if (controls.laneShift !== 0) {
      const nextLane = clamp(
        player.lane + Math.sign(controls.laneShift),
        0,
        2,
      ) as LaneIndex
      axis =
        Math.sign(LANE_X[nextLane] - player.x) ||
        Math.sign(controls.laneShift) ||
        0
      player.lane = nextLane
    }

    const laneX = LANE_X[player.lane]
    if (
      player.grabTimer > 0 &&
      !this.zombies.some(
        (zombie) => zombie.state === 'grabbing' && zombie.lane === player.lane,
      )
    ) {
      player.grabTimer = 0
    }

    if (axis === 0) {
      axis =
        Math.abs(laneX - player.x) > 0.012
          ? (Math.sign(laneX - player.x) as 1 | -1)
          : 0
    }

    const moveScale =
      player.grabTimer > 0 ? GAME.contact.grabMoveSlow : 1
    player.x = moveToward(
      player.x,
      laneX,
      GAME.player.speed * moveScale * dt,
    )
    if (Math.abs(laneX - player.x) > 0.015) {
      player.facing = laneX > player.x ? 1 : -1
    }

    player.x = clamp(player.x, -0.96, 0.96)

    const target = this.findTarget()
    this.aimTarget = target
    if (target && player.fireTimer <= 0) {
      this.fireAt(target)
      player.fireTimer =
        (GAME.player.fireInterval / player.weaponFireRate) *
        (player.overdriveTimer > 0 ? GAME.player.overdriveMultiplier : 1)
    }
  }

  private findTarget(): AimTarget | null {
    const lane = this.player.lane
    let nearestZombie: Zombie | null = null
    let nearestZombieDepth = Number.POSITIVE_INFINITY
    let blockingBarrel: Barrel | null = null
    let barrelDepth = Number.POSITIVE_INFINITY

    for (const zombie of this.zombies) {
      if (zombie.hp <= 0 || zombie.lane !== lane) continue
      if (zombie.z < nearestZombieDepth) {
        nearestZombieDepth = zombie.z
        nearestZombie = zombie
      }
    }

    for (const barrel of this.barrels) {
      if (barrel.hp <= 0 || barrel.lane !== lane) continue
      if (barrel.z < barrelDepth) {
        barrelDepth = barrel.z
        blockingBarrel = barrel
      }
    }

    if (blockingBarrel && barrelDepth < nearestZombieDepth) {
      return { kind: 'barrel', barrel: blockingBarrel }
    }

    return nearestZombie ? { kind: 'zombie', zombie: nearestZombie } : null
  }

  private fireAt(target: AimTarget): void {
    if (target.kind === 'barrel') {
      this.fireAtBarrel(target.barrel)
      return
    }
    this.fireAtZombie(target.zombie)
  }

  private fireAtZombie(zombie: Zombie): void {
    this.player.muzzleFlash = 0.055
    this.shake = Math.max(this.shake, 0.7)

    const shots = clamp(this.player.bulletMultiplier, 1, 5)
    for (let i = 0; i < shots; i += 1) {
      const crit = Math.random() < GAME.player.critChance
      const damage =
        this.player.weaponDamage * (crit ? GAME.player.critMultiplier : 1)
      this.tracers.push({
        x: this.player.x + randomBetween(-0.04, 0.04),
        z: 0.6,
        targetX: zombie.x + randomBetween(-0.035, 0.035),
        targetZ: zombie.z,
        targetKind: 'zombie',
        targetId: zombie.id,
        damage,
        speed: 45,
        life: 1,
        maxLife: 1,
        crit,
      })
    }
    this.events.push({ type: 'shoot' })
  }

  private fireAtBarrel(barrel: Barrel): void {
    this.player.muzzleFlash = 0.055
    this.shake = Math.max(this.shake, 0.8)

    const shots = clamp(this.player.bulletMultiplier, 1, 5)
    for (let i = 0; i < shots; i += 1) {
      const crit = Math.random() < GAME.player.critChance
      const damage =
        this.player.weaponDamage * (crit ? GAME.player.critMultiplier : 1)
      this.tracers.push({
        x: this.player.x + randomBetween(-0.04, 0.04),
        z: 0.6,
        targetX: barrel.x + randomBetween(-0.05, 0.05),
        targetZ: barrel.z,
        targetKind: 'barrel',
        targetId: barrel.id,
        damage,
        speed: 45,
        life: 1,
        maxLife: 1,
        crit,
      })
    }
    this.events.push({ type: 'shoot' })
  }

  private updateProjectiles(dt: number): void {
    for (const projectile of this.tracers) {
      projectile.life -= dt
      const target =
        projectile.targetKind === 'zombie'
          ? this.zombies.find(
              (zombie) => zombie.id === projectile.targetId && zombie.hp > 0,
            )
          : this.barrels.find(
              (barrel) => barrel.id === projectile.targetId && barrel.hp > 0,
            )

      if (target) {
        projectile.targetX = target.x
        projectile.targetZ = target.z
      }

      const dx = projectile.targetX - projectile.x
      const dz = projectile.targetZ - projectile.z
      const distance = Math.hypot(dx, dz)
      const step = projectile.speed * dt

      if (distance <= step || projectile.life <= 0) {
        projectile.x = projectile.targetX
        projectile.z = projectile.targetZ
        if (target) this.applyProjectileHit(projectile, target)
        continue
      }

      projectile.x += (dx / distance) * step
      projectile.z += (dz / distance) * step
    }

    this.tracers = this.tracers.filter((projectile) => projectile.life > 0)
  }

  private applyProjectileHit(
    projectile: (typeof this.tracers)[number],
    target: Zombie | Barrel,
  ): void {
    if ('variant' in target) {
      target.hp -= projectile.damage
      target.hitFlash = 0.09
      this.spawnSparks(
        target.x,
        target.z,
        projectile.crit ? COLORS.gold : '#fff1bd',
        projectile.crit ? 8 : 4,
      )
      if (target.hp <= 0) {
        this.killZombie(target as Zombie, projectile.crit)
      } else {
        this.events.push({ type: 'hit', crit: projectile.crit })
      }
      return
    }

    target.hp -= projectile.damage
    target.hitFlash = 0.09
    this.spawnSparks(
      target.x,
      target.z,
      projectile.crit ? COLORS.gold : COLORS.orange,
      projectile.crit ? 8 : 4,
    )
    if (target.hp <= 0) {
      this.destroyBarrel(target as Barrel, projectile.crit)
    } else {
      this.events.push({ type: 'hit', crit: projectile.crit })
    }
  }

  private destroyBarrel(barrel: Barrel, crit: boolean): void {
    const points = Math.round(250 * this.multiplier * (crit ? 1.3 : 1))
    this.score += points
    this.shake = Math.max(this.shake, 6.5)
    this.spawnBarrelBurst(barrel.x, barrel.z)

    const blastDamage =
      GAME.barrel.blastDamage +
      Math.max(0, this.wave - 1) * GAME.barrel.blastDamagePerWave
    for (const zombie of this.zombies) {
      if (zombie.hp <= 0 || zombie.lane !== barrel.lane) continue
      if (
        Math.abs(zombie.x - barrel.x) <= GAME.barrel.blastRadiusX &&
        Math.abs(zombie.z - barrel.z) <= GAME.barrel.blastRadiusZ
      ) {
        zombie.hp -= blastDamage
        zombie.hitFlash = 0.12
        if (zombie.hp <= 0) this.killZombie(zombie, false)
      }
    }

    this.texts.push({
      x: barrel.x,
      z: barrel.z,
      y: 2.1,
      text: crit ? `CRIT +${points}` : `+${points}`,
      life: 0.75,
      maxLife: 0.75,
      color: COLORS.gold,
    })
    this.applyBarrelMultiplier(barrel)
    this.events.push({ type: 'barrel' })
  }

  private applyBarrelMultiplier(barrel: Barrel): void {
    let label = `BULLET ×${barrel.multiplier}`

    if (barrel.kind === 'soldiers') {
      this.player.squadCount = clamp(
        this.player.squadCount + barrel.value,
        1,
        GAME.player.squadMax,
      )
      label = `SQUAD +${barrel.value}`
    } else if (barrel.kind === 'minus') {
      this.player.squadCount = clamp(
        this.player.squadCount - barrel.value,
        1,
        GAME.player.squadMax,
      )
      label = `SQUAD -${barrel.value}`
    } else if (barrel.kind === 'weapon') {
      this.player.weaponLevel += 1
      this.player.weaponDamage = GAME.player.damage + (this.player.weaponLevel - 1) * 5
      this.player.weaponFireRate = 1 + (this.player.weaponLevel - 1) * 0.12
      label = 'GUN +1'
    } else if (barrel.kind === 'heal') {
      this.player.hp = Math.min(
        GAME.player.maxHp,
        this.player.hp + barrel.value,
      )
      label = `HEAL +${barrel.value}`
    } else {
      this.player.bulletMultiplier = Math.max(
        this.player.bulletMultiplier,
        barrel.multiplier,
      )
      this.player.bulletMultiplierTimer = Math.max(
        this.player.bulletMultiplierTimer,
        GAME.barrel.multiplierDuration,
      )
    }

    this.texts.push({
      x: barrel.x,
      z: barrel.z,
      y: 2.75,
      text: label,
      life: 0.85,
      maxLife: 0.85,
      color: '#ffffff',
    })
  }

  private spawnBarrelsForWave(): void {
    const desired = Math.min(
      GAME.world.barrelMaxActive,
      1 + Math.ceil(this.wave / 2),
    )
    const spawnCount = Math.max(0, desired - this.barrels.length)
    const lanes: LaneIndex[] = [1, 0, 2]
    const occupied = new Set<LaneIndex>()

    for (const barrel of this.barrels) {
      occupied.add(barrel.lane)
    }

    const available = lanes.filter((lane) => !occupied.has(lane))
    for (let i = 0; i < spawnCount; i += 1) {
      const lane = available[i] ?? lanes[i % lanes.length]
      const depth =
        lane === 1 ? randomBetween(9.5, 12) : randomBetween(7.5, 10)
      this.spawnBarrel(lane, depth)
    }
  }

  private spawnBarrel(lane: LaneIndex, z: number): void {
    const hp = Math.round(
      (GAME.barrel.baseHp + Math.max(0, this.wave - 1) * GAME.barrel.hpPerWave) *
        randomBetween(0.9, 1.1),
    )
    const multiplier = randomInt(
      GAME.barrel.multiplierMin,
      GAME.barrel.multiplierMax,
    )
    const roll = Math.random()
    const kind: GateKind =
      roll < 0.42 ? 'weapon' : roll < 0.72 ? 'heal' : 'multiplier'
    const value = kind === 'heal' ? 18 : 1

    const x = LANE_X[lane]
    this.barrels.push({
      id: this.nextBarrelId++,
      x,
      lane,
      z,
      hp,
      maxHp: hp,
      multiplier,
      kind,
      value,
      seed: Math.random() * 1000,
      hitFlash: 0,
    })
    this.spawnDust(x, z)
  }

  private killZombie(zombie: Zombie, crit: boolean): void {
    const points = Math.round(100 * this.multiplier * (crit ? 1.5 : 1))
    this.score += points
    this.kills += 1
    this.combo += 1
    this.comboTimer = 3
    this.shake = Math.max(this.shake, crit ? 3.2 : 1.6)

    this.spawnGore(zombie.x, zombie.z, crit ? 14 : 9)
    this.texts.push({
      x: zombie.x,
      z: zombie.z,
      y: 1.5,
      text: `+${points}`,
      life: 0.7,
      maxLife: 0.7,
      color: crit ? COLORS.gold : '#ffffff',
    })
    this.events.push({ type: 'kill', crit })
  }

  private triggerOverrun(): void {
    this.player.hp = 0
    this.player.grabTimer = 0
    this.player.overdriveTimer = 0
    this.player.bulletMultiplier = 1
    this.player.bulletMultiplierTimer = 0
    this.player.muzzleFlash = 0
    this.status = 'overrun'
    this.overrunTimer = GAME.contact.overrunDuration
    this.aimTarget = null
    this.hurtFlash = 1
    this.shake = Math.max(this.shake, 14)
    this.combo = 0
    this.comboTimer = 0
    this.events.push({ type: 'overrun' })
  }

  private updateOverrun(dt: number): void {
    this.time += dt
    this.overrunTimer -= dt
    this.hurtFlash = Math.max(this.hurtFlash, 0.42)
    this.shake = Math.max(this.shake - dt * 20, 3.5)

    for (const zombie of this.zombies) {
      zombie.walkPhase += dt * 5
      zombie.z = Math.max(2.0, zombie.z - dt * 2.5)
      const targetX = clamp(
        this.player.x + zombie.targetOffset * 0.35,
        -0.96,
        0.96,
      )
      zombie.x = moveToward(zombie.x, targetX, dt * 1.2)
    }

    this.updateEffects(dt)

    if (this.overrunTimer <= 0) {
      this.status = 'gameover'
      this.events.push({ type: 'gameover' })
    }
  }

  private checkWaveClear(): void {
    if (
      this.wavePhase !== 'spawning' ||
      this.waveRemaining > 0 ||
      this.zombies.length > 0
    ) {
      return
    }

    this.wavePhase = 'break'
    this.breakTimer = GAME.wave.breakDuration
    const bonus = 250 * this.wave
    this.score += bonus
    this.player.hp = Math.min(
      GAME.player.maxHp,
      this.player.hp + GAME.wave.healPerWave,
    )
    this.setBanner(
      `WAVE ${this.wave} CLEARED`,
      `+${bonus} BONUS · PATCHING UP`,
    )
    this.events.push({ type: 'wave' })
  }

  private updateEffects(dt: number): void {
    for (const particle of this.particles) {
      particle.life -= dt
      particle.x += particle.vx * dt
      particle.z += particle.vz * dt
      particle.y += particle.vy * dt
      particle.vy -= 8.5 * dt

      if (particle.y < 0) {
        particle.y = 0
        particle.vy *= -0.22
        particle.vx *= 0.7
        particle.vz *= 0.7
      }
    }
    this.particles = this.particles.filter((particle) => particle.life > 0)

    for (const text of this.texts) {
      text.life -= dt
      text.y += dt * 1.1
    }
    this.texts = this.texts.filter((text) => text.life > 0)
  }

  private spawnDust(x: number, z: number): void {
    for (let i = 0; i < 8; i += 1) {
      const angle = Math.random() * Math.PI * 2
      const speed = randomBetween(0.2, 1.1)
      this.particles.push({
        x,
        z,
        y: randomBetween(0.05, 0.5),
        vx: Math.cos(angle) * speed,
        vz: Math.sin(angle) * speed * 0.5,
        vy: randomBetween(0.2, 1.2),
        life: randomBetween(0.25, 0.55),
        maxLife: 0.55,
        size: randomBetween(3, 7),
        color: 'rgba(206, 212, 198, 0.55)',
        kind: 'dust',
      })
    }
    this.trimParticles()
  }

  private spawnBarrelBurst(x: number, z: number): void {
    this.spawnSparks(x, z, COLORS.orange, 20)
    this.spawnSparks(x, z, COLORS.gold, 10)

    for (let i = 0; i < 12; i += 1) {
      const angle = Math.random() * Math.PI * 2
      const speed = randomBetween(0.2, 1.4)
      this.particles.push({
        x,
        z,
        y: randomBetween(0.2, 1.1),
        vx: Math.cos(angle) * speed,
        vz: Math.sin(angle) * speed * 0.55,
        vy: randomBetween(0.3, 2.1),
        life: randomBetween(0.35, 0.8),
        maxLife: 0.8,
        size: randomBetween(5, 12),
        color: 'rgba(74, 60, 45, 0.55)',
        kind: 'dust',
      })
    }
    this.trimParticles()
  }

  private spawnSparks(
    x: number,
    z: number,
    color: string,
    count: number,
  ): void {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2
      const speed = randomBetween(0.5, 2.3)
      this.particles.push({
        x,
        z,
        y: randomBetween(0.75, 1.35),
        vx: Math.cos(angle) * speed,
        vz: Math.sin(angle) * speed * 0.55,
        vy: randomBetween(0.5, 3.4),
        life: randomBetween(0.16, 0.42),
        maxLife: 0.42,
        size: randomBetween(1.2, 3.1),
        color,
        kind: 'spark',
      })
    }
    this.trimParticles()
  }

  private spawnGore(x: number, z: number, count: number): void {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2
      const speed = randomBetween(0.3, 1.8)
      this.particles.push({
        x,
        z,
        y: randomBetween(0.35, 1.5),
        vx: Math.cos(angle) * speed,
        vz: Math.sin(angle) * speed * 0.6,
        vy: randomBetween(0.8, 4.1),
        life: randomBetween(0.3, 0.75),
        maxLife: 0.75,
        size: randomBetween(2, 5.2),
        color: Math.random() > 0.35 ? COLORS.blood : '#6e1f24',
        kind: 'gore',
      })
    }
    this.trimParticles()
  }

  private trimParticles(): void {
    const overflow = this.particles.length - GAME.world.maxParticles
    if (overflow > 0) this.particles.splice(0, overflow)
  }
}
