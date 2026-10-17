import { useMemo } from "react";
import { analyze } from "../lib/sudoku";
import { Board } from "./Board";
import { Controls } from "./Controls";

type ReviewProps = {
  givens: number[];
  notes: number[];
  uncertain: boolean[];
  selected: number | null;
  notesMode: boolean;
  onSelect: (index: number | null) => void;
  onDigit: (digit: number) => void;
  onErase: () => void;
  onUndo: () => void;
  onNotes: () => void;
  onCheck: () => void;
  onHome: () => void;
  onStart: () => void;
};

export function Review({
  givens,
  notes,
  uncertain,
  selected,
  notesMode,
  onSelect,
  onDigit,
  onErase,
  onUndo,
  onNotes,
  onCheck,
  onHome,
  onStart,
}: ReviewProps) {
  const signature = givens.join("");
  const status = useMemo(() => {
    const result = analyze(givens, 2);
    if (result.count === 0) {
      return {
        ready: false,
        tone: "warn" as const,
        message: "These numbers don't make a puzzle. Change a digit that doesn't belong.",
      };
    }
    if (result.count > 1) {
      return {
        ready: false,
        tone: "warn" as const,
        message: "More than one puzzle fits. Fill a blank, or fix a digit.",
      };
    }
    return { ready: true, tone: "quiet" as const, message: "This is one puzzle." };
  }, [signature, givens]);

  const unsure = uncertain.some(Boolean);

  return (
    <main className="screen">
      <header className="topbar">
        <h1>Check the numbers</h1>
        <button type="button" className="linkish" onClick={onHome}>
          Home
        </button>
      </header>
      <p className="help slim">Tap a cell to change a number.</p>
      {unsure ? <p className="help slim mark">Marked cells were hard to read.</p> : null}
      <p className={`status ${status.tone}`} role="status">
        {status.message}
      </p>
      <div className="play-layout">
        <div className="board-wrap">
          <Board
            givens={givens}
            notes={notes}
            uncertain={uncertain}
            selected={selected}
            onSelect={onSelect}
          />
        </div>
        <Controls
          notesMode={notesMode}
          onDigit={onDigit}
          onErase={onErase}
          onUndo={onUndo}
          onNotes={onNotes}
          onCheck={onCheck}
          extra={
            <button type="button" className="btn primary compact" disabled={!status.ready} onClick={onStart}>
              This looks right
            </button>
          }
        />
      </div>
    </main>
  );
}
