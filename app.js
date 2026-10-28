// 网页版：首页 + 贪吃喔喔 + 喔喔连连看，用 #hash 切换页面。
// 玩法与小程序版（pages/snake、pages/link）一致，喔喔绘制和连线规则在 utils/（从小程序版复制）。
;(function () {
  const { VARIANTS, drawWowo, drawFullWowo, loadSkins, roundRect, ellipse } = window.Wowo
  const { findPath, findMove } = window.LinkPath

  const $ = (sel, root = document) => root.querySelector(sel)
  let skins = {}

  const storage = {
    getBest(game) {
      try {
        return Number(localStorage.getItem('best_' + game)) || 0
      } catch (e) {
        return 0
      }
    },
    // 返回是否刷新了纪录
    setBest(game, score) {
      if (score <= this.getBest(game)) return false
      try {
        localStorage.setItem('best_' + game, String(score))
      } catch (e) {}
      return true
    }
  }

  function setupCanvas(canvas, w, h) {
    const dpr = window.devicePixelRatio || 1
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    return ctx
  }

  function contentWidth() {
    return Math.min($('.app').clientWidth - 32, 480)
  }

  function isTouchUI() {
    return window.matchMedia('(pointer: coarse)').matches
  }

  function vibrate(ms) {
    if (navigator.vibrate) navigator.vibrate(ms)
  }

  function setText(root, key, value) {
    root.querySelectorAll(`[data-bind="${key}"]`).forEach((n) => {
      n.textContent = value
    })
  }

  function bindActions(root, actions) {
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]')
      if (btn && actions[btn.dataset.action]) actions[btn.dataset.action]()
    })
  }

  function createTip(root) {
    let timer = null
    return {
      show(text) {
        clearTimeout(timer)
        setText(root, 'tip', text)
        timer = setTimeout(() => setText(root, 'tip', ''), 1500)
      },
      clear() {
        clearTimeout(timer)
        setText(root, 'tip', '')
      }
    }
  }

  // ---------------- 首页 ----------------
  function createHome() {
    const el = $('#screen-home')
    const hero = $('.hero', el)
    const canvas = $('canvas', hero)
    let ctx, w, h
    let running = false
    let index = 0

    hero.addEventListener('click', () => {
      index = (index + 1) % VARIANTS.length
      setText(el, 'variant', VARIANTS[index].name)
    })

    function frame() {
      if (!running) return
      draw(Date.now())
      requestAnimationFrame(frame)
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h)
      const s = Math.min(w * 0.42, h * 0.5)
      const cx = w / 2
      const cy = h / 2 - 0.2 * s
      const bob = Math.sin(t / 320) * s * 0.04
      ctx.fillStyle = 'rgba(18,58,122,0.10)'
      ellipse(ctx, cx, cy + 1.08 * s, 0.32 * s * (1 - bob / s), 0.06 * s)
      ctx.fill()
      drawFullWowo(ctx, VARIANTS[index].id, cx, cy + bob, s, { skins, t })
    }

    function resize() {
      w = hero.clientWidth
      h = hero.clientHeight
      ctx = setupCanvas(canvas, w, h)
    }

    return {
      title: '喔喔游戏厅',
      enter() {
        resize()
        setText(el, 'snakeBest', storage.getBest('snake'))
        setText(el, 'linkBest', storage.getBest('link'))
        running = true
        requestAnimationFrame(frame)
      },
      leave() {
        running = false
      },
      resize
    }
  }

  // ---------------- 贪吃喔喔 ----------------
  function createSnake() {
    const COLS = 15
    const ROWS = 18
    const START_SPEED = 200 // 每步毫秒数，越小越快
    const MIN_SPEED = 85
    const DIRS = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 }
    }
    const KEYS = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right',
      W: 'up', S: 'down', A: 'left', D: 'right'
    }

    const el = $('#screen-snake')
    const canvas = $('canvas', el)
    const overlay = $('.overlay', el)
    const wrap = $('.board-wrap', el)
    const tip = createTip(el)

    let ctx, cell
    let body, dir, queue, foods, speed, acc, last, pausedAt, touch
    let running = false
    let state = 'ready' // ready | playing | paused | over
    let score = 0

    function resize() {
      const reserved = isTouchUI() ? 340 : 200
      cell = Math.max(12, Math.min(
        Math.floor(contentWidth() / COLS),
        Math.floor((window.innerHeight - reserved) / ROWS)
      ))
      ctx = setupCanvas(canvas, cell * COLS, cell * ROWS)
      wrap.style.width = cell * COLS + 'px'
      wrap.style.height = cell * ROWS + 'px'
    }

    function setScore(n) {
      score = n
      setText(el, 'score', n)
    }

    function setState(next, isRecord) {
      state = next
      overlay.hidden = next === 'playing'
      $('.pad-pause', el).textContent = next === 'playing' ? 'Ⅱ' : '▶'
      if (next === 'ready') {
        overlay.innerHTML = `
          <div class="overlay-title">贪吃喔喔</div>
          <p class="overlay-line">${isTouchUI() ? '滑动棋盘或点方向键' : '方向键或 WASD'}控制喔喔</p>
          <p class="overlay-line">石榴 +1 · 代码块 +3（限时出现）</p>
          <p class="overlay-line">小心 BUG：吃到会扣分、身体变短</p>
          <button class="btn-primary" data-action="start">开始游戏</button>`
      } else if (next === 'paused') {
        overlay.innerHTML = `
          <div class="overlay-title">暂停中</div>
          <button class="btn-primary" data-action="resume">继续</button>
          <button class="btn-ghost" data-action="restart">重新开始</button>`
      } else if (next === 'over') {
        overlay.innerHTML = `
          <div class="overlay-title">撞墙啦！</div>
          <div class="overlay-score">${score}</div>
          ${isRecord ? '<div class="overlay-badge">新纪录</div>' : ''}
          <button class="btn-primary" data-action="restart">再来一局</button>
          <a class="btn-ghost" href="#home">返回首页</a>`
      }
    }

    function reset() {
      const y = Math.floor(ROWS / 2)
      body = [{ x: 5, y }, { x: 4, y }, { x: 3, y }]
      dir = DIRS.right
      queue = []
      foods = []
      speed = START_SPEED
      acc = 0
      spawn('seed')
      setScore(0)
      tip.clear()
    }

    function start() {
      setState('playing')
    }

    function pause() {
      if (state !== 'playing') return
      pausedAt = Date.now()
      setState('paused')
    }

    function resume() {
      // 暂停期间限时道具不应该过期
      const gap = Date.now() - (pausedAt || Date.now())
      foods.forEach((f) => {
        if (f.expire) f.expire += gap
      })
      setState('playing')
    }

    function togglePause() {
      if (state === 'playing') pause()
      else if (state === 'paused') resume()
      else if (state === 'ready') start()
    }

    function restart() {
      reset()
      start()
    }

    function frame() {
      if (!running) return
      const now = Date.now()
      const dt = last ? Math.min(now - last, 250) : 0
      last = now
      if (state === 'playing') {
        acc += dt
        while (acc >= speed && state === 'playing') {
          acc -= speed
          step(now)
        }
      }
      draw(now)
      requestAnimationFrame(frame)
    }

    function step(now) {
      if (queue.length) dir = queue.shift()
      const head = body[0]
      const next = { x: head.x + dir.x, y: head.y + dir.y }
      foods = foods.filter((f) => !f.expire || f.expire > now)

      if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS || hitSelf(next)) {
        gameOver()
        return
      }

      body.unshift(next)
      const idx = foods.findIndex((f) => f.x === next.x && f.y === next.y)
      if (idx < 0) {
        body.pop()
        return
      }
      eat(foods.splice(idx, 1)[0])
    }

    // 尾巴这一步会挪走，所以不算最后一节
    function hitSelf(p) {
      for (let i = 0; i < body.length - 1; i++) {
        if (body[i].x === p.x && body[i].y === p.y) return true
      }
      return false
    }

    function eat(food) {
      let next = score
      if (food.type === 'bug') {
        next = Math.max(0, next - 2)
        body.pop()
        const cut = Math.min(2, body.length - 3)
        for (let i = 0; i < cut; i++) body.pop()
        tip.show('踩到 BUG 了！-2')
        vibrate(60)
      } else {
        next += food.type === 'code' ? 3 : 1
        speed = Math.max(MIN_SPEED, speed - 4)
        if (food.type === 'code') tip.show('代码写完了！+3')
      }

      if (food.type === 'seed') {
        spawn('seed')
        if (Math.random() < 0.25 && !has('code')) spawn('code', 8000)
        if (next >= 5 && Math.random() < 0.3 && !has('bug')) spawn('bug', 10000)
      }
      setScore(next)
    }

    function has(type) {
      return foods.some((f) => f.type === type)
    }

    function spawn(type, life) {
      const taken = new Set()
      body.forEach((p) => taken.add(p.y * COLS + p.x))
      foods.forEach((f) => taken.add(f.y * COLS + f.x))
      const free = []
      for (let i = 0; i < COLS * ROWS; i++) if (!taken.has(i)) free.push(i)
      if (!free.length) return
      const i = free[Math.floor(Math.random() * free.length)]
      foods.push({ x: i % COLS, y: Math.floor(i / COLS), type, expire: life ? Date.now() + life : 0 })
    }

    function gameOver() {
      const isRecord = storage.setBest('snake', score)
      setText(el, 'best', storage.getBest('snake'))
      vibrate(150)
      setState('over', isRecord)
    }

    function turn(name) {
      const d = DIRS[name]
      if (!d || state === 'over' || state === 'paused') return
      const lastDir = queue.length ? queue[queue.length - 1] : dir
      if ((d.x === -lastDir.x && d.y === -lastDir.y) || (d.x === lastDir.x && d.y === lastDir.y)) return
      if (queue.length < 2) queue.push(d)
      if (state === 'ready') start()
    }

    el.querySelectorAll('[data-dir]').forEach((btn) => {
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault()
        turn(btn.dataset.dir)
      })
    })

    canvas.addEventListener('pointerdown', (e) => {
      touch = { x: e.clientX, y: e.clientY }
    })
    canvas.addEventListener('pointerup', (e) => {
      if (!touch) return
      const dx = e.clientX - touch.x
      const dy = e.clientY - touch.y
      touch = null
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return
      if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 'right' : 'left')
      else turn(dy > 0 ? 'down' : 'up')
    })

    bindActions(el, { start, resume, restart, togglePause })

    function draw(now) {
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          ctx.fillStyle = (x + y) % 2 ? '#E4F2FD' : '#EFF8FF'
          ctx.fillRect(x * cell, y * cell, cell, cell)
        }
      }

      foods.forEach((f) => drawFood(f, now))

      for (let i = body.length - 1; i >= 1; i--) {
        const p = body[i]
        const size = cell * (0.86 - (0.2 * i) / body.length)
        ctx.fillStyle = i % 2 ? '#FFD21F' : '#FFC107'
        roundRect(ctx, p.x * cell + (cell - size) / 2, p.y * cell + (cell - size) / 2, size, size, size * 0.3)
        ctx.fill()
      }

      const h = body[0]
      drawWowo(ctx, 'classic', h.x * cell + cell / 2, h.y * cell + cell / 2, cell * 1.15, {
        skins,
        look: dir,
        noProp: true,
        skinId: 'head',
        skinBox: 1.1
      })
    }

    function drawFood(f, now) {
      const cx = f.x * cell + cell / 2
      const cy = f.y * cell + cell / 2
      // 快过期时闪烁提示
      if (f.expire && f.expire - now < 2500 && Math.floor(now / 150) % 2) return

      if (f.type === 'seed') {
        const r = cell * 0.34
        ctx.fillStyle = '#B71C1C'
        ctx.beginPath()
        ctx.moveTo(cx - r * 0.45, cy - r * 0.7)
        ctx.lineTo(cx - r * 0.3, cy - r * 1.25)
        ctx.lineTo(cx, cy - r * 0.9)
        ctx.lineTo(cx + r * 0.3, cy - r * 1.25)
        ctx.lineTo(cx + r * 0.45, cy - r * 0.7)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#E53935'
        ctx.beginPath()
        ctx.arc(cx, cy + r * 0.1, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.55)'
        ctx.beginPath()
        ctx.arc(cx - r * 0.4, cy - r * 0.2, r * 0.22, 0, Math.PI * 2)
        ctx.fill()
      } else if (f.type === 'code') {
        const size = cell * (0.78 + 0.06 * Math.sin(now / 150))
        ctx.fillStyle = '#0E7BD8'
        roundRect(ctx, cx - size / 2, cy - size / 2, size, size, size * 0.22)
        ctx.fill()
        ctx.fillStyle = '#FFFFFF'
        ctx.font = `bold ${Math.floor(cell * 0.36)}px monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('</>', cx, cy + 1)
      } else {
        const wiggle = Math.sin(now / 90) * cell * 0.04
        ctx.strokeStyle = '#1B5E20'
        ctx.lineWidth = Math.max(1, cell * 0.06)
        ctx.beginPath()
        for (let k = -1; k <= 1; k++) {
          const ly = cy + k * cell * 0.16
          ctx.moveTo(cx - cell * 0.38, ly + wiggle)
          ctx.lineTo(cx + cell * 0.38, ly - wiggle)
        }
        ctx.moveTo(cx - cell * 0.08, cy - cell * 0.3)
        ctx.lineTo(cx - cell * 0.18, cy - cell * 0.44)
        ctx.moveTo(cx + cell * 0.08, cy - cell * 0.3)
        ctx.lineTo(cx + cell * 0.18, cy - cell * 0.44)
        ctx.stroke()
        ctx.fillStyle = '#2E7D32'
        ellipse(ctx, cx, cy + cell * 0.04, cell * 0.24, cell * 0.3)
        ctx.fill()
        ctx.fillStyle = '#1B5E20'
        ctx.beginPath()
        ctx.arc(cx, cy - cell * 0.26, cell * 0.12, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(cx, cy - cell * 0.18)
        ctx.lineTo(cx, cy + cell * 0.32)
        ctx.stroke()
      }
    }

    return {
      title: '贪吃喔喔',
      enter() {
        resize()
        setText(el, 'best', storage.getBest('snake'))
        reset()
        setState('ready')
        running = true
        last = 0
        requestAnimationFrame(frame)
      },
      leave() {
        running = false
        tip.clear()
      },
      resize,
      pause,
      onKey(e) {
        if (KEYS[e.key]) {
          e.preventDefault()
          turn(KEYS[e.key])
        } else if (e.key === ' ') {
          e.preventDefault()
          togglePause()
        } else if (e.key === 'Enter' && state === 'over') {
          restart()
        }
      }
    }
  }

  // ---------------- 喔喔连连看 ----------------
  function createLink() {
    const ROWS = 8
    const COLS = 6
    const COMBO_WINDOW = 3000

    const el = $('#screen-link')
    const canvas = $('canvas', el)
    const overlay = $('.overlay', el)
    const wrap = $('.board-wrap', el)
    const timebar = $('.timebar', el)
    const fill = $('.timebar-fill', el)
    const tip = createTip(el)

    let ctx, cell, width, height
    let grid = null
    let selected = null
    let hint = null
    let link = null
    let busy = false
    let lastMatch = 0
    let timer = null
    const s = { level: 1, score: 0, timeLeft: 0, timeTotal: 0, hints: 3, shuffles: 3, combo: 0, state: 'ready' }

    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const t = arr[i]
        arr[i] = arr[j]
        arr[j] = t
      }
      return arr
    }

    // 外圈留半格给绕边的连线：格子中心在 (c * cell, r * cell)，c 取 1..COLS
    function resize() {
      cell = Math.max(28, Math.min(
        Math.floor(contentWidth() / (COLS + 1)),
        Math.floor((window.innerHeight - 250) / (ROWS + 1))
      ))
      width = cell * (COLS + 1)
      height = cell * (ROWS + 1)
      ctx = setupCanvas(canvas, width, height)
      wrap.style.width = width + 'px'
      wrap.style.height = height + 'px'
      timebar.style.width = width + 'px'
      if (grid) draw()
    }

    function render() {
      setText(el, 'level', s.level)
      setText(el, 'score', s.score)
      setText(el, 'hints', s.hints)
      setText(el, 'shuffles', s.shuffles)
      setText(el, 'time', s.timeLeft + 's')
      setText(el, 'pauseLabel', s.state === 'playing' ? '暂停' : '继续')
      fill.style.width = (s.timeTotal ? (s.timeLeft * 100) / s.timeTotal : 100) + '%'
      fill.classList.toggle('danger', s.timeLeft <= 20)
      $('[data-action="useHint"]', el).classList.toggle('disabled', !s.hints)
      $('[data-action="useShuffle"]', el).classList.toggle('disabled', !s.shuffles)
    }

    function setState(next, extra = {}) {
      s.state = next
      overlay.hidden = next === 'playing'
      const badge = extra.isRecord ? '<div class="overlay-badge">新纪录</div>' : ''
      if (next === 'ready') {
        overlay.innerHTML = `
          <div class="overlay-title">喔喔连连看</div>
          <p class="overlay-line">点两个相同的喔喔，</p>
          <p class="overlay-line">连线拐弯不超过两次就能消除</p>
          <p class="overlay-line">3 秒内连续消除有连击加分</p>
          <button class="btn-primary" data-action="start">开始游戏</button>`
      } else if (next === 'paused') {
        overlay.innerHTML = `
          <div class="overlay-title">暂停中</div>
          <button class="btn-primary" data-action="resume">继续</button>
          <button class="btn-ghost" data-action="restart">从第 1 关重来</button>`
      } else if (next === 'win') {
        overlay.innerHTML = `
          <div class="overlay-title">第 ${s.level} 关通过！</div>
          <p class="overlay-line">剩余时间奖励 +${extra.bonus}</p>
          <div class="overlay-score">${s.score}</div>
          ${badge}
          <button class="btn-primary" data-action="nextLevel">下一关</button>`
      } else if (next === 'lose') {
        overlay.innerHTML = `
          <div class="overlay-title">时间到！</div>
          <div class="overlay-score">${s.score}</div>
          ${badge}
          <button class="btn-primary" data-action="restart">再来一局</button>
          <a class="btn-ghost" href="#home">返回首页</a>`
      }
      render()
    }

    function newBoard() {
      const types = Math.min(5 + s.level, VARIANTS.length)
      const tiles = []
      for (let i = 0; i < (ROWS * COLS) / 2; i++) {
        const t = (i % types) + 1
        tiles.push(t, t)
      }
      grid = []
      for (let r = 0; r < ROWS + 2; r++) grid.push(new Array(COLS + 2).fill(0))
      let k = 0
      for (let r = 1; r <= ROWS; r++) {
        for (let c = 1; c <= COLS; c++) grid[r][c] = tiles[k++]
      }
      shuffleGrid()
      selected = null
      hint = null
      link = null
      busy = false
      lastMatch = 0
      s.timeTotal = s.timeLeft = Math.max(90, 180 - (s.level - 1) * 15)
      s.hints = 3
      s.shuffles = 3
      s.combo = 0
      tip.clear()
    }

    // 打乱剩余方块，保证至少有一步可走
    function shuffleGrid() {
      const cells = []
      for (let r = 1; r <= ROWS; r++) {
        for (let c = 1; c <= COLS; c++) if (grid[r][c]) cells.push({ r, c })
      }
      for (let tries = 0; tries < 100; tries++) {
        const vals = shuffle(cells.map((p) => grid[p.r][p.c]))
        cells.forEach((p, i) => { grid[p.r][p.c] = vals[i] })
        if (findMove(grid)) return
      }
    }

    function remaining() {
      let n = 0
      for (let r = 1; r <= ROWS; r++) {
        for (let c = 1; c <= COLS; c++) if (grid[r][c]) n++
      }
      return n
    }

    function startTimer() {
      stopTimer()
      timer = setInterval(() => {
        s.timeLeft = Math.max(0, s.timeLeft - 1)
        render()
        if (s.timeLeft <= 0) lose()
      }, 1000)
    }

    function stopTimer() {
      clearInterval(timer)
      timer = null
    }

    function start() {
      setState('playing')
      startTimer()
    }

    function pause() {
      if (s.state !== 'playing') return
      stopTimer()
      setState('paused')
    }

    function resume() {
      setState('playing')
      startTimer()
    }

    function togglePause() {
      if (s.state === 'playing') pause()
      else if (s.state === 'paused') resume()
      else if (s.state === 'ready') start()
    }

    function restart() {
      s.level = 1
      s.score = 0
      newBoard()
      draw()
      start()
    }

    function nextLevel() {
      s.level += 1
      newBoard()
      draw()
      start()
    }

    function win() {
      stopTimer()
      const bonus = s.timeLeft * 2
      s.score += bonus
      const isRecord = storage.setBest('link', s.score)
      setState('win', { bonus, isRecord })
    }

    function lose() {
      stopTimer()
      const isRecord = storage.setBest('link', s.score)
      vibrate(150)
      setState('lose', { isRecord })
    }

    function useHint() {
      if (s.state !== 'playing' || !s.hints) return
      hint = findMove(grid)
      s.hints -= 1
      render()
      draw()
    }

    function useShuffle() {
      if (s.state !== 'playing' || !s.shuffles || busy) return
      shuffleGrid()
      selected = null
      hint = null
      s.shuffles -= 1
      render()
      draw()
    }

    canvas.addEventListener('pointerdown', (e) => {
      if (s.state !== 'playing' || busy) return
      const c = Math.round(e.offsetX / cell)
      const r = Math.round(e.offsetY / cell)
      if (r < 1 || r > ROWS || c < 1 || c > COLS || !grid[r][c]) return
      const cur = { r, c }
      const sel = selected

      if (!sel || grid[sel.r][sel.c] !== grid[r][c]) {
        selected = cur
      } else if (sel.r === r && sel.c === c) {
        selected = null
      } else {
        const path = findPath(grid, sel, cur)
        if (path) return match(sel, cur, path)
        selected = cur
      }
      draw()
    })

    function match(a, b, path) {
      busy = true
      link = path
      selected = null
      hint = null
      draw()

      const now = Date.now()
      s.combo = now - lastMatch < COMBO_WINDOW ? s.combo + 1 : 0
      lastMatch = now
      s.score += 10 + s.combo * 5
      if (s.combo > 0) tip.show(`连击 ×${s.combo + 1}`)
      render()

      setTimeout(() => {
        grid[a.r][a.c] = 0
        grid[b.r][b.c] = 0
        link = null
        busy = false
        if (!remaining()) {
          draw()
          win()
          return
        }
        if (!findMove(grid)) {
          shuffleGrid()
          tip.show('没有能连的喔喔了，自动洗牌')
        }
        draw()
      }, 220)
    }

    bindActions(el, { start, resume, restart, nextLevel, togglePause, useHint, useShuffle })

    function isAt(p, r, c) {
      return p && p.r === r && p.c === c
    }

    function draw() {
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#F7FBFF'
      ctx.fillRect(0, 0, width, height)

      const size = cell * 0.9
      const h = hint || []
      for (let r = 1; r <= ROWS; r++) {
        for (let c = 1; c <= COLS; c++) {
          const v = grid[r][c]
          if (!v) continue
          const variant = VARIANTS[v - 1]
          const x = c * cell
          const y = r * cell
          const sel = isAt(selected, r, c)
          const hinted = isAt(h[0], r, c) || isAt(h[1], r, c)
          const lift = sel ? 2 : 0

          ctx.fillStyle = 'rgba(18,58,122,0.12)'
          roundRect(ctx, x - size / 2 + 1, y - size / 2 + 3, size, size, size * 0.2)
          ctx.fill()
          ctx.fillStyle = variant.bg
          roundRect(ctx, x - size / 2, y - size / 2 - lift, size, size, size * 0.2)
          ctx.fill()
          ctx.lineWidth = sel || hinted ? 3 : 1
          ctx.strokeStyle = sel ? '#0E7BD8' : hinted ? '#FF9800' : 'rgba(18,58,122,0.15)'
          ctx.stroke()

          drawWowo(ctx, variant.id, x, y + size * 0.06 - lift, size * 0.66, { skins, skinBox: 1.2 })
        }
      }

      if (link) {
        const clamp = (v, max) => Math.min(Math.max(v, 3), max - 3)
        ctx.strokeStyle = '#0E7BD8'
        ctx.lineWidth = 4
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'
        ctx.beginPath()
        link.forEach((p, i) => {
          const px = clamp(p.c * cell, width)
          const py = clamp(p.r * cell, height)
          if (i) ctx.lineTo(px, py)
          else ctx.moveTo(px, py)
        })
        ctx.stroke()
      }
    }

    return {
      title: '喔喔连连看',
      enter() {
        resize()
        s.level = 1
        s.score = 0
        newBoard()
        draw()
        setState('ready')
      },
      leave() {
        stopTimer()
        tip.clear()
      },
      redraw() {
        if (grid) draw()
      },
      resize,
      pause
    }
  }

  // ---------------- 路由 ----------------
  const screens = { home: createHome(), snake: createSnake(), link: createLink() }
  let current = null

  function route() {
    const key = location.hash.slice(1)
    const name = screens[key] ? key : 'home'
    if (current === screens[name]) return
    if (current) current.leave()
    Object.keys(screens).forEach((k) => {
      $('#screen-' + k).hidden = k !== name
    })
    $('.nav-title').textContent = screens[name].title
    $('.nav-back').hidden = name === 'home'
    document.title = screens[name].title
    current = screens[name]
    current.enter()
  }

  let resizeTimer = null
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => current && current.resize(), 150)
  })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && current && current.pause) current.pause()
  })
  document.addEventListener('keydown', (e) => {
    if (current && current.onKey) current.onKey(e)
  })
  window.addEventListener('hashchange', route)

  // 图片异步加载，回来后让静态画面（连连看棋盘）重画一次
  loadSkins(document.createElement('canvas'), '.').then((loaded) => {
    skins = loaded
    if (current && current.redraw) current.redraw()
  })
  route()
})()
