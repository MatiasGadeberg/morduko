export type Gray = {
  w: number;
  h: number;
  /** Luminance, 0 black to 1 white. */
  px: Float32Array;
  /** 1 where the pixel belongs to the photo. Padding from rotation is 0. */
  mask?: Uint8Array;
};

export function rgbaToGray(data: ArrayLike<number>, w: number, h: number): Gray {
  const px = new Float32Array(w * h);
  for (let p = 0, i = 0; p < px.length; p++, i += 4) {
    px[p] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
  }
  return { w, h, px };
}

export function sampleBilinear(src: Gray, x: number, y: number): { v: number; ok: boolean } {
  if (x < 0 || y < 0 || x > src.w - 1 || y > src.h - 1) return { v: 1, ok: false };
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, src.w - 1);
  const y1 = Math.min(y0 + 1, src.h - 1);
  const i00 = y0 * src.w + x0;
  const i10 = y0 * src.w + x1;
  const i01 = y1 * src.w + x0;
  const i11 = y1 * src.w + x1;
  if (src.mask && !(src.mask[i00] && src.mask[i10] && src.mask[i01] && src.mask[i11])) {
    return { v: 1, ok: false };
  }
  const tx = x - x0;
  const ty = y - y0;
  const v =
    src.px[i00] * (1 - tx) * (1 - ty) +
    src.px[i10] * tx * (1 - ty) +
    src.px[i01] * (1 - tx) * ty +
    src.px[i11] * tx * ty;
  return { v, ok: true };
}

export function resizeGray(src: Gray, w: number, h: number): Gray {
  const px = new Float32Array(w * h);
  const mask = src.mask ? new Uint8Array(w * h) : undefined;
  px.fill(1);
  for (let y = 0; y < h; y++) {
    const gy = ((y + 0.5) * src.h) / h - 0.5;
    for (let x = 0; x < w; x++) {
      const gx = ((x + 0.5) * src.w) / w - 0.5;
      const sample = sampleBilinear(src, gx, gy);
      px[y * w + x] = sample.v;
      if (mask) mask[y * w + x] = sample.ok ? 1 : 0;
    }
  }
  return { w, h, px, mask };
}

export function downscaleMax(gray: Gray, maxSide: number): Gray {
  const longest = Math.max(gray.w, gray.h);
  if (longest <= maxSide) return gray;
  const scale = maxSide / longest;
  const w = Math.max(1, Math.round(gray.w * scale));
  const h = Math.max(1, Math.round(gray.h * scale));
  return resizeGray(gray, w, h);
}

/**
 * Positive `angle` turns the photo clockwise in image coordinates (y down).
 * `mode: "near"` is for the deskew search; the final straighten uses bilinear.
 */
export function rotateGray(src: Gray, angle: number, mode: "near" | "linear" = "linear"): Gray {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const cx = (src.w - 1) / 2;
  const cy = (src.h - 1) / 2;
  const corners: [number, number][] = [
    [0, 0],
    [src.w - 1, 0],
    [src.w - 1, src.h - 1],
    [0, src.h - 1],
  ];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of corners) {
    const dx = x - cx;
    const dy = y - cy;
    const xr = c * dx - s * dy + cx;
    const yr = s * dx + c * dy + cy;
    minX = Math.min(minX, xr);
    minY = Math.min(minY, yr);
    maxX = Math.max(maxX, xr);
    maxY = Math.max(maxY, yr);
  }
  const w = Math.max(1, Math.round(maxX - minX + 1));
  const h = Math.max(1, Math.round(maxY - minY + 1));
  const px = new Float32Array(w * h);
  const mask = new Uint8Array(w * h);
  px.fill(1);
  for (let y = 0; y < h; y++) {
    const dy = y + minY - cy;
    for (let x = 0; x < w; x++) {
      const dx = x + minX - cx;
      const sx = c * dx + s * dy + cx;
      const sy = -s * dx + c * dy + cy;
      if (mode === "near") {
        const ix = Math.round(sx);
        const iy = Math.round(sy);
        if (ix < 0 || iy < 0 || ix >= src.w || iy >= src.h) continue;
        const i = iy * src.w + ix;
        if (src.mask && !src.mask[i]) continue;
        px[y * w + x] = src.px[i];
        mask[y * w + x] = 1;
      } else {
        const sample = sampleBilinear(src, sx, sy);
        if (!sample.ok) continue;
        px[y * w + x] = sample.v;
        mask[y * w + x] = 1;
      }
    }
  }
  return { w, h, px, mask };
}

export function sampleRect(src: Gray, x0: number, y0: number, x1: number, y1: number, size: number): Gray {
  const px = new Float32Array(size * size);
  px.fill(1);
  const width = x1 - x0;
  const height = y1 - y0;
  for (let y = 0; y < size; y++) {
    const gy = y0 + ((y + 0.5) / size) * height;
    for (let x = 0; x < size; x++) {
      const gx = x0 + ((x + 0.5) / size) * width;
      px[y * size + x] = sampleBilinear(src, gx, gy).v;
    }
  }
  return { w: size, h: size, px };
}
