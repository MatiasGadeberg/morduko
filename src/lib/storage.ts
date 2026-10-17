import type { Digit } from "./sudoku";

const KEY = "morduko.puzzle.v1";

export type UndoSnap = {
  index: number;
  entry: number;
  notes: number;
};

export type SavedPuzzle = {
  version: 1;
  phase: "review" | "play";
  givens: Digit[];
  entries: Digit[];
  notes: number[];
  uncertain: boolean[];
  undo: UndoSnap[];
  selected: number | null;
  notesMode: boolean;
  wrong: boolean[] | null;
  solved: boolean;
  checkNote: string | null;
};

function isDigitGrid(value: unknown): value is Digit[] {
  return (
    Array.isArray(value) &&
    value.length === 81 &&
    value.every((n) => typeof n === "number" && n >= 0 && n <= 9 && n === Math.floor(n))
  );
}

function isBoolGrid(value: unknown): value is boolean[] {
  return Array.isArray(value) && value.length === 81 && value.every((n) => typeof n === "boolean");
}

function isNotes(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === 81 &&
    value.every((n) => typeof n === "number" && n >= 0 && n < 1024 && n === Math.floor(n))
  );
}

export function loadPuzzle(): SavedPuzzle | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<SavedPuzzle>;
    if (data.version !== 1) return null;
    if (data.phase !== "review" && data.phase !== "play") return null;
    if (!isDigitGrid(data.givens) || !isDigitGrid(data.entries) || !isNotes(data.notes)) return null;
    if (!isBoolGrid(data.uncertain)) return null;
    const wrong = data.wrong == null ? null : isBoolGrid(data.wrong) ? data.wrong : null;
    const undo = Array.isArray(data.undo)
      ? data.undo
          .filter(
            (step): step is UndoSnap =>
              !!step &&
              typeof step.index === "number" &&
              step.index >= 0 &&
              step.index < 81 &&
              typeof step.entry === "number" &&
              typeof step.notes === "number",
          )
          .slice(-80)
      : [];
    const selected = typeof data.selected === "number" && data.selected >= 0 && data.selected < 81 ? data.selected : null;
    return {
      version: 1,
      phase: data.phase,
      givens: data.givens,
      entries: data.entries,
      notes: data.notes,
      uncertain: data.uncertain,
      undo,
      selected,
      notesMode: Boolean(data.notesMode),
      wrong,
      solved: Boolean(data.solved),
      checkNote: typeof data.checkNote === "string" ? data.checkNote : null,
    };
  } catch {
    return null;
  }
}

export function savePuzzle(puzzle: SavedPuzzle): void {
  try {
    if (typeof localStorage === "undefined") return;
    const next = { ...puzzle, undo: puzzle.undo.slice(-80) };
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode and full storage should not block play.
  }
}

export function clearPuzzle(): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(KEY);
  } catch {
    // Ignore.
  }
}
