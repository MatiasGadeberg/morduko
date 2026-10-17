import { downscaleMax, rotateGray, type Gray } from "./image";

type Stat = { score: number; from: number; to: number };
type Band = { pos: number; score: number; from: number; to: number };
type Candidate = { lines: Band[]; penalty: number; strength: number; span: number };

function alignmentScore(gray: Gray): number {
  const { w, h, px, mask } = gray;
  const row = new Float64Array(h);
  const col = new Float64Array(w);
  const step = Math.max(1, Math.floor(Math.min(w, h) / 280));
  for (let y = 1; y < h - 1; y += step) {
    for (let x = 1; x < w - 1; x += step) {
      const i = y * w + x;
      if (mask) {
        if (!mask[i] || !mask[i - 1] || !mask[i + 1] || !mask[i - w] || !mask[i + w]) continue;
      }
      const gx = Math.abs(px[i + 1] - px[i - 1]);
      const gy = Math.abs(px[i + w] - px[i - w]);
      if (gy > gx && gy > 0.12) row[y] += gy;
      else if (gx > gy && gx > 0.12) col[x] += gx;
    }
  }
  return sharpness(row) + sharpness(col);
}

function sharpness(values: Float64Array): number {
  let sum = 0;
  let square = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    square += values[i] * values[i];
  }
  if (sum <= 1e-6) return 0;
  return square / (sum * sum);
}

function bestAngle(src: Gray): number {
  const small = downscaleMax(src, 340);
  let best = 0;
  let bestScore = -1;
  const consider = (angle: number) => {
    const rotated = Math.abs(angle) < 1e-4 ? small : rotateGray(small, -angle, "near");
    const score = alignmentScore(rotated);
    if (score > bestScore) {
      bestScore = score;
      best = angle;
    }
  };
  for (let deg = -18; deg <= 18; deg += 2) consider((deg * Math.PI) / 180);
  const around = best;
  for (let deg = -2; deg <= 2; deg += 0.5) consider(around + (deg * Math.PI) / 180);
  return best;
}

function darkMask(gray: Gray): Uint8Array {
  const { w, h, px, mask } = gray;
  const radius = Math.max(6, Math.round(Math.min(w, h) * 0.018));
  const stride = w + 1;
  const integral = new Float64Array(stride * (h + 1));
  const counts = new Float64Array(stride * (h + 1));
  for (let y = 0; y < h; y++) {
    let runSum = 0;
    let runCount = 0;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const ok = !mask || mask[i] === 1;
      if (ok) {
        runSum += px[i];
        runCount++;
      }
      const dest = (y + 1) * stride + (x + 1);
      const up = y * stride + (x + 1);
      integral[dest] = integral[up] + runSum;
      counts[dest] = counts[up] + runCount;
    }
  }
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(h - 1, y + radius);
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (mask && !mask[i]) continue;
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(w - 1, x + radius);
      const a = y0 * stride + x0;
      const b = y0 * stride + (x1 + 1);
      const c = (y1 + 1) * stride + x0;
      const d = (y1 + 1) * stride + (x1 + 1);
      const n = counts[d] - counts[b] - counts[c] + counts[a];
      if (n < 8) continue;
      const mean = (integral[d] - integral[b] - integral[c] + integral[a]) / n;
      if (px[i] < mean - 0.07) out[i] = 1;
    }
  }
  return out;
}

function horizontalStats(dark: Uint8Array, gray: Gray, maxGap: number): Stat[] {
  const { w, h, mask } = gray;
  const stats: Stat[] = [];
  for (let y = 0; y < h; y++) {
    let best = 0;
    let bestFrom = 0;
    let bestTo = 0;
    let start = -1;
    let ink = 0;
    let gap = 0;
    let last = -1;
    const reset = () => {
      start = -1;
      ink = 0;
      gap = 0;
      last = -1;
    };
    for (let x = 0; x <= w; x++) {
      const valid = x < w && (!mask || mask[y * w + x] === 1);
      const on = valid && dark[y * w + x] === 1;
      if (on) {
        if (start < 0) start = x;
        ink++;
        gap = 0;
        last = x;
        const span = last - start + 1;
        if (ink >= span * 0.62 && span > best) {
          best = span;
          bestFrom = start;
          bestTo = last;
        }
      } else if (start >= 0) {
        gap++;
        if (!valid || gap > maxGap) reset();
      }
    }
    stats.push({ score: best, from: bestFrom, to: bestTo });
  }
  return stats;
}

