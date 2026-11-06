const OUTLINE = '#142125'
const OUTLINE_SOFT = '#27383a'
const SPRITE_W = 180
const SPRITE_H = 280

export const PLAYER_MUZZLE = {
  x: 0.43,
  y: 0.45,
} as const

type Ctx = CanvasRenderingContext2D

function createCanvas(width = SPRITE_W, height = SPRITE_H): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function roundedRect(
  ctx: Ctx,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

function outlinedLine(
  ctx: Ctx,
  points: Array<[number, number]>,
  width: number,
  color: string,
  outline = OUTLINE,
): void {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i][0], points[i][1])
  }
  ctx.strokeStyle = outline
  ctx.lineWidth = width + 7
  ctx.stroke()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.stroke()
}

function drawPlayer(): HTMLCanvasElement {
  const canvas = createCanvas()
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  // Legs
  outlinedLine(ctx, [[73, 184], [64, 258]], 21, '#2d7fd8')
  outlinedLine(ctx, [[107, 184], [118, 258]], 21, '#2d7fd8')

  // Knee pads and boots
  ctx.fillStyle = '#1e4f8c'
  ctx.strokeStyle = OUTLINE
  ctx.lineWidth = 5
  roundedRect(ctx, 51, 215, 28, 20, 8)
  ctx.fill()
  ctx.stroke()
  roundedRect(ctx, 101, 215, 28, 20, 8)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#1a1d23'
  roundedRect(ctx, 46, 253, 36, 18, 7)
  ctx.fill()
  ctx.stroke()
  roundedRect(ctx, 99, 253, 38, 18, 7)
  ctx.fill()
  ctx.stroke()

  // Torso / tactical vest
  ctx.fillStyle = '#1d2c3c'
  ctx.strokeStyle = OUTLINE
  ctx.lineWidth = 6
  roundedRect(ctx, 47, 93, 86, 98, 22)
  ctx.fill()
  ctx.stroke()

  // Blue sleeves
  outlinedLine(ctx, [[54, 111], [41, 161]], 19, '#2f86df')
  outlinedLine(ctx, [[126, 111], [139, 148]], 19, '#2f86df')

  // Vest panels
  ctx.fillStyle = '#2c4055'
  roundedRect(ctx, 57, 108, 66, 55, 10)
  ctx.fill()
  ctx.strokeStyle = OUTLINE_SOFT
  ctx.lineWidth = 3
  ctx.stroke()

  ctx.fillStyle = '#3a526a'
  roundedRect(ctx, 65, 116, 50, 12, 4)
  ctx.fill()
  roundedRect(ctx, 65, 135, 50, 7, 3)
  ctx.fill()

  ctx.strokeStyle = '#0f1922'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(90, 108)
  ctx.lineTo(90, 178)
  ctx.stroke()

  // Shoulder straps
  ctx.strokeStyle = '#435a70'
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.moveTo(62, 98)
  ctx.lineTo(75, 123)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(118, 98)
  ctx.lineTo(105, 123)
  ctx.stroke()

  // Belt
  ctx.fillStyle = '#8a5b2b'
  ctx.strokeStyle = OUTLINE
  ctx.lineWidth = 5
  roundedRect(ctx, 53, 178, 74, 16, 6)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#d6a54b'
  roundedRect(ctx, 82, 181, 16, 10, 3)
  ctx.fill()

  // Hands
  ctx.fillStyle = '#e5b184'
  ctx.strokeStyle = OUTLINE
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(41, 168, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(143, 153, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Head and blonde hair, viewed from behind
  ctx.fillStyle = '#e5b184'
  ctx.strokeStyle = OUTLINE
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(90, 70, 28, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#e9c253'
  ctx.beginPath()
  ctx.arc(90, 65, 29, Math.PI * 0.92, Math.PI * 2.08)
  ctx.lineTo(116, 89)
  ctx.quadraticCurveTo(90, 100, 64, 89)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = OUTLINE
  ctx.lineWidth = 4
  ctx.stroke()

  ctx.fillStyle = '#c99b31'
  ctx.beginPath()
  ctx.arc(72, 54, 10, 0, Math.PI * 2)
  ctx.arc(91, 48, 11, 0, Math.PI * 2)
  ctx.arc(108, 58, 8, 0, Math.PI * 2)
  ctx.fill()

  // Rifle
  ctx.save()
  ctx.translate(126, 139)
  ctx.rotate(-0.12)
  ctx.strokeStyle = OUTLINE
  ctx.lineWidth = 15
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(42, 8)
  ctx.stroke()
  ctx.strokeStyle = '#303943'
  ctx.lineWidth = 9
  ctx.stroke()

  ctx.fillStyle = '#202830'
  ctx.strokeStyle = OUTLINE
  ctx.lineWidth = 4
  roundedRect(ctx, 28, -4, 28, 12, 4)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#5e6f7d'
  roundedRect(ctx, 18, 4, 12, 18, 4)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#c8ff3d'
  roundedRect(ctx, 37, 1, 9, 3, 1)
  ctx.fill()
  ctx.restore()

  // Rim highlights
  ctx.strokeStyle = 'rgba(130, 207, 255, 0.55)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(61, 103)
  ctx.lineTo(61, 170)
  ctx.stroke()

  return canvas
}

interface ZombiePalette {
  shirt: string
  shirtDark: string
  pants: string
  skin: string
  hair: string
}

const ZOMBIE_PALETTES: ZombiePalette[] = [
  {
    shirt: '#4f7a6c',
    shirtDark: '#34594f',
    pants: '#344049',
    skin: '#a8bd72',
    hair: '#4c3928',
  },
  {
    shirt: '#7b604d',
    shirtDark: '#5b4334',
    pants: '#303d51',
    skin: '#b3c889',
    hair: '#2d2a27',
  },
  {
    shirt: '#7f4147',
    shirtDark: '#5d2d33',
    pants: '#3b4650',
    skin: '#93ac66',
    hair: '#4d3424',
  },
  {
    shirt: '#586d84',
    shirtDark: '#3f5368',
    pants: '#3b3d42',
    skin: '#b8cd8c',
    hair: '#6e5b36',
  },
]

function drawZombieFrame(
  palette: ZombiePalette,
  frame: number,
): HTMLCanvasElement {
  const canvas = createCanvas()
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const swing = Math.sin((frame / 3) * Math.PI * 2)
  const opposite = -swing
  const bob = frame === 1 ? 2 : 0

  // Legs
  outlinedLine(
    ctx,
    [[76, 184 + bob], [67 + swing * 7, 260]],
    20,
    palette.pants,
  )
  outlinedLine(
    ctx,
    [[104, 184 + bob], [113 + opposite * 7, 260]],
    20,
    palette.pants,
  )

  // Shoes
  ctx.fillStyle = '#202429'
  ctx.strokeStyle = OUTLINE
  ctx.lineWidth = 5
  roundedRect(ctx, 49 + swing * 7, 254, 36, 16, 7)
  ctx.fill()
  ctx.stroke()
  roundedRect(ctx, 96 + opposite * 7, 254, 37, 16, 7)
  ctx.fill()
  ctx.stroke()

  // Torso, slightly torn
  ctx.fillStyle = palette.shirt
  ctx.strokeStyle = OUTLINE
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(54, 102 + bob)
  ctx.quadraticCurveTo(90, 86 + bob, 126, 102 + bob)
  ctx.lineTo(132, 174 + bob)
  ctx.lineTo(118, 184 + bob)
  ctx.lineTo(110, 176 + bob)
  ctx.lineTo(101, 188 + bob)
  ctx.lineTo(90, 178 + bob)
  ctx.lineTo(79, 188 + bob)
  ctx.lineTo(68, 176 + bob)
  ctx.lineTo(58, 184 + bob)
  ctx.lineTo(48, 174 + bob)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = palette.shirtDark
  ctx.beginPath()
  ctx.moveTo(54, 110 + bob)
  ctx.lineTo(72, 126 + bob)
  ctx.lineTo(67, 165 + bob)
  ctx.lineTo(51, 158 + bob)
  ctx.closePath()
  ctx.fill()

  // Torn shirt detail
  ctx.strokeStyle = 'rgba(18, 29, 30, 0.45)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(108, 122 + bob)
  ctx.lineTo(99, 138 + bob)
  ctx.lineTo(112, 151 + bob)
  ctx.stroke()

  // Arms reach toward the player
  const leftHandX = 32 - Math.abs(swing) * 5
  const rightHandX = 148 + Math.abs(opposite) * 5
  const leftHandY = 168 + bob + swing * 6
  const rightHandY = 168 + bob + opposite * 6
  outlinedLine(
    ctx,
    [[57, 114 + bob], [41, 136 + bob], [leftHandX, leftHandY]],
    16,
    palette.skin,
  )
  outlinedLine(
    ctx,
    [[123, 114 + bob], [139, 136 + bob], [rightHandX, rightHandY]],
    16,
    palette.skin,
  )

  // Hands
  ctx.fillStyle = palette.skin
  ctx.strokeStyle = OUTLINE
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(leftHandX, leftHandY + 4, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(rightHandX, rightHandY + 4, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Neck
  ctx.fillStyle = palette.skin
  ctx.strokeStyle = OUTLINE
  ctx.lineWidth = 5
  roundedRect(ctx, 79, 80 + bob, 22, 28, 8)
  ctx.fill()
  ctx.stroke()

  // Head
  ctx.beginPath()
  ctx.arc(90, 70 + bob, 29, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Ears
  ctx.beginPath()
  ctx.arc(62, 72 + bob, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(118, 72 + bob, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Hair
  ctx.fillStyle = palette.hair
  ctx.beginPath()
  ctx.arc(90, 64 + bob, 28, Math.PI * 0.95, Math.PI * 2.1)
  ctx.quadraticCurveTo(101, 49 + bob, 72, 54 + bob)
  ctx.closePath()
  ctx.fill()

  // Eyes
  ctx.fillStyle = '#f0e9b0'
  ctx.beginPath()
  ctx.ellipse(78, 69 + bob, 6, 4.5, -0.1, 0, Math.PI * 2)
  ctx.ellipse(103, 68 + bob, 6, 4.5, 0.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1a2120'
  ctx.beginPath()
  ctx.arc(80, 69 + bob, 2.2, 0, Math.PI * 2)
  ctx.arc(101, 68 + bob, 2.2, 0, Math.PI * 2)
  ctx.fill()

  // Nose and hungry mouth
  ctx.strokeStyle = '#52633e'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(90, 74 + bob)
  ctx.lineTo(87, 81 + bob)
  ctx.stroke()

  ctx.fillStyle = '#351f22'
  ctx.strokeStyle = OUTLINE
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.ellipse(90, 88 + bob, 10, 6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#d9cda2'
  ctx.fillRect(84, 85 + bob, 4, 4)
  ctx.fillRect(93, 85 + bob, 4, 4)

  // Blood stains
  ctx.fillStyle = '#a72e35'
  ctx.beginPath()
  ctx.arc(112, 105 + bob, 5, 0, Math.PI * 2)
  ctx.arc(69, 145 + bob, 3.5, 0, Math.PI * 2)
  ctx.arc(86, 128 + bob, 2.8, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#7b2028'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(112, 108 + bob)
  ctx.lineTo(116, 122 + bob)
  ctx.stroke()

  // Sickly rim light
  ctx.strokeStyle = 'rgba(200, 255, 61, 0.22)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(90, 70 + bob, 31, Math.PI * 1.2, Math.PI * 1.8)
  ctx.stroke()

  return canvas
}

function drawBarrel(): HTMLCanvasElement {
  const canvas = createCanvas(160, 200)
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  // Barrel body
  ctx.beginPath()
  ctx.moveTo(24, 42)
  ctx.quadraticCurveTo(18, 112, 28, 182)
  ctx.quadraticCurveTo(80, 196, 132, 182)
  ctx.quadraticCurveTo(142, 112, 136, 42)
  ctx.quadraticCurveTo(80, 24, 24, 42)
  ctx.closePath()
  ctx.fillStyle = '#8b5a2b'
  ctx.fill()
  ctx.strokeStyle = OUTLINE
  ctx.lineWidth = 7
  ctx.stroke()

  // Wooden staves
  ctx.strokeStyle = 'rgba(57, 33, 17, 0.5)'
  ctx.lineWidth = 3
  for (const x of [46, 69, 92, 115]) {
    ctx.beginPath()
    ctx.moveTo(x, 36)
    ctx.quadraticCurveTo(x - 2, 110, x + 1, 186)
    ctx.stroke()
  }

  // Top rim and interior
  ctx.beginPath()
  ctx.ellipse(80, 42, 58, 18, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#b97a3f'
  ctx.fill()
  ctx.strokeStyle = OUTLINE
  ctx.lineWidth = 6
  ctx.stroke()

  ctx.beginPath()
  ctx.ellipse(80, 42, 44, 11, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#5b3a21'
  ctx.fill()
  ctx.strokeStyle = OUTLINE_SOFT
  ctx.lineWidth = 3
  ctx.stroke()

  // Metal hoops
  for (const y of [78, 150]) {
    ctx.fillStyle = '#4e5a5c'
    roundedRect(ctx, 16, y, 128, 16, 7)
    ctx.fill()
    ctx.strokeStyle = OUTLINE
    ctx.lineWidth = 4
    ctx.stroke()

    ctx.fillStyle = 'rgba(220, 239, 226, 0.24)'
    ctx.fillRect(24, y + 3, 112, 3)
  }

  // Rivets
  ctx.fillStyle = '#26383a'
  for (const x of [30, 54, 106, 130]) {
    ctx.beginPath()
    ctx.arc(x, 86, 3, 0, Math.PI * 2)
    ctx.arc(x, 158, 3, 0, Math.PI * 2)
    ctx.fill()
  }

  // Highlights and scratches
  ctx.strokeStyle = 'rgba(255, 219, 157, 0.4)'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(39, 55)
  ctx.quadraticCurveTo(32, 112, 38, 171)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(58, 34, 18, 0.5)'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(102, 105)
  ctx.lineTo(116, 118)
  ctx.moveTo(55, 128)
  ctx.lineTo(63, 138)
  ctx.stroke()

  return canvas
}

export class SpriteBank {
  readonly player = drawPlayer()
  readonly barrel = drawBarrel()
  readonly zombies = ZOMBIE_PALETTES.map((palette) =>
    [0, 1, 2].map((frame) => drawZombieFrame(palette, frame)),
  )
}
