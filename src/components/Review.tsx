import { useMemo } from "react";
import { analyze } from "../lib/sudoku";
import { Board } from "./Board";
import { Keypad } from "./Keypad";

type ReviewProps = {
  givens: number[];
  uncertain: boolean[];
  selected: number | null;
  onSelect: (index: number | null) => void;
  onDigit: (digit: number) => void;
  onClear: () => void;
  onHome: () => void;
  onStart: () => void;
};

export function Review({ givens, uncertain, selected, onSelect, onDigit, onClear, onHome, onStart }: ReviewProps) {
  const signature = givens.join("");
  const status = useMemo(() => {
    const result = analyze(givens, 2);
    if (result.count === 0) {
      return {
        ready: false,
        tone: "warn" as const,
        message: "These numbers don't make a puzzle. Look for a digit that doesn't belong.",
      };
    }
    if (result.count > 1) {
      return {
        ready: false,
        tone: "warn" as const,
        message: "More than one puzzle fits these numbers. Fill a blank cell, or correct a digit that looks wrong.",
      };
    }
    return { ready: true, tone: "ok" as const, message: "This is one puzzle." };
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
      <p className="help">
        Tap a cell, then tap a number to fix it. A wrong printed number spoils the puzzle, so take a moment.
      </p>
      {unsure ? <p className="help mark">Highlighted cells were hard to read. Leave them blank if no number was printed.</p> : null}
      <div className="play-layout">
        <div className="board-wrap">
          <Board givens={givens} uncertain={uncertain} selected={selected} onSelect={onSelect} />
        </div>
        <div className="side">
          <p className={`status ${status.tone}`} role="status">
            {status.message}
          </p>
          <Keypad onDigit={onDigit} onClear={onClear} />
          <button type="button" className="btn primary" disabled={!status.ready} onClick={onStart}>
            This looks right
          </button>
        </div>
      </div>
    </main>
  );
}
