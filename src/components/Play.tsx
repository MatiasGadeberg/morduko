import { Board } from "./Board";
import { Keypad } from "./Keypad";

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
  onClear: () => void;
  onUndo: () => void;
  onToggleNotes: () => void;
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
    onClear,
    onUndo,
    onToggleNotes,
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
        <p className={`status ${wrong?.some(Boolean) ? "warn" : "ok"}`} role="status">
          {checkNote}
        </p>
      ) : (
        <p className="help">Printed numbers stay put. Yours are in blue.</p>
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
          <div className="side">
            <button type="button" className="btn primary" onClick={onFinish}>
              Back to start
            </button>
          </div>
        ) : (
          <div className="side">
            <Keypad onDigit={onDigit} onClear={onClear} notesMode={notesMode} />
            <div className="actions">
              <button type="button" className="btn secondary" onClick={onUndo}>
                Undo
              </button>
              <button
                type="button"
                className={`btn secondary notes-toggle ${notesMode ? "on" : ""}`}
                aria-pressed={notesMode}
                onClick={onToggleNotes}
              >
                Notes
              </button>
              <button type="button" className="btn primary check" onClick={onCheck}>
                Check
              </button>
            </div>
            {notesMode ? <p className="help">Notes are on. Tap a number to pencil it in.</p> : null}
          </div>
        )}
      </div>
    </main>
  );
}
