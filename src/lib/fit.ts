/**
 * Advance widths of the display face (Archivo, width 62, weight 900) in
 * thousandths of an em, measured in Chrome. They let the hero work out at build
 * time how wide a name is, so it can be set to span the viewport exactly with
 * no client-side measuring. Unknown characters fall back to an average.
 */
const WIDTHS: Record<string, number> = {
  A: 530, B: 498, C: 513, D: 509, E: 462, F: 402, G: 543, H: 513, I: 263, J: 453, K: 510, L: 432, M: 705,
  N: 518, O: 554, P: 485, Q: 554, R: 509, S: 469, T: 475, U: 503, V: 490, W: 729, X: 500, Y: 481, Z: 475,
  '0': 444, '1': 371, '2': 427, '3': 440, '4': 435, '5': 437, '6': 445, '7': 396, '8': 432, '9': 445,
  ' ': 110, '-': 240, '.': 222, "'": 213, '’': 213, '&': 566,
};
const AVERAGE = 500;

/** Cap height of the display face, in the same units. */
export const CAP_HEIGHT = 688;

/** Estimated width of `text` set in uppercase display type, in thousandths of an em. */
export function displayWidth(text: string): number {
  return [...text.toUpperCase()].reduce((sum, char) => sum + (WIDTHS[char] ?? AVERAGE), 0);
}
