// Daktilo kipi (K33, §5.10) ve yazma ekranındaki biçim çubuğu. Örnek metin uydurmadır.
import { test, expect, type Page } from '@playwright/test';
import { editor, sahneAc } from './yardimci';

const CUMLE = 'Rüzgâr akşamdan beri dinmemişti; fenerin camları her dalgada hafifçe titriyordu ve sis kıyıyı örtüyordu.';

async function uzunMetin(p: Page, paragraf = 30) {
  await editor(p).focus();
  for (let i = 0; i < paragraf; i++) { await p.keyboard.insertText(CUMLE); await p.keyboard.press('Enter'); }
}

/** İmlecin satırının ortası ile pencerenin ortası arasındaki fark (piksel). */
const ortadanUzaklik = (p: Page) => p.evaluate(() => {
  const r = window.getSelection()!.getRangeAt(0).getBoundingClientRect();
  return Math.abs((r.top + r.bottom) / 2 - innerHeight / 2);
});
const kaydirma = (p: Page) => p.evaluate(() => document.scrollingElement!.scrollTop);
/** Yumuşak kayma bitene dek bekler; sonra sayfanın kaydırma yerini verir. */
async function durgunKaydirma(p: Page) {
  let once = -1;
  for (let i = 0; i < 30; i++) {
    const simdi = await kaydirma(p);
    if (simdi === once) return simdi;
    once = simdi;
    await p.waitForTimeout(150);
  }
  throw new Error('sayfa kaymayı bırakmadı');
}

test('daktilo kipi: yazılan satır ekranın ortasında kalır; tıklamak kaydırmaz; seçim hatırlanır', async ({ page: p }) => {
  await p.setViewportSize({ width: 1400, height: 800 });
  await sahneAc(p);
  await uzunMetin(p);
  // Kapalıyken imleç sayfanın altında kalır.
  await p.keyboard.type('Elin');
  expect(await ortadanUzaklik(p)).toBeGreaterThan(150);

  // "Sahne ⋯" menüsünden açılır.
  await p.locator('.yaz-ust .islem-menusu > summary').click();
  await p.getByRole('button', { name: 'Daktilo kipi' }).click();
  await expect(p.locator('html.daktilo-kipi')).toHaveCount(1);
  await editor(p).focus();
  await p.keyboard.type(' lambayı yaktı.');
  await expect.poll(() => ortadanUzaklik(p), { timeout: 3000 }).toBeLessThan(30);
  await p.keyboard.press('Enter');
  await p.keyboard.type('Işık denize uzandı.');
  await expect.poll(() => ortadanUzaklik(p), { timeout: 3000 }).toBeLessThan(30);

  // Fareyle yukarıdaki bir satıra tıklamak sayfayı kaydırmaz.
  const once = await durgunKaydirma(p);
  const kutu = (await editor(p).boundingBox())!;
  await p.mouse.click(kutu.x + 60, 160);
  await p.waitForTimeout(400);
  expect(Math.abs((await kaydirma(p)) - once)).toBeLessThan(2);
  // Ok tuşuyla imleç taşınınca satır yeniden ortalanır.
  await p.keyboard.press('ArrowDown');
  await expect.poll(() => ortadanUzaklik(p), { timeout: 3000 }).toBeLessThan(30);

  // Seçim cihazda hatırlanır; kısayolla kapanır.
  await p.reload();
  await expect(editor(p)).toBeVisible();
  await expect(p.locator('html.daktilo-kipi')).toHaveCount(1);
  await editor(p).focus();
  await p.keyboard.press('Control+Shift+D');
  await expect(p.locator('html.daktilo-kipi')).toHaveCount(0);
  await p.keyboard.press('Control+Shift+D');
  await expect(p.locator('html.daktilo-kipi')).toHaveCount(1);
});

test('daktilo kipi: animasyonları azalt açıkken kayma anlık; komut paletinde bulunur', async ({ page: p }) => {
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.setViewportSize({ width: 1400, height: 800 });
  await sahneAc(p);
  await uzunMetin(p);
  await p.keyboard.press('Control+K');
  const palet = p.getByRole('dialog', { name: 'Komut paleti' });
  await palet.getByRole('textbox').fill('daktilo');
  await expect(palet.locator('[role=option][aria-selected=true]')).toContainText('Daktilo kipi');
  await p.keyboard.press('Enter');
  await expect(p.locator('html.daktilo-kipi')).toHaveCount(1);
  await editor(p).focus();
  await p.keyboard.type('Son satır.');
  // Kayma beklenmeden ölçülür.
  expect(await ortadanUzaklik(p)).toBeLessThan(30);
});

test('yazma ekranında biçim çubuğu soluk ama altındaki metin görünmez', async ({ page: p }) => {
  await p.setViewportSize({ width: 1400, height: 800 });
  await sahneAc(p);
  await uzunMetin(p);
  await p.evaluate(() => { document.scrollingElement!.scrollTop = document.scrollingElement!.scrollHeight; (document.activeElement as HTMLElement | null)?.blur(); });
  await p.mouse.move(5, 790);
  const cubuk = p.locator('.yaz-kagidi .arac-cubugu');
  await expect.poll(() => cubuk.evaluate((e) => [getComputedStyle(e).opacity, getComputedStyle(e.firstElementChild!).opacity])).toEqual(['1', '0.55']);
  // Çubuk sayfanın üstüne yapışmış ve metnin önünde.
  const ust = await cubuk.evaluate((e) => { const b = e.getBoundingClientRect(); return { top: Math.round(b.top), onde: document.elementFromPoint(b.right - 4, b.top + b.height / 2)?.closest('.arac-cubugu') === e }; });
  expect(ust).toEqual({ top: 0, onde: true });
});
