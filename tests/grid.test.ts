import { describe, expect, it } from "vitest";
import { locateGrid } from "../src/scan/grid";
import { rotateGray, type Gray } from "../src/scan/image";

function paintPuzzle(): Gray {
  const w = 520;
  const h = 640;
  const px = new Float32Array(w * h);
  px.fill(0.96);
  const x0 = 70;
  const y0 = 120;
  const size = 360;
  const cell = size / 9;
  for (let i = 0; i <= 9; i++) {
    const thick = i % 3 === 0 ? 2 : 1;
    const y = Math.round(y0 + i * cell);
    const x = Math.round(x0 + i * cell);
    for (let t = -thick; t <= thick; t++) {
      const yy = y + t;
      const xx = x + t;
      for (let k = 0; k <= size; k++) {
        if (yy >= 0 && yy < h) px[yy * w + (x0 + k)] = 0.05;
        if (xx >= 0 && xx < w) px[(y0 + k) * w + xx] = 0.04;
      }
    }
  }
  for (let row = 0; row < 14; row++) {
    const y = 40 + row * 5;
    for (let x = 70; x < 250; x += 4) px[y * w + x] = 0.1;
  }
  return { w, h, px };
}

function gaps(lines: number[]): number[] {
  return lines.slice(1).map((value, index) => value - lines[index]);
}

describe("grid locator", () => {
  it("finds an upright grid among other marks", () => {
    const located = locateGrid(paintPuzzle());
    expect(located).not.toBeNull();
    if (!located) return;
    expect(located.xs).toHaveLength(10);
    expect(located.ys).toHaveLength(10);
    const span = located.xs[9] - located.xs[0];
    expect(span).toBeGreaterThan(300);
    expect(span).toBeLessThan(430);
    for (const gap of gaps(located.xs)) expect(gap).toBeGreaterThan(span / 12);
  });

  it("finds the same grid after a small rotation", () => {
    const rotated = rotateGray(paintPuzzle(), (7 * Math.PI) / 180);
    const located = locateGrid(rotated);
    expect(located).not.toBeNull();
    if (!located) return;
    const width = located.xs[9] - located.xs[0];
    const height = located.ys[9] - located.ys[0];
    expect(Math.abs(width - height) / width).toBeLessThan(0.12);
    const step = width / 9;
    for (const gap of [...gaps(located.xs), ...gaps(located.ys)]) {
      expect(Math.abs(gap - step) / step).toBeLessThan(0.2);
    }
  });
});