function verticalStats(dark: Uint8Array, gray: Gray, maxGap: number): Stat[] {
  const { w, h, mask } = gray;
  const stats: Stat[] = [];
  for (let x = 0; x < w; x++) {
    let best = 0;
    let bestFrom = 0;
    let bestTo = 0;
    let start = -1;
    let ink = 0;
    let gap = 0;
    let last = -1;
    const reset = () => {
      start = -1;
      ink = 0;
      gap = 0;
      last = -1;
    };
    for (let y = 0; y <= h; y++) {
      const valid = y < h && (!mask || mask[y * w + x] === 1);
      const on = valid && dark[y * w + x] === 1;
      if (on) {
        if (start < 0) start = y;
        ink++;
        gap = 0;
        last = y;
        const span = last - start + 1;
        if (ink >= span * 0.62 && span > best) {
          best = span;
          bestFrom = start;
          bestTo = last;
        }
      } else if (start >= 0) {
        gap++;
        if (!valid || gap > maxGap) reset();
      }
    }
    stats.push({ score: best, from: bestFrom, to: bestTo });
  }
  return stats;
}

function extractBands(stats: Stat[], rel: number, minSep: number): Band[] {
  const n = stats.length;
  let max = 0;
  for (const stat of stats) if (stat.score > max) max = stat.score;
  if (max < 28) return [];
  const thresh = max * rel;
  const raw: Band[] = [];
  let i = 0;
  while (i < n) {
    if (stats[i].score >= thresh) {
      let j = i;
      let best = i;
      while (j < n && stats[j].score >= thresh * 0.78) {
        if (stats[j].score > stats[best].score) best = j;
        j++;
      }
      if (j - i <= Math.max(8, n * 0.035)) {
        raw.push({
          pos: best,
          score: stats[best].score,
          from: stats[best].from,
          to: stats[best].to,
        });
      }
      i = j;
    } else {
      i++;
    }
  }
  const merged: Band[] = [];
  for (const band of raw) {
    const last = merged[merged.length - 1];
    if (last && band.pos - last.pos < minSep) {
      if (band.score > last.score) merged[merged.length - 1] = band;
    } else {
      merged.push(band);
    }
  }
  return merged;
}

function extentsAgree(lines: Band[]): boolean {
  const froms = lines.map((line) => line.from).sort((a, b) => a - b);
  const tos = lines.map((line) => line.to).sort((a, b) => a - b);
  const mid = Math.floor(lines.length / 2);
  const from = froms[mid];
  const to = tos[mid];
  const span = to - from;
  if (span < 36) return false;
  let hits = 0;
  for (const line of lines) {
    const overlap = Math.min(line.to, to) - Math.max(line.from, from);
    if (overlap >= span * 0.55) hits++;
  }
  return hits >= 6;
}

