import { COLORS, GAME } from './config'
import type { GameWorld } from './GameWorld'
import type { Barrel, Particle, Zombie } from './types'
import { clamp } from './math'
import { PLAYER_MUZZLE, SpriteBank } from './SpriteBank'

interface ProjectedPoint {
  x: number
  y: number
  scale: number
}

const FOCAL_LENGTH = 12
const ROAD_SCREEN_HALF = 0.44
const BRIDGE_FAR_DEPTH = 400
const HORIZON_RATIO = 0.235
const GROUND_RATIO = 0.865

export class Renderer {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly sprites = new SpriteBank()
  private readonly resizeObserver: ResizeObserver
  private width = 1
  private height = 1
  private dpr = 1
  private elapsed = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('Canvas 2D is not supported in this browser.')
    this.ctx = ctx
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(canvas)
    this.resize()
  }

  destroy(): void {
    this.resizeObserver.disconnect()
  }

  render(world: GameWorld, dt: number): void {
    this.elapsed += dt
    const ctx = this.ctx
    const { width, height } = this

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.fillStyle = '#0c5064'
    ctx.fillRect(0, 0, width, height)

    const shakeX = world.shake > 0 ? (Math.random() * 2 - 1) * world.shake : 0
    const shakeY = world.shake > 0 ? (Math.random() * 2 - 1) * world.shake : 0

    ctx.save()
    ctx.translate(shakeX, shakeY)
    this.drawBackdrop()
    this.drawBridge()
    this.drawWorld(world)
    ctx.restore()

    this.drawScreenEffects(world)
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return

    this.width = rect.width
    this.height = rect.height
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.round(rect.width * this.dpr)
    this.canvas.height = Math.round(rect.height * this.dpr)
  }

  private project(x: number, z: number): ProjectedPoint {
    const depth = Math.max(0, z)
    const scale = FOCAL_LENGTH / (FOCAL_LENGTH + depth)
    return {
      x: this.width * 0.5 + x * this.width * ROAD_SCREEN_HALF * scale,
      y:
        this.height * HORIZON_RATIO +
        this.height * (GROUND_RATIO - HORIZON_RATIO) * scale,
      scale,
    }
  }

  private drawBackdrop(): void {
    const { ctx, width, height } = this
    const horizon = height * HORIZON_RATIO

    const sky = ctx.createLinearGradient(0, -30, 0, horizon + 10)
    sky.addColorStop(0, '#78cfdf')
    sky.addColorStop(0.62, '#b7e9e9')
    sky.addColorStop(1, '#e8f6e8')
    ctx.fillStyle = sky
    ctx.fillRect(-30, -30, width + 60, horizon + 40)

    const sea = ctx.createLinearGradient(0, horizon, 0, height + 30)
    sea.addColorStop(0, '#53b9c8')
    sea.addColorStop(0.25, '#2a93aa')
    sea.addColorStop(0.72, '#16738c')
    sea.addColorStop(1, '#0d536b')
    ctx.fillStyle = sea
    ctx.fillRect(-30, horizon, width + 60, height - horizon + 60)

    // Sun haze
    const sun = ctx.createRadialGradient(
      width * 0.76,
      height * 0.08,
      0,
      width * 0.76,
      height * 0.08,
      height * 0.3,
    )
    sun.addColorStop(0, 'rgba(255, 250, 205, 0.55)')
    sun.addColorStop(0.35, 'rgba(255, 244, 190, 0.18)')
    sun.addColorStop(1, 'rgba(255, 244, 190, 0)')
    ctx.fillStyle = sun
    ctx.fillRect(0, 0, width, height * 0.5)

    // Clouds
    for (let i = 0; i < 5; i += 1) {
      const drift = this.elapsed * (3 + i * 0.8)
      const x = ((i * 0.29 + 0.08) * width + drift) % (width + 180) - 90
      const y = height * (0.045 + (i % 3) * 0.036)
      this.drawCloud(x, y, 0.75 + (i % 3) * 0.18, 0.14 + (i % 2) * 0.04)
    }

    // Horizon haze
    const haze = ctx.createLinearGradient(0, horizon - 10, 0, horizon + 48)
    haze.addColorStop(0, 'rgba(236, 252, 240, 0)')
    haze.addColorStop(0.45, 'rgba(221, 248, 235, 0.36)')
    haze.addColorStop(1, 'rgba(190, 238, 229, 0)')
    ctx.fillStyle = haze
    ctx.fillRect(0, horizon - 10, width, 62)

    // Distant ships
    this.drawShip(width * 0.13, horizon + height * 0.012, 0.8)
    this.drawShip(width * 0.86, horizon + height * 0.02, 0.58)

    // Ocean glints
    ctx.save()
    ctx.lineCap = 'round'
    for (let i = 0; i < 34; i += 1) {
      const t = i / 34
      const y = horizon + Math.pow(t, 1.55) * (height - horizon)
      const wave = Math.sin(this.elapsed * 0.8 + i * 1.7) * 0.5 + 0.5
      const lineWidth = 8 + t * 52
      const alpha = 0.04 + t * 0.11 + wave * 0.035
      ctx.strokeStyle = `rgba(203, 255, 250, ${alpha.toFixed(3)})`
      ctx.lineWidth = 1 + t * 2
      for (let j = 0; j < 4; j += 1) {
        const x =
          ((j * 0.27 + 0.04 + Math.sin(i * 2.3 + j) * 0.04 + this.elapsed * 0.004) %
            1.08) *
          width
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + lineWidth, y)
        ctx.stroke()
      }
    }
    ctx.restore()
  }

  private drawCloud(x: number, y: number, scale: number, alpha: number): void {
    const { ctx } = this
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.ellipse(x, y, 42 * scale, 15 * scale, 0, 0, Math.PI * 2)
    ctx.ellipse(x - 28 * scale, y + 4 * scale, 26 * scale, 11 * scale, 0, 0, Math.PI * 2)
    ctx.ellipse(x + 32 * scale, y + 5 * scale, 30 * scale, 10 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  private drawShip(x: number, y: number, scale: number): void {
    const { ctx } = this
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(scale, scale)
    ctx.globalAlpha = 0.38
    ctx.fillStyle = '#315963'
    ctx.beginPath()
    ctx.moveTo(-46, 0)
    ctx.lineTo(48, 0)
    ctx.lineTo(36, 10)
    ctx.lineTo(-34, 10)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#e8e5ce'
    for (let i = 0; i < 4; i += 1) {
      ctx.fillRect(-32 + i * 16, -8, 12, 8)
    }
    ctx.fillStyle = '#d8d3b9'
    ctx.fillRect(32, -15, 8, 15)
    ctx.restore()
  }

  private drawBridge(): void {
    const { ctx, width, height } = this

    // Concrete bridge body
    const nearLeft = this.project(-1.17, 0)
    const nearRight = this.project(1.17, 0)
    const farLeft = this.project(-1.17, BRIDGE_FAR_DEPTH)
    const farRight = this.project(1.17, BRIDGE_FAR_DEPTH)
    const concrete = ctx.createLinearGradient(0, farLeft.y, 0, height)
    concrete.addColorStop(0, '#c7c9b9')
    concrete.addColorStop(0.35, '#b4b5a6')
    concrete.addColorStop(1, '#8d8e83')
    ctx.fillStyle = concrete
    ctx.beginPath()
    ctx.moveTo(nearLeft.x, nearLeft.y)
    ctx.lineTo(nearRight.x, nearRight.y)
    ctx.lineTo(farRight.x, farRight.y)
    ctx.lineTo(farLeft.x, farLeft.y)
    ctx.closePath()
    ctx.fill()

    // Asphalt
    const nearRoadLeft = this.project(-1, 0)
    const nearRoadRight = this.project(1, 0)
    const farRoadLeft = this.project(-1, BRIDGE_FAR_DEPTH)
    const farRoadRight = this.project(1, BRIDGE_FAR_DEPTH)
    const asphalt = ctx.createLinearGradient(0, farRoadLeft.y, 0, height)
    asphalt.addColorStop(0, '#757b80')
    asphalt.addColorStop(0.3, '#5b6168')
    asphalt.addColorStop(1, '#3e434a')
    ctx.fillStyle = asphalt
    ctx.beginPath()
    ctx.moveTo(nearRoadLeft.x, nearRoadLeft.y)
    ctx.lineTo(nearRoadRight.x, nearRoadRight.y)
    ctx.lineTo(farRoadRight.x, farRoadRight.y)
    ctx.lineTo(farRoadLeft.x, farRoadLeft.y)
    ctx.closePath()
    ctx.fill()

    // Shoulder seams
    ctx.strokeStyle = 'rgba(32, 42, 43, 0.35)'
    ctx.lineWidth = 1.2
    for (let z = 2; z < 70; z += 6) {
      const a = this.project(-1.17, z)
      const b = this.project(-1, z)
      const c = this.project(1.17, z)
      const d = this.project(1, z)
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(c.x, c.y)
      ctx.lineTo(d.x, d.y)
      ctx.stroke()
    }

    // Expansion joints
    ctx.strokeStyle = 'rgba(24, 31, 34, 0.3)'
    ctx.lineWidth = 2
    for (let z = 10; z < 90; z += 16) {
      const left = this.project(-0.98, z)
      const right = this.project(0.98, z)
      ctx.beginPath()
      ctx.moveTo(left.x, left.y)
      ctx.lineTo(right.x, right.y)
      ctx.stroke()
    }

    // Solid edge lines
    this.drawRoadQuad(-0.955, -0.93, 0, 100, 'rgba(235, 240, 228, 0.6)')
    this.drawRoadQuad(0.93, 0.955, 0, 100, 'rgba(235, 240, 228, 0.6)')

    // Dashed center line
    for (let z = 1.2; z < 90; z += 5.4) {
      this.drawRoadQuad(-0.014, 0.014, z, z + 2.7, 'rgba(245, 247, 233, 0.82)')
    }

    // Faint tire wear
    ctx.fillStyle = 'rgba(30, 35, 39, 0.12)'
    for (const x of [-0.56, -0.18, 0.18, 0.56]) {
      const a = this.project(x - 0.045, 0)
      const b = this.project(x + 0.045, 0)
      const c = this.project(x + 0.04, 90)
      const d = this.project(x - 0.04, 90)
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.lineTo(c.x, c.y)
      ctx.lineTo(d.x, d.y)
      ctx.closePath()
      ctx.fill()
    }

    // Guard rails
    this.drawRailing(-1.15)
    this.drawRailing(1.15)

    // Static roadside cones
    this.drawCone(-0.87, 13.5)
    this.drawCone(0.9, 21)
    this.drawCone(-0.91, 30)

    // Distant bridge fade
    const fade = ctx.createLinearGradient(0, farLeft.y - 4, 0, farLeft.y + height * 0.13)
    fade.addColorStop(0, 'rgba(224, 248, 238, 0.48)')
    fade.addColorStop(1, 'rgba(224, 248, 238, 0)')
    ctx.fillStyle = fade
    ctx.fillRect(0, farLeft.y - 4, width, height * 0.14)
  }

  private drawRoadQuad(
    leftX: number,
    rightX: number,
    nearZ: number,
    farZ: number,
    color: string,
  ): void {
    const { ctx } = this
    const a = this.project(leftX, nearZ)
    const b = this.project(rightX, nearZ)
    const c = this.project(rightX, farZ)
    const d = this.project(leftX, farZ)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.lineTo(c.x, c.y)
    ctx.lineTo(d.x, d.y)
    ctx.closePath()
    ctx.fill()
  }

  private drawRailing(x: number): void {
    const { ctx, height } = this
    const posts: Array<{ x: number; baseY: number; topY: number; scale: number }> = []

    for (let z = 0; z <= 52; z += 3.1) {
      const point = this.project(x, z)
      const postHeight = height * 0.05 * point.scale
      posts.push({
        x: point.x,
        baseY: point.y,
        topY: point.y - postHeight,
        scale: point.scale,
      })
    }

    // Rails first so posts sit on top.
    for (const railOffset of [0, 0.42, 0.8]) {
      for (let i = 0; i < posts.length - 1; i += 1) {
        const a = posts[i]
        const b = posts[i + 1]
        const aY = a.baseY - (a.baseY - a.topY) * (1 - railOffset)
        const bY = b.baseY - (b.baseY - b.topY) * (1 - railOffset)
        ctx.strokeStyle =
          railOffset === 0 ? '#eef1e7' : 'rgba(222, 228, 216, 0.86)'
        ctx.lineWidth = Math.max(1, 2.7 * ((a.scale + b.scale) * 0.5))
        ctx.beginPath()
        ctx.moveTo(a.x, aY)
        ctx.lineTo(b.x, bY)
        ctx.stroke()
      }
    }

    for (const post of posts) {
      const postHeight = post.baseY - post.topY
      ctx.strokeStyle = '#dce1d5'
      ctx.lineWidth = Math.max(1.5, 4.4 * post.scale)
      ctx.beginPath()
      ctx.moveTo(post.x, post.baseY)
      ctx.lineTo(post.x, post.topY)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(56, 67, 66, 0.5)'
      ctx.lineWidth = Math.max(1, 1.4 * post.scale)
      ctx.beginPath()
      ctx.moveTo(post.x + 1.5 * post.scale, post.baseY)
      ctx.lineTo(post.x + 1.5 * post.scale, post.topY + postHeight * 0.1)
      ctx.stroke()
    }
  }

  private drawCone(x: number, z: number): void {
    const { ctx, height } = this
    const p = this.project(x, z)
    const coneHeight = height * 0.036 * p.scale
    const coneWidth = coneHeight * 0.52

    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.beginPath()
    ctx.ellipse(0, 0, coneWidth * 0.72, coneHeight * 0.12, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#f07b1f'
    ctx.strokeStyle = '#2b2d2b'
    ctx.lineWidth = Math.max(1, 1.7 * p.scale)
    ctx.beginPath()
    ctx.moveTo(0, -coneHeight)
    ctx.lineTo(coneWidth * 0.45, 0)
    ctx.lineTo(-coneWidth * 0.45, 0)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#f3ede0'
    ctx.fillRect(
      -coneWidth * 0.27,
      -coneHeight * 0.54,
      coneWidth * 0.54,
      Math.max(1.5, coneHeight * 0.14),
    )
    ctx.fillStyle = '#f07b1f'
    ctx.fillRect(
      -coneWidth * 0.32,
      -coneHeight * 0.12,
      coneWidth * 0.64,
      Math.max(1.5, coneHeight * 0.12),
    )
    ctx.restore()
  }

  private drawWorld(world: GameWorld): void {
    const entities: Array<
      | { kind: 'zombie'; z: number; zombie: Zombie }
      | { kind: 'barrel'; z: number; barrel: Barrel }
    > = [
      ...world.zombies
        .filter((zombie) => zombie.hp > 0)
        .map((zombie) => ({
          kind: 'zombie' as const,
          z: zombie.z,
          zombie,
        })),
      ...world.barrels
        .filter((barrel) => barrel.hp > 0)
        .map((barrel) => ({
          kind: 'barrel' as const,
          z: barrel.z,
          barrel,
        })),
    ].sort((a, b) => b.z - a.z)

    for (const entity of entities) {
      if (entity.kind === 'zombie') {
        this.drawZombie(entity.zombie, world.time)
      } else {
        this.drawBarrel(entity.barrel, world.time)
      }
    }

    this.drawTracers(world)
    this.drawPlayer(world)
    this.drawParticles(world.particles)
    if (world.status !== 'overrun') this.drawBarrelLabels(world)
    this.drawFloatingTexts(world)
    this.drawAimTarget(world)
  }

  private drawZombie(zombie: Zombie, time: number): void {
    const { ctx, height } = this
    const point = this.project(zombie.x, zombie.z)
    const spriteHeight = height * 0.27 * point.scale * zombie.scale
    const spriteWidth = spriteHeight * (180 / 280)
    const bob = Math.sin(zombie.walkPhase + time * 1.7) * 2.2 * point.scale
    const groundY = point.y + bob
    const frame =
      zombie.state === 'grabbing' ? 2 : Math.floor(zombie.walkPhase) % 3
    const sprite = this.sprites.zombies[zombie.variant][frame]

    // Shadow
    ctx.fillStyle = `rgba(7, 18, 20, ${0.26 * point.scale})`
    ctx.beginPath()
    ctx.ellipse(
      point.x,
      point.y + 2,
      spriteWidth * 0.43,
      spriteWidth * 0.13,
      0,
      0,
      Math.PI * 2,
    )
    ctx.fill()

    ctx.save()
    if (zombie.hitFlash > 0) {
      ctx.filter = 'brightness(2.6) saturate(0.35)'
    }
    ctx.drawImage(
      sprite,
      point.x - spriteWidth / 2,
      groundY - spriteHeight,
      spriteWidth,
      spriteHeight,
    )
    ctx.restore()

    if (zombie.hp < zombie.maxHp) {
      const barWidth = Math.max(22, spriteWidth * 0.58)
      const barHeight = Math.max(3, 4.2 * point.scale)
      const barY = groundY - spriteHeight - barHeight - 7 * point.scale
      ctx.fillStyle = 'rgba(8, 17, 18, 0.72)'
      ctx.fillRect(point.x - barWidth / 2 - 1, barY - 1, barWidth + 2, barHeight + 2)
      ctx.fillStyle = zombie.hp / zombie.maxHp > 0.35 ? COLORS.lime : '#ff6b4a'
      ctx.fillRect(
        point.x - barWidth / 2,
        barY,
        barWidth * clamp(zombie.hp / zombie.maxHp, 0, 1),
        barHeight,
      )
    }
  }

  private drawBarrel(barrel: Barrel, time: number): void {
    const { ctx, height } = this
    const point = this.project(barrel.x, barrel.z)
    const spriteHeight = height * 0.155 * point.scale
    const spriteWidth = spriteHeight * 0.8
    const bob = Math.sin(time * 2.2 + barrel.seed) * 1.4 * point.scale
    const groundY = point.y + bob

    ctx.fillStyle = `rgba(7, 18, 20, ${0.28 * point.scale})`
    ctx.beginPath()
    ctx.ellipse(
      point.x,
      point.y + 2,
      spriteWidth * 0.46,
      spriteWidth * 0.14,
      0,
      0,
      Math.PI * 2,
    )
    ctx.fill()

    ctx.save()
    if (barrel.hitFlash > 0) {
      ctx.filter = 'brightness(2.2) saturate(0.6)'
    }
    ctx.drawImage(
      this.sprites.barrel,
      point.x - spriteWidth / 2,
      groundY - spriteHeight,
      spriteWidth,
      spriteHeight,
    )
    ctx.restore()
  }

  private drawBarrelLabels(world: GameWorld): void {
    const { ctx, height } = this
    for (const barrel of world.barrels) {
      if (barrel.hp <= 0) continue
      const point = this.project(barrel.x, barrel.z)
      const spriteHeight = height * 0.155 * point.scale
      const bob =
        Math.sin(world.time * 2.2 + barrel.seed) * 1.4 * point.scale
      const numberY = point.y + bob - spriteHeight * 0.55
      const fontSize = clamp(44 * point.scale, 17, 46)
      const label = `${Math.max(0, Math.ceil(barrel.hp))}`
      const labelColor =
        barrel.reward === 'medkit'
          ? COLORS.lime
          : barrel.reward === 'overdrive'
            ? COLORS.cyan
            : COLORS.gold

      ctx.save()
      ctx.font = `900 ${fontSize}px "Arial Black", Impact, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = Math.max(3, fontSize * 0.22)
      ctx.strokeStyle = 'rgba(8, 16, 18, 0.92)'
      ctx.strokeText(label, point.x, numberY)
      ctx.fillStyle = labelColor
      ctx.fillText(label, point.x, numberY)
      ctx.restore()
    }
  }

  private drawPlayer(world: GameWorld): void {
    const { ctx, height } = this
    const player = world.player
    const point = this.project(player.x, 0)
    const spriteHeight = height * 0.285
    const spriteWidth = spriteHeight * (180 / 280)
    const idleBob = Math.sin(world.time * 6) * 1.2
    const overrunProgress =
      world.status === 'overrun'
        ? clamp(1 - world.overrunTimer / GAME.contact.overrunDuration, 0, 1)
        : 0
    const grabShake =
      player.grabTimer > 0 ? Math.sin(world.time * 42) * 2.4 : 0
    const groundY = point.y + idleBob + overrunProgress * height * 0.045
    const flicker =
      player.invulnerability > 0 &&
      player.dashTimer <= 0 &&
      overrunProgress === 0 &&
      Math.floor(world.time * 24) % 2 === 0
        ? 0.55
        : 1

    // Shadow
    ctx.fillStyle = 'rgba(5, 16, 19, 0.34)'
    ctx.beginPath()
    ctx.ellipse(
      point.x,
      point.y + 4,
      spriteWidth * 0.46,
      spriteWidth * 0.14,
      0,
      0,
      Math.PI * 2,
    )
    ctx.fill()

    ctx.save()
    ctx.globalAlpha = flicker
    ctx.translate(point.x + grabShake, groundY)
    ctx.scale(player.facing, 1)
    ctx.rotate(
      overrunProgress * 0.55 +
        (player.grabTimer > 0 ? Math.sin(world.time * 42) * 0.018 : 0),
    )
    ctx.drawImage(
      this.sprites.player,
      -spriteWidth / 2,
      -spriteHeight,
      spriteWidth,
      spriteHeight,
    )

    if (player.grabTimer > 0 && overrunProgress === 0) {
      this.drawGrabHands(spriteWidth, spriteHeight)
    }
    ctx.restore()

    if (player.muzzleFlash > 0) {
      const muzzle = this.getMuzzlePosition(world)
      const strength = player.muzzleFlash / 0.055
      this.drawMuzzleFlash(muzzle.x, muzzle.y, strength, world.time)
    }

    if (player.dashTimer > 0) {
      this.drawDashStreaks(point.x, groundY - spriteHeight * 0.5)
    }
  }

  private drawGrabHands(width: number, height: number): void {
    const { ctx } = this
    const handY = -height * 0.64

    for (const side of [-1, 1]) {
      ctx.save()
      ctx.translate(side * width * 0.29, handY)
      ctx.rotate(side * 0.16)
      ctx.fillStyle = '#a8bd72'
      ctx.strokeStyle = '#142125'
      ctx.lineWidth = Math.max(2, width * 0.018)
      ctx.beginPath()
      ctx.ellipse(0, 0, width * 0.105, height * 0.045, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      ctx.lineWidth = Math.max(1.5, width * 0.012)
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath()
        ctx.moveTo(i * width * 0.035, -height * 0.01)
        ctx.lineTo(i * width * 0.042, height * 0.034)
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  private getMuzzlePosition(world: GameWorld): { x: number; y: number } {
    const point = this.project(world.player.x, 0)
    const spriteHeight = this.height * 0.285
    const spriteWidth = spriteHeight * (180 / 280)
    return {
      x: point.x + world.player.facing * spriteWidth * PLAYER_MUZZLE.x,
      y: point.y - spriteHeight * PLAYER_MUZZLE.y,
    }
  }

  private drawMuzzleFlash(
    x: number,
    y: number,
    strength: number,
    time: number,
  ): void {
    const { ctx } = this
    const size = 16 + strength * 18
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(time * 17)
    ctx.globalCompositeOperation = 'lighter'
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, size)
    glow.addColorStop(0, 'rgba(255, 255, 231, 0.95)')
    glow.addColorStop(0.3, 'rgba(255, 226, 93, 0.85)')
    glow.addColorStop(1, 'rgba(255, 156, 20, 0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(0, 0, size, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#fffbe2'
    ctx.beginPath()
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2
      const radius = i % 2 === 0 ? size * 0.8 : size * 0.28
      const px = Math.cos(angle) * radius
      const py = Math.sin(angle) * radius
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  private drawTracers(world: GameWorld): void {
    const { ctx } = this
    const muzzle = this.getMuzzlePosition(world)
    for (const tracer of world.tracers) {
      const target = this.project(tracer.targetX, tracer.targetZ)
      const alpha = clamp(tracer.life / tracer.maxLife, 0, 1)
      const width = (tracer.crit ? 3.6 : 2.2) * (0.7 + target.scale * 0.5)
      const color = tracer.crit ? '#ffd23f' : '#ffed9e'

      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = alpha
      ctx.strokeStyle = color
      ctx.shadowColor = tracer.crit ? COLORS.gold : '#fff1a8'
      ctx.shadowBlur = 12
      ctx.lineWidth = width + 2
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(muzzle.x, muzzle.y)
      ctx.lineTo(target.x, target.y - this.height * 0.14 * target.scale)
      ctx.stroke()

      ctx.strokeStyle = '#fffdf0'
      ctx.shadowBlur = 4
      ctx.lineWidth = Math.max(1, width * 0.45)
      ctx.beginPath()
      ctx.moveTo(muzzle.x, muzzle.y)
      ctx.lineTo(target.x, target.y - this.height * 0.14 * target.scale)
      ctx.stroke()

      const impact = ctx.createRadialGradient(
        target.x,
        target.y - this.height * 0.14 * target.scale,
        0,
        target.x,
        target.y - this.height * 0.14 * target.scale,
        18 * target.scale,
      )
      impact.addColorStop(0, 'rgba(255, 255, 226, 0.8)')
      impact.addColorStop(1, 'rgba(255, 180, 30, 0)')
      ctx.fillStyle = impact
      ctx.beginPath()
      ctx.arc(
        target.x,
        target.y - this.height * 0.14 * target.scale,
        18 * target.scale,
        0,
        Math.PI * 2,
      )
      ctx.fill()
      ctx.restore()
    }
  }

  private drawParticles(particles: Particle[]): void {
    const { ctx, height } = this
    for (const particle of particles) {
      const point = this.project(particle.x, particle.z)
      const radius = Math.max(1, particle.size * point.scale)
      const screenY =
        point.y - particle.y * height * 0.16 * point.scale
      const alpha = clamp(particle.life / particle.maxLife, 0, 1)

      ctx.save()
      ctx.globalAlpha = alpha
      if (particle.kind === 'spark' || particle.kind === 'dash') {
        ctx.globalCompositeOperation = 'lighter'
        ctx.shadowColor = particle.color
        ctx.shadowBlur = 8 * point.scale
      }
      ctx.fillStyle = particle.color
      ctx.beginPath()
      ctx.arc(point.x, screenY, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  private drawFloatingTexts(world: GameWorld): void {
    const { ctx, height } = this
    for (const text of world.texts) {
      const point = this.project(text.x, text.z)
      const size = Math.max(11, 22 * point.scale)
      const y = point.y - text.y * height * 0.16 * point.scale
      const alpha = clamp(text.life / text.maxLife, 0, 1)

      ctx.save()
      ctx.globalAlpha = alpha
      ctx.font = `900 ${size}px "Arial Black", Impact, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = Math.max(2, size * 0.2)
      ctx.strokeStyle = 'rgba(10, 20, 22, 0.8)'
      ctx.strokeText(text.text, point.x, y)
      ctx.fillStyle = text.color
      ctx.fillText(text.text, point.x, y)
      ctx.restore()
    }
  }

  private drawAimTarget(world: GameWorld): void {
    const target = world.aimTarget
    if (!target) return

    let point: ProjectedPoint
    let centerY: number
    let size: number
    let color: string

    if (target.kind === 'zombie') {
      const zombie = target.zombie
      if (zombie.hp <= 0) return
      point = this.project(zombie.x, zombie.z)
      const verticalOffset = zombie.state === 'grabbing' ? 0.27 : 0.14
      centerY = point.y - this.height * verticalOffset * point.scale
      size = clamp(48 * point.scale, 18, 56)
      color = COLORS.lime
    } else {
      const barrel = target.barrel
      if (barrel.hp <= 0) return
      point = this.project(barrel.x, barrel.z)
      centerY = point.y - this.height * 0.085 * point.scale
      size = clamp(58 * point.scale, 24, 66)
      color = COLORS.orange
    }

    const pulse = 1 + Math.sin(this.elapsed * 8) * 0.06
    const scaled = size * pulse
    const half = scaled / 2
    const arm = scaled * 0.3
    const { ctx } = this

    ctx.save()
    ctx.strokeStyle = color
    ctx.shadowColor = color
    ctx.shadowBlur = 8
    ctx.lineWidth = Math.max(1.6, 2.4 * point.scale)
    ctx.lineCap = 'round'

    const corners: Array<[number, number, number, number]> = [
      [point.x - half, centerY - half, 1, 1],
      [point.x + half, centerY - half, -1, 1],
      [point.x - half, centerY + half, 1, -1],
      [point.x + half, centerY + half, -1, -1],
    ]

    for (const [x, y, dx, dy] of corners) {
      ctx.beginPath()
      ctx.moveTo(x + dx * arm, y)
      ctx.lineTo(x, y)
      ctx.lineTo(x, y + dy * arm)
      ctx.stroke()
    }

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(point.x, centerY, Math.max(1.4, 2 * point.scale), 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  private drawDashStreaks(x: number, y: number): void {
    const { ctx } = this
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = 'rgba(93, 228, 238, 0.65)'
    ctx.lineCap = 'round'
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2 + this.elapsed
      const inner = this.height * 0.11
      const outer = this.height * (0.2 + (i % 3) * 0.03)
      ctx.lineWidth = i % 2 === 0 ? 2.2 : 1.2
      ctx.beginPath()
      ctx.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner)
      ctx.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer)
      ctx.stroke()
    }
    ctx.restore()
  }

  private drawScreenEffects(world: GameWorld): void {
    const { ctx, width, height } = this

    const vignette = ctx.createRadialGradient(
      width * 0.5,
      height * 0.53,
      height * 0.22,
      width * 0.5,
      height * 0.53,
      height * 0.78,
    )
    vignette.addColorStop(0, 'rgba(2, 12, 16, 0)')
    vignette.addColorStop(0.72, 'rgba(2, 12, 16, 0.08)')
    vignette.addColorStop(1, 'rgba(2, 12, 16, 0.52)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, width, height)

    const topShade = ctx.createLinearGradient(0, 0, 0, height * 0.2)
    topShade.addColorStop(0, 'rgba(2, 13, 18, 0.55)')
    topShade.addColorStop(1, 'rgba(2, 13, 18, 0)')
    ctx.fillStyle = topShade
    ctx.fillRect(0, 0, width, height * 0.22)

    const bottomShade = ctx.createLinearGradient(0, height * 0.8, 0, height)
    bottomShade.addColorStop(0, 'rgba(2, 13, 18, 0)')
    bottomShade.addColorStop(1, 'rgba(2, 13, 18, 0.42)')
    ctx.fillStyle = bottomShade
    ctx.fillRect(0, height * 0.8, width, height * 0.2)

    const lowHealth = clamp(1 - world.player.hp / GAME.player.maxHp, 0, 1)
    const grabPulse =
      world.player.grabTimer > 0
        ? 0.2 + (Math.sin(this.elapsed * 18) * 0.5 + 0.5) * 0.16
        : 0
    const hurtAlpha = Math.max(
      world.hurtFlash * 0.65,
      grabPulse,
      lowHealth > 0.68
        ? (0.08 + Math.sin(this.elapsed * 5) * 0.025) * (lowHealth - 0.68) * 3
        : 0,
    )

    if (hurtAlpha > 0.001) {
      const hurt = ctx.createRadialGradient(
        width * 0.5,
        height * 0.52,
        height * 0.24,
        width * 0.5,
        height * 0.52,
        height * 0.76,
      )
      hurt.addColorStop(0, 'rgba(168, 24, 36, 0)')
      hurt.addColorStop(0.65, `rgba(168, 24, 36, ${hurtAlpha * 0.2})`)
      hurt.addColorStop(1, `rgba(168, 24, 36, ${hurtAlpha})`)
      ctx.fillStyle = hurt
      ctx.fillRect(0, 0, width, height)
    }

    if (world.status === 'overrun') {
      const progress = clamp(
        1 - world.overrunTimer / GAME.contact.overrunDuration,
        0,
        1,
      )
      const red = ctx.createRadialGradient(
        width * 0.5,
        height * 0.56,
        height * 0.08,
        width * 0.5,
        height * 0.56,
        height * 0.72,
      )
      red.addColorStop(0, `rgba(92, 4, 12, ${0.22 + progress * 0.28})`)
      red.addColorStop(0.55, `rgba(46, 2, 8, ${0.3 + progress * 0.25})`)
      red.addColorStop(1, `rgba(3, 0, 2, ${0.45 + progress * 0.3})`)
      ctx.fillStyle = red
      ctx.fillRect(0, 0, width, height)

      ctx.fillStyle = `rgba(2, 0, 1, ${progress * progress * 0.45})`
      ctx.fillRect(0, 0, width, height)
    }
  }
}
