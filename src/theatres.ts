/**
 * Your regular cinemas, by a short key you pick. A booking in `upNext` (src/site.config.ts)
 * says `at: 'amb'` instead of spelling the cinema out each time. Only the cinema on a
 * booked ticket appears on the page; this list itself is never shown.
 *
 * Names are exactly as BookMyShow writes them.
 */

export interface Theatre {
  /** As BookMyShow shows it, e.g. 'AMB Cinemas: Gachibowli'. */
  name: string;
  /** Neighbourhood, shown smaller next to the name (optional; most BookMyShow names already include it). */
  area?: string;
}

export const theatres: Record<string, Theatre> = {
  amb: { name: 'AMB Cinemas: Gachibowli' },
  prasads: { name: 'Prasads Multiplex: Hyderabad' },
  nexus: { name: 'PVR: Nexus Mall Kukatpally, Hyderabad' },
  irrum: { name: 'PVR: Irrum Manzil, Hyderabad' },
  inorbit: { name: 'PVR Superplex Inorbit: LUXE, PXL, 4DX: Cyberabad' },
};
