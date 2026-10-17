import { describe, expect, it } from "vitest";
import classic from "../src/data/classic.json";
import { analyze, grade, hasConflict } from "../src/lib/sudoku";

describe("sudoku", () => {
  it("solves the practice puzzle once", () => {
    const result = analyze(classic.givens, 2);
    expect(result.count).toBe(1);
    expect(result.solution).not.toBeNull();
    expect(hasConflict(result.solution ?? [])).toBe(false);
  });

  it("rejects a repeated given and an unfinished grid", () => {
    const clash = classic.givens.slice();
    clash[1] = clash[0];
    expect(analyze(clash, 2).count).toBe(0);

    const sparse = Array.from({ length: 81 }, () => 0);
    sparse[0] = 5;
    expect(analyze(sparse, 2).count).toBe(2);
  });

  it("marks wrong filled cells and leaves blanks empty", () => {
    const solution = analyze(classic.givens, 2).solution;
    expect(solution).not.toBeNull();
    if (!solution) return;
    const entries = Array.from({ length: 81 }, () => 0);
    const emptyIndex = classic.givens.findIndex((value) => value === 0);
    const otherEmpty = classic.givens.findIndex((value, index) => value === 0 && index !== emptyIndex);
    entries[emptyIndex] = solution[emptyIndex] === 9 ? 8 : solution[emptyIndex] + 1;
    const result = grade(classic.givens, entries, solution);
    expect(result.wrong[emptyIndex]).toBe(true);
    expect(result.wrong[otherEmpty]).toBe(false);
    expect(entries[otherEmpty]).toBe(0);
    expect(result.complete).toBe(false);

    for (let i = 0; i < 81; i++) {
      if (!classic.givens[i]) entries[i] = solution[i];
    }
    const done = grade(classic.givens, entries, solution);
    expect(done.complete).toBe(true);
    expect(done.wrong.some(Boolean)).toBe(false);
  });
});
