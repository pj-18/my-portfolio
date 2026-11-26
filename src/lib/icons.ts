/**
 * A small hand-drawn icon set (24×24, round caps, currentColor).
 * The aperture glyph is adapted from Lucide (ISC licence).
 */
export const icons = {
  code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.4l2.8 2.8L16.4 9.4"/>',
  terminal: '<rect x="2.5" y="4" width="19" height="16" rx="2.5"/><path d="M6.5 9.5l3 2.5-3 2.5M12 15h5.5"/>',
  clapper:
    '<path d="M3.5 10h17v9a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19z"/><path d="M3.5 10l-.6-3.3 16.6-3 .7 3.4z"/><path d="M7.6 5.9l2.5 2.7M12.6 5l2.5 2.7"/>',
  reel:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="6.8" r="2"/><circle cx="12" cy="17.2" r="2"/><circle cx="6.8" cy="12" r="2"/><circle cx="17.2" cy="12" r="2"/>',
  popcorn:
    '<path d="M5.5 9.5h13l-1.5 10.7a1 1 0 0 1-1 .8H8a1 1 0 0 1-1-.8z"/><path d="M10 9.5l.5 11.5M14 9.5l-.5 11.5"/><path d="M6.2 9.5a2.3 2.3 0 0 1 1.9-3.9 2.7 2.7 0 0 1 3.9-2 2.7 2.7 0 0 1 4 2.1 2.3 2.3 0 0 1 1.8 3.8"/>',
  camera:
    '<path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h3l1.6-2.3h5.8L16.5 7h3A1.5 1.5 0 0 1 21 8.5v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/><circle cx="12" cy="13.2" r="3.7"/>',
  aperture:
    '<circle cx="12" cy="12" r="9.5"/><path d="M14.3 8l5.5 9.5M9.7 8h11M7.4 12l5.5-9.5M9.7 16L4.2 6.5M14.3 16h-11M16.6 12l-5.5 9.5"/>',
  frame: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 16.5l5.2-5.2 4 4 2.6-2.6L21 18.8"/><circle cx="16" cy="9" r="1.6"/>',
  play: '<circle cx="12" cy="12" r="9.5"/><path d="M10 8.6v6.8l5.4-3.4z"/>',
  note: '<path d="M9 17.5V5.8l10-2.3v11.7"/><circle cx="6.6" cy="17.6" r="2.6"/><circle cx="16.6" cy="15.3" r="2.6"/><path d="M9 9.3l10-2.3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.8 6.5l8.2 6.3 8.2-6.3"/>',
  arrow: '<path d="M7 17L17 7M8.5 7H17v8.5"/>',
  down: '<path d="M12 4v16M6 14l6 6 6-6"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  rewatch: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.6M20 4v4.6h-4.6M20 12a8 8 0 0 1-13.7 5.6L4 15.4M4 20v-4.6h4.6"/>',
  copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v9A1.5 1.5 0 0 0 5 15.5h3.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  shuffle:
    '<path d="M3 7h3.5c4.5 0 6.5 10 11 10H21M3 17h3.5c1.8 0 3-1.6 4-3.4M21 7h-3.5c-1.8 0-3 1.6-4 3.4M18.5 4.5L21 7l-2.5 2.5M18.5 14.5L21 17l-2.5 2.5"/>',
} as const;

export type IconName = keyof typeof icons;
