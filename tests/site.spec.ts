import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/** Scroll the whole page once so lazy-loaded images are in place before checking it. */
async function settle(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    window.scrollTo(0, 0);
    await document.fonts.ready;
  });
}

for (const scheme of ['light', 'dark'] as const) {
  test(`no accessibility violations, ${scheme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await page.goto('/');
    await settle(page);

    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(violations).toEqual([]);
  });
}

test('no accessibility violations with the lightbox open', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('[data-photo]').first().click();
  await expect(page.locator('[data-lightbox]')).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(violations).toEqual([]);
});

test('every section is present and nothing overflows sideways', async ({ page }) => {
  await page.goto('/');
  for (const id of ['work', 'films', 'photography', 'chess', 'contact']) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/\S/);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('hero links jump to their sections', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Chess' }).click();
  await expect(page).toHaveURL(/#chess$/);
  await expect(page.locator('#chess')).toBeInViewport();
  // Wait for smooth scrolling to finish, then check the section sits at the top edge.
  await expect.poll(async () => Math.abs((await page.locator('#chess').boundingBox())!.y), { timeout: 5000 }).toBeLessThan(4);
});

test('lightbox: opens from the keyboard, arrows navigate, Escape returns focus', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const photos = page.locator('[data-photo]');
  const total = await photos.count();
  expect(total).toBeGreaterThan(1);

  const dialog = page.locator('[data-lightbox]');
  const count = dialog.locator('[data-lb-count]');

  await photos.first().focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await expect(count).toHaveText(`1 / ${total}`);
  await expect(dialog.locator('img')).toHaveAttribute('alt', /\S/);

  await page.keyboard.press('ArrowRight');
  await expect(count).toHaveText(`2 / ${total}`);

  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(count).toHaveText(`${total} / ${total}`);

  await page.keyboard.press('Home');
  await expect(count).toHaveText(`1 / ${total}`);
  await page.keyboard.press('ArrowRight');

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(photos.nth(1)).toBeFocused();
});

test('chess: the game can be stepped through', async ({ page }) => {
  await page.goto('/');
  const game = page.locator('[data-game]');
  const status = game.locator('[data-status]');
  const final = await status.textContent();

  await game.getByRole('button', { name: 'Previous move' }).click();
  await expect(status).not.toHaveText(final!);

  await game.getByRole('button', { name: 'First position' }).click();
  await expect(status).toHaveText('Starting position');
  await expect(game.locator('[data-pieces] use')).toHaveCount(32);

  await page.keyboard.press('End');
  await expect(status).toHaveText(final!);
});

test('theme toggle switches the theme and remembers it', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const html = page.locator('html');

  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(html).toHaveAttribute('data-theme', 'dark');

  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();
});

test('search and social metadata are in place', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https:\/\//);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og\.png$/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');

  const person = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(person['@type']).toBe('Person');
  expect(person.sameAs.length).toBeGreaterThan(0);

  expect((await request.get('/robots.txt')).ok()).toBe(true);
  expect(await (await request.get('/sitemap.xml')).text()).toContain('<urlset');
  expect((await request.get('/og.png')).ok()).toBe(true);
});
