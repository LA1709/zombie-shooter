import { GAME, COLORS } from './config'
import type { GameStatus, ZombieVariant } from './config'
import type {
  AimTarget,
  Banner,
  Barrel,
  BarrelReward,
  Controls,
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
    hp: GAME.player.maxHp,
    facing: 1,
    fireTimer: 0,
    dashTimer: 0,
    dashCooldown: 0,
    dashDirection: 1,
    invulnerability: 0,
    muzzleFlash: 0,
    grabTimer: 0,
    overdriveTimer: 0,
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
      combo: this.combo,
      multiplier: this.multiplier,
      dashReady: this.player.dashCooldown <= 0,
      dashProgress: clamp(
        1 - this.player.dashCooldown / GAME.player.dashCooldown,
        0,
        1,
      ),
      grabbed: this.player.grabTimer > 0,
      grabTime: this.player.grabTimer,
      overdrive: this.player.overdriveTimer,
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

    for (let i = 0; i < vanguardCount; i += 1) {
      this.spawnZombie(randomBetween(6, 14))
    }

    this.spawnBarrelsForWave()
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
    const hp = Math.round(config.hp * randomBetween(0.88, 1.12))
    const zombie: Zombie = {
      id: this.nextZombieId++,
      x: randomBetween(-0.9, 0.9),
      z:
        zOverride ??
        GAME.world.spawnDepth + randomBetween(0, GAME.world.spawnDepthJitter),
      hp,
      maxHp: hp,
      speed: config.speed * randomBetween(0.9, 1.12),
      damage: config.damage,
      variant,
      scale: randomBetween(0.92, 1.08),
      seed: Math.random() * 1000,
      walkPhase: Math.random() * Math.PI * 2,
      attackCooldown: randomBetween(0.2, 1.1),
      hitFlash: 0,
      targetOffset: randomBetween(-0.52, 0.52),
      state: 'walking',
      grabTimer: 0,
    }
    this.zombies.push(zombie)
    if (zOverride !== undefined) this.spawnDust(zombie.x, zombie.z)
  }

  private updateZombies(dt: number): void {
    for (const zombie of this.zombies) {
      if (zombie.hp <= 0) continue
      zombie.hitFlash = Math.max(0, zombie.hitFlash - dt)
      zombie.walkPhase += zombie.speed * dt * 2.1

      if (zombie.state === 'grabbing') {
        zombie.grabTimer -= dt
        zombie.z = moveToward(
          zombie.z,
          GAME.contact.grabDepth,
          dt * 8,
        )
        const grabX = clamp(
          this.player.x + zombie.targetOffset * 0.18,
          -0.96,
          0.96,
        )
        zombie.x = moveToward(zombie.x, grabX, dt * 2.6)

        if (zombie.grabTimer <= 0) {
          zombie.state = 'walking'
          zombie.z = GAME.contact.grabDepth + 0.9
          zombie.attackCooldown = randomBetween(1.05, 1.5)
        }
        continue
      }

      if (zombie.z > GAME.world.attackDepth) {
        zombie.z = Math.max(
          GAME.world.attackDepth,
          zombie.z - zombie.speed * dt,
        )

        if (zombie.z < 10) {
          const targetX = clamp(
            this.player.x + zombie.targetOffset,
            -0.96,
            0.96,
          )
          zombie.x = moveToward(zombie.x, targetX, dt * 0.95)
        }
        continue
      }

      const targetX = clamp(
        this.player.x + zombie.targetOffset * 0.85,
        -0.96,
        0.96,
      )
      zombie.x = moveToward(zombie.x, targetX, dt * 0.65)
      zombie.attackCooldown -= dt

      if (
        zombie.attackCooldown <= 0 &&
        Math.abs(zombie.x - this.player.x) < 0.46
      ) {
        this.startGrab(zombie)
        if (this.status !== 'playing') return
      }
    }
  }

  private startGrab(zombie: Zombie): void {
    zombie.state = 'grabbing'
    zombie.grabTimer = GAME.contact.grabDuration
    zombie.z = GAME.contact.grabDepth
    zombie.x = clamp(
      this.player.x + zombie.targetOffset * 0.18,
      -0.96,
      0.96,
    )
    zombie.attackCooldown = 0
    zombie.walkPhase += Math.PI
    this.player.grabTimer = Math.max(
      this.player.grabTimer,
      GAME.contact.grabDuration + 0.08,
    )
    this.shake = Math.max(this.shake, 5)
    this.spawnSparks(zombie.x, zombie.z, COLORS.blood, 5)
    this.events.push({ type: 'grab' })
    this.damagePlayer(
      Math.ceil(zombie.damage * GAME.contact.grabDamageMultiplier),
    )
  }

  private breakGrabs(): void {
    let broken = false
    for (const zombie of this.zombies) {
      if (zombie.state !== 'grabbing') continue
      zombie.state = 'walking'
      zombie.z = GAME.contact.breakKnockbackDepth + randomBetween(0, 0.6)
      zombie.attackCooldown = GAME.contact.breakCooldown
      zombie.hitFlash = 0.08
      this.spawnDust(zombie.x, zombie.z)
      broken = true
    }

    if (!broken) return
    this.player.grabTimer = 0
    this.shake = Math.max(this.shake, 4)
    this.texts.push({
      x: this.player.x,
      z: 1.6,
      y: 1.7,
      text: 'BREAK FREE',
      life: 0.55,
      maxLife: 0.55,
      color: COLORS.cyan,
    })
  }

  private updatePlayer(dt: number, controls: Controls): void {
    const player = this.player
    player.fireTimer -= dt
    player.invulnerability = Math.max(0, player.invulnerability - dt)
    player.dashCooldown = Math.max(0, player.dashCooldown - dt)
    player.grabTimer = Math.max(0, player.grabTimer - dt)
    player.overdriveTimer = Math.max(0, player.overdriveTimer - dt)

    let axis = controls.moveAxis
    if (axis === 0 && controls.pointerX !== null) {
      const delta = controls.pointerX - player.x
      if (Math.abs(delta) > 0.012) {
        axis = clamp(delta * 6, -1, 1)
      }
    }

    if (controls.dashPressed && player.dashCooldown <= 0) {
      if (player.grabTimer > 0) this.breakGrabs()
      const direction: 1 | -1 =
        axis !== 0
          ? (Math.sign(axis) as 1 | -1)
          : controls.pointerX !== null &&
              Math.abs(controls.pointerX - player.x) > 0.04
            ? (Math.sign(controls.pointerX - player.x) as 1 | -1)
            : player.facing
      player.dashDirection = direction
      player.dashTimer = GAME.player.dashDuration
      player.dashCooldown = GAME.player.dashCooldown
      player.invulnerability = Math.max(
        player.invulnerability,
        GAME.player.dashDuration + 0.08,
      )
      player.facing = direction
      this.shake = Math.max(this.shake, 2.5)
      this.events.push({ type: 'dash' })
    }

    if (player.dashTimer > 0) {
      player.dashTimer = Math.max(0, player.dashTimer - dt)
      player.x += player.dashDirection * GAME.player.dashSpeed * dt
      this.spawnDashTrail()
    } else {
      const moveScale =
        player.grabTimer > 0 ? GAME.contact.grabMoveSlow : 1
      player.x += axis * GAME.player.speed * moveScale * dt
      if (axis !== 0) player.facing = axis > 0 ? 1 : -1
    }

    player.x = clamp(player.x, -0.96, 0.96)

    const target = this.findTarget()
    this.aimTarget = target
    if (target && player.fireTimer <= 0) {
      this.fireAt(target)
      player.fireTimer =
        GAME.player.fireInterval *
        (player.overdriveTimer > 0 ? GAME.player.overdriveMultiplier : 1)
    }
  }

  private findTarget(): AimTarget | null {
    let best: AimTarget | null = null
    let bestScore = Number.POSITIVE_INFINITY

    for (const zombie of this.zombies) {
      if (zombie.hp <= 0) continue
      const threat =
        zombie.z + Math.abs(zombie.x - this.player.x) * 3.2
      if (threat < bestScore) {
        bestScore = threat
        best = { kind: 'zombie', zombie }
      }
    }

    for (const barrel of this.barrels) {
      if (barrel.hp <= 0) continue
      const alignment = Math.abs(barrel.x - this.player.x)
      if (alignment > GAME.world.barrelMaxAlignment) continue
      const threat = barrel.z + alignment * 1.6 - 1.8
      if (threat < bestScore) {
        bestScore = threat
        best = { kind: 'barrel', barrel }
      }
    }

    return best
  }

  private fireAt(target: AimTarget): void {
    if (target.kind === 'barrel') {
      this.fireAtBarrel(target.barrel)
      return
    }
    this.fireAtZombie(target.zombie)
  }

  private fireAtZombie(zombie: Zombie): void {
    const crit = Math.random() < GAME.player.critChance
    const damage =
      GAME.player.damage * (crit ? GAME.player.critMultiplier : 1)

    zombie.hp -= damage
    zombie.hitFlash = 0.09
    this.player.muzzleFlash = 0.055
    this.shake = Math.max(this.shake, 0.7)

    this.tracers.push({
      targetX: zombie.x,
      targetZ: zombie.z,
      life: 0.12,
      maxLife: 0.12,
      crit,
    })
    this.spawnSparks(
      zombie.x,
      zombie.z,
      crit ? COLORS.gold : '#fff1bd',
      crit ? 8 : 4,
    )
    this.events.push({ type: 'shoot', crit })

    if (zombie.hp <= 0) {
      this.killZombie(zombie, crit)
    } else {
      this.events.push({ type: 'hit', crit })
    }
  }

  private fireAtBarrel(barrel: Barrel): void {
    const crit = Math.random() < GAME.player.critChance
    const damage =
      GAME.player.damage * (crit ? GAME.player.critMultiplier : 1)

    barrel.hp -= damage
    barrel.hitFlash = 0.09
    this.player.muzzleFlash = 0.055
    this.shake = Math.max(this.shake, 0.8)

    this.tracers.push({
      targetX: barrel.x,
      targetZ: barrel.z,
      life: 0.12,
      maxLife: 0.12,
      crit,
    })
    this.spawnSparks(
      barrel.x,
      barrel.z,
      crit ? COLORS.gold : COLORS.orange,
      crit ? 8 : 4,
    )
    this.events.push({ type: 'shoot', crit })

    if (barrel.hp <= 0) {
      this.destroyBarrel(barrel, crit)
    } else {
      this.events.push({ type: 'hit', crit })
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
      if (zombie.hp <= 0) continue
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
    this.applyBarrelReward(barrel)
    this.events.push({ type: 'barrel' })
  }

  private applyBarrelReward(barrel: Barrel): void {
    if (barrel.reward === 'medkit') {
      const before = this.player.hp
      this.player.hp = Math.min(
        GAME.player.maxHp,
        this.player.hp + GAME.barrel.heal,
      )
      const healed = Math.round(this.player.hp - before)
      this.texts.push({
        x: barrel.x,
        z: barrel.z,
        y: 2.75,
        text: healed > 0 ? `MEDKIT +${healed}` : 'MEDKIT',
        life: 0.8,
        maxLife: 0.8,
        color: COLORS.lime,
      })
      return
    }

    if (barrel.reward === 'overdrive') {
      this.player.overdriveTimer = Math.max(
        this.player.overdriveTimer,
        GAME.barrel.overdriveDuration,
      )
      this.texts.push({
        x: barrel.x,
        z: barrel.z,
        y: 2.75,
        text: 'OVERDRIVE',
        life: 0.8,
        maxLife: 0.8,
        color: COLORS.cyan,
      })
      return
    }

    const bonus = Math.round(GAME.barrel.scoreBonus * this.multiplier)
    this.score += bonus
    this.texts.push({
      x: barrel.x,
      z: barrel.z,
      y: 2.75,
      text: `+${bonus}`,
      life: 0.8,
      maxLife: 0.8,
      color: COLORS.gold,
    })
  }

  private spawnBarrelsForWave(): void {
    const desired = Math.min(
      GAME.world.barrelMaxActive,
      1 + Math.ceil(this.wave / 2),
    )
    const spawnCount = Math.max(0, desired - this.barrels.length)
    const lanes = [0, -0.58, 0.58]
    const occupied = new Set<number>()

    for (const barrel of this.barrels) {
      if (Math.abs(barrel.x) < 0.22) occupied.add(0)
      else occupied.add(barrel.x < 0 ? -0.58 : 0.58)
    }

    const available = lanes.filter((lane) => !occupied.has(lane))
    for (let i = 0; i < spawnCount; i += 1) {
      const lane = available[i] ?? lanes[i % lanes.length]
      const depth =
        lane === 0
          ? randomBetween(9.5, 12)
          : randomBetween(7.5, 10)
      this.spawnBarrel(lane + randomBetween(-0.06, 0.06), depth)
    }
  }

  private spawnBarrel(x: number, z: number): void {
    const hp = Math.round(
      (GAME.barrel.baseHp + Math.max(0, this.wave - 1) * GAME.barrel.hpPerWave) *
        randomBetween(0.9, 1.1),
    )
    const roll = Math.random()
    const reward: BarrelReward =
      roll < 0.38 ? 'medkit' : roll < 0.68 ? 'overdrive' : 'score'

    this.barrels.push({
      id: this.nextBarrelId++,
      x: clamp(x, -0.88, 0.88),
      z,
      hp,
      maxHp: hp,
      reward,
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

  private damagePlayer(amount: number): void {
    if (this.player.invulnerability > 0 || this.status !== 'playing') return

    this.player.hp = Math.max(0, this.player.hp - amount)
    this.player.invulnerability = GAME.player.hurtInvulnerability
    this.hurtFlash = 0.55
    this.shake = Math.max(this.shake, 8)
    this.combo = 0
    this.comboTimer = 0
    this.events.push({ type: 'hurt' })

    if (this.player.hp <= 0) this.triggerOverrun()
  }

  private triggerOverrun(): void {
    this.player.hp = 0
    this.player.grabTimer = 0
    this.player.overdriveTimer = 0
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

    for (const tracer of this.tracers) tracer.life -= dt
    this.tracers = this.tracers.filter((tracer) => tracer.life > 0)

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

  private spawnDashTrail(): void {
    if (Math.random() > 0.7) return
    this.particles.push({
      x: this.player.x + randomBetween(-0.06, 0.06),
      z: 0.3,
      y: randomBetween(0.2, 1.1),
      vx: randomBetween(-0.25, 0.25),
      vz: randomBetween(-0.3, 0.3),
      vy: randomBetween(-0.1, 0.35),
      life: 0.28,
      maxLife: 0.28,
      size: randomBetween(3, 7),
      color: COLORS.cyan,
      kind: 'dash',
    })
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
