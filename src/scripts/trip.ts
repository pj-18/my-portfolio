export {};

/**
 * A trip page: which day is on screen, and the map that follows it.
 *
 * The page in the middle of the content area is the active one. It's lit up, its dot in the day
 * rail is marked, and the map flies to its places and draws that day's route. Train days run a
 * little train along the line, with the clock and the station it's passing at the top left.
 *
 * MapLibre (and its tiles) only load here, after the page is up. If it can't load, or there's
 * no WebGL, the map is dropped and the days read as a plain list.
 */
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import type { FeatureCollection } from 'geojson';
import type { GeoJSONSource, Map as MapLibre, Marker, NavigationControl } from 'maplibre-gl';
import { along, bounds, measure, nearest, type Bounds, type LngLat } from '../lib/geo';
import type { Accent, MapData, MapDay } from '../lib/tours';
import { pad } from '../lib/util';

/** OpenFreeMap: free, no key, no limits. Swap in another MapLibre style URL here. */
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark';
/** Give up on the map if its style hasn't arrived by then. */
const LOAD_TIMEOUT = 15_000;
const TRAIN_MS = 6500;

const root = document.querySelector<HTMLElement>('[data-trip]');
const wrap = root?.querySelector<HTMLElement>('[data-trip-map]');
const canvas = wrap?.querySelector<HTMLElement>('[data-map-canvas]');
const source = wrap?.querySelector('[data-trip-data]');

if (root && wrap && canvas && source?.textContent) setUp(root, wrap, canvas, JSON.parse(source.textContent) as MapData);

interface Plan {
  day: MapDay;
  path: LngLat[];
  cum: number[];
  total: number;
  /** The whole day in one frame. */
  frame: Bounds;
  /** Camera moves, each with how far along the route (km) to draw while it's held. */
  legs: { frame: Bounds; end: number }[];
  stations: { name: string; at: LngLat; km: number }[];
}

