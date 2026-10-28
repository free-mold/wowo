// 喔喔占位形象：全部用 Canvas 2D 绘制，造型参考公众号里的盲盒系列。
// 拿到官方素材后，把 PNG 放进 /images/wowo/ 并在 SKIN_IMAGES 里登记，
// 对应造型就会自动改用图片绘制，游戏代码不用改。
// 官方形象取自《喔喔形象汇总.pptx》，已裁成透明底 PNG；head 是蛇头专用的脑袋图
const SKIN_IMAGES = {
  classic: '/images/wowo/classic.png',
  head: '/images/wowo/head.png',
  mask: '/images/wowo/mask.png',
  facemask: '/images/wowo/facemask.png',
  bachelor: '/images/wowo/bachelor.png',
  master: '/images/wowo/master.png',
  doctor: '/images/wowo/doctor.png',
  torch: '/images/wowo/torch.png',
  practice: '/images/wowo/practice.png',
  pc: '/images/wowo/pc.png'
}

// 有官方图的排在前面：连连看前几关只出现官方形象
const VARIANTS = [
  { id: 'classic', name: '石榴喔喔', bg: '#DDF3FF' },
  { id: 'mask', name: '抗疫喔喔', bg: '#DFF7F2' },
  { id: 'bachelor', name: '学士喔喔', bg: '#E6E6EF' },
  { id: 'master', name: '硕士喔喔', bg: '#E1E8FF' },
  { id: 'torch', name: '火炬喔喔', bg: '#FFE2DC' },
  { id: 'practice', name: '实践喔喔', bg: '#FFEDD2' },
  { id: 'pc', name: 'hello world 喔喔', bg: '#E6F4E1' },
  { id: 'facemask', name: '口罩喔喔', bg: '#E4F6FB' },
  { id: 'doctor', name: '博士喔喔', bg: '#FFE3E3' },
  { id: 'astronaut', name: '宇航员喔喔', bg: '#D8E4F8' },
  { id: 'egg', name: '破壳喔喔', bg: '#FFF5C7' },
  { id: 'gold', name: '金喔喔', bg: '#FFEFB8' },
  { id: 'origin', name: '原点喔喔', bg: '#EEF2F6' }
]

const BASE = {
  head: '#FFFFFF',
  shade: '#DDE3EA',
  line: '#2B2B2B',
  lens: '#FFFFFF',
  comb: '#E8392B',
  beak: '#F5A623',
  wattle: '#E0322A',
  blush: 'rgba(247,140,165,0.75)',
  body: '#FFD21F',
  bodyShade: '#F2B705'
}

const PALETTES = {
  gold: {
    head: '#F9D45C', shade: '#D9A520', line: '#7A5600', lens: '#FBE38E',
    comb: '#E8A800', wattle: '#D99A00', body: '#F2C230', bodyShade: '#C99400',
    blush: 'rgba(255,170,90,0.6)'
  },
  origin: {
    head: 'rgba(255,255,255,0.45)', shade: 'rgba(170,190,210,0.35)', line: '#8FA3B8',
    lens: 'rgba(255,255,255,0.6)', comb: 'rgba(232,57,43,0.55)', wattle: 'rgba(224,50,42,0.55)',
    beak: 'rgba(245,166,35,0.7)', body: 'rgba(200,215,230,0.6)', bodyShade: 'rgba(170,190,210,0.6)'
  },
  pc: { body: '#CFC8D6', bodyShade: '#B3AABD' }
}

const NO_COMB = ['bachelor', 'master', 'doctor', 'practice', 'egg']

function paletteOf(id) {
  return Object.assign({}, BASE, PALETTES[id] || {})
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function ellipse(ctx, cx, cy, rx, ry) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(rx, ry)
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, Math.PI * 2)
  ctx.restore()
}

function drawComb(ctx, cx, top, s, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(cx - 0.1 * s, top + 0.03 * s)
  ctx.bezierCurveTo(cx - 0.16 * s, top - 0.12 * s, cx - 0.06 * s, top - 0.26 * s, cx + 0.02 * s, top - 0.24 * s)
  ctx.bezierCurveTo(cx - 0.02 * s, top - 0.16 * s, cx + 0.04 * s, top - 0.12 * s, cx + 0.12 * s, top - 0.16 * s)
  ctx.bezierCurveTo(cx + 0.14 * s, top - 0.06 * s, cx + 0.1 * s, top + 0.02 * s, cx + 0.06 * s, top + 0.03 * s)
  ctx.closePath()
  ctx.fill()
}

