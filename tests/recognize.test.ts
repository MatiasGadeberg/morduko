import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import classic from "../src/data/classic.json";
import { recognizeRgba, type ScanResult } from "../src/scan/recognize";

function readFixture(name: string): ScanResult {
  const png = PNG.sync.read(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));
  return recognizeRgba(png.data, png.width, png.height);
}

function compare(actual: number[], expected: number[]) {
  const wrong: string[] = [];
  let found = 0;
  let givens = 0;
  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9) + 1;
    const col = (i % 9) + 1;
    if (!expected[i]) {
      if (actual[i]) wrong.push(`r${row}c${col} was empty and read as ${actual[i]}`);
      continue;
    }
    givens++;
    if (!actual[i]) continue;
    found++;
    if (actual[i] !== expected[i]) wrong.push(`r${row}c${col} read ${actual[i]} instead of ${expected[i]}`);
  }
  return { wrong, found, givens };
}

function format(grid: number[]): string {
  return Array.from({ length: 9 }, (_, row) => grid.slice(row * 9, row * 9 + 9).join(" ")).join("\n");
}

describe("newspaper scan", () => {
  it("reads a clean printed puzzle", () => {
    const result = readFixture("puzzle-clean.png");
    expect(result.ok, !result.ok ? result.message : "").toBe(true);
    if (!result.ok) return;
    const report = compare(result.givens, classic.givens);
    expect(report.wrong, format(result.givens)).toEqual([]);
    expect(report.found).toBe(report.givens);
  });

  it("reads a tilted photo with margin and other text, leaving unsure cells blank", () => {
    const result = readFixture("puzzle-tilted.png");
    expect(result.ok, !result.ok ? result.message : "").toBe(true);
    if (!result.ok) return;
    const report = compare(result.givens, classic.givens);
    expect(report.wrong, format(result.givens)).toEqual([]);
    expect(report.found).toBeGreaterThanOrEqual(Math.ceil(report.givens * 0.9));
  });

  it("fails gently when the photo has no grid", () => {
    const result = readFixture("no-grid.png");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message.length).toBeGreaterThan(20);
    expect(result.message.toLowerCase()).toContain("grid");
  });
});
