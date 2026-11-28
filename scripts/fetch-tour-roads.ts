/**
 * Looks up the driving route for each day of each trip in src/data/tours/, and saves it in the
 * trip's file as `road.path`, so the map draws real roads instead of straight lines.
 *
 *   npm run tours:roads            fills in days that have no path yet
 *   npm run tours:roads -- --all   looks every day up again (after changing a day's `via`)
 *
 * It uses the public OSRM demo router (router.project-osrm.org), one request per day, so run it
 * by hand after adding a trip and commit the result. Builds never call it.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import type { LngLat } from '../src/lib/geo.ts';
import type { Trip } from '../src/lib/tours.ts';

const DIR = new URL('../src/data/tours/', import.meta.url);
const ROUTER = 'https://router.project-osrm.org/route/v1/driving';
const all = process.argv.includes('--all');

const log = (message: string) => console.log(`[tours] ${message}`);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Ramer–Douglas–Peucker in degrees: ~0.0002° is about 20 m, plenty for a map at city zoom. */
function simplify(points: LngLat[], tolerance = 0.0002): LngLat[] {
  if (points.length < 3) return points;
  const [ax, ay] = points[0];
  const [bx, by] = points[points.length - 1];
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  let worst = 0;
  let at = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i];
    const d = Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
    if (d > worst) {
      worst = d;
      at = i;
    }
  }
  if (worst <= tolerance) return [points[0], points[points.length - 1]];
  return [...simplify(points.slice(0, at + 1), tolerance).slice(0, -1), ...simplify(points.slice(at), tolerance)];
}

const round = ([lng, lat]: LngLat): LngLat => [Math.round(lng * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5];

async function route(points: LngLat[]): Promise<LngLat[]> {
  const coords = points.map(([lng, lat]) => `${lng},${lat}`).join(';');
  const res = await fetch(`${ROUTER}/${coords}?overview=full&geometries=geojson`, {
    headers: { 'User-Agent': 'static-site-build/1.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as { code: string; routes?: { geometry: { coordinates: LngLat[] }; distance: number }[] };
  const best = body.routes?.[0];
  if (body.code !== 'Ok' || !best) throw new Error(`router said ${body.code}`);
  log(`  ${(best.distance / 1000).toFixed(0)} km by road`);
  return simplify(best.geometry.coordinates).map(round);
}

/** Pretty JSON that keeps coordinate pairs and short lists on one line. */
function format(data: unknown): string {
  return `${JSON.stringify(data, null, 2).replace(/\[([^[\]{}]*)\]/g, (whole, inner: string) => {
    const flat = inner.trim().split(/,\s*/).join(', ');
    return flat.length < 100 ? `[${flat}]` : whole;
  })}\n`;
}

async function main() {
  const files = (await readdir(DIR)).filter((name) => name.endsWith('.json'));
  for (const name of files) {
    const file = new URL(name, DIR);
    const trip = JSON.parse(await readFile(file, 'utf8')) as Trip;
    let changed = false;
    for (const day of trip.days) {
      if (!day.road || (day.road.path?.length && !all)) continue;
      const missing = day.road.via.filter((id) => !trip.places[id]);
      if (missing.length) {
        log(`${trip.slug} day ${day.n}: unknown places ${missing.join(', ')}; skipped`);
        continue;
      }
      log(`${trip.slug} day ${day.n}: ${day.road.via.map((id) => trip.places[id].name).join(' → ')}`);
      try {
        day.road.path = await route(day.road.via.map((id) => trip.places[id].at));
        log(`  saved ${day.road.path.length} points`);
        changed = true;
      } catch (error) {
        log(`  couldn't get a route (${(error as Error).message}); the map will use straight lines`);
      }
      await wait(1100); // be gentle with the demo server
    }
    if (changed) {
      await writeFile(file, format(trip));
      log(`wrote ${name}`);
    } else log(`${name}: nothing to do`);
  }
}

await main();
