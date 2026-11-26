import { starsLabel, starsMarkup } from '../lib/stars';

type ReelFilm = {
  title: string;
  year: number | null;
  rating: number | null;
  liked: boolean;
  src: string | null;
  srcset: string | null;
  url: string;
  take: string | null;
};

/* ---- copy email ---- */
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
  const label = button.querySelector<HTMLElement>('[data-copy-label]');
  const original = label?.textContent ?? '';
  button.addEventListener('click', async () => {
    const value = button.dataset.copy ?? '';
    try {
      await navigator.clipboard.writeText(value);
      if (label) label.textContent = 'Copied ✓';
    } catch {
      window.location.href = `mailto:${value}`;
      return;
    }
    window.setTimeout(() => {
      if (label) label.textContent = original;
    }, 2200);
  });
}

/* ---- post-credits: spin the reel ---- */
const spinner = document.querySelector<HTMLElement>('[data-spinner]');
const spin = document.querySelector<HTMLButtonElement>('[data-spin]');
const raw = document.getElementById('reel-data')?.textContent;

if (spinner && spin && raw) {
  const films = JSON.parse(raw) as ReelFilm[];
  const img = spinner.querySelector<HTMLImageElement>('[data-spin-img]');
  const leader = spinner.querySelector<HTMLElement>('.spinner__leader');
  const result = spinner.querySelector<HTMLElement>('[data-spin-result]');
  const gate = spinner.querySelector<HTMLElement>('.spinner__gate');
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const small = (film: ReelFilm) => film.src?.replace(/-0-\d+-0-\d+-crop/, '-0-300-0-450-crop') ?? '';
  const withPoster = films.filter((film) => film.src);
  let last = -1;
  let busy = false;

  // Warm the cache before anyone presses the button, so every frame is ready to roll.
  const cache = new Map<string, HTMLImageElement>();
  const warm = (film: ReelFilm) => {
    const url = small(film);
    if (!url || cache.has(url)) return cache.get(url);
    const probe = new Image();
    probe.decoding = 'async';
    probe.src = url;
    cache.set(url, probe);
    return probe;
  };
  const ready = (url: string) => {
    const probe = cache.get(url);
    return !!probe && probe.complete && probe.naturalWidth > 0;
  };
  new IntersectionObserver(
    ([entry], observer) => {
      if (!entry.isIntersecting) return;
      withPoster.forEach(warm);
      observer.disconnect();
    },
    { rootMargin: '600px 0px' },
  ).observe(spinner);

  const strip = document.createElement('div');
  strip.className = 'spinner__reel';
  strip.hidden = true;
  strip.setAttribute('aria-hidden', 'true');
  gate?.append(strip);

  /** Roll a strip of posters through the gate and ease to a stop on the pick. */
  const roll = async (target: ReelFilm) => {
    withPoster.forEach(warm);
    // give slow connections a moment, but never hang on it
    await Promise.race([
      Promise.allSettled(withPoster.map((film) => warm(film)?.decode())),
      wait(700),
    ]);
    const loaded = withPoster.filter((film) => ready(small(film)) && film !== target);
    const pool = loaded.length >= 4 ? loaded : withPoster.filter((film) => film !== target);
    const frames: ReelFilm[] = [];
    for (let i = 0; i < 18; i++) frames.push(pool[Math.floor(Math.random() * pool.length)] ?? target);
    frames.push(target);

    strip.replaceChildren(
      ...frames.map((film) => {
        const poster = document.createElement('img');
        poster.alt = '';
        poster.width = 300;
        poster.height = 450;
        poster.src = small(film);
        return poster;
      }),
    );
    if (img) img.hidden = true;
    if (leader) leader.hidden = true;
    strip.hidden = false;

    const distance = ((frames.length - 1) / frames.length) * 100;
    // spin up, roll at full speed, then brake into the pick (each segment eases on its own)
    const at = (share: number) => `translateY(-${(distance * share).toFixed(3)}%)`;
    const motion = strip.animate(
      [
        { transform: at(0), filter: 'blur(0px)', easing: 'cubic-bezier(0.5, 0, 1, 1)' },
        { transform: at(0.1), filter: 'blur(2.5px)', offset: 0.18, easing: 'linear' },
        { transform: at(0.72), filter: 'blur(2.5px)', offset: 0.6, easing: 'cubic-bezier(0, 0, 0.3, 1)' },
        { transform: at(1), filter: 'blur(0px)' },
      ],
      { duration: 2600, easing: 'linear', fill: 'forwards' },
    );
    await motion.finished;
  };

  const frame = (film: ReelFilm, sharp: boolean) => {
    if (!img || !film.src) return;
    img.hidden = false;
    if (leader) leader.hidden = true;
    if (sharp && film.srcset) {
      img.sizes = '8.5rem';
      img.srcset = film.srcset;
      img.src = film.src;
    } else {
      img.removeAttribute('srcset');
      img.src = small(film);
    }
  };

  const reveal = (film: ReelFilm) => {
    if (!result) return;
    const title = document.createElement('p');
    title.className = 'spin-title';
    title.textContent = `${film.title} `;
    if (film.year) {
      const year = document.createElement('span');
      year.textContent = `(${film.year})`;
      title.append(year);
    }
    const stars = document.createElement('p');
    stars.className = 'spin-stars';
    stars.innerHTML = starsMarkup(film.rating);
    if (film.rating != null) {
      stars.setAttribute('role', 'img');
      stars.setAttribute('aria-label', `${starsLabel(film.rating)}${film.liked ? ', liked' : ''}`);
    }
    if (film.liked) stars.insertAdjacentHTML('beforeend', '<span class="spin-heart" aria-hidden="true">♥</span>');
    const parts: HTMLElement[] = [title, stars];
    if (film.take) {
      const take = document.createElement('p');
      take.className = 'spin-take';
      take.textContent = `“${film.take.length > 140 ? `${film.take.slice(0, 137)}…` : film.take}”`;
      parts.push(take);
    }
    const link = document.createElement('a');
    link.className = 'spin-link';
    link.href = film.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Open on Letterboxd ↗';
    parts.push(link);
    result.replaceChildren(...parts);
  };

  spin.addEventListener('click', async () => {
    if (busy || !films.length) return;
    busy = true;
    spin.disabled = true;
    let pick = Math.floor(Math.random() * films.length);
    if (films.length > 1 && pick === last) pick = (pick + 1) % films.length;
    last = pick;

    if (!calm && films[pick].src && withPoster.length > 1) {
      spinner.classList.add('is-spinning');
      try {
        await roll(films[pick]);
      } finally {
        spinner.classList.remove('is-spinning');
      }
    }
    frame(films[pick], true);
    strip.hidden = true;
    strip.getAnimations().forEach((animation) => animation.cancel());
    reveal(films[pick]);
    busy = false;
    spin.disabled = false;
  });
}