function setUp(root: HTMLElement, wrap: HTMLElement, canvas: HTMLElement, data: MapData) {
  const steps = [...root.querySelectorAll<HTMLElement>('[data-step]')];
  const rail = [...wrap.querySelectorAll<HTMLAnchorElement>('[data-rail]')];
  const note = wrap.querySelector<HTMLElement>('[data-map-note]');
  const ride = {
    box: wrap.querySelector<HTMLElement>('[data-ride]'),
    no: wrap.querySelector<HTMLElement>('[data-ride-no]'),
    clock: wrap.querySelector<HTMLElement>('[data-ride-clock]'),
    at: wrap.querySelector<HTMLElement>('[data-ride-at]'),
  };
  const wide = window.matchMedia('(min-width: 64rem)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const css = getComputedStyle(document.documentElement);
  const color = (accent: Accent) => css.getPropertyValue(`--${accent}`).trim() || '#f3ead8';
  const place = (id: string): LngLat => data.places[id].at;

  /* ---------- every day's route, measured once ---------- */

  const plans: Plan[] = data.days.map((day) => {
    const path = day.path;
    const cum = measure(path);
    const total = cum[cum.length - 1] ?? 0;
    const legIds = day.legs?.length ? day.legs : [day.stops];
    let from = 0;
    const legs = legIds.map((ids, i) => {
      const last = i === legIds.length - 1;
      const end = last ? path.length - 1 : nearest(path, place(ids[ids.length - 1]), from);
      const frame = bounds([...ids.map(place), ...path.slice(from, end + 1)]);
      from = end;
      return { frame, end: last ? total : cum[end] };
    });
    let at = 0;
    const stations = (day.train?.stations ?? []).map((station) => {
      at = nearest(path, station.at, at);
      return { ...station, km: cum[at] };
    });
    return { day, path, cum, total, frame: bounds([...day.stops.map(place), ...path]), legs, stations };
  });
  const everything = bounds([...Object.values(data.places).map((p) => p.at), ...plans.flatMap((p) => p.path)]);

  /* ---------- which page is on screen ---------- */

  let current: HTMLElement | null = null;
  const activate = (step: HTMLElement, instant = false) => {
    if (step === current && !instant) return;
    current = step;
    for (const s of steps) s.toggleAttribute('data-active', s === step);
    for (const link of rail) {
      if (link.dataset.rail === step.dataset.rail) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    }
    show(step.dataset.step ?? 'all', instant);
  };

  // A thin band across the middle of the content: the middle of the screen on a big screen,
  // the middle of what's below the map on a phone.
  let watcher: IntersectionObserver | null = null;
  const watch = () => {
    watcher?.disconnect();
    if (!('IntersectionObserver' in window)) return activate(steps[0]);
    watcher = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) activate(entry.target as HTMLElement);
      },
      { rootMargin: wide.matches ? '-45% 0px -54% 0px' : '-73% 0px -26% 0px' },
    );
    steps.forEach((step) => watcher?.observe(step));
  };

  /* ---------- the map ---------- */

  let map: MapLibre | null = null;
  let nav: NavigationControl | null = null;
  let train: Marker | null = null;
  let trainOn = false;
  let ready = false;
  let failed = false;
  let run = 0;
  let pending = { key: 'all', instant: true };
  const pins = new Map<string, { el: HTMLElement; label: HTMLElement }>();

  const empty: FeatureCollection = { type: 'FeatureCollection', features: [] };
  const lines = (paths: LngLat[][]): FeatureCollection => ({
    type: 'FeatureCollection',
    features: paths
      .filter((p) => p.length > 1)
      .map((coordinates) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } })),
  });
  const dots = (points: LngLat[]): FeatureCollection => ({
    type: 'FeatureCollection',
    features: points.map((coordinates) => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates } })),
  });
  const setData = (id: string, value: FeatureCollection) => (map?.getSource(id) as GeoJSONSource | undefined)?.setData(value);

  const padding = () =>
    // room for the header, the day rail, the zoom buttons, and labels that sit out to sea
    wide.matches ? { top: 110, bottom: 96, left: 150, right: 150 } : { top: 68, bottom: 34, left: 70, right: 60 };

  const fit = (frame: Bounds, duration: number) => {
    const room = padding();
    if (ride.box && !ride.box.hidden) room.top += 44; // the train's clock sits at the top left
    map?.fitBounds(frame, { padding: room, duration, maxZoom: 13, essential: true });
  };

  /** Move the camera and wait for it to land (or for a newer move to take over). */
  const fly = (frame: Bounds, duration: number) =>
    new Promise<void>((resolve) => {
      if (!map) return resolve();
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        resolve();
      };
      const timer = window.setTimeout(finish, duration + 400);
      map.once('moveend', finish);
      fit(frame, duration);
    });

  const setAccent = (accent: Accent) => {
    wrap.style.setProperty('--accent', `var(--${accent})`);
    map?.setPaintProperty('route', 'line-color', color(accent));
    map?.setPaintProperty('route-glow', 'line-color', color(accent));
  };

  /** The lit places, most important first (the order the day or the overview lists them). */
  let lit: string[] = [];

  const setPins = (on: string[], towns: boolean) => {
    lit = on.filter((id) => pins.has(id));
    for (const [id, pin] of pins) {
      pin.el.toggleAttribute('data-on', lit.includes(id));
      const p = data.places[id];
      pin.label.textContent = towns ? (p.town ?? p.name) : p.name;
    }
    sideLabels();
  };

  /**
   * Each lit label goes on its preferred side of the pin, or the other side if that would run
   * off the map, under the day rail, or into a label already placed. If neither side is free
   * at this zoom, it steps back until the map zooms in.
   */
  const sideLabels = () => {
    if (!map) return;
    const width = canvas.clientWidth;
    const limit = width - (wide.matches ? 96 : 8); // the rail runs down the right on a big screen
    const taken: [number, number, number, number][] = [];
    const points = lit.map((id) => ({ id, ...map!.project(data.places[id].at) }));
    // every lit dot is an obstacle for every label
    for (const { x, y } of points) taken.push([x - 9, x + 9, y - 9, y + 9]);
    for (const { id, x, y } of points) {
      const pin = pins.get(id)!;
      const w = pin.label.offsetWidth;
      const preferred = data.places[id].label ?? 'right';
      const sides = preferred === 'left' ? (['left', 'right'] as const) : (['right', 'left'] as const);
      const fits = sides.find((side) => {
        const l = side === 'right' ? x + 13 : x - 13 - w;
        const r = l + w;
        if (l < 4 || r > limit) return false;
        return !taken.some(([tl, tr, tt, tb]) => l < tr && r > tl && y - 10 < tb && y + 10 > tt);
      });
      pin.el.toggleAttribute('data-quiet', !fits);
      if (!fits) continue;
      pin.el.dataset.side = fits;
      const l = fits === 'right' ? x + 13 : x - 13 - w;
      taken.push([l, l + w, y - 10, y + 10]);
    }
  };

  /* ---- the train and its clock ---- */

  const minutes = (time: string | null) => {
    const m = time?.match(/^(\d{1,2}):(\d{2})$/);
    return m ? +m[1] * 60 + +m[2] : null;
  };
  const write = (el: HTMLElement | null, text: string) => {
    if (el && el.textContent !== text) el.textContent = text;
  };

  const hideTrain = () => {
    if (trainOn) train?.remove();
    trainOn = false;
    if (ride.box) ride.box.hidden = true;
  };

  const moveTrain = (plan: Plan, km: number, at: LngLat) => {
    if (!map || !train) return;
    train.setLngLat(at);
    if (!trainOn) train.addTo(map);
    trainOn = true;
    const info = plan.day.train;
    const share = plan.total ? Math.min(1, km / plan.total) : 1;
    const dep = minutes(info?.departs ?? null);
    const arr = minutes(info?.arrives ?? null);
    if (dep !== null && arr !== null) {
      const span = arr > dep ? arr - dep : arr + 1440 - dep;
      const now = Math.round(dep + span * share) % 1440;
      write(ride.clock, `${pad(Math.floor(now / 60))}:${pad(now % 60)}`);
    } else write(ride.clock, '');
    let passing = plan.stations[0]?.name ?? '';
    for (const station of plan.stations) if (station.km <= km + 0.05) passing = station.name;
    write(ride.at, passing);
  };

  /** Draw the day's route up to `km`, with the train at its tip on train days. */
  const drawTo = (plan: Plan, km: number) => {
    const { at, drawn } = along(plan.path, plan.cum, km);
    setData('route', lines([drawn]));
    if (plan.day.train) moveTrain(plan, km, at);
  };

  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

  const draw = (plan: Plan, from: number, to: number, token: number) =>
    new Promise<void>((resolve) => {
      const ms = plan.day.train ? TRAIN_MS : Math.min(2600, Math.max(900, 700 + (to - from) * 8));
      const start = performance.now();
      const tick = (now: number) => {
        if (token !== run) return resolve();
        const t = Math.min(1, (now - start) / ms);
        drawTo(plan, from + (to - from) * ease(t));
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });

  /* ---- what the map shows for each page ---- */

  const overview = (calm: boolean) => {
    setAccent(data.accent);
    setPins(data.overview, true);
    hideTrain();
    setData('stations', empty);
    setData('route', lines(plans.map((p) => p.path)));
    fit(everything, calm ? 0 : 1600);
  };

  const playDay = async (plan: Plan, token: number, calm: boolean) => {
    const { day } = plan;
    setAccent(day.accent);
    setPins(day.stops, false);
    setData('stations', dots(plan.stations.map((s) => s.at)));
    setData('route', empty);
    if (day.train && ride.box) {
      write(ride.no, day.train.number ?? '');
      ride.box.hidden = false;
      moveTrain(plan, 0, plan.path[0]);
    } else hideTrain();

    if (calm) {
      fit(plan.frame, 0);
      drawTo(plan, plan.total);
      return;
    }
    let from = 0;
    for (const [i, leg] of plan.legs.entries()) {
      await fly(leg.frame, i === 0 ? 1500 : 1200);
      if (token !== run) return;
      await draw(plan, from, leg.end, token);
      if (token !== run) return;
      from = leg.end;
      // linger on each close-up before pulling out to the next
      if (i < plan.legs.length - 1) await new Promise((resolve) => window.setTimeout(resolve, 1400));
      if (token !== run) return;
    }
  };

  function show(key: string, instant: boolean) {
    pending = { key, instant };
    if (!ready || !map) return;
    const token = ++run;
    const calm = instant || reduced.matches;
    if (key === 'all') return overview(calm);
    const plan = plans[Number(key)];
    if (plan) void playDay(plan, token, calm);
  }

  /* ---- a phone shows the map as a picture; a big screen lets you pan and zoom ---- */

  const setHandlers = () => {
    if (!map) return;
    for (const handler of [map.dragPan, map.doubleClickZoom, map.touchZoomRotate, map.boxZoom]) {
      if (wide.matches) handler.enable();
      else handler.disable();
    }
    map.touchZoomRotate.disableRotation();
    if (!nav) return;
    if (wide.matches && !map.hasControl(nav)) map.addControl(nav, 'bottom-left');
    if (!wide.matches && map.hasControl(nav)) map.removeControl(nav);
  };

  const fail = (why: string) => {
    if (failed) return;
    failed = true;
    console.warn(`[trip] no map: ${why}`);
    map?.remove();
    map = null;
    watcher?.disconnect();
    delete root.dataset.live;
    for (const s of steps) s.removeAttribute('data-active');
    root.classList.add('trip--nomap');
  };

  const addLayers = (ml: typeof import('maplibre-gl')) => {
    if (!map) return;
    // the base map's own labels step back so the trip's pins read first
    for (const layer of map.getStyle().layers ?? []) {
      if (layer.type !== 'symbol') continue;
      try {
        map.setPaintProperty(layer.id, 'text-opacity', 0.55);
      } catch {
        /* a layer without text */
      }
    }
    const paper = css.getPropertyValue('--paper').trim() || '#f3ead8';
    const ink = css.getPropertyValue('--ink').trim() || '#0d0c0a';
    const round = { 'line-cap': 'round', 'line-join': 'round' } as const;

    map.addSource('trip', { type: 'geojson', data: lines(plans.map((p) => p.path)) });
    map.addLayer({
      id: 'trip',
      type: 'line',
      source: 'trip',
      layout: round,
      paint: { 'line-color': paper, 'line-opacity': 0.3, 'line-width': 1.4, 'line-dasharray': [1.5, 2] },
    });
    map.addSource('route', { type: 'geojson', data: empty });
    map.addLayer({
      id: 'route-glow',
      type: 'line',
      source: 'route',
      layout: round,
      paint: { 'line-color': color(data.accent), 'line-width': 10, 'line-opacity': 0.28, 'line-blur': 6 },
    });
    map.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: round,
      paint: { 'line-color': color(data.accent), 'line-width': 3 },
    });
    map.addSource('stations', { type: 'geojson', data: empty });
    map.addLayer({
      id: 'stations',
      type: 'circle',
      source: 'stations',
      paint: {
        'circle-radius': 2.6,
        'circle-color': ink,
        'circle-stroke-color': paper,
        'circle-stroke-width': 1.2,
        'circle-stroke-opacity': 0.75,
      },
    });

    for (const [id, p] of Object.entries(data.places)) {
      const el = document.createElement('div');
      el.className = 'pin';
      el.dataset.kind = p.kind;
      el.dataset.side = p.label ?? 'right';
      const dot = document.createElement('i');
      dot.className = 'pin__dot';
      const label = document.createElement('span');
      label.className = 'pin__label';
      label.textContent = p.name;
      el.append(dot, label);
      new ml.Marker({ element: el, anchor: 'center' }).setLngLat(p.at).addTo(map);
      pins.set(id, { el, label });
    }

    const look = wrap.querySelector<HTMLTemplateElement>('[data-train-marker]')?.content.firstElementChild;
    if (look) train = new ml.Marker({ element: look.cloneNode(true) as HTMLElement, anchor: 'center' });
  };

  const boot = async () => {
    let ml: typeof import('maplibre-gl');
    try {
      ml = await import('maplibre-gl');
    } catch (error) {
      return fail(`couldn't load MapLibre (${(error as Error).message})`);
    }
    ml.setWorkerUrl(workerUrl);
    try {
      map = new ml.Map({
        container: canvas,
        style: MAP_STYLE,
        bounds: everything,
        fitBoundsOptions: { padding: padding() },
        attributionControl: { compact: false },
        scrollZoom: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        keyboard: false,
        maxPitch: 0,
        renderWorldCopies: false,
      });
    } catch (error) {
      return fail(`couldn't start the map (${(error as Error).message})`);
    }
    nav = new ml.NavigationControl({ showCompass: false });
    setHandlers();

    const timer = window.setTimeout(() => fail('the map style took too long'), LOAD_TIMEOUT);
    map.once('styledata', () => window.clearTimeout(timer));
    map.on('error', (event) => console.warn('[trip] map:', event.error?.message));
    map.on('move', sideLabels);
    map.once('load', () => {
      if (failed) return;
      addLayers(ml);
      ready = true;
      wrap.classList.add('is-ready');
      note?.remove();
      show(pending.key, pending.instant && pending.key === 'all');
    });
  };

  wide.addEventListener('change', () => {
    if (failed) return;
    watch();
    setHandlers();
    if (current) activate(current, true);
  });

  root.dataset.live = '';
  watch();
  void boot();
}
