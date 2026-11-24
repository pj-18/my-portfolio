/**
 * Page-wide behaviour: the "Lights" theme switch, the small-screen index, and marking the
 * section being read in the navigation. Everything here is an enhancement; the page reads
 * and navigates without it.
 */

const root = document.documentElement;
const prefersDark = matchMedia('(prefers-color-scheme: dark)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// ── Lights (theme) ───────────────────────────────────────────────────────────────────────

type Theme = 'light' | 'dark';

const toggle = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
const systemTheme = (): Theme => (prefersDark.matches ? 'dark' : 'light');
const currentTheme = (): Theme => (root.dataset.theme === 'light' || root.dataset.theme === 'dark' ? root.dataset.theme : systemTheme());

function reflectTheme(): void {
  const theme = currentTheme();
  toggle?.setAttribute('aria-pressed', String(theme === 'light'));

  // Keep the browser chrome in step with a manual choice.
  const chosen = root.dataset.theme;
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const own = meta.media.includes('dark') ? meta.dataset.dark : meta.dataset.light;
    const colour = chosen === 'light' ? meta.dataset.light : chosen === 'dark' ? meta.dataset.dark : own;
    if (colour) meta.content = colour;
  }
}

function setTheme(theme: Theme): void {
  // Choosing what the system already prefers hands control back to the system.
  const override = theme === systemTheme() ? null : theme;
  if (override) root.dataset.theme = override;
  else delete root.dataset.theme;
  try {
    if (override) localStorage.setItem('theme', override);
    else localStorage.removeItem('theme');
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts for this visit only.
  }
  reflectTheme();
}

toggle?.addEventListener('click', () => {
  const next: Theme = currentTheme() === 'light' ? 'dark' : 'light';
  if (document.startViewTransition && !reducedMotion.matches) {
    document.startViewTransition(() => setTheme(next));
  } else {
    setTheme(next);
  }
});

prefersDark.addEventListener('change', reflectTheme);
reflectTheme();

// ── Index (small screens) ────────────────────────────────────────────────────────────────

const menu = document.querySelector<HTMLDialogElement>('[data-menu]');

document.querySelector('[data-menu-open]')?.addEventListener('click', () => menu?.showModal());

menu?.addEventListener('click', (event) => {
  // Following a link or pressing Close dismisses the index; the link then scrolls as usual.
  if ((event.target as Element).closest('a, [data-menu-close]')) menu.close();
});

// ── Jump links ───────────────────────────────────────────────────────────────────────────
//
// Links to a section glide there instead of snapping. This is scripted rather than left to
// CSS `scroll-behavior: smooth` because sections below the fold are only laid out as they
// approach the viewport (see `.section` in global.css), so the target's position changes
// during the trip. Each frame re-reads where the target is and steers towards it.
// With reduced motion, or without JavaScript, the browser's ordinary instant jump applies.

const INTERRUPTIONS = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
let stopGlide: (() => void) | null = null;

function glideTo(target: HTMLElement): void {
  stopGlide?.();

  const padding = Number.parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
  const destination = () => {
    const limit = root.scrollHeight - innerHeight;
    return Math.max(0, Math.min(limit, scrollY + target.getBoundingClientRect().top - padding));
  };

  const from = scrollY;
  const began = performance.now();
  // Longer trips take a little longer, within reason.
  const duration = Math.min(900, 380 + Math.abs(destination() - from) * 0.1);
  let frame = 0;
  let settling = 0;

  const stop = () => {
    cancelAnimationFrame(frame);
    for (const type of INTERRUPTIONS) removeEventListener(type, stop);
    stopGlide = null;
  };
  // Any input from the visitor takes over at once.
  for (const type of INTERRUPTIONS) addEventListener(type, stop, { passive: true });
  stopGlide = stop;

  const step = (now: number) => {
    const progress = Math.min(1, (now - began) / duration);
    const eased = 1 - (1 - progress) ** 4;
    const to = destination();
    scrollTo({ top: from + (to - from) * eased, behavior: 'instant' });

    // After arriving, hold for a few frames in case late layout nudges the target.
    if (progress < 1 || (Math.abs(destination() - scrollY) > 1 && settling++ < 8)) {
      frame = requestAnimationFrame(step);
      return;
    }
    stop();
    // Continue keyboard and screen-reader reading from the section, as a native jump would.
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  };
  frame = requestAnimationFrame(step);
}

document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (reducedMotion.matches) return;
  const link = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
  const target = link && document.getElementById(decodeURIComponent(link.hash.slice(1)));
  if (!link || !target) return;

  event.preventDefault();
  if (location.hash !== link.hash) history.pushState(null, '', link.hash);
  glideTo(target);
});

// ── Current section ──────────────────────────────────────────────────────────────────────

const links = document.querySelectorAll<HTMLAnchorElement>('[data-nav]');
const sections = [...new Set([...links].map((link) => link.dataset.nav!))]
  .map((id) => document.getElementById(id))
  .filter((section): section is HTMLElement => section !== null);

function markCurrent(id: string | null): void {
  for (const link of links) {
    if (link.dataset.nav === id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}

if (sections.length > 0 && 'IntersectionObserver' in window) {
  const visible = new Set<string>();
  // A thin band just above the middle of the viewport: whichever section crosses it is current.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      }
      markCurrent(sections.find((section) => visible.has(section.id))?.id ?? null);
    },
    { rootMargin: '-40% 0px -59% 0px' },
  );
  for (const section of sections) observer.observe(section);
}
