type BoardProps = {
  givens: number[];
  entries?: number[];
  notes?: number[];
  uncertain?: boolean[];
  wrong?: boolean[] | null;
  selected: number | null;
  lockGivens?: boolean;
  onSelect: (index: number) => void;
};

function Notes({ mask }: { mask: number }) {
  return (
    <span className="notes">
      {Array.from({ length: 9 }, (_, n) => {
        const digit = n + 1;
        const on = (mask & (1 << digit)) !== 0;
        return (
          <span key={digit} className={on ? "on" : undefined}>
            {on ? digit : ""}
          </span>
        );
      })}
    </span>
  );
}

export function Board({
  givens,
  entries,
  notes,
  uncertain,
  wrong,
  selected,
  lockGivens = false,
  onSelect,
}: BoardProps) {
  return (
    <div className="board" role="grid" aria-label="Sudoku">
      {givens.map((given, index) => {
        const row = Math.floor(index / 9);
        const col = index % 9;
        const entry = entries?.[index] ?? 0;
        const value = given || entry;
        const noteMask = !value ? notes?.[index] ?? 0 : 0;
        const isGiven = Boolean(given) && lockGivens;
        const classes = [
          "cell",
          col === 2 || col === 5 ? "b-r" : "",
          row === 2 || row === 5 ? "b-b" : "",
          isGiven ? "given" : "",
          !isGiven && entry ? "entry" : "",
          uncertain?.[index] ? "uncertain" : "",
          wrong?.[index] ? "wrong" : "",
          selected === index ? "selected" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const label = [
          `Row ${row + 1}, column ${col + 1}`,
          value ? String(value) : "empty",
          isGiven ? "printed" : "",
          uncertain?.[index] ? "needs a look" : "",
          wrong?.[index] ? "does not match" : "",
        ]
          .filter(Boolean)
          .join(", ");
        return (
          <button
            key={index}
            type="button"
            role="gridcell"
            className={classes}
            aria-label={label}
            aria-selected={selected === index}
            data-index={index}
            data-digit={value || ""}
            onClick={() => {
              if (isGiven) return;
              onSelect(index);
            }}
          >
            {value ? <span className="digit">{value}</span> : noteMask ? <Notes mask={noteMask} /> : null}
          </button>
        );
      })}
    </div>
  );
}
