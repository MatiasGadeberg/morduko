import type { Gray } from "./image";

export const NORMAL_SIDE = 28;

function otsu(px: Float32Array): number {
  const hist = new Float64Array(256);
  for (let i = 0; i < px.length; i++) {
    const bin = Math.max(0, Math.min(255, Math.round(px[i] * 255)));
    hist[bin]++;
  }
  const total = px.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumBg = 0;
  let weightBg = 0;
  let best = -1;
  let threshold = 128;
  for (let i = 0; i < 256; i++) {
    weightBg += hist[i];
    if (!weightBg) continue;
    const weightFg = total - weightBg;
    if (!weightFg) break;
    sumBg += i * hist[i];
    const meanBg = sumBg / weightBg;
    const meanFg = (sum - sumBg) / weightFg;
    const between = weightBg * weightFg * (meanBg - meanFg) * (meanBg - meanFg);
    if (between > best) {
      best = between;
      threshold = i;
    }
  }
  return threshold / 255;
}

function blur3(gray: Gray): Float32Array {
  const { w, h, px } = gray;
  const out = new Float32Array(px.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          sum += px[yy * w + xx];
          n++;
        }
      }
      out[y * w + x] = sum / n;
    }
  }
  return out;
}

/** Turn a dark-on-light patch into a centered 28×28 bitmap, or null when the cell is empty. */
export function normalizeGray(gray: Gray): Uint8Array | null {
  const { w, h } = gray;
  if (w < 8 || h < 8) return null;
  let min = 1;
  let max = 0;
  const src = gray.px;
  for (let i = 0; i < src.length; i++) {
    if (src[i] < min) min = src[i];
    if (src[i] > max) max = src[i];
  }
  if (max - min < 0.14 || min > 0.78) return null;

  const blurred = blur3(gray);
  const threshold = Math.min(otsu(blurred), (min + max) * 0.5 + 0.05);
  const bin = new Uint8Array(w * h);
  const border = Math.max(2, Math.round(Math.min(w, h) * 0.06));
  let ink = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < border || y < border || x >= w - border || y >= h - border) continue;
      if (blurred[y * w + x] < threshold) {
        bin[y * w + x] = 1;
        ink++;
      }
    }
  }
  if (ink < Math.max(8, w * h * 0.012)) return null;

  const kept = new Uint8Array(w * h);
  const seen = new Uint8Array(w * h);
  let keptInk = 0;
  for (let i = 0; i < bin.length; i++) {
    if (!bin[i] || seen[i]) continue;
    const stack = [i];
    const pixels: number[] = [];
    seen[i] = 1;
    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    while (stack.length) {
      const p = stack.pop() as number;
      pixels.push(p);
      const x = p % w;
      const y = (p / w) | 0;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      const neighbors = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const n = ny * w + nx;
        if (seen[n] || !bin[n]) continue;
        seen[n] = 1;
        stack.push(n);
      }
    }
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    const flat = bw <= 2 || bh <= 2;
    if (pixels.length < 8 || flat) continue;
    for (const p of pixels) kept[p] = 1;
    keptInk += pixels.length;
  }
  if (keptInk < 8) return null;

  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!kept[y * w + x]) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  if (bh < h * 0.18 && bw < w * 0.18) return null;

  const target = 22;
  const scale = target / Math.max(bw, bh);
  const dw = Math.max(1, Math.round(bw * scale));
  const dh = Math.max(1, Math.round(bh * scale));
  const ox = Math.floor((NORMAL_SIDE - dw) / 2);
  const oy = Math.floor((NORMAL_SIDE - dh) / 2);
  const out = new Uint8Array(NORMAL_SIDE * NORMAL_SIDE);
  for (let y = 0; y < dh; y++) {
    const sy = minY + ((y + 0.5) / dh) * bh - 0.5;
    const y0 = Math.max(0, Math.min(h - 1, Math.floor(sy)));
    const y1 = Math.max(0, Math.min(h - 1, y0 + 1));
    const ty = sy - Math.floor(sy);
    for (let x = 0; x < dw; x++) {
      const sx = minX + ((x + 0.5) / dw) * bw - 0.5;
      const x0 = Math.max(0, Math.min(w - 1, Math.floor(sx)));
      const x1 = Math.max(0, Math.min(w - 1, x0 + 1));
      const tx = sx - Math.floor(sx);
      const v =
        kept[y0 * w + x0] * (1 - tx) * (1 - ty) +
        kept[y0 * w + x1] * tx * (1 - ty) +
        kept[y1 * w + x0] * (1 - tx) * ty +
        kept[y1 * w + x1] * tx * ty;
      if (v >= 0.35) out[(oy + y) * NORMAL_SIDE + (ox + x)] = 1;
    }
  }
  return out;
}
