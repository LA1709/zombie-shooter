import * as THREE from 'three'
import { COLORS, GAME, LANE_X } from './config'
import type { GameWorld } from './GameWorld'
import type { Barrel } from './types'
import { clamp } from './math'

const ROAD_WIDTH = 5.2
const ROAD_LENGTH = 70
const LANE_WIDTH = 1.55

const ZOMBIE_COLORS = [
  { body: 0x4f7a6c, skin: 0xa8bd72 },
  { body: 0x7b604d, skin: 0xb3c889 },
  { body: 0xb2464c, skin: 0x93ac66 },
  { body: 0x586d84, skin: 0xb8cd8c },
]

function toWorldX(x: number): number {
  return -x * 2.4
}

function makeTextTexture(text: string, color = '#ffffff'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.font = '900 120px "Arial Black", Impact, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 18
    ctx.strokeStyle = 'rgba(8,16,18,0.95)'
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2)
    ctx.fillStyle = color
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function makeTextSprite(text: string, color = '#ffffff', scale = 1): THREE.Sprite {
  const texture = makeTextTexture(text, color)
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(2.2 * scale, 1.1 * scale, 1)
  sprite.userData.texture = texture
  return sprite
}

const textureLoader = new THREE.TextureLoader()

function loadTexture(path: string): THREE.Texture {
  const texture = textureLoader.load(path)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function makeBillboard(texture: THREE.Texture, width: number, height: number): THREE.Sprite {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
  )
  sprite.scale.set(width, height, 1)
  sprite.center.set(0.5, 0)
  sprite.userData.texture = texture
  return sprite
}

function makeGun(weaponLevel: number, scale = 1): THREE.Group {
  const gun = new THREE.Group()
  const metal = new THREE.MeshStandardMaterial({ color: 0x202830, roughness: 0.42, metalness: 0.35 })
  const accent = new THREE.MeshStandardMaterial({ color: 0xff9f1c, roughness: 0.3, metalness: 0.25 })
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.8, metalness: 0.05 })

  const addBox = (
    name: string,
    size: [number, number, number],
    position: [number, number, number],
    material: THREE.Material = metal,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material)
    mesh.name = name
    mesh.position.set(...position)
    gun.add(mesh)
    return mesh
  }

  const addCylinderZ = (
    radius: number,
    length: number,
    position: [number, number, number],
    material: THREE.Material = metal,
  ): THREE.Mesh => {
    const geometry = new THREE.CylinderGeometry(radius, radius, length, 10)
    geometry.rotateX(Math.PI / 2)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(...position)
    gun.add(mesh)
    return mesh
  }

  if (weaponLevel <= 1) {
    addBox('receiver', [0.09, 0.13, 0.42], [0, 0, 0.12])
    addCylinderZ(0.045, 0.2, [0, 0.02, 0.36])
    addBox('grip', [0.08, 0.22, 0.09], [0, -0.14, -0.08], darkWood)
  } else if (weaponLevel === 2) {
    addBox('receiver', [0.12, 0.16, 0.68], [0, 0, 0.18])
    addCylinderZ(0.055, 0.3, [0, 0.02, 0.55])
    addBox('magazine', [0.08, 0.26, 0.12], [0, -0.2, 0.08])
    addBox('sight', [0.07, 0.1, 0.16], [0, 0.12, 0.22], accent)
    addBox('stock', [0.11, 0.14, 0.24], [0, -0.02, -0.26], darkWood)
  } else if (weaponLevel === 3) {
    addBox('receiver', [0.16, 0.18, 0.6], [0, 0, 0.16])
    addCylinderZ(0.075, 0.52, [-0.055, 0.025, 0.58])
    addCylinderZ(0.075, 0.52, [0.055, 0.025, 0.58])
    addBox('pump', [0.2, 0.1, 0.18], [0, -0.04, 0.46], accent)
    addBox('stock', [0.15, 0.18, 0.28], [0, -0.04, -0.26], darkWood)
  } else if (weaponLevel === 4) {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.22, 18), accent)
    drum.rotation.x = Math.PI / 2
    drum.position.set(0, -0.1, 0.08)
    gun.add(drum)
    addBox('receiver', [0.2, 0.22, 0.54], [0, 0.05, 0.18])
    for (const x of [-0.1, 0, 0.1]) {
      addCylinderZ(0.045, 0.58, [x, 0.08, 0.56])
    }
  } else {
    addCylinderZ(0.14, 0.72, [0, 0, 0.22])
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.22, 14), accent)
    nose.rotation.x = Math.PI / 2
    nose.position.set(0, 0, 0.66)
    gun.add(nose)
    addBox('housing', [0.24, 0.24, 0.34], [0, -0.05, -0.28])
    addBox('scope', [0.09, 0.1, 0.2], [0, 0.14, 0.06], accent)
  }

  gun.scale.setScalar(scale)
  return gun
}

