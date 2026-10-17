import { readCell } from "./digits";
import { cellQuad, locateGrid, type Point } from "./grid";
import { downscaleMax, rgbaToGray, sampleQuad } from "./image";

export type ScanSuccess = {
  ok: true;
  givens: number[];
  uncertain: boolean[];
};

export type ScanFailure = {
  ok: false;
  message: string;
};

export type ScanResult = ScanSuccess | ScanFailure;

export const NO_GRID_MESSAGE =
  "I couldn't find a Sudoku grid in that photo. Try again with the whole puzzle in the picture, on a flat page.";

const CELL = 64;
const INSET = 0.14;

function insetQuad(quad: [Point, Point, Point, Point], amount: number): [Point, Point, Point, Point] {
  const cx = (quad[0].x + quad[1].x + quad[2].x + quad[3].x) / 4;
  const cy = (quad[0].y + quad[1].y + quad[2].y + quad[3].y) / 4;
  return quad.map((point) => ({
    x: point.x + (cx - point.x) * amount,
    y: point.y + (cy - point.y) * amount,
  })) as [Point, Point, Point, Point];
}

export function recognizeRgba(data: ArrayLike<number>, w: number, h: number): ScanResult {
  try {
    if (w < 30 || h < 30) return { ok: false, message: NO_GRID_MESSAGE };
    const gray = downscaleMax(rgbaToGray(data, w, h), 1700);
    const located = locateGrid(gray);
    if (!located) return { ok: false, message: NO_GRID_MESSAGE };
    const givens = Array.from({ length: 81 }, () => 0);
    const uncertain = Array.from({ length: 81 }, () => false);
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const [tl, tr, br, bl] = insetQuad(cellQuad(located, row, col), INSET);
        const patch = sampleQuad(located.image, tl, tr, br, bl, CELL);
        const read = readCell(patch);
        const index = row * 9 + col;
        givens[index] = read.digit;
        uncertain[index] = read.uncertain;
      }
    }
    return { ok: true, givens, uncertain };
  } catch {
    return { ok: false, message: NO_GRID_MESSAGE };
  }
}
