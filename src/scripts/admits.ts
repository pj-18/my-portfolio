export {};

/* The hanging ticket's serial number is the site's total viewers from GoatCounter: "Guests 1,234".
   It refreshes while the page is open, so the number climbs as people arrive.
   If the count can't be fetched (blocked, offline, or counts not made public) the printed number stays. */
const serial = document.querySelector<HTMLElement>('[data-admits]');
const totalUrl = serial?.dataset.admits;
const homeUrl = serial?.dataset.admitsHome;

const REFRESH_MS = 30_000;

/* GoatCounter formats the number ("1,234" or "1 234"): keep only the digits. */
const read = (data: { count?: string } | null) => Number(String(data?.count ?? '').replace(/\D/g, ''));

const get = (url: string) =>
  fetch(url, { cache: 'no-store' })
    .then((response) => (response.ok ? response.json() : null))
    .then(read)
    .catch(() => 0);

/* The site-wide total is rolled up by GoatCounter every so often and can read 0 for a while after
   new visits; the home page's own counter is live, so it stands in until the total catches up. */
async function fetchTotal(): Promise<number> {
  const total = totalUrl ? await get(totalUrl) : 0;
  if (total) return total;
  return homeUrl ? get(homeUrl) : 0;
}

if (serial && totalUrl) {
  let shown = 0;
  let number: HTMLElement | null = null;

  const render = (total: number) => {
    if (!total || total === shown) return;
    const first = !number;
    if (!number) {
      number = document.createElement('b');
      number.className = 'ticket__count';
      serial.replaceChildren('Guests ', number);
    }
    number.textContent = total.toLocaleString('en');
    shown = total;
    if (!first) {
      // a brief nudge so a live change is noticed (CSS turns it off for reduced motion)
      number.classList.remove('is-bumped');
      void number.offsetWidth;
      number.classList.add('is-bumped');
    }
  };

  const refresh = () => {
    if (document.hidden) return;
    fetchTotal().then(render);
  };

  refresh();
  window.setInterval(refresh, REFRESH_MS);
  document.addEventListener('visibilitychange', refresh);
}
