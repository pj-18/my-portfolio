export {};

/**
 * Page-wide choreography: which reel is on screen (dock + scene lighting),
 * the runtime counter, scroll reveals and the test runner.
 */
const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad = (n: number) => String(n).padStart(2, '0');

/* ---- the reel in the middle of the screen sets the lighting and the dock ---- */
const sections = [...document.querySelectorAll<HTMLElement>('section[data-scene]')];
const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-nav]')];

const setScene = (scene: string) => {
  document.body.dataset.scene = scene;
  for (const link of links) {
    if (link.dataset.nav === scene) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  }
};

const sceneWatcher = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) setScene((entry.target as HTMLElement).dataset.scene ?? 'top');
    }
  },
  { rootMargin: '-45% 0px -54% 0px' },
);
sections.forEach((section) => sceneWatcher.observe(section));

/* ---- runtime counter + progress bar ---- */
const runtime = document.querySelector<HTMLElement>('[data-runtime]');
const progress = document.querySelector<HTMLElement>('[data-progress]');
const RUNTIME = 2 * 3600 + 7 * 60;
let queued = false;

const tick = () => {
  queued = false;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const share = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  if (progress) progress.style.transform = `scaleX(${share})`;
  if (runtime) {
    const t = Math.round(share * RUNTIME);
    runtime.textContent = `${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
  }
};

const queue = () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(tick);
};
/* the transport icon shows pause while the page is moving, play once it rests */
const transport = document.querySelector<HTMLElement>('.topbar__play');
let settle = 0;
const onScroll = () => {
  queue();
  if (!transport) return;
  transport.classList.add('is-scrolling');
  window.clearTimeout(settle);
  settle = window.setTimeout(() => transport.classList.remove('is-scrolling'), 500);
};
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', queue);
tick();

/* ---- "back to the top" links scroll up without leaving #top in the address bar ----
   The links keep their href, so they still work with scripting off. */
document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (!(event.target as Element | null)?.closest('a[href="#top"]')) return;
  event.preventDefault();
  window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
});

/* ---- reveal on scroll ---- */
const reveals = [...document.querySelectorAll<HTMLElement>('.reveal')];
if (calm || !('IntersectionObserver' in window)) {
  reveals.forEach((el) => el.classList.add('is-in'));
} else {
  const revealer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        revealer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.08 },
  );
  reveals.forEach((el) => revealer.observe(el));
}

/* ---- the test runner runs once it is on screen ---- */
const runner = document.querySelector<HTMLElement>('[data-runner]');
if (runner) {
  if (calm) runner.classList.add('is-run');
  else {
    const watcher = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        runner.classList.add('is-run');
        watcher.disconnect();
      },
      { threshold: 0.4 },
    );
    watcher.observe(runner);
  }
}
