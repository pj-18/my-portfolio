/**
 * Trips for /tours: the shape of a trip file, and helpers shared by the pages, their browser
 * scripts and `npm run tours:roads`, so all of them agree on dates, routes and status.
 * Nothing here reads files or config, so it is safe to bundle for the browser;
 * the trips themselves are loaded in tours-data.ts.
 */
import type { LngLat } from './geo.ts';

export type Accent = 'green' | 'amber' | 'magenta' | 'violet' | 'cobalt' | 'mint' | 'coral' | 'orchid' | 'red' | 'cyan';
export type PlaceKind = 'station' | 'camp' | 'falls' | 'temple' | 'beach';

export interface Place {
  name: string;
  /** The name for the whole-trip view, where nearby places share one label (e.g. "Gokarna"). */
  town?: string;
  kind: PlaceKind;
  at: LngLat;
  /** Which side of the pin its label sits on. Coastal places put theirs out to sea. */
  label?: 'left' | 'right';
}

export interface Station {
  name: string;
  at: LngLat;
}

export interface Train {
  /** Leave null rather than guess: it is printed on the page. */
  number: string | null;
  name: string;
  /** 24-hour local times, or null if not known yet. */
  departs: string | null;
  arrives: string | null;
  /** The stops in order. Empty on the way back means "the outbound line, reversed". */
  stations: Station[];
}

export interface Road {
  /** Places the road passes through, in order (ids from `places`). */
  via: string[];
  /** Driving geometry from `npm run tours:roads`. Without it, the map joins `via` with straight lines. */
  path?: LngLat[];
}

export interface Day {
  n: number;
  title: string;
  body: string;
  accent: Accent;
  /** Places lit up on the map for this day. */
  stops: string[];
  train?: 'out' | 'back';
  road?: Road;
  /**
   * Optional camera moves: each leg is a list of places to frame, and the route is drawn up to
   * the leg's last place before the next leg. Used when places are too close to see at one zoom.
   */
  legs?: string[][];
  activities?: string[];
  meals?: string;
  stay?: string;
}

export interface Trip {
  slug: string;
  title: string;
  kicker: string;
  summary: string;
  /** Day 0, as YYYY-MM-DD in India time. */
  startDate: string;
  accent: Accent;
  /** The towns along the way, for the route line on cards. */
  route: string[];
  /** Places labelled on the whole-trip map. */
  overview: string[];
  places: Record<string, Place>;
  trains: { out: Train; back: Train };
  days: Day[];
  covered: string[];
  notCovered: string[];
}

/* ---------- dates ---------- */

const DAY_MS = 86_400_000;

/** YYYY-MM-DD of day `n`. */
export function dayDate(trip: Pick<Trip, 'startDate'>, n: number): string {
  const t = Date.parse(`${trip.startDate}T00:00:00Z`) + n * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}

const fmt = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', ...options });

/** "Thu 10 Dec". */
export const dayLabel = (iso: string) => fmt(iso, { weekday: 'short', day: 'numeric', month: 'short' });

/** "10–14 Dec 2026", or "30 Dec 2026 – 2 Jan 2027" across months or years. */
export function tripRange(trip: Trip): string {
  const first = trip.startDate;
  const last = dayDate(trip, trip.days.length - 1);
  const [y1, m1] = first.split('-');
  const [y2, m2] = last.split('-');
  if (y1 === y2 && m1 === m2) return `${+first.slice(8)}–${fmt(last, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  if (y1 === y2) return `${fmt(first, { day: 'numeric', month: 'short' })} – ${fmt(last, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  return `${fmt(first, { day: 'numeric', month: 'short', year: 'numeric' })} – ${fmt(last, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export type TripState = 'upcoming' | 'away' | 'home';

/** Where the trip is at `now`, by the local calendar (`offset` minutes from UTC; 330 is India). */
export function tripStatus(
  startDate: string,
  dayCount: number,
  now: number,
  offset: number,
): { state: TripState; label: string; day?: number } {
  const start = Date.parse(`${startDate}T00:00:00Z`) - offset * 60_000;
  const today = Math.floor((now + offset * 60_000) / DAY_MS) * DAY_MS - offset * 60_000;
  const days = Math.round((start - today) / DAY_MS);
  if (days > 1) return { state: 'upcoming', label: `Leaving in ${days} days` };
  if (days === 1) return { state: 'upcoming', label: 'Leaving tomorrow' };
  const n = -days;
  if (n < dayCount) return { state: 'away', label: n === 0 ? 'Leaving today' : `On the road · Day ${n}`, day: n };
  return { state: 'home', label: 'Back home' };
}

/* ---------- routes ---------- */

export function trainStations(trip: Trip, which: 'out' | 'back'): Station[] {
  const train = trip.trains[which];
  if (train.stations.length) return train.stations;
  const other = trip.trains[which === 'out' ? 'back' : 'out'];
  return [...other.stations].reverse();
}

/** The line drawn for a day: the train's stations, the road geometry, or straight hops. */
export function dayPath(trip: Trip, day: Day): LngLat[] {
  if (day.train) return trainStations(trip, day.train).map((s) => s.at);
  if (day.road?.path?.length) return day.road.path;
  if (day.road) return day.road.via.map((id) => trip.places[id].at);
  return day.stops.map((id) => trip.places[id].at);
}

/* ---------- what the map script gets ---------- */

export interface MapDay {
  n: number;
  accent: Accent;
  stops: string[];
  legs?: string[][];
  path: LngLat[];
  train: Train | null;
}

export interface MapData {
  accent: Accent;
  overview: string[];
  places: Record<string, Place>;
  days: MapDay[];
}

/** Only what the map needs, with every day's line worked out, to inline in the page. */
export function mapData(trip: Trip): MapData {
  return {
    accent: trip.accent,
    overview: trip.overview,
    places: trip.places,
    days: trip.days.map((day) => ({
      n: day.n,
      accent: day.accent,
      stops: day.stops,
      legs: day.legs,
      path: dayPath(trip, day),
      train: day.train ? { ...trip.trains[day.train], stations: trainStations(trip, day.train) } : null,
    })),
  };
}

/** "Two night trains", "One night train". */
export const count = (n: number, one: string, many = `${one}s`) =>
  `${['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'][n] ?? n} ${n === 1 ? one : many}`;
