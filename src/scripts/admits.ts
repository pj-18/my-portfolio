export {};

/* The hanging ticket's serial number is the site's visitor total from GoatCounter: "Guests 1,234".
   If the count can't be fetched (blocked, offline, or counts not made public) the printed number stays. */
const serial = document.querySelector<HTMLElement>('[data-admits]');
const url = serial?.dataset.admits;

if (serial && url) {
  fetch(url)
    .then((response) => (response.ok ? response.json() : null))
    .then((data: { count?: string } | null) => {
      // GoatCounter formats the number ("1,234" or "1 234"): keep only the digits.
      const total = Number(String(data?.count ?? '').replace(/\D/g, ''));
      if (!total) return;
      const number = document.createElement('b');
      number.className = 'ticket__count';
      number.textContent = total.toLocaleString('en');
      serial.replaceChildren('Guests ', number);
    })
    .catch(() => {});
}
