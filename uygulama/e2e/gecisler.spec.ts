// Arayüz geçişleri: kısa ve yumuşak; "animasyonları azalt" açıkken hiç oynamaz. Örnek adlar uydurmadır.
import { test, expect, type Page } from '@playwright/test';
import { sahneAc } from './yardimci';

/** Sayfada şu an oynayan geçişlerin en uzunu (milisaniye); hiç yoksa 0. */
const enUzunGecis = (p: Page) => p.evaluate(() => Math.max(0, ...document.getAnimations()
  .map((a) => Number(a.effect?.getComputedTiming().duration) || 0)));

test('komut paleti, sahne menüsü ve sayfa değişimi kısa bir geçişle açılır', async ({ page: p }) => {
  await sahneAc(p);
  // Geçişler yavaşlatılır ki yük altındaki makinede ölçmeden önce bitmesinler; süreleri değişmez.
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.02 });
  await p.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await p.keyboard.press('Control+K');
  await expect(p.getByRole('dialog', { name: 'Komut paleti' })).toBeVisible();
  const palet = await enUzunGecis(p);
  expect(palet).toBeGreaterThanOrEqual(150);
  expect(palet).toBeLessThanOrEqual(200);
  await p.keyboard.press('Escape');

  await p.locator('.islem-menusu > summary').first().click();
  await expect(p.locator('.islem-menusu .menu-icerik').first()).toBeVisible();
  expect(await p.locator('.islem-menusu .menu-icerik').first().evaluate((e) => e.getAnimations().length)).toBe(1);
  await p.keyboard.press('Escape');

  await p.getByRole('link', { name: 'Kayıtlar' }).click();
  expect(await p.locator('.kabuk-ic').evaluate((e) => e.getAnimations().map((a) => Number(a.effect?.getComputedTiming().duration))))
    .toEqual([180]);
});

test('"animasyonları azalt" açıkken hiçbir geçiş oynamaz', async ({ page: p }) => {
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await sahneAc(p);
  await p.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await p.keyboard.press('Control+K');
  await expect(p.getByRole('dialog', { name: 'Komut paleti' })).toBeVisible();
  expect(await enUzunGecis(p)).toBe(0);
  await p.keyboard.press('Escape');
  await p.getByRole('link', { name: 'Kayıtlar' }).click();
  expect(await p.locator('.kabuk-ic').evaluate((e) => e.getAnimations().length)).toBe(0);
});
