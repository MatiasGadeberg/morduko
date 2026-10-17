import type { ReactNode } from "react";

type ControlsProps = {
  notesMode: boolean;
  onDigit: (digit: number) => void;
  onUndo: () => void;
  onErase: () => void;
  onNotes: () => void;
  onCheck: () => void;
  extra?: ReactNode;
};

export function Controls({ notesMode, onDigit, onUndo, onErase, onNotes, onCheck, extra }: ControlsProps) {
  return (
    <div className="dock">
      <div className="tool-row">
        <button type="button" className="tool" onClick={onUndo}>
          <UndoIcon />
          <span>Undo</span>
        </button>
        <button type="button" className="tool" onClick={onErase}>
          <EraseIcon />
          <span>Erase</span>
        </button>
        <button type="button" className={`tool ${notesMode ? "on" : ""}`} aria-pressed={notesMode} onClick={onNotes}>
          <span className="tool-icon">
            <NotesIcon />
            {notesMode ? <span className="tool-mark">On</span> : null}
          </span>
          <span>Notes</span>
        </button>
        <button type="button" className="tool" onClick={onCheck}>
          <CheckIcon />
          <span>Check</span>
        </button>
      </div>
      <div className="digit-row" aria-label={notesMode ? "Pencil notes" : "Numbers"}>
        {Array.from({ length: 9 }, (_, n) => {
          const digit = n + 1;
          return (
            <button key={digit} type="button" className="digit-key" onClick={() => onDigit(digit)}>
              {digit}
            </button>
          );
        })}
      </div>
      {extra}
    </div>
  );
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8 8H4.5V4.5M5 13a7 7 0 1 0 1.2-4.2L4.5 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EraseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M15.2 4.2 19.8 8.8 10.6 18H6.4L3.8 15.4 13 6.2a1.6 1.6 0 0 1 2.2 0Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="m8.6 10.4 4.8 4.8M6.4 18h13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 19.5 16.8 6.2a1.8 1.8 0 0 1 2.5 2.5L8.2 21H5v-1.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M14.2 8.2 17 11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12.5 9.2 17 19 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