function makeHumanoid(
  bodyColor: number,
  skinColor: number,
  scale = 1,
  withGun = false,
  weaponLevel = 1,
): THREE.Group {
  const group = new THREE.Group()
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.72, metalness: 0.04 })
  const skinMaterial = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.66, metalness: 0.02 })
  const pantsMaterial = new THREE.MeshStandardMaterial({ color: 0x2a3438, roughness: 0.8, metalness: 0.02 })
  const bootMaterial = new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: 0.6, metalness: 0.08 })
  const zombie = !withGun

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.72, 4, 12), bodyMaterial)
  torso.position.y = 1.02
  group.add(torso)

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.24, 0.3), pantsMaterial)
  pelvis.position.y = 0.58
  group.add(pelvis)

  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.52, 8), pantsMaterial)
  leftLeg.position.set(-0.12, 0.32, 0)
  const rightLeg = leftLeg.clone()
  rightLeg.position.x = 0.12
  group.add(leftLeg, rightLeg)

  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.3), bootMaterial)
  leftBoot.position.set(-0.12, 0.05, 0.04)
  const rightBoot = leftBoot.clone()
  rightBoot.position.x = 0.12
  group.add(leftBoot, rightBoot)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 14, 12), skinMaterial)
  head.position.y = 1.68
  group.add(head)

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.23, 0.12, 14),
    new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.7, metalness: 0.03 }),
  )
  cap.position.set(0, 1.83, -0.02)
  group.add(cap)

  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.58, 8), skinMaterial)
  leftArm.position.set(-0.35, 1.18, 0.12)
  leftArm.rotation.z = 0.45
  leftArm.rotation.x = -0.65
  const rightArm = leftArm.clone()
  rightArm.position.x = 0.35
  rightArm.rotation.z = -0.45
  group.add(leftArm, rightArm)

  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), skinMaterial)
  leftHand.position.set(-0.42, 1.02, 0.38)
  const rightHand = leftHand.clone()
  rightHand.position.x = 0.42
  group.add(leftHand, rightHand)

  if (zombie) {
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xf0e9b0 })
    for (const x of [-0.09, 0.09]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), eyeMaterial)
      eye.position.set(x, 1.72, 0.19)
      group.add(eye)
    }

    const mouth = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.06, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x351f22, roughness: 0.85 }),
    )
    mouth.position.set(0, 1.58, 0.205)
    group.add(mouth)

    const bloodMaterial = new THREE.MeshStandardMaterial({ color: 0xa72e35, roughness: 0.55 })
    for (const [x, y, s] of [[-0.13, 1.2, 0.06], [0.16, 0.95, 0.05], [0.08, 1.3, 0.04]] as const) {
      const spot = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), bloodMaterial)
      spot.position.set(x, y, 0.27)
      group.add(spot)
    }

    const clawMaterial = new THREE.MeshStandardMaterial({ color: 0xe8e2c8, roughness: 0.45 })
    for (const side of [-1, 1]) {
      for (let i = -1; i <= 1; i += 1) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.16, 6), clawMaterial)
        claw.position.set(side * 0.42 + i * 0.05, 0.96, 0.48)
        claw.rotation.x = Math.PI / 2
        group.add(claw)
      }
    }
  }

  if (withGun) {
    const gun = makeGun(weaponLevel)
    gun.position.set(0.28, 1.1, 0.48)
    gun.rotation.y = 0.05
    group.add(gun)
  }

  group.userData.bodyMaterial = bodyMaterial
  group.userData.headMaterial = skinMaterial
  group.userData.leftArm = leftArm
  group.userData.rightArm = rightArm
  group.userData.leftLeg = leftLeg
  group.userData.rightLeg = rightLeg
  group.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (mesh.isMesh) {
      mesh.castShadow = true
      mesh.receiveShadow = true
    }
  })
  group.scale.setScalar(scale)
  return group
}

