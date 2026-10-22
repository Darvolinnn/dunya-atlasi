// Arayüz geçişleri: kısa ve yumuşak; "animasyonları azalt" açıkken hiç oynamaz. Örnek adlar uydurmadır.
// Geçişler 200 ms'den kısa sürdüğü için oynarken yakalanmaya çalışılmaz: CSS geçişi öğenin hesaplanmış
// biçiminden, sayfa geçişi (Element.animate) sayfa açılmadan kurulan bir kayıttan okunur.
import { test, expect, type Page } from '@playwright/test';
import { sahneAc } from './yardimci';

async function kaydet(p: Page) {
  await p.addInitScript(() => {
    const kayit: { sinif: string; sure: number }[] = [];
    (window as unknown as { __gecisler: typeof kayit }).__gecisler = kayit;
    const asil = Element.prototype.animate;
    Element.prototype.animate = function (this: Element, ...a: Parameters<Element['animate']>) {
      const s = a[1];
      kayit.push({ sinif: this.className, sure: typeof s === 'number' ? s : Number(s?.duration ?? 0) });
      return asil.apply(this, a);
    };
  });
}
const sayfaGecisleri = (p: Page) => p.evaluate(() => (window as unknown as { __gecisler: { sinif: string; sure: number }[] }).__gecisler
  .filter((g) => g.sinif.split(' ').includes('kabuk-ic')).map((g) => g.sure));
const css = (p: Page, secici: string) => p.locator(secici).first().evaluate((e) => {
  const s = getComputedStyle(e);
  return { ad: s.animationName, sure: parseFloat(s.animationDuration) * 1000 };
});

test('komut paleti, sahne menüsü ve sayfa değişimi kısa bir geçişle açılır', async ({ page: p }) => {
  await kaydet(p);
  await sahneAc(p);
  expect(await sayfaGecisleri(p)).toContain(180);
  await p.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await p.keyboard.press('Control+K');
  await expect(p.getByRole('dialog', { name: 'Komut paleti' })).toBeVisible();
  expect(await css(p, '.perde')).toEqual({ ad: 'sol-gir', sure: 150 });
  expect(await css(p, '.palet')).toEqual({ ad: 'pencere-gir', sure: 180 });
  await p.keyboard.press('Escape');

  await p.locator('.islem-menusu > summary').first().click();
  await expect(p.locator('.islem-menusu .menu-icerik').first()).toBeVisible();
  expect(await css(p, '.islem-menusu .menu-icerik')).toEqual({ ad: 'asagi-gir', sure: 150 });
  await p.keyboard.press('Escape');

  const once = (await sayfaGecisleri(p)).length;
  await p.getByRole('link', { name: 'Kayıtlar' }).click();
  await expect(p).toHaveURL(/\/kayitlar$/);
  await expect.poll(async () => (await sayfaGecisleri(p)).length).toBeGreaterThan(once);
  expect((await sayfaGecisleri(p)).every((s) => s >= 150 && s <= 200)).toBe(true);
});

test('"animasyonları azalt" açıkken hiçbir geçiş oynamaz', async ({ page: p }) => {
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await kaydet(p);
  await sahneAc(p);
  await p.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await p.keyboard.press('Control+K');
  await expect(p.getByRole('dialog', { name: 'Komut paleti' })).toBeVisible();
  expect((await css(p, '.palet')).ad).toBe('none');
  expect((await css(p, '.perde')).ad).toBe('none');
  await p.keyboard.press('Escape');
  await p.getByRole('link', { name: 'Kayıtlar' }).click();
  await expect(p).toHaveURL(/\/kayitlar$/);
  expect(await sayfaGecisleri(p)).toEqual([]);
});
