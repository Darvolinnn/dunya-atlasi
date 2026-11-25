// Kenardan gelen panelleri geldiği yöne sürükleyerek kapatma, kaydırınca üstte kalan kapatma düğmesi ve
// geri hareketinin önce paneli kapatması. Adlar uydurmadır.
import { test, expect, type Page, type Locator } from '@playwright/test';
import { sahneAc } from './yardimci';

/** Fareyle paneli sağa sürükler; `adim` kadar adımda toplam `mesafe` piksel. */
async function fareyleSurukle(p: Page, kutu: Locator, mesafe: number, y = 0.6) {
  const b = (await kutu.boundingBox())!;
  const x0 = b.x + 60;
  const y0 = b.y + b.height * y;
  await p.mouse.move(x0, y0);
  await p.mouse.down();
  for (let i = 1; i <= 10; i++) { await p.mouse.move(x0 + (mesafe * i) / 10, y0 + i * 0.5); await p.waitForTimeout(16); }
  await p.mouse.up();
}

/** Dokunarak sürükler (gerçek dokunma olayları; tarayıcı bunları parmak olarak görür). */
async function dokunarakSurukle(p: Page, kutu: Locator, dx: number, dy: number, sure = 300) {
  const b = (await kutu.boundingBox())!;
  const x0 = b.x + 60;
  const y0 = b.y + 40;
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (dx * i) / 10, y: y0 + (dy * i) / 10 }] });
    await p.waitForTimeout(sure / 10);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

test('sayfa rehberi: Kapat kaydırınca görünür kalır; az sürükleme geri döner, sağa sürükleme kapatır', async ({ page: p }) => {
  await sahneAc(p);
  await p.locator('nav.gezinti').getByRole('link', { name: /^Kayıtlar/ }).click();
  await p.getByRole('button', { name: 'Bu sayfa ne işe yarar?' }).first().click();
  const panel = p.locator('.rehber-paneli');
  await expect(panel).toBeVisible();
  await panel.evaluate((e) => Promise.all(e.getAnimations().map((a) => a.finished)));
  await panel.evaluate((e) => { e.scrollTop = e.scrollHeight; });
  const kapat = panel.getByRole('button', { name: 'Kapat' });
  const pb = (await panel.boundingBox())!;
  const kb = (await kapat.boundingBox())!;
  expect(kb.y).toBeGreaterThanOrEqual(pb.y);
  expect(kb.y).toBeLessThan(pb.y + 60);

  await fareyleSurukle(p, panel, 40);
  await p.waitForTimeout(300);
  await expect(panel).toBeVisible();
  expect(await panel.evaluate((e) => e.style.transform)).toBe('');

  await fareyleSurukle(p, panel, 220);
  await expect(panel).toBeHidden();
  await expect(p.locator('.cikis-hayaleti')).toHaveCount(0);
});

test('sayfa rehberi dokunarak sağa çekilince kapanır; aşağı kaydırma kapatmaz', async ({ browser }) => {
  const c = await browser.newContext({ viewport: { width: 1100, height: 760 }, hasTouch: true });
  const p = await c.newPage();
  await sahneAc(p);
  await p.locator('nav.gezinti').getByRole('link', { name: /^Kayıtlar/ }).click();
  await p.getByRole('button', { name: 'Bu sayfa ne işe yarar?' }).first().click();
  const panel = p.locator('.rehber-paneli');
  await panel.evaluate((e) => Promise.all(e.getAnimations().map((a) => a.finished)));
  await dokunarakSurukle(p, panel, 4, 200);
  await p.waitForTimeout(300);
  await expect(panel).toBeVisible();
  await dokunarakSurukle(p, panel, 200, 6);
  await expect(panel).toBeHidden();
  await c.close();
});

test('geri hareketi önce açık rehberi kapatır, sayfa değişmez; Kapat ile kapanınca geri boşa gitmez', async ({ page: p }) => {
  await sahneAc(p);
  await p.locator('nav.gezinti').getByRole('link', { name: /^Kayıtlar/ }).click();
  await expect(p).toHaveURL(/\/kayitlar$/);
  const adres = p.url();
  const panel = p.locator('.rehber-paneli');
  await p.getByRole('button', { name: 'Bu sayfa ne işe yarar?' }).first().click();
  await expect(panel).toBeVisible();
  await p.goBack();
  await expect(panel).toBeHidden();
  expect(p.url()).toBe(adres);
  // Kapat ile kapanınca eklenen işaret geri alınır: sonraki geri hareketi doğrudan önceki sayfaya gider.
  await p.getByRole('button', { name: 'Bu sayfa ne işe yarar?' }).first().click();
  await panel.getByRole('button', { name: 'Kapat' }).click();
  await expect(panel).toBeHidden();
  await p.waitForTimeout(200);
  await p.goBack();
  await expect(p).not.toHaveURL(/\/kayitlar$/);
});

test('yazma ekranındaki bağlam paneli sağa sürüklenince kapanır ve kapalı kalır', async ({ page: p }) => {
  await p.setViewportSize({ width: 1400, height: 850 });
  const adres = await sahneAc(p);
  const panel = p.getByRole('complementary', { name: 'Sahnenin bağlamı' });
  await p.getByRole('button', { name: 'Bağlam', exact: true }).click();
  await expect(panel).toBeVisible();
  await panel.evaluate((e) => Promise.all(e.getAnimations().map((a) => a.finished)));
  await fareyleSurukle(p, panel, 220, 0.8);
  await expect(panel).toBeHidden();
  await p.goto(adres);
  await p.reload();
  await expect(p.getByRole('button', { name: 'Bağlam', exact: true })).toBeVisible();
  await expect(panel).toBeHidden();
});

test('yan panel: geniş ekranda sağa, dar ekranda başlığından aşağı sürüklenince kapanır; geri hareketi kapatır', async ({ page: p }) => {
  await p.setViewportSize({ width: 1400, height: 850 });
  await sahneAc(p);
  const panel = p.locator('.yan-panel');
  const ac = async () => {
    await p.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await p.keyboard.press('Control+K');
    await p.locator('.palet input').fill('Kuzey Yolu');
    await expect(p.locator('.palet li.secili .tur-rozeti')).toBeVisible();
    await p.locator('.palet input').press('Shift+Enter');
    await expect(panel).toBeVisible();
    await panel.evaluate((e) => Promise.all(e.getAnimations().map((a) => a.finished)));
  };
  await ac();
  await fareyleSurukle(p, panel, 220, 0.5);
  await expect(panel).toBeHidden();

  await ac();
  const adres = p.url();
  await p.goBack();
  await expect(panel).toBeHidden();
  expect(p.url()).toBe(adres);

  await p.setViewportSize({ width: 800, height: 900 });
  await ac();
  const bas = panel.locator('.yan-panel-basi');
  const b = (await bas.boundingBox())!;
  // İçerikten aşağı çekmek kapatmaz (içerik kayar); başlıktan çekmek kapatır.
  await p.mouse.move(b.x + b.width - 30, b.y + b.height / 2);
  await p.mouse.down();
  for (let i = 1; i <= 10; i++) { await p.mouse.move(b.x + b.width - 30, b.y + b.height / 2 + i * 25); await p.waitForTimeout(16); }
  await p.mouse.up();
  await expect(panel).toBeHidden();
});
