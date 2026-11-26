import { starsLabel, starsMarkup } from '../lib/stars';
import { showStatus } from '../lib/up-next';

const section = document.querySelector<HTMLElement>('#films');

if (section) {
  /* ---- histogram → filter the diary strip ---- */
  const scroller = section.querySelector<HTMLElement>('.diary-scroller');
  const status = section.querySelector<HTMLElement>('[data-diary-status]');
  const clear = section.querySelector<HTMLButtonElement>('[data-diary-clear]');
  const bars = [...section.querySelectorAll<HTMLButtonElement>('.bar')];
  const stubs = [...section.querySelectorAll<HTMLLIElement>('.stub')];
  const defaultStatus = status?.textContent ?? '';
  let active: number | null = null;

  const filter = (rating: number | null) => {
    active = rating;
    let shown = 0;
    for (const bar of bars) bar.setAttribute('aria-pressed', String(Number(bar.dataset.rating) === rating));
    for (const stub of stubs) {
      const match = rating == null || Number(stub.dataset.rating) === rating;
      stub.hidden = !match;
      if (match) shown++;
    }
    if (status) {
      if (rating == null) status.textContent = defaultStatus;
      else {
        // stars are drawn for the eye, spelled out for screen readers
        status.innerHTML = `${shown} ${shown === 1 ? 'film' : 'films'} rated <span class="status-stars">${starsMarkup(rating)}</span><span class="sr-only">${starsLabel(rating)}</span>`;
      }
    }
    if (clear) clear.hidden = rating == null;
    scroller?.scrollTo({ left: 0 });
  };

  for (const bar of bars) {
    bar.addEventListener('click', () => {
      const rating = Number(bar.dataset.rating);
      filter(active === rating ? null : rating);
      if (active != null) scroller?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
  clear?.addEventListener('click', () => filter(null));

  /* ---- desktop arrows for the strip ---- */
  const page = (direction: number) =>
    scroller?.scrollBy({ left: direction * scroller.clientWidth * 0.8, behavior: 'smooth' });
  section.querySelector('[data-diary-prev]')?.addEventListener('click', () => page(-1));
  section.querySelector('[data-diary-next]')?.addEventListener('click', () => page(1));

  /* ---- entry sheet ---- */
  const sheet = section.querySelector<HTMLDialogElement>('[data-sheet]');

  /* ---- slide the strip on its own: one card every 3 seconds ----
     It holds still while you're using it (hover, touch, keyboard, an open
     film), while it's off screen or the tab is hidden, and for reduced motion. */
  const auto = section.querySelector<HTMLButtonElement>('[data-diary-auto]');
  if (scroller && auto && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const EVERY = 4000;
    const IDLE = 8000; // after you touch it, wait this long before sliding again
    let stopped = false;
    let inView = false;
    let hovering = false;
    let resumeAt = 0;

    const held = () =>
      stopped ||
      !inView ||
      hovering ||
      document.hidden ||
      !!sheet?.open ||
      Date.now() < resumeAt ||
      !!scroller.querySelector(':focus-visible');

    /* The browser's own smooth scroll is a quick flick, so glide by hand:
       an unhurried ease-in-out, with snapping off until it lands. */
    let frame = 0;
    const settle = () => {
      cancelAnimationFrame(frame);
      scroller.style.scrollSnapType = '';
    };
    const glide = (to: number, duration: number) => {
      settle();
      const from = scroller.scrollLeft;
      if (Math.abs(to - from) < 1) return;
      const start = performance.now();
      scroller.style.scrollSnapType = 'none';
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
        scroller.scrollLeft = from + (to - from) * eased;
        if (t < 1) frame = requestAnimationFrame(step);
        else settle();
      };
      frame = requestAnimationFrame(step);
    };

    const advance = () => {
      const max = scroller.scrollWidth - scroller.clientWidth;
      if (max <= 2) return;
      if (scroller.scrollLeft >= max - 2) {
        glide(0, 2800); // back to the newest film, a longer trip
        return;
      }
      const inset = parseFloat(getComputedStyle(scroller).scrollPaddingLeft) || 0;
      const next = stubs.find((stub) => !stub.hidden && stub.offsetLeft - inset > scroller.scrollLeft + 4);
      if (next) glide(Math.min(max, next.offsetLeft - inset), 1800);
    };

    window.setInterval(() => {
      if (!held()) advance();
    }, EVERY);

    const nudge = () => {
      settle(); // let go the moment you reach for it
      resumeAt = Date.now() + IDLE;
    };
    for (const type of ['pointerdown', 'wheel', 'touchstart', 'keydown']) {
      scroller.addEventListener(type, nudge, { passive: true });
    }
    for (const el of [...bars, clear, ...section.querySelectorAll('[data-diary-prev], [data-diary-next]')]) {
      el?.addEventListener('click', nudge);
    }
    scroller.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse') hovering = true;
    });
    scroller.addEventListener('pointerleave', () => {
      hovering = false;
    });
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
    }, { threshold: 0.6 }).observe(scroller);

    const label = auto.querySelector<HTMLElement>('[data-auto-label]');
    const icons = [...auto.querySelectorAll<HTMLElement>('[data-auto-icon]')];
    auto.hidden = false;
    auto.addEventListener('click', () => {
      stopped = !stopped;
      if (label) label.textContent = stopped ? 'Play' : 'Pause';
      for (const icon of icons) icon.hidden = icon.dataset.autoIcon !== (stopped ? 'play' : 'pause');
      if (stopped) {
        settle(); // stop the slide now; the strip rests on the nearest card
      } else {
        resumeAt = 0;
        window.setTimeout(() => {
          if (!held()) advance(); // set off again without waiting a full beat
        }, 600);
      }
    });
  }
  const body = sheet?.querySelector<HTMLElement>('[data-sheet-body]');

  if (sheet && body) {
    section.addEventListener('click', (event) => {
      const trigger = (event.target as Element).closest<HTMLElement>('[data-entry]');
      if (!trigger) return;
      const template = document.getElementById(`entry-${trigger.dataset.entry}`);
      if (!(template instanceof HTMLTemplateElement)) return;
      body.replaceChildren(template.content.cloneNode(true));
      sheet.showModal();
      sheet.scrollTop = 0;
    });

    sheet.querySelector('[data-sheet-close]')?.addEventListener('click', () => sheet.close());
    // a click that lands on the dialog itself is a click on the backdrop
    sheet.addEventListener('click', (event) => {
      if (event.target === sheet) sheet.close();
    });

    // pull the sheet down to dismiss it (phones)
    let startY = 0;
    let pulling = false;
    sheet.addEventListener(
      'touchstart',
      (event) => {
        pulling = sheet.scrollTop <= 0;
        startY = event.touches[0].clientY;
      },
      { passive: true },
    );
    sheet.addEventListener(
      'touchmove',
      (event) => {
        if (!pulling) return;
        const dy = event.touches[0].clientY - startY;
        if (dy > 0) sheet.style.transform = `translateY(${dy}px)`;
      },
      { passive: true },
    );
    sheet.addEventListener('touchend', (event) => {
      if (!pulling) return;
      const dy = event.changedTouches[0].clientY - startY;
      sheet.style.transform = '';
      pulling = false;
      if (dy > 110) sheet.close();
    });
  }

  /* ---- up next: countdown → rolling → wrapped → gone, kept current between rebuilds ---- */
  const passes = [...section.querySelectorAll<HTMLElement>('[data-show-day]')];
  if (passes.length) {
    const offset = Number(section.querySelector<HTMLElement>('[data-utc-offset]')?.dataset.utcOffset ?? 0);
    const block = section.querySelector<HTMLElement>('[data-upnext]');
    const note = block?.querySelector<HTMLElement>('[data-upnext-note]');
    const time = (value?: string) => (value ? Number(value) : null);
    const update = () => {
      const now = Date.now();
      for (const pass of passes) {
        if (pass.hidden) continue;
        const { showDay, showStart, showWraps, showGone } = pass.dataset;
        const ticket = showStatus(
          { day: Number(showDay), start: time(showStart), wraps: time(showWraps), gone: Number(showGone) },
          now,
          offset,
        );
        if (ticket.state === 'gone') {
          pass.hidden = true; // the next rebuild drops it for good
          continue;
        }
        pass.dataset.state = ticket.state;
        const num = pass.querySelector('[data-count-num]');
        const unit = pass.querySelector('[data-count-unit]');
        if (num && num.textContent !== ticket.num) num.textContent = ticket.num;
        if (unit && unit.textContent !== ticket.unit) unit.textContent = ticket.unit;
      }
      const left = passes.filter((pass) => !pass.hidden).length;
      if (!left) block?.setAttribute('hidden', ''); // every booked show is over
      else if (note) note.textContent = left === 1 ? 'Ticket in the pocket' : `${left} tickets in the pocket`;
      return left;
    };
    // a ticket changes on the minute (lights down, credits, gone): check once a minute while any remain
    if (update()) {
      const timer = window.setInterval(() => {
        if (!update()) window.clearInterval(timer);
      }, 60_000);
    }
  }

  /* ---- one-liners: pause / play ---- */
  const quotes = section.querySelector<HTMLElement>('[data-quotes]');
  const toggle = quotes?.querySelector<HTMLButtonElement>('[data-quotes-toggle]');
  const label = toggle?.querySelector<HTMLElement>('[data-quotes-label]');
  toggle?.addEventListener('click', () => {
    const paused = toggle.getAttribute('aria-pressed') !== 'true';
    toggle.setAttribute('aria-pressed', String(paused));
    // the icon shows the action on offer: play while paused, pause while moving
    for (const icon of toggle.querySelectorAll<HTMLElement>('[data-quotes-icon]')) {
      icon.hidden = icon.dataset.quotesIcon !== (paused ? 'play' : 'pause');
    }
    quotes?.toggleAttribute('data-paused', paused);
    if (label) label.textContent = paused ? 'Play' : 'Pause';
  });
}
