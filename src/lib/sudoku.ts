/** A puzzle cell. 0 is empty. */
export type Digit = number;

export type Analysis = {
  count: number;
  solution: Digit[] | null;
};

function usedMask(grid: readonly Digit[], index: number): number {
  const row = Math.floor(index / 9);
  const col = index % 9;
  let used = 0;
  for (let k = 0; k < 9; k++) {
    if (k !== col) {
      const value = grid[row * 9 + k];
      if (value) used |= 1 << value;
    }
    if (k !== row) {
      const value = grid[k * 9 + col];
      if (value) used |= 1 << value;
    }
    const br = Math.floor(row / 3) * 3 + Math.floor(k / 3);
    const bc = Math.floor(col / 3) * 3 + (k % 3);
    const bi = br * 9 + bc;
    if (bi !== index) {
      const value = grid[bi];
      if (value) used |= 1 << value;
    }
  }
  return used;
}

export function hasConflict(grid: readonly Digit[]): boolean {
  for (let i = 0; i < 81; i++) {
    const value = grid[i];
    if (value && usedMask(grid, i) & (1 << value)) return true;
  }
  return false;
}

/** Count solutions, stopping at `limit`. Returns one solution when one exists. */
export function analyze(grid: readonly Digit[], limit = 2): Analysis {
  if (grid.length !== 81 || hasConflict(grid)) return { count: 0, solution: null };
  const cells = grid.slice();
  let count = 0;
  let solution: Digit[] | null = null;

  const walk = (): boolean => {
    if (count >= limit) return true;
    let best = -1;
    let bestUsed = 0;
    let bestCount = 10;
    for (let i = 0; i < 81; i++) {
      if (cells[i]) continue;
      const used = usedMask(cells, i);
      let open = 0;
      for (let digit = 1; digit <= 9; digit++) {
        if ((used & (1 << digit)) === 0) open++;
      }
      if (open === 0) return false;
      if (open < bestCount) {
        best = i;
        bestUsed = used;
        bestCount = open;
        if (open === 1) break;
      }
    }
    if (best < 0) {
      count++;
      if (!solution) solution = cells.slice();
      return count >= limit;
    }
    for (let digit = 1; digit <= 9; digit++) {
      if (bestUsed & (1 << digit)) continue;
      cells[best] = digit;
      if (walk()) return true;
      cells[best] = 0;
    }
    return false;
  };

  walk();
  return { count, solution };
}

export function countSolutions(grid: readonly Digit[], limit = 2): number {
  return analyze(grid, limit).count;
}

export function uniqueSolution(grid: readonly Digit[]): Digit[] | null {
  const result = analyze(grid, 2);
  return result.count === 1 ? result.solution : null;
}

export type Grade = {
  wrong: boolean[];
  complete: boolean;
  filled: number;
};

/** Compare filled answers with the solution. Empty cells stay empty. */
export function grade(givens: readonly Digit[], entries: readonly Digit[], solution: readonly Digit[]): Grade {
  const wrong = Array.from({ length: 81 }, () => false);
  let complete = true;
  let filled = 0;
  for (let i = 0; i < 81; i++) {
    if (givens[i]) {
      if (givens[i] !== solution[i]) complete = false;
      continue;
    }
    const value = entries[i] ?? 0;
    if (!value) {
      complete = false;
      continue;
    }
    filled++;
    if (value !== solution[i]) {
      wrong[i] = true;
      complete = false;
    }
  }
  return { wrong, complete, filled };
}

export function cloneGrid(grid: readonly Digit[]): Digit[] {
  return grid.slice();
}

export function emptyGrid(): Digit[] {
  return Array.from({ length: 81 }, () => 0);
}

export function sameGrid(a: readonly Digit[], b: readonly Digit[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
