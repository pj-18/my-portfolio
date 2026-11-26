import { starsLabel, starsMarkup } from '../lib/stars';

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

  /* ---- one-liners: pause / play ---- */
  const quotes = section.querySelector<HTMLElement>('[data-quotes]');
  const toggle = quotes?.querySelector<HTMLButtonElement>('[data-quotes-toggle]');
  const label = toggle?.querySelector<HTMLElement>('[data-quotes-label]');
  toggle?.addEventListener('click', () => {
    const paused = toggle.getAttribute('aria-pressed') !== 'true';
    toggle.setAttribute('aria-pressed', String(paused));
    quotes?.toggleAttribute('data-paused', paused);
    if (label) label.textContent = paused ? 'Play' : 'Pause';
  });
}