export class Renderer {
  private readonly canvas: HTMLCanvasElement
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly resizeObserver: ResizeObserver
  private readonly zombieMeshes = new Map<number, THREE.Group>()
  private readonly gateMeshes = new Map<number, THREE.Group>()
  private readonly projectilePool: THREE.Group[] = []
  private readonly tempColor = new THREE.Color()
  private particlePoints: THREE.Points | null = null
  private particleGeometry: THREE.BufferGeometry | null = null
  private textGroup: THREE.Group | null = null
  private finishLine: THREE.Mesh | null = null
  private finishGlow: THREE.Mesh | null = null
  private finishLabel: THREE.Sprite | null = null
  private aimRing: THREE.Mesh | null = null
  private laneGuide: THREE.Mesh | null = null
  private laneLabels: THREE.Sprite[] = []
  private elapsed = 0
  private readonly heroBack = loadTexture('/assets/hero/rotations/back.png')
  private readonly heroBackLeft = loadTexture('/assets/hero/rotations/back_left.png')
  private readonly heroBackRight = loadTexture('/assets/hero/rotations/back_right.png')
  private readonly heroAim = loadTexture('/assets/hero/actions/aim.png')
  private readonly heroFire = loadTexture('/assets/hero/actions/fire.png')
  private readonly heroWalkRight = Array.from({ length: 8 }, (_, i) =>
    loadTexture(`/assets/hero/walk_frames/walk_${pad2(i + 1)}.png`),
  )
  private readonly heroWalkLeft = Array.from({ length: 8 }, (_, i) =>
    loadTexture(`/assets/hero/walk_frames/walk_l${i + 1}.png`),
  )
  private readonly zombieWalk = Array.from({ length: 16 }, (_, i) =>
    loadTexture(`/assets/zombie/walk/${pad2(17 + i)}.png`),
  )
  private readonly zombieAttack = Array.from({ length: 8 }, (_, i) =>
    loadTexture(`/assets/zombie/attack/${pad2(33 + i)}.png`),
  )
  private readonly zombieDeath = Array.from({ length: 8 }, (_, i) =>
    loadTexture(`/assets/zombie/death/${pad2(41 + i)}.png`),
  )
  private readonly muzzleTexture = loadTexture('/assets/hero/vfx_ui/vfx_muzzle_flash.png')

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.18
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.scene.background = new THREE.Color('#0c5064')
    this.scene.fog = new THREE.Fog('#0c5064', 16, 68)

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 220)
    this.camera.position.set(0, 6.4, -8.4)
    this.camera.lookAt(0, 1.1, 9)

    const ambient = new THREE.HemisphereLight(0xdff4ff, 0x2a3a2d, 1.05)
    const sun = new THREE.DirectionalLight(0xffe0a3, 2.6)
    sun.position.set(4, 10, -3)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -6
    sun.shadow.camera.right = 6
    sun.shadow.camera.top = 12
    sun.shadow.camera.bottom = -4
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far = 30
    const rim = new THREE.DirectionalLight(0x5de4ee, 0.65)
    rim.position.set(-4, 6, 12)
    this.scene.add(ambient, sun, rim)

    this.buildBridge()
    this.buildFinishLine()
    this.buildLaneGuide()
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(canvas)
    this.resize()
  }

  destroy(): void {
    this.resizeObserver.disconnect()
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh
      mesh.geometry?.dispose()
      const material = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(material)) {
        for (const item of material) item.dispose()
      } else {
        material?.dispose()
      }
      const sprite = object as THREE.Sprite
      const texture = (sprite.userData.texture as THREE.CanvasTexture | undefined) ?? null
      texture?.dispose()
    })
    this.renderer.dispose()
  }

  render(world: GameWorld, dt: number): void {
    this.elapsed += dt
    const shake = world.shake > 0 ? world.shake * 0.025 : 0
    this.camera.position.x = (Math.random() * 2 - 1) * shake
    this.camera.position.y = 6.4 + (Math.random() * 2 - 1) * shake
    this.camera.lookAt(0, 1.1, 9)

    this.syncZombies(world)
    this.syncGates(world)
    this.syncPlayer(world)
    this.syncTracers(world)
    this.syncParticles(world)
    this.syncFloatingTexts(world)
    this.syncAimTarget(world)
    this.syncFinishLine(world)
    this.syncLaneGuide(world)

    this.renderer.render(this.scene, this.camera)
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return
    const width = Math.max(1, rect.width)
    const height = Math.max(1, rect.height)
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  private buildBridge(): void {
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_LENGTH),
      new THREE.MeshLambertMaterial({ color: 0x3e434a }),
    )
    road.rotation.x = -Math.PI / 2
    road.position.set(0, 0, 18)
    this.scene.add(road)

    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(120, ROAD_LENGTH + 20),
      new THREE.MeshLambertMaterial({ color: 0x16738c }),
    )
    water.rotation.x = -Math.PI / 2
    water.position.set(0, -0.4, 18)
    this.scene.add(water)

    const sideMaterial = new THREE.MeshLambertMaterial({ color: 0x8d8e83 })
    const railMaterial = new THREE.MeshLambertMaterial({ color: 0xeef1e7 })
    const dividerMaterial = new THREE.MeshLambertMaterial({ color: 0xffd23f })
    const centerMaterial = new THREE.MeshLambertMaterial({ color: 0xf5f7e9 })

    for (const side of [-1, 1]) {
      const concrete = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, ROAD_LENGTH), sideMaterial)
      concrete.position.set(side * 2.75, 0.22, 18)
      this.scene.add(concrete)

      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, ROAD_LENGTH), railMaterial)
      rail.position.set(side * 2.45, 0.72, 18)
      this.scene.add(rail)
    }

    for (const x of [-0.76, 0.76]) {
      const divider = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, ROAD_LENGTH), dividerMaterial)
      divider.position.set(x, 0.015, 18)
      this.scene.add(divider)
    }

    for (let z = 1.2; z < 42; z += 5.4) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.015, 1.8), centerMaterial)
      dash.position.set(0, 0.012, z)
      this.scene.add(dash)
    }

    const cityMaterial = new THREE.MeshLambertMaterial({ color: 0x7aa7a0 })
    for (let i = 0; i < 22; i += 1) {
      const side = i % 2 === 0 ? -1 : 1
      const height = 2 + ((i * 37) % 9)
      const building = new THREE.Mesh(new THREE.BoxGeometry(1.6 + (i % 4) * 0.5, height, 1.6), cityMaterial)
      building.position.set(side * (4.2 + (i % 5) * 0.7), height / 2, 5 + (i * 2.3) % 38)
      const windowMaterial = new THREE.MeshBasicMaterial({ color: 0xdff7ff, transparent: true, opacity: 0.22 })
      const windowBand = new THREE.Mesh(new THREE.BoxGeometry(building.geometry.parameters.width, 0.18, building.geometry.parameters.depth + 0.04), windowMaterial)
      windowBand.position.y = height * 0.58
      building.add(windowBand)
      this.scene.add(building)
    }
  }

  private buildFinishLine(): void {
    const lineZ = GAME.world.attackDepth
    const dangerMaterial = new THREE.MeshBasicMaterial({
      color: '#ff2a35',
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    })
    this.finishGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_WIDTH, 0.72),
      dangerMaterial,
    )
    this.finishGlow.rotation.x = -Math.PI / 2
    this.finishGlow.position.set(0, 0.025, lineZ)
    this.scene.add(this.finishGlow)

    this.finishLine = new THREE.Mesh(
      new THREE.BoxGeometry(ROAD_WIDTH, 0.09, 0.22),
      new THREE.MeshBasicMaterial({ color: '#ff2a35' }),
    )
    this.finishLine.position.set(0, 0.06, lineZ)
    this.scene.add(this.finishLine)

    for (let i = 0; i < 16; i += 1) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.02, 0.5),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? '#ff2a35' : '#ffd23f' }),
      )
      stripe.position.set(-ROAD_WIDTH / 2 + 0.22 + i * 0.31, 0.035, lineZ - 0.75)
      this.scene.add(stripe)
    }

    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 1.15, 0.22),
        new THREE.MeshLambertMaterial({ color: 0x202830 }),
      )
      post.position.set(side * 2.42, 0.57, lineZ)
      this.scene.add(post)

      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 12, 8),
        new THREE.MeshBasicMaterial({ color: '#ff2a35' }),
      )
      lamp.position.set(side * 2.42, 1.28, lineZ)
      this.scene.add(lamp)
    }

    this.finishLabel = makeTextSprite('HOME LINE', '#ff6b61', 0.55)
    this.finishLabel.position.set(0, 0.75, lineZ + 0.25)
    this.scene.add(this.finishLabel)
  }

  private syncFinishLine(world: GameWorld): void {
    const nearest = world.zombies
      .filter((zombie) => zombie.hp > 0)
      .reduce((closest, zombie) => Math.min(closest, zombie.z), Number.POSITIVE_INFINITY)
    const danger = clamp((7 - nearest) / 3, 0, 1)
    const pulse = 0.72 + Math.sin(this.elapsed * 7) * 0.28 + danger * 0.55

    if (this.finishLine) {
      const material = this.finishLine.material as THREE.MeshBasicMaterial
      material.color.set(danger > 0.4 ? '#ff1744' : '#ff2a35')
      this.finishLine.scale.y = 1 + pulse * 0.45
    }

    if (this.finishGlow) {
      const material = this.finishGlow.material as THREE.MeshBasicMaterial
      material.opacity = 0.24 + pulse * 0.16 + danger * 0.22
    }

    if (this.finishLabel) {
      const material = this.finishLabel.material as THREE.SpriteMaterial
      material.opacity = 0.72 + danger * 0.28
      this.finishLabel.scale.setScalar(1 + danger * 0.12)
    }
  }

  private buildLaneGuide(): void {
    this.laneGuide = new THREE.Mesh(
      new THREE.PlaneGeometry(LANE_WIDTH, 22),
      new THREE.MeshBasicMaterial({ color: COLORS.lime, transparent: true, opacity: 0.09, depthWrite: false }),
    )
    this.laneGuide.rotation.x = -Math.PI / 2
    this.laneGuide.position.set(0, 0.02, 9)
    this.scene.add(this.laneGuide)

    const labels = ['L', 'C', 'R']
    for (let i = 0; i < LANE_X.length; i += 1) {
      const label = makeTextSprite(labels[i], '#ffffff', 0.28)
      label.position.set(toWorldX(LANE_X[i]), 0.35, 1.2)
      this.laneLabels.push(label)
      this.scene.add(label)
    }
  }

  private syncLaneGuide(world: GameWorld): void {
    if (!this.laneGuide) return
    this.laneGuide.position.x = toWorldX(LANE_X[world.player.lane])
    const material = this.laneGuide.material as THREE.MeshBasicMaterial
    material.color.set(world.status === 'overrun' ? '#ff5a4f' : COLORS.lime)
    material.opacity = 0.08 + Math.sin(this.elapsed * 2.4) * 0.012
  }

  private syncZombies(world: GameWorld): void {
    const seen = new Set<number>()
    for (const zombie of world.zombies) {
      seen.add(zombie.id)
      let mesh = this.zombieMeshes.get(zombie.id)
      if (!mesh) {
        const colors = ZOMBIE_COLORS[zombie.variant]
        mesh = new THREE.Group()
        const sprite = makeBillboard(this.zombieWalk[0], 1.15, 1.7)
        sprite.position.y = 0
        mesh.add(sprite)
        const fallback = makeHumanoid(colors.body, colors.skin, zombie.scale, false)
        fallback.visible = false
        mesh.add(fallback)
        mesh.userData.sprite = sprite
        mesh.userData.fallback = fallback
        mesh.userData.frame = -1
        this.zombieMeshes.set(zombie.id, mesh)
        this.scene.add(mesh)
      }

      mesh.position.set(toWorldX(zombie.x), 0, zombie.z)
      mesh.scale.setScalar(zombie.scale)
      mesh.rotation.y = 0

      const sprite = mesh.userData.sprite as THREE.Sprite
      const fallback = mesh.userData.fallback as THREE.Group
      const frames = zombie.isBoss ? this.zombieAttack : zombie.hp <= 0 ? this.zombieDeath : this.zombieWalk
      const frameIndex = Math.floor(zombie.walkPhase * 2.2) % frames.length
      const texture = frames[frameIndex]
      const spriteReady = Boolean(texture.image)
      sprite.visible = spriteReady
      fallback.visible = !spriteReady

      if (spriteReady && mesh.userData.frame !== frameIndex) {
        const material = sprite.material as THREE.SpriteMaterial
        material.map = texture
        material.needsUpdate = true
        mesh.userData.frame = frameIndex
      }

      const stride = Math.sin(zombie.walkPhase)
      if (!spriteReady) {
        const leftArm = fallback.userData.leftArm as THREE.Mesh
        const rightArm = fallback.userData.rightArm as THREE.Mesh
        const leftLeg = fallback.userData.leftLeg as THREE.Mesh
        const rightLeg = fallback.userData.rightLeg as THREE.Mesh
        leftArm.rotation.x = -0.65 + stride * 0.28
        rightArm.rotation.x = -0.65 - stride * 0.28
        leftLeg.rotation.x = stride * 0.42
        rightLeg.rotation.x = -stride * 0.42
      }
      mesh.position.y = Math.abs(Math.cos(zombie.walkPhase)) * 0.035

      if (zombie.hp < zombie.maxHp) {
        const bar = this.getZombieHealthBar(mesh)
        bar.visible = true
        bar.scale.x = clamp(zombie.hp / zombie.maxHp, 0, 1)
      } else {
        const bar = this.getZombieHealthBar(mesh)
        bar.visible = false
      }
    }

    for (const [id, mesh] of this.zombieMeshes) {
      if (!seen.has(id)) {
        this.scene.remove(mesh)
        this.disposeObject(mesh)
        this.zombieMeshes.delete(id)
      }
    }
  }

  private getZombieHealthBar(mesh: THREE.Group): THREE.Mesh {
    let bar = mesh.children.find((child) => child.name === 'zombie-hp-bar') as THREE.Mesh | undefined
    if (!bar) {
      bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.06, 0.03),
        new THREE.MeshBasicMaterial({ color: COLORS.lime }),
      )
      bar.name = 'zombie-hp-bar'
      bar.position.set(0, 2.05, 0)
      mesh.add(bar)
    }
    return bar
  }

  private syncGates(world: GameWorld): void {
    const seen = new Set<number>()
    for (const gate of world.barrels) {
      seen.add(gate.id)
      let mesh = this.gateMeshes.get(gate.id)
      if (!mesh) {
        mesh = this.createGateMesh(gate)
        this.gateMeshes.set(gate.id, mesh)
        this.scene.add(mesh)
      }
      this.updateGateMesh(mesh, gate)
    }

    for (const [id, mesh] of this.gateMeshes) {
      if (!seen.has(id)) {
        this.scene.remove(mesh)
        this.disposeObject(mesh)
        this.gateMeshes.delete(id)
      }
    }
  }

  private createGateMesh(gate: Barrel): THREE.Group {
    const group = new THREE.Group()
    const color =
      gate.kind === 'soldiers'
        ? '#39d353'
        : gate.kind === 'minus'
          ? '#e5484d'
          : gate.kind === 'weapon'
            ? '#3b82f6'
            : gate.kind === 'heal'
              ? '#84cc16'
              : '#f59e0b'
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 2.25, 0.14),
      new THREE.MeshLambertMaterial({
        color,
        transparent: true,
        opacity: 0.72,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.12,
      }),
    )
    panel.position.y = 1.15
    group.add(panel)

    const labelText =
      gate.kind === 'soldiers'
        ? `+${gate.value}`
        : gate.kind === 'minus'
          ? `-${gate.value}`
          : gate.kind === 'weapon'
            ? 'GUN+1'
            : gate.kind === 'heal'
              ? `+${gate.value}`
              : `x${gate.multiplier}`
    const label = makeTextSprite(labelText, gate.kind === 'minus' ? '#ffd7d7' : '#ffffff', 0.78)
    label.position.set(0, 1.38, 0.18)
    group.add(label)

    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.09, 0.04),
      new THREE.MeshBasicMaterial({ color: COLORS.gold }),
    )
    bar.position.set(0, 2.45, 0.05)
    bar.name = 'gate-hp-bar'
    group.add(bar)
    return group
  }

  private updateGateMesh(mesh: THREE.Group, gate: Barrel): void {
    mesh.position.set(toWorldX(gate.x), 0, gate.z)
    const targetScale = gate.hitFlash > 0 ? 1.06 : 1
    mesh.scale.setScalar(targetScale)
    const bar = mesh.children.find((child) => child.name === 'gate-hp-bar') as THREE.Mesh | undefined
    if (bar) bar.scale.x = clamp(gate.hp / gate.maxHp, 0, 1)
  }

  private syncPlayer(world: GameWorld): void {
    const player = world.player
    const groupRoot = this.scene.getObjectByName('player-squad') as THREE.Group | undefined
    const squad = groupRoot ?? new THREE.Group()
    squad.name = 'player-squad'
    if (!groupRoot) this.scene.add(squad)

    const shake = player.grabTimer > 0 ? Math.sin(world.time * 42) * 0.035 : 0
    squad.position.set(toWorldX(player.x) + shake, 0, 0)
    squad.rotation.y = player.facing > 0 ? 0.08 : -0.08

    const offsets: Array<[number, number]> = [[0, 0]]

    const desired = 1
    while (squad.children.length > desired) {
      const child = squad.children.pop()
      if (child) this.disposeObject(child)
    }

    for (let i = 0; i < desired; i += 1) {
      let member = squad.children[i] as THREE.Group | undefined
      if (!member) {
        member = new THREE.Group()
        const texture = i === 0 ? this.heroAim : i % 3 === 1 ? this.heroBackLeft : i % 3 === 2 ? this.heroBackRight : this.heroBack
        const sprite = makeBillboard(texture, 0.95, 1.55)
        sprite.position.y = 0
        member.add(sprite)
        member.userData.sprite = sprite
        squad.add(member)
      }

      member.position.set(offsets[i][0], 0, offsets[i][1])
      member.rotation.y = 0
      const sprite = member.userData.sprite as THREE.Sprite
      const material = sprite.material as THREE.SpriteMaterial
      const laneX = LANE_X[player.lane]
      const moving = Math.abs(player.x - laneX) > 0.015
      const walkFrame = Math.floor(world.time * 8 + i * 0.35) % 8
      let texture = this.heroBack
      if (moving) {
        texture = player.facing >= 0 ? this.heroWalkRight[walkFrame] : this.heroWalkLeft[walkFrame]
      } else if (i === 0) {
        texture = player.muzzleFlash > 0 || player.bulletMultiplier > 1 ? this.heroFire : this.heroFire
      } else if (i % 3 === 1) {
        texture = this.heroBackLeft
      } else if (i % 3 === 2) {
        texture = this.heroBackRight
      }
      if (material.map !== texture) {
        material.map = texture
        material.needsUpdate = true
      }
      sprite.visible = Boolean(texture.image)
      sprite.position.y = Math.abs(Math.sin(world.time * 8 + i * 0.9)) * 0.025
    }

    let muzzle = squad.userData.muzzle as THREE.Sprite | undefined
    if (!muzzle) {
      muzzle = makeBillboard(this.muzzleTexture, 0.75, 0.42)
      muzzle.position.set(0.3, 1.32, 0.9)
      squad.add(muzzle)
      squad.userData.muzzle = muzzle
    }
    muzzle.visible = player.muzzleFlash > 0
    muzzle.scale.setScalar(player.muzzleFlash > 0 ? 0.8 + player.muzzleFlash * 4 : 1)

    if (world.status === 'overrun') squad.rotation.x = 0.35
    else squad.rotation.x = 0
  }

  private syncTracers(world: GameWorld): void {
    while (this.projectilePool.length < world.tracers.length) {
      const projectile = new THREE.Group()
      const outerGeometry = new THREE.CapsuleGeometry(0.075, 0.5, 3, 8)
      outerGeometry.rotateX(Math.PI / 2)
      const outer = new THREE.Mesh(
        outerGeometry,
        new THREE.MeshBasicMaterial({
          color: '#ff9f1c',
          transparent: true,
          opacity: 0.65,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      const coreGeometry = new THREE.CapsuleGeometry(0.035, 0.38, 3, 8)
      coreGeometry.rotateX(Math.PI / 2)
      const core = new THREE.Mesh(
        coreGeometry,
        new THREE.MeshBasicMaterial({
          color: '#fff7d1',
          transparent: true,
          opacity: 1,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      const trailGeometry = new THREE.BufferGeometry()
      trailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
      const trail = new THREE.Line(
        trailGeometry,
        new THREE.LineBasicMaterial({
          color: '#ff9f1c',
          transparent: true,
          opacity: 0.55,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      projectile.add(outer, core, trail)
      projectile.frustumCulled = false
      this.projectilePool.push(projectile)
      this.scene.add(projectile)
    }

    for (let i = 0; i < this.projectilePool.length; i += 1) {
      const projectile = this.projectilePool[i]
      const tracer = world.tracers[i]
      if (!tracer) {
        projectile.visible = false
        continue
      }

      projectile.visible = true
      const position = new THREE.Vector3(toWorldX(tracer.x), 1.3, tracer.z)
      const target = new THREE.Vector3(toWorldX(tracer.targetX), 1.35, tracer.targetZ)
      projectile.position.copy(position)
      projectile.lookAt(target)

      const outerMaterial = projectile.children[0].material as THREE.MeshBasicMaterial
      const coreMaterial = projectile.children[1].material as THREE.MeshBasicMaterial
      const trailMaterial = (projectile.children[2] as THREE.Line).material as THREE.LineBasicMaterial
      const warm = tracer.crit ? COLORS.gold : '#ffed9e'
      outerMaterial.color.set(warm)
      coreMaterial.color.set('#fff7d1')
      trailMaterial.color.set(warm)

      const fade = 0.55 + clamp(tracer.life / tracer.maxLife, 0, 1) * 0.45
      outerMaterial.opacity = fade * 0.65
      coreMaterial.opacity = fade
      trailMaterial.opacity = fade * 0.55

      const trail = projectile.children[2] as THREE.Line
      const positions = trail.geometry.getAttribute('position') as THREE.BufferAttribute
      positions.setXYZ(0, 0, 0, -0.72)
      positions.setXYZ(1, 0, 0, -0.02)
      positions.needsUpdate = true
    }
  }

  private syncParticles(world: GameWorld): void {
    if (!this.particlePoints) {
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(GAME.world.maxParticles * 3), 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(GAME.world.maxParticles * 3), 3))
      this.particleGeometry = geometry
      this.particlePoints = new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
          size: 0.18,
          vertexColors: true,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
        }),
      )
      this.particlePoints.frustumCulled = false
      this.scene.add(this.particlePoints)
    }

    if (!this.particleGeometry) return
    const positions = this.particleGeometry.getAttribute('position') as THREE.BufferAttribute
    const colors = this.particleGeometry.getAttribute('color') as THREE.BufferAttribute
    const count = Math.min(GAME.world.maxParticles, world.particles.length)
    for (let i = 0; i < count; i += 1) {
      const particle = world.particles[i]
      positions.setXYZ(i, toWorldX(particle.x), particle.y, particle.z)
      this.tempColor.set(particle.color)
      const fade = clamp(particle.life / particle.maxLife, 0, 1)
      colors.setXYZ(i, this.tempColor.r * fade, this.tempColor.g * fade, this.tempColor.b * fade)
    }
    for (let i = count; i < GAME.world.maxParticles; i += 1) {
      positions.setXYZ(i, 0, -100, 0)
      colors.setXYZ(i, 0, 0, 0)
    }
    positions.needsUpdate = true
    colors.needsUpdate = true
  }

  private syncFloatingTexts(world: GameWorld): void {
    if (!this.textGroup) {
      this.textGroup = new THREE.Group()
      this.scene.add(this.textGroup)
    }
    for (const child of [...this.textGroup.children]) {
      this.textGroup.remove(child)
      this.disposeObject(child)
    }

    for (const text of world.texts) {
      const sprite = makeTextSprite(text.text, text.color, 0.5)
      const point = new THREE.Vector3(toWorldX(text.x), text.y, text.z)
      sprite.position.copy(point)
      const material = sprite.material as THREE.SpriteMaterial
      material.opacity = clamp(text.life / text.maxLife, 0, 1)
      this.textGroup.add(sprite)
    }
  }

  private syncAimTarget(world: GameWorld): void {
    if (!this.aimRing) {
      this.aimRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.035, 8, 24),
        new THREE.MeshBasicMaterial({ color: COLORS.lime, transparent: true, opacity: 0.95 }),
      )
      this.aimRing.rotation.x = Math.PI / 2
      this.scene.add(this.aimRing)
    }

    const target = world.aimTarget
    if (!target) {
      this.aimRing.visible = false
      return
    }

    this.aimRing.visible = true
    const x = target.kind === 'zombie' ? target.zombie.x : target.barrel.x
    const z = target.kind === 'zombie' ? target.zombie.z : target.barrel.z
    this.aimRing.position.set(toWorldX(x), 0.08, z)
    const material = this.aimRing.material as THREE.MeshBasicMaterial
    material.color.set(target.kind === 'barrel' ? COLORS.orange : COLORS.lime)
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh
      mesh.geometry?.dispose()
      const material = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(material)) {
        for (const item of material) item.dispose()
      } else {
        material?.dispose()
      }
      const texture = (child as THREE.Sprite).userData.texture as THREE.CanvasTexture | undefined
      texture?.dispose()
    })
  }
}
