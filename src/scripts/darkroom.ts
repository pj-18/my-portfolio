export {};

type PhotoData = {
  title: string;
  place: string | null;
  date: string | null;
  alt: string;
  src: string;
  srcset: string;
  w: number;
  h: number;
  tone: string;
  camera: string | null;
  lens: string | null;
  focal: string | null;
  aperture: string | null;
  shutter: string | null;
  iso: string | null;
};

const section = document.querySelector<HTMLElement>('#darkroom');
const roll = section?.querySelector<HTMLElement>('[data-roll]');
const raw = document.getElementById('photo-data')?.textContent;

if (section && roll && raw) {
  const photos = JSON.parse(raw) as PhotoData[];
  const frames = [...roll.querySelectorAll<HTMLElement>('.frame')];
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = (n: number) => String(n).padStart(2, '0');

  /* ---- strip / contact sheet ---- */
  const buttons = [...section.querySelectorAll<HTMLButtonElement>('[data-layout-btn]')];
  const setLayout = (layout: string) => {
    roll.dataset.layout = layout;
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.layoutBtn === layout));
    try {
      localStorage.setItem('pj:darkroom', layout);
    } catch {
      /* storage blocked: the choice just isn't remembered */
    }
  };
  for (const button of buttons) button.addEventListener('click', () => setLayout(button.dataset.layoutBtn ?? 'strip'));
  try {
    const saved = localStorage.getItem('pj:darkroom');
    if (saved === 'sheet' || saved === 'strip') setLayout(saved);
  } catch {
    /* ignore */
  }

  /* ---- desktop arrows for the sideways strip ---- */
  const track = roll.querySelector<HTMLElement>('.roll__frames');
  for (const button of section.querySelectorAll<HTMLButtonElement>('[data-roll-step]')) {
    button.addEventListener('click', () => {
      if (!track) return;
      track.scrollBy({ left: Number(button.dataset.rollStep) * track.clientWidth * 0.75, behavior: 'smooth' });
    });
  }

  /* ---- develop each frame the first time it comes into view ---- */
  if (calm || !('IntersectionObserver' in window)) {
    frames.forEach((frame) => frame.classList.add('is-developed'));
  } else {
    const developer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const frame = entry.target as HTMLElement;
          const img = frame.querySelector('img');
          const develop = () => window.setTimeout(() => frame.classList.add('is-developed'), 250);
          if (!img || img.complete) develop();
          else img.addEventListener('load', develop, { once: true });
          developer.unobserve(frame);
        }
      },
      { threshold: 0.35 },
    );
    frames.forEach((frame) => developer.observe(frame));
  }

  /* ---- the viewfinder ---- */
  const dialog = section.querySelector<HTMLDialogElement>('[data-viewfinder]');
  const stage = dialog?.querySelector<HTMLElement>('[data-vf-stage]');
  const frameBox = dialog?.querySelector<HTMLElement>('[data-vf-frame]');
  const img = dialog?.querySelector<HTMLImageElement>('[data-vf-img]');
  const count = dialog?.querySelector<HTMLElement>('[data-vf-count]');
  const lcd = dialog?.querySelector<HTMLElement>('[data-vf-lcd]');
  const title = dialog?.querySelector<HTMLElement>('[data-vf-title]');
  const meta = dialog?.querySelector<HTMLElement>('[data-vf-meta]');
  const gear = dialog?.querySelector<HTMLElement>('[data-vf-gear]');
  const focus = dialog?.querySelector<HTMLElement>('.vf__focus');

  if (dialog && stage && frameBox && img && count && lcd && title && meta && gear) {
    let index = 0;
    const sizes = '(min-width: 64rem) 80vw, 100vw';

    const preload = (i: number) => {
      const photo = photos[(i + photos.length) % photos.length];
      const probe = new Image();
      probe.sizes = sizes;
      probe.srcset = photo.srcset;
      probe.src = photo.src;
    };

    const show = (i: number) => {
      index = (i + photos.length) % photos.length;
      const photo = photos[index];
      img.classList.add('is-loading');
      img.onload = () => img.classList.remove('is-loading');
      img.width = photo.w;
      img.height = photo.h;
      img.sizes = sizes;
      img.srcset = photo.srcset;
      img.src = photo.src;
      img.alt = photo.alt;
      if (img.complete) img.classList.remove('is-loading');
      dialog.style.setProperty('--vf-tone', photo.tone);

      count.textContent = `${pad(index + 1)} / ${pad(photos.length)}`;
      const readout = [photo.shutter?.replace(/s$/, ''), photo.aperture?.replace('ƒ/', 'F'), photo.iso, photo.focal];
      lcd.replaceChildren(
        ...readout.map((value) => {
          const span = document.createElement('span');
          span.textContent = value ?? '--';
          return span;
        }),
      );
      title.textContent = photo.title;
      meta.textContent = [photo.place, photo.date].filter(Boolean).join(' · ');
      gear.textContent = [photo.camera, photo.lens].filter(Boolean).join(' · ');

      // re-run the focus "lock" on every frame
      if (focus && !calm) {
        focus.style.animation = 'none';
        void focus.offsetWidth;
        focus.style.animation = '';
      }
      preload(index + 1);
      preload(index - 1);
    };

    const open = (i: number) => {
      show(i);
      dialog.showModal();
    };

    section.addEventListener('click', (event) => {
      const trigger = (event.target as Element).closest<HTMLElement>('[data-open]');
      if (trigger) open(Number(trigger.dataset.open));
    });

    dialog.querySelector('[data-vf-close]')?.addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-vf-prev]')?.addEventListener('click', () => show(index - 1));
    dialog.querySelector('[data-vf-next]')?.addEventListener('click', () => show(index + 1));
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') show(index - 1);
      if (event.key === 'ArrowRight') show(index + 1);
    });

    // swipe sideways to change frames, pull down to put the camera away
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let dy = 0;
    let tracking = false;

    stage.addEventListener('pointerdown', (event) => {
      if ((event.target as Element).closest('button')) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      tracking = true;
      startX = event.clientX;
      startY = event.clientY;
      dx = 0;
      dy = 0;
      frameBox.classList.add('is-dragging');
      stage.setPointerCapture(event.pointerId);
    });

    stage.addEventListener('pointermove', (event) => {
      if (!tracking) return;
      dx = event.clientX - startX;
      dy = event.clientY - startY;
      const sideways = Math.abs(dx) > Math.abs(dy);
      frameBox.style.transform = sideways
        ? `translateX(${dx}px)`
        : dy > 0
          ? `translateY(${dy}px) scale(${Math.max(0.85, 1 - dy / 1600)})`
          : '';
      frameBox.style.opacity = !sideways && dy > 0 ? String(Math.max(0.4, 1 - dy / 500)) : '';
    });

    const settle = () => {
      if (!tracking) return;
      tracking = false;
      frameBox.classList.remove('is-dragging');
      frameBox.style.transform = '';
      frameBox.style.opacity = '';
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
      else if (dy > 110 && dy > Math.abs(dx)) dialog.close();
    };
    stage.addEventListener('pointerup', settle);
    stage.addEventListener('pointercancel', settle);
  }
}
