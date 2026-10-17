import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Home } from "./components/Home";
import { Play } from "./components/Play";
import { Review } from "./components/Review";
import classic from "./data/classic.json";
import { emptyGrid, grade, uniqueSolution, type Digit } from "./lib/sudoku";
import { clearPuzzle, loadPuzzle, savePuzzle, type SavedPuzzle, type UndoSnap } from "./lib/storage";

type Phase = "home" | "scanning" | "review" | "play";

type Puzzle = {
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

function blankPuzzle(givens: Digit[], uncertain?: boolean[]): Puzzle {
  return {
    givens: givens.slice(),
    entries: emptyGrid(),
    notes: Array.from({ length: 81 }, () => 0),
    uncertain: uncertain?.length === 81 ? uncertain.slice() : Array.from({ length: 81 }, () => false),
    undo: [],
    selected: null,
    notesMode: false,
    wrong: null,
    solved: false,
    checkNote: null,
  };
}

function fromSaved(saved: SavedPuzzle): Puzzle {
  return {
    givens: saved.givens,
    entries: saved.entries,
    notes: saved.notes,
    uncertain: saved.uncertain,
    undo: saved.undo,
    selected: saved.selected,
    notesMode: saved.notesMode,
    wrong: saved.wrong,
    solved: saved.solved,
    checkNote: saved.checkNote,
  };
}

function moveSelection(selected: number | null, key: string): number {
  const current = selected ?? 0;
  const row = Math.floor(current / 9);
  const col = current % 9;
  if (key === "ArrowLeft") return row * 9 + ((col + 8) % 9);
  if (key === "ArrowRight") return row * 9 + ((col + 1) % 9);
  if (key === "ArrowUp") return ((row + 8) % 9) * 9 + col;
  return ((row + 1) % 9) * 9 + col;
}

function remember(puzzle: Puzzle, index: number, phase: Phase): UndoSnap[] {
  const snap: UndoSnap = { index, entry: puzzle.entries[index], notes: puzzle.notes[index] };
  if (phase === "review") {
    snap.given = puzzle.givens[index];
    snap.uncertain = puzzle.uncertain[index];
  }
  return [...puzzle.undo, snap].slice(-80);
}

function applyDigit(puzzle: Puzzle, phase: Phase, digit: number): Puzzle | null {
  if (puzzle.selected == null) return null;
  const index = puzzle.selected;
  if (phase === "review") {
    const undo = remember(puzzle, index, phase);
    const givens = puzzle.givens.slice();
    const notes = puzzle.notes.slice();
    const uncertain = puzzle.uncertain.slice();
    uncertain[index] = false;
    if (puzzle.notesMode) {
      givens[index] = 0;
      notes[index] = notes[index] ^ (1 << digit);
    } else {
      givens[index] = digit;
      notes[index] = 0;
    }
    return { ...puzzle, givens, notes, uncertain, undo };
  }
  if (puzzle.solved || puzzle.givens[index]) return null;
  const undo = remember(puzzle, index, phase);
  const entries = puzzle.entries.slice();
  const notes = puzzle.notes.slice();
  if (puzzle.notesMode) {
    entries[index] = 0;
    notes[index] = notes[index] ^ (1 << digit);
  } else {
    entries[index] = digit;
    notes[index] = 0;
  }
  const wrong = puzzle.wrong?.slice() ?? null;
  if (wrong) wrong[index] = false;
  return { ...puzzle, entries, notes, undo, wrong, solved: false, checkNote: null };
}

function applyClear(puzzle: Puzzle, phase: Phase): Puzzle | null {
  if (puzzle.selected == null) return null;
  const index = puzzle.selected;
  if (phase === "review") {
    const undo = remember(puzzle, index, phase);
    const givens = puzzle.givens.slice();
    const notes = puzzle.notes.slice();
    const uncertain = puzzle.uncertain.slice();
    givens[index] = 0;
    notes[index] = 0;
    uncertain[index] = false;
    return { ...puzzle, givens, notes, uncertain, undo };
  }
  if (puzzle.solved || puzzle.givens[index]) return null;
  const undo = remember(puzzle, index, phase);
  const entries = puzzle.entries.slice();
  const notes = puzzle.notes.slice();
  entries[index] = 0;
  notes[index] = 0;
  const wrong = puzzle.wrong?.slice() ?? null;
  if (wrong) wrong[index] = false;
  return { ...puzzle, entries, notes, undo, wrong, checkNote: null };
}

export function App() {
  const restored = useRef(loadPuzzle()).current;
  const [phase, setPhase] = useState<Phase>(restored?.phase ?? "home");
  const [puzzle, setPuzzle] = useState<Puzzle | null>(restored ? fromSaved(restored) : null);
  const [returnPhase, setReturnPhase] = useState<"review" | "play">(restored?.phase ?? "play");
  const [notice, setNotice] = useState<string | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const scanId = useRef(0);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!puzzle || (phase !== "review" && phase !== "play")) return;
    savePuzzle({ version: 1, phase, ...puzzle });
  }, [phase, puzzle]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const current = phaseRef.current;
      if (current !== "review" && current !== "play") return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (event.key >= "1" && event.key <= "9") {
        event.preventDefault();
        const digit = Number(event.key);
        setPuzzle((prev) => (prev ? applyDigit(prev, current, digit) ?? prev : prev));
        return;
      }
      if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
        event.preventDefault();
        setPuzzle((prev) => (prev ? applyClear(prev, current) ?? prev : prev));
        return;
      }
      if ((event.key === "z" || event.key === "Z") && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setPuzzle((prev) => undoPuzzle(prev));
        return;
      }
      if (event.key.startsWith("Arrow")) {
        event.preventDefault();
        setPuzzle((prev) => (prev ? { ...prev, selected: moveSelection(prev.selected, event.key) } : prev));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function goHome() {
    if (phase === "review" || phase === "play") setReturnPhase(phase);
    setNotice(null);
    setPhase("home");
  }

  function startScan(file: File) {
    const id = ++scanId.current;
    setNotice(null);
    setPhase("scanning");
    void (async () => {
      const { recognizeFile } = await import("./scan/browser");
      const result = await recognizeFile(file);
      if (id !== scanId.current) return;
      if (!result.ok) {
        setNotice(result.message);
        setPhase("home");
        return;
      }
      setPuzzle(blankPuzzle(result.givens, result.uncertain));
      setReturnPhase("review");
      setPhase("review");
    })();
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) startScan(file);
  }

  function startPractice() {
    setPuzzle(blankPuzzle(classic.givens));
    setReturnPhase("play");
    setNotice(null);
    setPhase("play");
  }

  function startPlay() {
    setPuzzle((prev) => {
      if (!prev || !uniqueSolution(prev.givens)) return prev;
      return {
        ...prev,
        entries: emptyGrid(),
        notes: Array.from({ length: 81 }, () => 0),
        undo: [],
        selected: null,
        notesMode: false,
        wrong: null,
        solved: false,
        checkNote: null,
        uncertain: Array.from({ length: 81 }, () => false),
      };
    });
    setReturnPhase("play");
    setPhase("play");
  }

  function check() {
    setPuzzle((prev) => {
      if (!prev) return prev;
      const solution = uniqueSolution(prev.givens);
      if (!solution) {
        return { ...prev, checkNote: "These printed numbers don't make one puzzle.", wrong: null, solved: false };
      }
      const result = grade(prev.givens, prev.entries, solution);
      if (result.complete) {
        return { ...prev, wrong: result.wrong, solved: true, checkNote: null, notesMode: false, selected: null };
      }
      if (result.wrong.some(Boolean)) {
        return {
          ...prev,
          wrong: result.wrong,
          solved: false,
          checkNote: "The red numbers don't match. Empty cells are still yours to fill.",
        };
      }
      if (result.filled === 0) {
        return { ...prev, wrong: result.wrong, solved: false, checkNote: "Fill in a few numbers, then check." };
      }
      return { ...prev, wrong: result.wrong, solved: false, checkNote: "Those numbers match so far." };
    });
  }

  function finish() {
    clearPuzzle();
    setPuzzle(null);
    setNotice(null);
    setPhase("home");
  }

  return (
    <div className={phase === "review" || phase === "play" ? "app board-app" : "app"}>
      <input
        ref={cameraRef}
        className="file"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFile}
        aria-hidden="true"
        tabIndex={-1}
      />
      <input
        ref={fileRef}
        className="file"
        type="file"
        accept="image/*"
        onChange={onFile}
        aria-hidden="true"
        tabIndex={-1}
      />
      {phase === "home" ? (
        <Home
          notice={notice}
          hasSaved={puzzle != null}
          onCamera={() => cameraRef.current?.click()}
          onChoose={() => fileRef.current?.click()}
          onPractice={startPractice}
          onContinue={() => {
            setNotice(null);
            setPhase(returnPhase);
          }}
        />
      ) : null}
      {phase === "scanning" ? (
        <main className="home" aria-busy="true">
          <p className="eyebrow">Just a moment</p>
          <h1>Reading the puzzle…</h1>
          <p className="lede">This stays on your phone. Nothing is uploaded.</p>
        </main>
      ) : null}
      {phase === "review" && puzzle ? (
        <Review
          givens={puzzle.givens}
          notes={puzzle.notes}
          uncertain={puzzle.uncertain}
          selected={puzzle.selected}
          notesMode={puzzle.notesMode}
          onSelect={(index) => setPuzzle((prev) => (prev ? { ...prev, selected: index } : prev))}
          onDigit={(digit) => setPuzzle((prev) => (prev ? applyDigit(prev, "review", digit) ?? prev : prev))}
          onErase={() => setPuzzle((prev) => (prev ? applyClear(prev, "review") ?? prev : prev))}
          onUndo={() => setPuzzle((prev) => undoPuzzle(prev))}
          onNotes={() => setPuzzle((prev) => (prev ? { ...prev, notesMode: !prev.notesMode } : prev))}
          onCheck={() => undefined}
          onHome={goHome}
          onStart={startPlay}
        />
      ) : null}
      {phase === "play" && puzzle ? (
        <Play
          givens={puzzle.givens}
          entries={puzzle.entries}
          notes={puzzle.notes}
          selected={puzzle.selected}
          notesMode={puzzle.notesMode}
          wrong={puzzle.wrong}
          solved={puzzle.solved}
          checkNote={puzzle.checkNote}
          onSelect={(index) => setPuzzle((prev) => (prev ? { ...prev, selected: index } : prev))}
          onDigit={(digit) => setPuzzle((prev) => (prev ? applyDigit(prev, "play", digit) ?? prev : prev))}
          onErase={() => setPuzzle((prev) => (prev ? applyClear(prev, "play") ?? prev : prev))}
          onUndo={() => setPuzzle((prev) => undoPuzzle(prev))}
          onNotes={() => setPuzzle((prev) => (prev ? { ...prev, notesMode: !prev.notesMode } : prev))}
          onCheck={check}
          onHome={goHome}
          onFinish={finish}
        />
      ) : null}
    </div>
  );
}

function undoPuzzle(puzzle: Puzzle | null): Puzzle | null {
  if (!puzzle || puzzle.solved || puzzle.undo.length === 0) return puzzle;
  const undo = puzzle.undo.slice();
  const snap = undo.pop();
  if (!snap) return puzzle;
  const entries = puzzle.entries.slice();
  const notes = puzzle.notes.slice();
  const givens = puzzle.givens.slice();
  const uncertain = puzzle.uncertain.slice();
  entries[snap.index] = snap.entry;
  notes[snap.index] = snap.notes;
  if (typeof snap.given === "number") givens[snap.index] = snap.given;
  if (typeof snap.uncertain === "boolean") uncertain[snap.index] = snap.uncertain;
  const wrong = puzzle.wrong?.slice() ?? null;
  if (wrong) wrong[snap.index] = false;
  return { ...puzzle, givens, entries, notes, uncertain, undo, wrong, selected: snap.index, checkNote: null };
}
