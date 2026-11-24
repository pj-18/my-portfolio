/**
 * Steps through the favourite game. Every position was worked out at build time, so this
 * only redraws the pieces for the chosen position: no chess rules in the browser.
 *
 * Keys, with focus anywhere in the game: Left / Right step a move, Home / End jump to the ends.
 */

interface GameData {
  start: number;
  flipped: boolean;
  /** Piece placement (first field of a FEN) before any move, then after each one. */
  positions: string[];
  /** [from, to] for each move, e.g. ["e2", "e4"]. */
  moves: [string, string][];
  status: string[];
}

const root = document.querySelector<HTMLElement>('[data-game]');
const source = root?.querySelector('[data-game-data]');

if (root && source) {
  const data: GameData = JSON.parse(source.textContent ?? '{}');
  const piecesLayer = root.querySelector<SVGGElement>('[data-pieces]')!;
  const marksLayer = root.querySelector<SVGGElement>('[data-marks]')!;
  const status = root.querySelector<HTMLElement>('[data-status]')!;
  const moveButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-ply]')];
  const controls = [...root.querySelectorAll<HTMLButtonElement>('[data-go]')];

  const SVG = 'http://www.w3.org/2000/svg';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finalPly = data.positions.length - 1;
  let ply = data.start;

  /** "e4" -> column and row on the diagram, counted from the top left. */
  const place = (file: number, rank: number): [number, number] => (data.flipped ? [7 - file, 7 - rank] : [file, rank]);
  const squareAt = (square: string) => place(square.charCodeAt(0) - 97, 8 - Number(square[1]));

  function shape(tag: 'use' | 'rect', x: number, y: number): SVGElement {
    const node = document.createElementNS(SVG, tag);
    node.setAttribute('x', String(x));
    node.setAttribute('y', String(y));
    node.setAttribute('width', '1');
    node.setAttribute('height', '1');
    return node;
  }

  function drawPieces(placement: string): void {
    const nodes: SVGElement[] = [];
    placement.split('/').forEach((row, rank) => {
      let file = 0;
      for (const char of row) {
        if (char >= '1' && char <= '8') {
          file += Number(char);
          continue;
        }
        const [x, y] = place(file, rank);
        const piece = shape('use', x, y);
        piece.setAttribute('href', `#piece-${char === char.toUpperCase() ? 'w' : 'b'}${char.toUpperCase()}`);
        piece.dataset.at = `${x},${y}`;
        nodes.push(piece);
        file += 1;
      }
    });
    piecesLayer.replaceChildren(...nodes);
  }

  function reflect(): void {
    status.textContent = data.status[ply] ?? '';
    for (const button of moveButtons) {
      if (Number(button.dataset.ply) === ply) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    }
    for (const button of controls) {
      const backwards = button.dataset.go === 'first' || button.dataset.go === 'prev';
      const atEnd = backwards ? ply === 0 : ply === finalPly;
      // aria-disabled rather than disabled, so the button keeps keyboard focus at either end.
      button.setAttribute('aria-disabled', String(atEnd));
    }
  }

  function go(target: number): void {
    const next = Math.max(0, Math.min(finalPly, target));
    if (next === ply) return;
    const previous = ply;
    ply = next;

    drawPieces(data.positions[ply]!);

    // Mark the squares of the move that led here.
    const played = ply > 0 ? data.moves[ply - 1] : undefined;
    marksLayer.replaceChildren(...(played ?? []).map((square) => shape('rect', ...squareAt(square))));

    // Stepping a single move slides the piece, so the eye can follow it.
    if (!reducedMotion.matches && Math.abs(ply - previous) === 1) {
      const forward = ply > previous;
      const move = data.moves[forward ? ply - 1 : ply]!;
      const [fromX, fromY] = squareAt(forward ? move[0] : move[1]);
      const [toX, toY] = squareAt(forward ? move[1] : move[0]);
      piecesLayer
        .querySelector<SVGElement>(`[data-at="${toX},${toY}"]`)
        ?.animate([{ transform: `translate(${fromX - toX}px, ${fromY - toY}px)` }, { transform: 'translate(0, 0)' }], {
          duration: 220,
          easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
        });
    }

    reflect();
  }

  for (const button of moveButtons) {
    button.disabled = false;
    button.addEventListener('click', () => go(Number(button.dataset.ply)));
  }

  for (const button of controls) {
    button.addEventListener('click', () => {
      const action = button.dataset.go;
      go(action === 'first' ? 0 : action === 'prev' ? ply - 1 : action === 'next' ? ply + 1 : finalPly);
    });
  }

  root.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowLeft') go(ply - 1);
    else if (event.key === 'ArrowRight') go(ply + 1);
    else if (event.key === 'Home') go(0);
    else if (event.key === 'End') go(finalPly);
    else return;
    event.preventDefault();
  });

  reflect();
}