function candidateSets(bands: Band[]): Candidate[] {
  const sets: Candidate[] = [];
  const n = bands.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 9; j < n; j++) {
      const span = bands[j].pos - bands[i].pos;
      if (span < 64) continue;
      const gap = span / 9;
      const chosen: Band[] = [];
      let penalty = 0;
      let prev = i - 1;
      let ok = true;
      for (let k = 0; k <= 9; k++) {
        const target = bands[i].pos + gap * k;
        const tolerance = Math.max(3.5, gap * 0.32);
        let pick = -1;
        let rank = -Infinity;
        for (let t = prev + 1; t <= j; t++) {
          const distance = Math.abs(bands[t].pos - target);
          if (distance > tolerance) continue;
          const score = bands[t].score - distance * 3;
          if (score > rank) {
            rank = score;
            pick = t;
          }
        }
        if (pick < 0) {
          ok = false;
          break;
        }
        penalty += Math.abs(bands[pick].pos - target) / gap;
        chosen.push(bands[pick]);
        prev = pick;
      }
      if (!ok || chosen.length !== 10) continue;
      if (chosen[0] !== bands[i]) continue;
      if (!extentsAgree(chosen)) continue;
      const strength = chosen.reduce((sum, line) => sum + line.score, 0);
      const weakest = chosen.reduce((min, line) => Math.min(min, line.score), Infinity);
      if (weakest < strength / 10 * 0.28) continue;
      sets.push({ lines: chosen, penalty, strength, span });
    }
  }
  sets.sort((a, b) => a.penalty - b.penalty || b.strength - a.strength);
  const unique: Candidate[] = [];
  for (const set of sets) {
    const key = set.lines.map((line) => line.pos).join(",");
    if (unique.some((item) => item.lines.map((line) => line.pos).join(",") === key)) continue;
    unique.push(set);
    if (unique.length === 6) break;
  }
  return unique;
}

function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function choosePair(rows: Candidate[], cols: Candidate[]): { xs: number[]; ys: number[] } | null {
  let best: { xs: number[]; ys: number[]; score: number } | null = null;
  for (const row of rows) {
    for (const col of cols) {
      const ys = row.lines.map((line) => line.pos);
      const xs = col.lines.map((line) => line.pos);
      const gridW = xs[9] - xs[0];
      const gridH = ys[9] - ys[0];
      if (gridW < 70 || gridH < 70) continue;
      const ratio = gridH / gridW;
      if (ratio < 0.78 || ratio > 1.28) continue;
      const hx0 = median(row.lines.map((line) => line.from));
      const hx1 = median(row.lines.map((line) => line.to));
      const vy0 = median(col.lines.map((line) => line.from));
      const vy1 = median(col.lines.map((line) => line.to));
      if (Math.abs(hx0 - xs[0]) > gridW * 0.22) continue;
      if (Math.abs(hx1 - xs[9]) > gridW * 0.22) continue;
      if (Math.abs(vy0 - ys[0]) > gridH * 0.22) continue;
      if (Math.abs(vy1 - ys[9]) > gridH * 0.22) continue;
      if (Math.abs(hx1 - hx0 - gridW) > gridW * 0.28) continue;
      if (Math.abs(vy1 - vy0 - gridH) > gridH * 0.28) continue;
      const square = Math.abs(Math.log(ratio));
      const score = row.penalty + col.penalty + square * 1.4 - (row.strength + col.strength) / 1e7;
      if (!best || score < best.score) best = { xs, ys, score };
    }
  }
  return best ? { xs: best.xs, ys: best.ys } : null;
}

export type FittedLine = {
  /** Coordinate where the line crosses `mid` on the other axis. */
  intercept: number;
  slope: number;
  mid: number;
};

export type Point = { x: number; y: number };

export type LocatedGrid = {
  image: Gray;
  /** Vertical lines, x at the grid's vertical midpoint. */
  xs: number[];
  /** Horizontal lines, y at the grid's horizontal midpoint. */
  ys: number[];
  vertical: FittedLine[];
  horizontal: FittedLine[];
};

