import { Board } from "./Board";
import { Controls } from "./Controls";

type PlayProps = {
  givens: number[];
  entries: number[];
  notes: number[];
  selected: number | null;
  notesMode: boolean;
  wrong: boolean[] | null;
  solved: boolean;
  checkNote: string | null;
  onSelect: (index: number | null) => void;
  onDigit: (digit: number) => void;
  onErase: () => void;
  onUndo: () => void;
  onNotes: () => void;
  onCheck: () => void;
  onHome: () => void;
  onFinish: () => void;
};

export function Play(props: PlayProps) {
  const {
    givens,
    entries,
    notes,
    selected,
    notesMode,
    wrong,
    solved,
    checkNote,
    onSelect,
    onDigit,
    onErase,
    onUndo,
    onNotes,
    onCheck,
    onHome,
    onFinish,
  } = props;

  return (
    <main className="screen">
      <header className="topbar">
        <h1>Morduko</h1>
        <button type="button" className="linkish" onClick={onHome}>
          Home
        </button>
      </header>
      {solved ? (
        <div className="success" role="status">
          <h2>You did it</h2>
          <p>The puzzle is complete.</p>
        </div>
      ) : checkNote ? (
        <p className={`status ${wrong?.some(Boolean) ? "warn" : "quiet"}`} role="status">
          {checkNote}
        </p>
      ) : (
        <p className="help slim">Your numbers are blue.</p>
      )}
      <div className="play-layout">
        <div className="board-wrap">
          <Board
            givens={givens}
            entries={entries}
            notes={notes}
            wrong={wrong}
            selected={selected}
            lockGivens
            onSelect={onSelect}
          />
        </div>
        {solved ? (
          <button type="button" className="btn primary compact" onClick={onFinish}>
            Back to start
          </button>
        ) : (
          <Controls
            notesMode={notesMode}
            onDigit={onDigit}
            onErase={onErase}
            onUndo={onUndo}
            onNotes={onNotes}
            onCheck={onCheck}
          />
        )}
      </div>
    </main>
  );
}
