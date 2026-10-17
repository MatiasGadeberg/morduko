import { readCell } from "./digits";
import { locateGrid } from "./grid";
import { downscaleMax, rgbaToGray, sampleRect } from "./image";

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
const INSET = 0.13;

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
        const x0 = located.xs[col];
        const x1 = located.xs[col + 1];
        const y0 = located.ys[row];
        const y1 = located.ys[row + 1];
        const padX = (x1 - x0) * INSET;
        const padY = (y1 - y0) * INSET;
        const patch = sampleRect(located.image, x0 + padX, y0 + padY, x1 - padX, y1 - padY, CELL);
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
