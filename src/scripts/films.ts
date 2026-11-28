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

    /* ---- list or stack: in the stack the tickets overlap and the top one is swiped up to bring up the next ---- */
    const list = block?.querySelector<HTMLElement>('.upnext__list');
    const switcher = block?.querySelector<HTMLElement>('[data-upnext-views]');
    const bar = block?.querySelector<HTMLElement>('[data-upnext-bar]');
    const position = bar?.querySelector<HTMLElement>('[data-upnext-position]');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const KEY = 'upnext-view';
    let view: 'list' | 'stack' = 'stack'; // the stack is the default; the choice is remembered
    try {
      if (localStorage.getItem(KEY) === 'list') view = 'list';
    } catch {
      // storage can be blocked: the stack is the default anyway
    }
    let top = 0; // which of the live tickets is on top
    let busy = false;
    const live = () => passes.filter((pass) => !pass.hidden);

    const layout = () => {
      if (!list) return;
      const cards = live();
      const n = cards.length;
      const stacked = view === 'stack' && n > 1;
      top = n ? ((top % n) + n) % n : 0;
      list.dataset.view = stacked ? 'stack' : 'list';
      if (switcher) switcher.hidden = n < 2;
      if (bar) bar.hidden = !stacked;
      for (const button of switcher?.querySelectorAll<HTMLButtonElement>('[data-upnext-view]') ?? []) {
        button.setAttribute('aria-pressed', String(button.dataset.upnextView === view));
      }
      cards.forEach((card, i) => {
        const depth = (i - top + n) % n;
        if (stacked) {
          card.style.setProperty('--depth', String(depth));
          card.dataset.depth = String(depth);
          card.toggleAttribute('inert', depth > 0); // the tickets underneath can't be tabbed to
        } else {
          card.style.removeProperty('--depth');
          delete card.dataset.depth;
          card.removeAttribute('inert');
        }
      });
      if (position) position.textContent = `Ticket ${top + 1} of ${n}`;
    };

    /**
     * Runs `change` (which re-lays the tickets out) and eases from the old layout to the new one:
     * the block grows or shrinks smoothly, so what's below it glides, and each ticket slides from
     * where it was to where it is now.
     */
    const morph = (change: () => void) => {
      if (!block || reduced.matches || typeof block.animate !== 'function') return change();
      const cards = live();
      const first = block.getBoundingClientRect().height;
      const before = cards.map((card) => card.getBoundingClientRect());
      const timing = { duration: 700, easing: 'cubic-bezier(0.45, 0, 0.2, 1)' };
      // the list has no stacking order of its own: keep the stack's (top ticket in front) while they slide,
      // so the second ticket never jumps in front of the first on the way to or from the stack
      cards.forEach((card, i) => (card.style.zIndex = String(10 - ((i - top + cards.length) % cards.length))));
      window.setTimeout(() => cards.forEach((card) => (card.style.zIndex = '')), timing.duration);
      change();
      const last = block.getBoundingClientRect().height;
      cards.forEach((card, i) => {
        const now = card.getBoundingClientRect();
        const dx = before[i].left - now.left;
        const dy = before[i].top - now.top;
        if (dx || dy) card.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], timing);
      });
      // no clipping: while it grows, the tickets underneath (and the bar) are already in place and show whole
      if (Math.abs(first - last) > 1) block.animate([{ height: `${first}px` }, { height: `${last}px` }], timing);
      if (bar && !bar.hidden) bar.animate([{ opacity: 0 }, { opacity: 1 }], timing);
    };

    /**
     * dir 1: the top ticket goes to the back and the next one comes up, the old one leaving the way it was
     * thrown (`exit` -1 is up, 1 is down). dir -1: the last one comes back on top.
     */
    const step = (dir: 1 | -1, exit: 1 | -1 = -1) => {
      const cards = live();
      if (busy || cards.length < 2 || list?.dataset.view !== 'stack') return;
      const card = cards[top];
      const settle = () => {
        card.classList.remove('is-dragging');
        card.style.transition = 'none'; // it goes to the back without sliding through the others
        card.style.transform = '';
        card.style.opacity = '';
        top += dir;
        layout();
        void card.offsetHeight;
        card.style.transition = '';
        busy = false;
      };
      if (dir === -1) {
        card.classList.remove('is-dragging');
        card.style.transform = '';
        top -= 1;
        layout();
        return;
      }
      if (reduced.matches) return settle();
      busy = true;
      card.classList.remove('is-dragging');
      card.style.transition = 'transform 0.28s ease-in, opacity 0.28s ease-in';
      card.style.transform = `translateY(${exit * 130}%) rotate(${exit * 3}deg)`;
      card.style.opacity = '0';
      window.setTimeout(settle, 280);
    };

    for (const button of switcher?.querySelectorAll<HTMLButtonElement>('[data-upnext-view]') ?? []) {
      button.addEventListener('click', () => {
        const next = button.dataset.upnextView === 'stack' ? 'stack' : 'list';
        if (next === view) return;
        view = next;
        if (view === 'stack') top = 0; // however it was shuffled before, the stack starts with the soonest show on top
        try {
          localStorage.setItem(KEY, view);
        } catch {
          // fine: it just won't be remembered
        }
        morph(layout);
      });
    }
    bar?.querySelector('[data-upnext-next]')?.addEventListener('click', () => step(1));
    bar?.querySelector('[data-upnext-prev]')?.addEventListener('click', () => step(-1));

    /* dragging the top ticket up or down (or a quick flick either way) brings up the next one */
    // the browser's own drag-and-drop (a poster, a link) would take over the gesture
    list?.addEventListener('dragstart', (event) => {
      if (list.dataset.view === 'stack') event.preventDefault();
    });
    let drag: { id: number; y: number; at: number; card: HTMLElement; dy: number } | null = null;
    let dragged = false;
    list?.addEventListener('pointerdown', (event) => {
      const card = (event.target as Element).closest<HTMLElement>('.pass');
      if (list.dataset.view !== 'stack' || !event.isPrimary || busy || !card || card.dataset.depth !== '0') return;
      drag = { id: event.pointerId, y: event.clientY, at: performance.now(), card, dy: 0 };
      card.setPointerCapture(event.pointerId);
    });
    list?.addEventListener('pointermove', (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      drag.dy = event.clientY - drag.y;
      if (Math.abs(drag.dy) < 4) return;
      drag.card.classList.add('is-dragging');
      drag.card.style.transform = `translateY(${drag.dy}px) rotate(${drag.dy * 0.03}deg)`;
    });
    const release = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const { dy, at, card } = drag;
      drag = null;
      dragged = Math.abs(dy) > 6;
      if (dragged) window.setTimeout(() => (dragged = false), 60); // the click that follows a drag isn't a tap
      const flick = Math.abs(dy) / Math.max(1, performance.now() - at) > 0.5; // px per ms
      if (dy < -48 || (dy < -16 && flick)) step(1, -1);
      else if (dy > 48 || (dy > 16 && flick)) step(1, 1);
      else {
        card.classList.remove('is-dragging');
        card.style.transform = '';
      }
    };
    list?.addEventListener('pointerup', release);
    list?.addEventListener('pointercancel', release);
    list?.addEventListener(
      'click',
      (event) => {
        if (!dragged) return;
        event.preventDefault(); // dragging the ticket shouldn't open its film page
        event.stopPropagation();
      },
      true,
    );

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
      if (note) note.textContent = !left ? 'No tickets in the pocket' : left === 1 ? 'Ticket in the pocket' : `${left} tickets in the pocket`;
      // every booked show is over: the blank ticket takes over
      if (!left) block?.querySelector<HTMLElement>('[data-upnext-empty]')?.removeAttribute('hidden');
      layout();
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
