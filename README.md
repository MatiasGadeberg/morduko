# Morduko

Morduko turns a photo of a newspaper Sudoku into a puzzle you can play on your phone or iPad. It is for someone who wants to play the paper puzzle, not learn a gadget.

Photos and recognition stay on the device. Nothing is uploaded, there is no account, and there are no ads.

## Run it

```bash
npm install
npm run dev
```

Open the address Vite prints, usually http://localhost:5173.

```bash
npm test
npm run build
npm run preview
```

`npm run generate:fixtures` redraws the sample photos and the digit templates the scanner compares against.

## How to use it

1. **Scan.** On the home screen, tap **Take a photo** (this opens the camera on a phone) or **Choose a photo**. **Practice puzzle** starts a built-in puzzle when you do not have the paper.
2. **Review.** Morduko finds the 9×9 grid and reads the printed digits, including on a page with other text and a photo that is slightly tilted. If it is not sure of a digit, it leaves that cell blank and highlights it. Tap any cell to set or clear a number. **This looks right** stays off until the printed numbers have exactly one solution.
3. **Play.** Printed numbers are locked and shown in black. Numbers you enter are blue. The keypad, **Clear**, and **Undo** are large on purpose. **Notes** is a smaller pencil mode. The puzzle is saved on this device, so you can leave and come back.
4. **Check.** **Check** compares what you entered with the one solution of the printed numbers. Wrong filled cells are marked. Empty cells are not filled in. A complete correct grid shows a clear success.

## Recognition

The scanner is ordinary browser code, loaded only when you pick a photo, so the play screen stays light. It straightens a slight tilt, finds ten horizontal and ten vertical grid lines, and reads each cell by comparing the ink with a set of printed typefaces. A guess is left blank when it is not confident: a wrong given ruins the puzzle, and a blank is easy to correct on the review screen.

The puzzle logic is standard backtracking. It is used to require a unique solution before play, and again when you tap Check.
