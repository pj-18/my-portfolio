/** Build time only: every trip in src/data/tours/, soonest first. */
import { site } from '../site.config.ts';
import type { Trip } from './tours.ts';
import { offsetMinutes } from './up-next.ts';

const files = import.meta.glob<Trip>('../data/tours/*.json', { eager: true, import: 'default' });

export const tours: Trip[] = Object.values(files).sort((a, b) => a.startDate.localeCompare(b.startDate));

/** Trip dates are India time, like the show times in "Up next". */
export const tourOffset = offsetMinutes(site.upNext.utcOffset);
