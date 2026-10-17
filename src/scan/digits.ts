import type { Gray } from "./image";
import { NORMAL_SIDE, normalizeGray } from "./normalize";
import { TEMPLATE_SIDE, TEMPLATES } from "./templates";

export const MIN_SCORE = 0.62;
export const MIN_MARGIN = 0.045;

type Prepared = { digit: number; bits: Uint8Array; holes: number; ink: number };

let prepared: Prepared[] | null = null;

function unpack(bits: string, n: number): Uint8Array {
  const binary = atob(bits);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const byte = binary.charCodeAt(i >> 3);
    out[i] = (byte >> (i & 7)) & 1;
  }
  return out;
}

function holeCount(bits: Uint8Array, side: number): number {
  const seen = new Uint8Array(bits.length);
  const stack: number[] = [];
  const flood = (start: number) => {
    stack.length = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop() as number;
      const x = p % side;
      const y = (p / side) | 0;
      const next = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];
      for (const [nx, ny] of next) {
        if (nx < 0 || ny < 0 || nx >= side || ny >= side) continue;
        const n = ny * side + nx;
        if (seen[n] || bits[n]) continue;
        seen[n] = 1;
        stack.push(n);
      }
    }
  };
  for (let x = 0; x < side; x++) {
    if (!bits[x] && !seen[x]) flood(x);
    const bottom = (side - 1) * side + x;
    if (!bits[bottom] && !seen[bottom]) flood(bottom);
  }
  for (let y = 0; y < side; y++) {
    const left = y * side;
    const right = y * side + side - 1;
    if (!bits[left] && !seen[left]) flood(left);
    if (!bits[right] && !seen[right]) flood(right);
  }
  let holes = 0;
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] || seen[i]) continue;
    holes++;
    flood(i);
  }
  return holes;
}

function library(): Prepared[] {
  if (prepared) return prepared;
  const n = TEMPLATE_SIDE * TEMPLATE_SIDE;
  prepared = TEMPLATES.map((template) => {
    const bits = unpack(template.bits, n);
    let ink = 0;
    for (let i = 0; i < bits.length; i++) ink += bits[i];
    return { digit: template.digit, bits, holes: holeCount(bits, TEMPLATE_SIDE), ink };
  });
  return prepared;
}

function scorePair(sample: Uint8Array, template: Uint8Array): number {
  let dot = 0;
  let left = 0;
  let right = 0;
  for (let i = 0; i < sample.length; i++) {
    const a = sample[i];
    const b = template[i];
    dot += a * b;
    left += a;
    right += b;
  }
  if (left < 8 || right < 8) return 0;
  return dot / Math.sqrt(left * right);
}

export type Classification = { digit: number; score: number; margin: number };

export function classifyBitmap(sample: Uint8Array): Classification | null {
  const templates = library();
  if (!templates.length || sample.length !== NORMAL_SIDE * NORMAL_SIDE) return null;
  const holes = holeCount(sample, NORMAL_SIDE);
  let bestDigit = 0;
  let best = -1;
  let second = -1;
  for (const template of templates) {
    let score = scorePair(sample, template.bits);
    const holeGap = Math.abs(holes - template.holes);
    if (holeGap === 1) score *= 0.93;
    else if (holeGap >= 2) score *= 0.78;
    if (score > best) {
      second = best;
      best = score;
      bestDigit = template.digit;
    } else if (score > second) {
      second = score;
    }
  }
  if (best < 0) return null;
  return { digit: bestDigit, score: best, margin: best - Math.max(0, second) };
}

export type CellRead = {
  digit: number;
  uncertain: boolean;
  score: number;
};

export function readCell(patch: Gray): CellRead {
  const bitmap = normalizeGray(patch);
  if (!bitmap) return { digit: 0, uncertain: false, score: 1 };
  const found = classifyBitmap(bitmap);
  if (!found || found.score < MIN_SCORE || found.margin < MIN_MARGIN) {
    return { digit: 0, uncertain: true, score: found?.score ?? 0 };
  }
  return { digit: found.digit, uncertain: false, score: found.score };
}
