// K38: öneri raporundaki açıklar (örnek evrende; adlar uydurmadır).
import { test, expect, type Page } from '@playwright/test';
import { editor, sahneAc, yaz } from './yardimci';

async function ornekEvren(p: Page): Promise<string> {
  await p.goto('/');
  await p.getByRole('button', { name: 'Örnek evreni aç' }).click();
  await expect(p.getByRole('heading', { name: 'Unutulanlar' })).toBeVisible({ timeout: 40_000 });
  for (const ad of ['Bir daha gösterme', 'Gizle']) { const d = p.getByRole('button', { name: ad }); if (await d.count()) await d.first().click(); }
  return /#\/e\/([^/]+)/.exec(p.url())![1];
}

test('haritada tekerlek imlecin altındaki noktayı tutarak yakınlaştırır; sürüklemek kaydırır, işaret açmaz', async ({ page: p }) => {
  test.setTimeout(120_000);
  await p.setViewportSize({ width: 1400, height: 900 });
  const ev = await ornekEvren(p);
  await p.goto(`/#/e/${ev}/haritalar`);
  await p.getByText('Başkent planı').first().click();
  const yuzde = p.locator('.harita-yakinlik span.kucuk');
  await expect(yuzde).toHaveText('%100');
  const tuval = p.locator('.harita-tuval');
  const k = (await tuval.boundingBox())!;
  const imlec = { x: k.x + k.width * 0.35, y: k.y + k.height * 0.55 };
  // İmlecin altındaki harita noktası (yüzeyin oranı) yakınlaşmadan önce ve sonra aynı kalır.
  const oran = () => p.evaluate(({ x, y }) => {
    const r = document.querySelector('.harita-yuzey')!.getBoundingClientRect();
    return { x: (x - r.left) / r.width, y: (y - r.top) / r.height };
  }, imlec);
  const once = await oran();
  await p.mouse.move(imlec.x, imlec.y);
  await p.mouse.wheel(0, -300);
  await expect(yuzde).not.toHaveText('%100');
  const deger = Number((await yuzde.textContent())!.slice(1));
  expect(deger).toBeGreaterThan(100);
  const sonra = await oran();
  expect(Math.abs(sonra.x - once.x)).toBeLessThan(0.02);
  expect(Math.abs(sonra.y - once.y)).toBeLessThan(0.02);

  // Sürüklemek kaydırır; bırakınca yer kartı açılmaz.
  const sl = await tuval.evaluate((t) => t.scrollLeft);
  await p.mouse.move(imlec.x, imlec.y);
  await p.mouse.down();
  await p.mouse.move(imlec.x - 120, imlec.y, { steps: 6 });
  await p.mouse.up();
  expect(await tuval.evaluate((t) => t.scrollLeft)).toBeGreaterThan(sl + 60);
  await expect(p.getByRole('region', { name: 'Seçili yer' })).toHaveCount(0);
  // Düğmeler yine çalışır.
  await p.getByRole('button', { name: 'Uzaklaştır' }).click();
  await expect(yuzde).toHaveText(`%${Math.round(deger / 1.5)}`);
});

test('Windows uygulamasında kapatırken yazılmamış metin kaydedilir, sonra pencere kapanır', async ({ page: p }) => {
  // Kabuğun yerine sahtesi: istekleri kaydeder, kapatma isteğinin zamanını tutar.
  await p.addInitScript(() => {
    const w = window as unknown as { __TAURI_INTERNALS__: unknown; kabukIstekleri: string[] };
    w.kabukIstekleri = [];
    w.__TAURI_INTERNALS__ = { invoke: async (komut: string) => { w.kabukIstekleri.push(komut); return null; } };
  });
  await sahneAc(p);
  await yaz(p, 'Kapı kapanmadan önce yazılan son cümle.');
  await p.evaluate(() => dispatchEvent(new Event('dunya-atlasi:kapanis')));
  await expect(p.getByText('Değişiklikler kaydediliyor…')).toBeVisible();
  await expect.poll(() => p.evaluate(() => (window as unknown as { kabukIstekleri: string[] }).kabukIstekleri.includes('pencereyi_kapat'))).toBe(true);
  // Kapatma istendiğinde metin veritabanına yazılmıştı: taslağı silinmiş sayfada yeniden açınca metin duruyor.
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await expect(editor(p)).toContainText('Kapı kapanmadan önce yazılan son cümle.');
});