// 圆眼镜 + 豆豆眼 + 小黄嘴；look 是 {x, y} 方向，让眼珠跟着动
function drawFace(ctx, cx, cy, s, p, look) {
  const ey = cy - 0.03 * s
  const r = 0.16 * s
  const eyes = [cx - 0.19 * s, cx + 0.19 * s]

  ctx.fillStyle = p.blush
  ellipse(ctx, cx - 0.38 * s, cy + 0.14 * s, 0.05 * s, 0.035 * s)
  ctx.fill()
  ellipse(ctx, cx + 0.38 * s, cy + 0.14 * s, 0.05 * s, 0.035 * s)
  ctx.fill()

  ctx.lineWidth = Math.max(1, 0.035 * s)
  ctx.strokeStyle = p.line
  ctx.fillStyle = p.lens
  eyes.forEach((ex) => {
    ctx.beginPath()
    ctx.arc(ex, ey, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  })
  ctx.beginPath()
  ctx.moveTo(eyes[0] + r, ey)
  ctx.lineTo(eyes[1] - r, ey)
  ctx.stroke()

  const ox = (look ? look.x : 0) * 0.06 * s
  const oy = (look ? look.y : 0) * 0.06 * s + 0.01 * s
  eyes.forEach((ex) => {
    ctx.fillStyle = p.line
    ctx.beginPath()
    ctx.arc(ex + ox, ey + oy, 0.055 * s, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(ex + ox - 0.02 * s, ey + oy - 0.02 * s, 0.018 * s, 0, Math.PI * 2)
    ctx.fill()
  })

  ctx.fillStyle = p.beak
  ctx.beginPath()
  ctx.moveTo(cx - 0.055 * s, cy + 0.16 * s)
  ctx.lineTo(cx + 0.055 * s, cy + 0.16 * s)
  ctx.lineTo(cx, cy + 0.25 * s)
  ctx.closePath()
  ctx.fill()
  ctx.lineWidth = Math.max(0.5, 0.02 * s)
  ctx.stroke()
}

// hello world 喔喔：脑袋是一台老式显示器（致敬 IBM PC）
function drawScreen(ctx, x0, y0, w, h, s) {
  ctx.fillStyle = '#2F3A3F'
  roundRect(ctx, x0 + 0.08 * s, y0 + 0.1 * s, w - 0.3 * s, h - 0.2 * s, 0.06 * s)
  ctx.fill()
  ctx.fillStyle = '#7CFFB2'
  ctx.font = `bold ${Math.max(6, 0.12 * s)}px monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('hello', x0 + 0.08 * s + (w - 0.3 * s) / 2, y0 + h / 2)
  ctx.fillStyle = '#9AA0A6'
  ctx.beginPath()
  ctx.arc(x0 + w - 0.11 * s, y0 + h * 0.6, 0.04 * s, 0, Math.PI * 2)
  ctx.arc(x0 + w - 0.11 * s, y0 + h * 0.8, 0.04 * s, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(x0 + w - 0.14 * s, y0 + 0.14 * s, 0.06 * s, 0.1 * s)
}

function drawStar(ctx, x, y, r) {
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.quadraticCurveTo(x, y, x, y + r)
  ctx.quadraticCurveTo(x, y, x - r, y)
  ctx.quadraticCurveTo(x, y, x, y - r)
  ctx.fill()
}

function drawAccessory(ctx, id, cx, cy, s, x0, y0, w, h, p, opts) {
  switch (id) {
    case 'classic': {
      // 手持的“16 + 石榴”全息投影；尺寸很小时（如蛇头）传 noProp 省略
      if (opts.noProp) break
      const bx = x0 + w - 0.02 * s
      const by = cy + 0.3 * s
      ctx.fillStyle = 'rgba(25,181,240,0.9)'
      ctx.beginPath()
      ctx.arc(bx, by, 0.14 * s, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = Math.max(1, 0.02 * s)
      ctx.beginPath()
      ctx.arc(bx, by, 0.1 * s, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#FFFFFF'
      ctx.font = `bold ${Math.max(5, 0.1 * s)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('16', bx, by + 0.005 * s)
      break
    }
    case 'mask':
    case 'facemask':
      ctx.fillStyle = id === 'mask' ? '#62D2D8' : '#BFE3F5'
      roundRect(ctx, cx - 0.4 * s, cy + 0.12 * s, 0.8 * s, 0.22 * s, 0.1 * s)
      ctx.fill()
      ctx.strokeStyle = p.line
      ctx.lineWidth = Math.max(0.5, 0.025 * s)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(cx - 0.25 * s, cy + 0.2 * s)
      ctx.lineTo(cx + 0.25 * s, cy + 0.2 * s)
      ctx.moveTo(cx - 0.25 * s, cy + 0.26 * s)
      ctx.lineTo(cx + 0.25 * s, cy + 0.26 * s)
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      ctx.stroke()
      break
    case 'bachelor':
    case 'master':
    case 'doctor': {
      const top = y0 + 0.02 * s
      ctx.fillStyle = '#2E2E36'
      roundRect(ctx, cx - 0.3 * s, top - 0.04 * s, 0.6 * s, 0.12 * s, 0.03 * s)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(cx - 0.55 * s, top - 0.07 * s)
      ctx.lineTo(cx, top - 0.19 * s)
      ctx.lineTo(cx + 0.55 * s, top - 0.07 * s)
      ctx.lineTo(cx, top + 0.04 * s)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = id === 'master' ? '#4FC3F7' : '#F5C518'
      ctx.lineWidth = Math.max(1, 0.035 * s)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(cx, top - 0.08 * s)
      ctx.lineTo(cx + 0.42 * s, top - 0.06 * s)
      ctx.lineTo(cx + 0.42 * s, top + 0.26 * s)
      ctx.stroke()
      ctx.lineCap = 'butt'
      break
    }
    case 'torch': {
      const tx = x0 + w + 0.02 * s
      const ty = cy + 0.3 * s
      ctx.fillStyle = '#F5A623'
      ctx.beginPath()
      ctx.moveTo(tx - 0.06 * s, ty - 0.4 * s)
      ctx.lineTo(tx + 0.08 * s, ty - 0.4 * s)
      ctx.lineTo(tx + 0.01 * s, ty)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#E8392B'
      ctx.beginPath()
      ctx.moveTo(tx - 0.08 * s, ty - 0.4 * s)
      ctx.quadraticCurveTo(tx - 0.09 * s, ty - 0.6 * s, tx + 0.01 * s, ty - 0.7 * s)
      ctx.quadraticCurveTo(tx + 0.11 * s, ty - 0.58 * s, tx + 0.1 * s, ty - 0.4 * s)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#FFD21F'
      ctx.beginPath()
      ctx.moveTo(tx - 0.03 * s, ty - 0.41 * s)
      ctx.quadraticCurveTo(tx - 0.03 * s, ty - 0.52 * s, tx + 0.01 * s, ty - 0.57 * s)
      ctx.quadraticCurveTo(tx + 0.06 * s, ty - 0.5 * s, tx + 0.05 * s, ty - 0.41 * s)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'practice':
      ctx.fillStyle = '#E8392B'
      ctx.beginPath()
      ctx.arc(cx, y0 + 0.08 * s, 0.36 * s, Math.PI, 0)
      ctx.closePath()
      ctx.fill()
      roundRect(ctx, cx - 0.05 * s, y0 + 0.03 * s, 0.58 * s, 0.09 * s, 0.045 * s)
      ctx.fill()
      ctx.strokeStyle = '#B71C1C'
      ctx.lineWidth = Math.max(0.5, 0.02 * s)
      ctx.beginPath()
      ctx.moveTo(cx, y0 - 0.28 * s)
      ctx.lineTo(cx, y0 + 0.06 * s)
      ctx.stroke()
      break
    case 'astronaut':
      ctx.strokeStyle = '#2F80ED'
      ctx.lineWidth = Math.max(1.5, 0.06 * s)
      ctx.beginPath()
      ctx.arc(cx + 0.02 * s, cy, 0.6 * s, Math.PI * 1.17, Math.PI * 1.83)
      ctx.stroke()
      ctx.fillStyle = '#2F80ED'
      roundRect(ctx, x0 - 0.08 * s, cy - 0.14 * s, 0.12 * s, 0.28 * s, 0.05 * s)
      ctx.fill()
      roundRect(ctx, x0 + w + 0.01 * s, cy - 0.14 * s, 0.12 * s, 0.28 * s, 0.05 * s)
      ctx.fill()
      break
    case 'egg': {
      ctx.fillStyle = '#F4C7A8'
      ctx.beginPath()
      ctx.moveTo(x0 - 0.02 * s, y0 + 0.14 * s)
      const n = 6
      for (let i = 1; i <= n; i++) {
        const x = x0 - 0.02 * s + ((w + 0.04 * s) * i) / n
        ctx.lineTo(x, y0 + (i % 2 ? 0.07 : 0.15) * s)
      }
      ctx.lineTo(x0 + w + 0.02 * s, y0 + 0.02 * s)
      ctx.quadraticCurveTo(cx, y0 - 0.3 * s, x0 - 0.02 * s, y0 + 0.02 * s)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#C98E6A'
      ctx.lineWidth = Math.max(0.5, 0.025 * s)
      ctx.stroke()
      break
    }
    case 'gold': {
      const twinkle = opts.t ? 0.75 + 0.25 * Math.sin(opts.t / 200) : 1
      ctx.fillStyle = `rgba(255,255,255,${0.9 * twinkle})`
      drawStar(ctx, x0 + 0.08 * s, y0 + 0.1 * s, 0.08 * s * twinkle)
      drawStar(ctx, x0 + w - 0.06 * s, y0 + h - 0.12 * s, 0.06 * s * twinkle)
      break
    }
  }
}

// 只画脑袋（贪吃喔喔的蛇头、连连看的方块都用这个）
function drawHead(ctx, id, cx, cy, s, opts) {
  const p = paletteOf(id)
  const w = s
  const h = s * 0.78
  const x0 = cx - w / 2
  const y0 = cy - h / 2
  const r = s * 0.17

  if (NO_COMB.indexOf(id) < 0) drawComb(ctx, cx + 0.04 * s, y0, s, p.comb)

  ctx.fillStyle = p.shade
  roundRect(ctx, x0 + 0.05 * s, y0 + 0.04 * s, w, h, r)
  ctx.fill()

  ctx.fillStyle = id === 'pc' ? '#F1E6C2' : p.head
  roundRect(ctx, x0, y0, w, h, r)
  ctx.fill()
  ctx.lineWidth = Math.max(1, 0.035 * s)
  ctx.strokeStyle = p.line
  ctx.stroke()

  if (id === 'pc') drawScreen(ctx, x0, y0, w, h, s)
  else drawFace(ctx, cx, cy, s, p, opts.look)

  ctx.fillStyle = p.wattle
  ellipse(ctx, cx - 0.035 * s, y0 + h + 0.035 * s, 0.04 * s, 0.05 * s)
  ctx.fill()
  ellipse(ctx, cx + 0.035 * s, y0 + h + 0.035 * s, 0.04 * s, 0.05 * s)
  ctx.fill()

  drawAccessory(ctx, id, cx, cy, s, x0, y0, w, h, p, opts)
}

// base 是图片路径前缀：小程序传空，网页版（web/ 目录）传 '..'
// ids 只加载需要的图（单个游戏的小程序只打包自己用到的 PNG）
function loadSkins(canvas, base = '', ids = Object.keys(SKIN_IMAGES)) {
  const skins = {}
  return Promise.all(ids.filter((id) => SKIN_IMAGES[id]).map((id) => new Promise((resolve) => {
    const img = canvas.createImage ? canvas.createImage() : new Image()
    img.onload = () => {
      skins[id] = img
      resolve()
    }
    img.onerror = () => resolve()
    img.src = base + SKIN_IMAGES[id]
  }))).then(() => skins)
}

// 把图片等比缩放进以 (cx, cy) 为中心、边长 box 的正方形
function drawSkin(ctx, img, cx, cy, box) {
  const k = Math.min(box / img.width, box / img.height)
  const w = img.width * k
  const h = img.height * k
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h)
}

// cx, cy 是脑袋中心，s 是脑袋宽度。
// opts.skinId 可指定改用哪张图（蛇头用 'head'），opts.skinBox 是图片占 s 的倍数
function drawWowo(ctx, id, cx, cy, s, opts = {}) {
  const img = opts.skins && opts.skins[opts.skinId || id]
  if (img) return drawSkin(ctx, img, cx, cy, s * (opts.skinBox || 1.3))
  drawHead(ctx, id, cx, cy, s, opts)
}

// 全身版（首页展示用），cx, cy 仍是脑袋中心
function drawFullWowo(ctx, id, cx, cy, s, opts = {}) {
  const img = opts.skins && opts.skins[id]
  if (img) return drawSkin(ctx, img, cx, cy + 0.23 * s, s * 1.7)
  const p = paletteOf(id)
  const neck = cy + 0.39 * s
  ctx.fillStyle = p.body
  roundRect(ctx, cx - 0.2 * s, neck + 0.25 * s, 0.15 * s, 0.32 * s, 0.07 * s)
  ctx.fill()
  roundRect(ctx, cx + 0.05 * s, neck + 0.25 * s, 0.15 * s, 0.32 * s, 0.07 * s)
  ctx.fill()
  ellipse(ctx, cx, neck + 0.22 * s, 0.25 * s, 0.26 * s)
  ctx.fill()
  ctx.fillStyle = p.bodyShade
  ellipse(ctx, cx - 0.25 * s, neck + 0.2 * s, 0.07 * s, 0.14 * s)
  ctx.fill()
  ellipse(ctx, cx + 0.25 * s, neck + 0.2 * s, 0.07 * s, 0.14 * s)
  ctx.fill()
  drawHead(ctx, id, cx, cy, s, opts)
}

module.exports = { VARIANTS, drawWowo, drawFullWowo, loadSkins, roundRect, ellipse }
