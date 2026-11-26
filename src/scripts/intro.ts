export {};

const root = document.documentElement;
const leader = document.querySelector<HTMLElement>('[data-leader]');

if (leader && root.classList.contains('intro')) {
  let done = false;

  const finish = (skipped: boolean) => {
    if (done) return;
    done = true;
    try {
      sessionStorage.setItem('pj:intro', '1');
    } catch {
      /* private mode: the countdown just plays again next visit */
    }
    window.removeEventListener('keydown', onKey);
    const lights = () => root.classList.remove('intro');
    if (skipped) {
      leader.classList.add('is-skipping');
      window.setTimeout(lights, 280);
    } else {
      lights();
    }
  };

  function onKey(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === 'Escape' || event.key === ' ') {
      event.preventDefault();
      finish(true);
    }
  }

  leader.addEventListener('animationend', (event) => {
    if (event.target === leader && event.animationName === 'leader-out') finish(false);
  });
  leader.addEventListener('click', () => finish(true));
  window.addEventListener('keydown', onKey);

  // Nothing to scroll to while the leader rolls.
  const hold = (event: Event) => event.preventDefault();
  leader.addEventListener('wheel', hold, { passive: false });
  leader.addEventListener('touchmove', hold, { passive: false });
}
