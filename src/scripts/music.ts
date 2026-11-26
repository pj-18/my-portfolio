export {};

const section = document.querySelector<HTMLElement>('[data-music]');

if (section) {
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = <T extends Element = HTMLElement>(selector: string) => section.querySelector<T>(selector);

  /* ---------- the turntable ---------- */
  const deck = $('[data-deck]');
  const record = $('[data-record]');
  const label = $<HTMLImageElement>('[data-label]');
  const blank = $('[data-label-blank]');
  const toggle = $<HTMLButtonElement>('[data-toggle]');
  const link = $<HTMLAnchorElement>('[data-now-link]');
  const readout = {
    state: $('[data-now-state]'),
    code: $('[data-now-code]'),
    title: $('[data-now-title]'),
    artist: $('[data-now-artist]'),
    time: $('[data-time]'),
  };
  const announcer = $('[data-announce]');

  const audio = new Audio();
  audio.preload = 'none';
  let current: HTMLButtonElement | null = null;

  const tracks = () => [...section.querySelectorAll<HTMLButtonElement>('.sides:not([hidden]) [data-track]')];
  const firstTrack = () => tracks().find((track) => track.dataset.preview) ?? tracks()[0] ?? null;
  const say = (text: string) => {
    if (announcer) announcer.textContent = text;
  };
  const setState = (text: string) => {
    if (readout.state) readout.state.textContent = text;
  };
  const clock = (seconds: number) => {
    const s = Math.max(0, Math.round(seconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  /* A record doesn't start or stop dead: ramp the spin up and down. */
  const spin =
    record && !calm
      ? record.animate([{ transform: 'rotate(0turn)' }, { transform: 'rotate(1turn)' }], {
          // a real 33⅓ rpm (1.8s a turn) looks frantic on screen; this is an easy ~12.5 rpm
          duration: 4800,
          iterations: Infinity,
        })
      : null;
  spin?.pause();
  let ramp = 0;
  const spinTo = (target: number) => {
    if (!spin) return;
    cancelAnimationFrame(ramp);
    if (target > 0 && spin.playState !== 'running') {
      spin.playbackRate = 0.02;
      spin.play();
    }
    const from = spin.playbackRate;
    const start = performance.now();
    const duration = target > 0 ? 900 : 1600;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      spin.playbackRate = from + (target - from) * (1 - (1 - t) ** 3);
      if (t < 1) ramp = requestAnimationFrame(step);
      else if (target === 0) spin.pause();
    };
    ramp = requestAnimationFrame(step);
  };

  const media = 'mediaSession' in navigator ? navigator.mediaSession : null;

  const cue = (track: HTMLButtonElement | null) => {
    if (!track) return;
    if (current && current !== track) {
      current.setAttribute('aria-pressed', 'false');
      current.closest('.track')?.classList.remove('is-cued');
    }
    current = track;
    track.closest('.track')?.classList.add('is-cued');
    const { name = '', artist = '', art = '', code = '', link: href = '' } = track.dataset;
    if (readout.title) readout.title.textContent = name;
    if (readout.artist) readout.artist.textContent = artist;
    if (readout.code) readout.code.textContent = code;
    if (readout.time) readout.time.textContent = '';
    if (label && blank) {
      if (art) label.src = art;
      label.hidden = !art;
      blank.hidden = !!art;
    }
    if (link) {
      link.href = href;
      link.setAttribute('aria-label', `${name} on ${track.dataset.apple === 'true' ? 'Apple Music' : 'Last.fm'}`);
    }
    if (toggle) toggle.disabled = !track.dataset.preview;
    setState(track.dataset.preview ? 'Cued up' : 'No preview');
    deck?.style.setProperty('--progress', '0');
  };

  const stop = () => {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    deck?.classList.remove('is-playing', 'is-paused');
    deck?.style.setProperty('--progress', '0');
    current?.setAttribute('aria-pressed', 'false');
    spinTo(0);
  };

  const play = async (track: HTMLButtonElement) => {
    if (current !== track) {
      stop();
      cue(track);
    }
    const src = track.dataset.preview;
    if (!src) {
      say(`There's no preview of ${track.dataset.name}. The arrow opens it instead.`);
      return;
    }
    if (audio.getAttribute('src') !== src) audio.src = src;
    if (media && 'MediaMetadata' in window) {
      media.metadata = new MediaMetadata({
        title: track.dataset.name,
        artist: track.dataset.artist,
        album: [section.dataset.owner && `${section.dataset.owner}'s rotation`, track.dataset.code].filter(Boolean).join(' · '),
        artwork: track.dataset.artBig ? [{ src: track.dataset.artBig, sizes: '600x600', type: 'image/jpeg' }] : [],
      });
    }
    try {
      await audio.play();
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') setState('Preview unavailable');
    }
  };

  const skip = (direction: 1 | -1) => {
    const playable = tracks().filter((track) => track.dataset.preview);
    const next = playable[playable.indexOf(current as HTMLButtonElement) + direction];
    if (next) play(next);
  };

  audio.addEventListener('playing', () => {
    deck?.classList.add('is-playing');
    deck?.classList.remove('is-paused');
    current?.setAttribute('aria-pressed', 'true');
    toggle?.setAttribute('aria-label', 'Pause preview');
    setState('Now spinning');
    spinTo(1);
    if (media) media.playbackState = 'playing';
    say(`Playing a preview of ${current?.dataset.name} by ${current?.dataset.artist}`);
  });

  audio.addEventListener('waiting', () => setState('Loading'));

  audio.addEventListener('pause', () => {
    // Ignore the pause queued while switching songs: by now the next one is already playing.
    if (!audio.paused || audio.ended || !audio.getAttribute('src')) return;
    deck?.classList.remove('is-playing');
    deck?.classList.add('is-paused');
    current?.setAttribute('aria-pressed', 'false');
    toggle?.setAttribute('aria-label', 'Play preview');
    setState('Paused');
    spinTo(0);
    if (media) media.playbackState = 'paused';
  });

  audio.addEventListener('ended', () => {
    deck?.classList.remove('is-playing', 'is-paused');
    deck?.style.setProperty('--progress', '0');
    current?.setAttribute('aria-pressed', 'false');
    toggle?.setAttribute('aria-label', 'Play preview');
    setState('Played');
    spinTo(0);
    if (media) media.playbackState = 'none';
  });

  audio.addEventListener('timeupdate', () => {
    const length = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 30;
    deck?.style.setProperty('--progress', Math.min(1, audio.currentTime / length).toFixed(4));
    if (readout.time) readout.time.textContent = `${clock(audio.currentTime)} / ${clock(length)}`;
  });

  audio.addEventListener('error', () => {
    if (!audio.getAttribute('src')) return;
    deck?.classList.remove('is-playing', 'is-paused');
    current?.setAttribute('aria-pressed', 'false');
    setState('Preview unavailable');
    spinTo(0);
  });

  toggle?.addEventListener('click', () => {
    if (!current) cue(firstTrack());
    if (!current) return;
    if (audio.paused) play(current);
    else audio.pause();
  });

  if (media) {
    const actions: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => current && play(current)],
      ['pause', () => audio.pause()],
      ['previoustrack', () => skip(-1)],
      ['nexttrack', () => skip(1)],
    ];
    for (const [action, handler] of actions) {
      try {
        media.setActionHandler(action, handler);
      } catch {
        // not every browser supports every action
      }
    }
  }

  cue(firstTrack());

  /* ---------- clicks: songs, and names on the line-up ---------- */
  section.addEventListener('click', (event) => {
    const target = event.target as Element;

    const track = target.closest<HTMLButtonElement>('[data-track]');
    if (track) {
      if (track === current && !audio.paused) audio.pause();
      else play(track);
      return;
    }

    const act = target.closest<HTMLButtonElement>('[data-act]');
    const poster = act?.closest<HTMLElement>('.poster');
    if (!act || !poster) return;
    for (const button of poster.querySelectorAll<HTMLButtonElement>('[data-act]')) {
      button.setAttribute('aria-pressed', String(button === act));
    }
    for (const panel of poster.querySelectorAll<HTMLElement>('[data-spot]')) {
      panel.hidden = panel.dataset.spot !== act.dataset.act;
    }
    // On phones the spotlight sits above the names: bring it back into view.
    const spot = poster.querySelector('.spot');
    if (spot && spot.getBoundingClientRect().top < 64) {
      spot.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
    }
  });

  /* ---------- 30 days / 12 months / all time ---------- */
  const periods = [...section.querySelectorAll<HTMLButtonElement>('[data-period]')];
  const parts = [...section.querySelectorAll<HTMLElement>('[data-chart]')];
  for (const button of periods) {
    button.addEventListener('click', () => {
      const key = button.dataset.period;
      for (const other of periods) other.setAttribute('aria-pressed', String(other === button));
      for (const part of parts) part.hidden = part.dataset.chart !== key;
      // a different chart is a different record
      stop();
      cue(firstTrack());
    });
  }

  /* ---------- "last spun 3 hours ago" ---------- */
  const ago = $<HTMLTimeElement>('[data-ago]');
  if (ago) {
    const seconds = (Date.now() - new Date(ago.dateTime).getTime()) / 1000;
    const units: [Intl.RelativeTimeFormatUnit, number][] = [
      ['year', 31_536_000],
      ['month', 2_592_000],
      ['week', 604_800],
      ['day', 86_400],
      ['hour', 3_600],
      ['minute', 60],
    ];
    const unit = units.find(([, size]) => seconds >= size);
    if (Number.isFinite(seconds)) {
      ago.textContent = unit
        ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-Math.floor(seconds / unit[1]), unit[0])
        : 'just now';
    }
  }
}
