type KeypadProps = {
  onDigit: (digit: number) => void;
  onClear: () => void;
  notesMode?: boolean;
};

export function Keypad({ onDigit, onClear, notesMode = false }: KeypadProps) {
  return (
    <div className="keypad" aria-label={notesMode ? "Pencil notes" : "Numbers"}>
      <div className="keys">
        {Array.from({ length: 9 }, (_, n) => {
          const digit = n + 1;
          return (
            <button key={digit} type="button" className="key" onClick={() => onDigit(digit)}>
              {digit}
            </button>
          );
        })}
      </div>
      <button type="button" className="btn secondary clear-btn" onClick={onClear}>
        Clear
      </button>
    </div>
  );
}