function fitVertical(dark: Uint8Array, gray: Gray, xApprox: number, y0: number, y1: number): FittedLine {
  const mid = (y0 + y1) / 2;
  const { w, h } = gray;
  let best: FittedLine & { score: number } = { intercept: xApprox, slope: 0, mid, score: -1 };
  for (let si = -10; si <= 10; si++) {
    const slope = si * 0.012;
    for (let shift = -8; shift <= 8; shift++) {
      const intercept = xApprox + shift;
      let score = 0;
      for (let y = Math.round(y0); y <= y1; y++) {
        const x = Math.round(intercept + slope * (y - mid));
        if (y < 0 || y >= h || x < 1 || x >= w - 1) continue;
        const i = y * w + x;
        if (dark[i]) score += 2;
        if (dark[i - 1]) score += 1;
        if (dark[i + 1]) score += 1;
      }
      if (score > best.score) best = { intercept, slope, mid, score };
    }
  }
  return { intercept: best.intercept, slope: best.slope, mid };
}

function fitHorizontal(dark: Uint8Array, gray: Gray, yApprox: number, x0: number, x1: number): FittedLine {
  const mid = (x0 + x1) / 2;
  const { w, h } = gray;
  let best: FittedLine & { score: number } = { intercept: yApprox, slope: 0, mid, score: -1 };
  for (let si = -10; si <= 10; si++) {
    const slope = si * 0.012;
    for (let shift = -8; shift <= 8; shift++) {
      const intercept = yApprox + shift;
      let score = 0;
      for (let x = Math.round(x0); x <= x1; x++) {
        const y = Math.round(intercept + slope * (x - mid));
        if (x < 0 || x >= w || y < 1 || y >= h - 1) continue;
        const i = y * w + x;
        if (dark[i]) score += 2;
        if (dark[i - w]) score += 1;
        if (dark[i + w]) score += 1;
      }
      if (score > best.score) best = { intercept, slope, mid, score };
    }
  }
  return { intercept: best.intercept, slope: best.slope, mid };
}

function cross(horizontal: FittedLine, vertical: FittedLine): Point {
  const denom = 1 - vertical.slope * horizontal.slope;
  const x =
    (vertical.intercept + vertical.slope * (horizontal.intercept - vertical.mid - horizontal.slope * horizontal.mid)) /
    (Math.abs(denom) < 1e-4 ? 1 : denom);
  const y = horizontal.intercept + horizontal.slope * (x - horizontal.mid);
  return { x, y };
}

/** Corners of one cell, clockwise from the top left. */
export function cellQuad(grid: LocatedGrid, row: number, col: number): [Point, Point, Point, Point] {
  return [
    cross(grid.horizontal[row], grid.vertical[col]),
    cross(grid.horizontal[row], grid.vertical[col + 1]),
    cross(grid.horizontal[row + 1], grid.vertical[col + 1]),
    cross(grid.horizontal[row + 1], grid.vertical[col]),
  ];
}

export function locateGrid(original: Gray): LocatedGrid | null {
  if (original.w < 40 || original.h < 40) return null;
  const angle = bestAngle(original);
  const image = Math.abs(angle) < 0.004 ? original : rotateGray(original, -angle, "linear");
  const dark = darkMask(image);
  const maxGap = Math.max(2, Math.round(Math.min(image.w, image.h) * 0.01));
  const minSep = Math.max(4, Math.round(Math.min(image.w, image.h) * 0.012));
  const rows = horizontalStats(dark, image, maxGap);
  const cols = verticalStats(dark, image, maxGap);
  for (const rel of [0.52, 0.4, 0.3, 0.22]) {
    const rowBands = extractBands(rows, rel, minSep);
    const colBands = extractBands(cols, rel, minSep);
    if (rowBands.length < 10 || colBands.length < 10) continue;
    const pair = choosePair(candidateSets(rowBands), candidateSets(colBands));
    if (!pair) continue;
    const vertical = pair.xs.map((x) => fitVertical(dark, image, x, pair.ys[0], pair.ys[9]));
    const horizontal = pair.ys.map((y) => fitHorizontal(dark, image, y, pair.xs[0], pair.xs[9]));
    return {
      image,
      xs: vertical.map((line) => line.intercept),
      ys: horizontal.map((line) => line.intercept),
      vertical,
      horizontal,
    };
  }
  return null;
}
