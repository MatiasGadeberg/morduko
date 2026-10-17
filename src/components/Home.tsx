type HomeProps = {
  notice: string | null;
  hasSaved: boolean;
  onCamera: () => void;
  onChoose: () => void;
  onPractice: () => void;
  onContinue: () => void;
};

export function Home({ notice, hasSaved, onCamera, onChoose, onPractice, onContinue }: HomeProps) {
  return (
    <main className="home">
      <p className="eyebrow">Newspaper sudoku</p>
      <h1>Morduko</h1>
      <p className="lede">
        Take a photo of today’s puzzle and play it here. The picture stays on this phone.
      </p>
      {notice ? (
        <p className="banner" role="status">
          {notice}
        </p>
      ) : null}
      {hasSaved ? (
        <button type="button" className="btn secondary" onClick={onContinue}>
          Continue your puzzle
        </button>
      ) : null}
      <button type="button" className="btn primary" onClick={onCamera}>
        Take a photo
      </button>
      <button type="button" className="btn secondary" onClick={onChoose}>
        Choose a photo
      </button>
      <button type="button" className="btn quiet" onClick={onPractice}>
        Practice puzzle
      </button>
    </main>
  );
}
