// 连连看连线规则：两点之间的折线最多拐两个弯，且经过的格子都为空。
// grid 外圈留一圈 0，允许连线从棋盘边缘绕过去。

function isEmpty(grid, r, c) {
  return grid[r][c] === 0
}

function same(a, b) {
  return a.r === b.r && a.c === b.c
}

// 同行或同列，且两点之间（不含端点）没有方块
function lineClear(grid, a, b) {
  if (a.r === b.r) {
    const lo = Math.min(a.c, b.c)
    const hi = Math.max(a.c, b.c)
    for (let c = lo + 1; c < hi; c++) if (!isEmpty(grid, a.r, c)) return false
    return true
  }
  if (a.c === b.c) {
    const lo = Math.min(a.r, b.r)
    const hi = Math.max(a.r, b.r)
    for (let r = lo + 1; r < hi; r++) if (!isEmpty(grid, r, a.c)) return false
    return true
  }
  return false
}

// 一个拐角：返回拐点，找不到返回 null
function oneCorner(grid, a, b) {
  const corners = [{ r: a.r, c: b.c }, { r: b.r, c: a.c }]
  for (const p of corners) {
    if (isEmpty(grid, p.r, p.c) && lineClear(grid, a, p) && lineClear(grid, p, b)) return p
  }
  return null
}

// 返回连线经过的点 [a, 拐点..., b]，连不上返回 null
function findPath(grid, a, b) {
  if (same(a, b)) return null
  if (lineClear(grid, a, b)) return [a, b]
  const p = oneCorner(grid, a, b)
  if (p) return [a, p, b]

  const rows = grid.length
  const cols = grid[0].length
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]
  for (const [dr, dc] of dirs) {
    let r = a.r + dr
    let c = a.c + dc
    while (r >= 0 && r < rows && c >= 0 && c < cols && isEmpty(grid, r, c)) {
      const mid = { r, c }
      const q = oneCorner(grid, mid, b)
      if (q) return [a, mid, q, b]
      r += dr
      c += dc
    }
  }
  return null
}

// 找出任意一对可以消除的方块，没有返回 null
function findMove(grid) {
  const byType = {}
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      const v = grid[r][c]
      if (!v) continue
      ;(byType[v] = byType[v] || []).push({ r, c })
    }
  }
  for (const v in byType) {
    const cells = byType[v]
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        if (findPath(grid, cells[i], cells[j])) return [cells[i], cells[j]]
      }
    }
  }
  return null
}

module.exports = { findPath, findMove }
