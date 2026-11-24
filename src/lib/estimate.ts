/**
 * Rough heights, in CSS pixels, for the `content-visibility` rules in global.css.
 *
 * The browser skips laying out a section (or one of the long lists marked `.defer`) until it
 * is near the viewport, and uses these numbers as a stand-in height until then, so the
 * scrollbar stays roughly honest. They only need to be in the right neighbourhood: once a
 * block has been rendered, the browser remembers its real height, and jump links never
 * depend on them (see src/scripts/site.ts).
 *
 * Three figures are given: for phones (under 40em wide), tablets, and anything from 60em up.
 * The constants were fitted to the rendered page and scale with the amount of content.
 */
export function estimate(narrow: number, medium: number, wide: number): string {
  return `--est-narrow:${Math.round(narrow)}px;--est-medium:${Math.round(medium)}px;--est-wide:${Math.round(wide)}px`;
}

const rows = (items: number) => Math.ceil(items / 2);

export const estimates = {
  work: (roles: number, projects: number) =>
    estimate(1190 + roles * 385 + projects * 265, 1190 + roles * 305 + rows(projects) * 280, 1200 + roles * 295 + rows(projects) * 278),
  /** The two long lists inside Work, deferred on their own (`.defer`). */
  roles: (roles: number) => estimate(roles * 385, roles * 305, roles * 295),
  projects: (projects: number) => estimate(projects * 265, rows(projects) * 280, rows(projects) * 278),
  films: (entries: number) => {
    const rest = Math.max(0, entries - 1);
    return entries === 0 ? estimate(620, 620, 700) : estimate(1300 + rest * 220, 950 + rest * 216, 1300 + rows(rest) * 215);
  },
  photography: (photos: number) => estimate(650 + photos * 155, 600 + photos * 140, 600 + photos * 150),
  chess: () => estimate(1720, 1800, 1570),
  contact: (links: number) => estimate(500 + links * 50, 590 + links * 45, 650 + links * 45),
};
