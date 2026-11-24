/**
 * The photo viewer. Thumbnails are ordinary links to the large JPEG; this script upgrades them
 * to open the <dialog> in src/components/Viewer.astro instead.
 *
 * Opening the viewer adds a history entry, so the browser's Back button (and the Android back
 * gesture) closes it instead of leaving the page, and a URL ending in #photo-3 opens on that photo.
 */

interface ViewerPhoto {
  avif: string;
  webp: string;
  jpg: string;
  src: string;
  w: number;
  h: number;
  alt: string;
  title: string;
  meta: string;
  exif: string;
  colour: string;
}

const dialog = document.querySelector<HTMLDialogElement>('[data-viewer]');
const thumbs = [...document.querySelectorAll<HTMLAnchorElement>('[data-photo]')];

if (dialog && thumbs.length > 0 && typeof dialog.showModal === 'function') {
  const part = <T extends Element>(selector: string) => dialog.querySelector<T>(selector)!;

  const photos: ViewerPhoto[] = JSON.parse(part('[data-photos]').textContent ?? '[]');
  const stage = part<HTMLElement>('[data-stage]');
  const image = part<HTMLImageElement>('[data-image]');
  const avif = part<HTMLSourceElement>('[data-avif]');
  const webp = part<HTMLSourceElement>('[data-webp]');
  const count = part<HTMLElement>('[data-count]');
  const title = part<HTMLElement>('[data-title]');
  const meta = part<HTMLElement>('[data-meta]');
  const exif = part<HTMLElement>('[data-exif]');

  let index = 0;

  /** The photo is as wide as the screen allows, or as wide as its height allows, whichever is less. */
  const sizesFor = (photo: ViewerPhoto) => `min(100vw, calc((100vh - 9rem) * ${(photo.w / photo.h).toFixed(3)}))`;

  const preload = document.createElement('link');
  preload.rel = 'preload';
  preload.as = 'image';
  preload.type = 'image/avif';

  function show(next: number): void {
    index = (next + photos.length) % photos.length;
    const photo = photos[index]!;
    const sizes = sizesFor(photo);

    // Clear the old picture first so it never sits under the new caption while loading.
    image.removeAttribute('srcset');
    image.removeAttribute('src');

    const thumbnail = thumbs[index]?.querySelector('img');
    image.style.backgroundColor = photo.colour;
    image.style.backgroundImage = thumbnail?.currentSrc ? `url("${thumbnail.currentSrc}")` : '';

    image.width = photo.w;
    image.height = photo.h;
    image.style.setProperty('--ratio', (photo.w / photo.h).toFixed(4));
    image.style.setProperty('--natural', `${photo.w}px`);
    image.alt = photo.alt;
    avif.sizes = webp.sizes = image.sizes = sizes;
    avif.srcset = photo.avif;
    webp.srcset = photo.webp;
    image.srcset = photo.jpg;
    image.src = photo.src;

    count.textContent = `${index + 1} / ${photos.length}`;
    title.textContent = photo.title;
    meta.textContent = photo.meta;
    exif.textContent = photo.exif;

    // Fetch the next photo in the background so stepping forward feels instant.
    const following = photos[(index + 1) % photos.length]!;
    preload.imageSrcset = following.avif;
    preload.imageSizes = sizesFor(following);
    if (!preload.isConnected) document.head.append(preload);
  }

  const hashFor = (i: number) => `#photo-${i + 1}`;

  function open(i: number, addHistoryEntry: boolean): void {
    show(i);
    if (!dialog!.open) dialog!.showModal();
    if (addHistoryEntry) history.pushState({ photo: index }, '', hashFor(index));
  }

  function step(delta: number): void {
    show(index + delta);
    history.replaceState({ photo: index }, '', hashFor(index));
  }

  function jump(to: number): void {
    step(to - index);
  }

  /** Closing goes through history when opening added an entry, so Back and Close agree. */
  function requestClose(): void {
    if (typeof history.state?.photo === 'number') history.back();
    else dialog!.close();
  }

  thumbs.forEach((thumb, i) => {
    thumb.addEventListener('click', (event) => {
      // Leave modified clicks alone: they mean "open the image in a new tab".
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      open(i, true);
    });
  });

  part('[data-close]').addEventListener('click', requestClose);
  part('[data-prev]').addEventListener('click', () => step(-1));
  part('[data-next]').addEventListener('click', () => step(1));

  // On the document, not the dialog: the keys keep working even if focus has wandered off to
  // the browser's own controls and back.
  document.addEventListener('keydown', (event) => {
    if (!dialog.open || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight') step(1);
    else if (event.key === 'ArrowLeft') step(-1);
    else if (event.key === 'Home') jump(0);
    else if (event.key === 'End') jump(photos.length - 1);
    else return;
    event.preventDefault();
  });

  // Esc
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    requestClose();
  });

  // Swipe left or right on touch screens.
  let startX = 0;
  let startY = 0;
  let swiped = false;
  stage.addEventListener('pointerdown', (event) => {
    startX = event.clientX;
    startY = event.clientY;
    swiped = false;
  });
  stage.addEventListener('pointerup', (event) => {
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped = true;
      step(dx < 0 ? 1 : -1);
    }
  });

  // A click on the empty area around the photo closes the viewer.
  dialog.addEventListener('click', (event) => {
    if (swiped) {
      swiped = false;
      return;
    }
    if (event.target === dialog || event.target === stage) requestClose();
  });

  dialog.addEventListener('close', () => {
    image.removeAttribute('srcset');
    image.removeAttribute('src');
    // Hand focus back to the thumbnail of the photo that was on screen.
    thumbs[index]?.focus();
  });

  addEventListener('popstate', (event: PopStateEvent) => {
    const photo: unknown = event.state?.photo;
    if (typeof photo === 'number' && photo >= 0 && photo < photos.length) open(photo, false);
    else if (dialog.open) dialog.close();
  });

  // A link straight to a photo: example.com/#photo-3
  const linked = /^#photo-(\d+)$/.exec(location.hash);
  const linkedIndex = linked ? Number(linked[1]) - 1 : -1;
  if (linkedIndex >= 0 && linkedIndex < photos.length) {
    history.replaceState(null, '', location.pathname + location.search);
    open(linkedIndex, true);
  }
}
