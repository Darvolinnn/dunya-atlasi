// 6 Kasım önerileri: grafik araçlarının grupları (2A), yan panel genişliği (3A), çıktıda sahne seçimi (1B). Adlar uydurmadır.
import { test, expect } from '@playwright/test';
import { sahneAc } from './yardimci';

test('Araçlar sayfası araçları soruya göre gruplar; kart tek tıklamayla açılır, sabitlenen menüde kalır (K43)', async ({ page: p }) => {
  await sahneAc(p);
  await p.getByRole('link', { name: 'Araçlar', exact: true }).click();
  await expect(p.locator('.arac-grubu > h2')).toHaveText(['Kurguyu ve bölümleri planlarken', 'Zamanı, yaşları ve takvimi kontrol ederken', 'Karakterleri, aileleri ve ilişkileri incelerken', 'Mekânları ve yolculukları çizerken', 'Çelişkileri ve kelimeleri denetlerken', 'Kitap çıktısı, sürümler ve düzen']);
  await p.locator('.arac-karti', { has: p.getByRole('link', { name: 'Ağ', exact: true }) }).getByRole('button', { name: 'Sabitle' }).click();
  await p.locator('.arac-grubu').getByRole('link', { name: 'Ağ', exact: true }).click();
  await expect(p).toHaveURL(/\/ag$/);
  await expect(p.locator('nav.gezinti').getByRole('link', { name: /Ağ/ })).toBeVisible();
});

test('yan panel kenarından ve ok tuşlarıyla genişler; genişlik bu cihazda hatırlanır', async ({ page: p }) => {
  await p.setViewportSize({ width: 1400, height: 850 });
  await sahneAc(p);
  await p.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await p.keyboard.press('Control+K');
  await expect(p.locator('.palet input')).toBeFocused();
  await p.locator('.palet input').fill('Kuzey Yolu');
  // Arama sonucu gelene dek seçili satır "yeni kayıt" önerisidir; kaydın kendisi (tür rozetli) seçilene dek beklenir.
  await expect(p.locator('.palet li.secili .tur-rozeti')).toBeVisible();
  await expect(p.locator('.palet li.secili')).toContainText('Kuzey Yolu');
  await p.locator('.palet input').press('Shift+Enter');
  const panel = p.locator('.yan-panel');
  await expect(panel).toBeVisible();
  // Panel kayarak gelir (K41); ölçmeden önce geçiş bitsin.
  await panel.evaluate((e) => Promise.all(e.getAnimations().map((a) => a.finished)));
  const genislik = async () => Math.round((await panel.boundingBox())!.width);
  expect(await genislik()).toBe(380);
  const tutamak = p.getByRole('separator', { name: 'Yan panelin genişliği' });
  await tutamak.focus();
  await p.keyboard.press('ArrowLeft');
  await p.keyboard.press('ArrowLeft');
  expect(await genislik()).toBe(412);
  await expect(tutamak).toHaveAttribute('aria-valuenow', '412');
  const k = (await tutamak.boundingBox())!;
  await p.mouse.move(k.x + k.width / 2, k.y + k.height / 2);
  await p.mouse.down();
  await p.mouse.move(1400 - 520, k.y + k.height / 2, { steps: 5 });
  await p.mouse.up();
  expect(await genislik()).toBe(520);
  // Sınırlar: en çok 640.
  await p.mouse.move(1400 - 520, k.y + k.height / 2);
  await tutamak.press('End');
  expect(await genislik()).toBe(640);
  expect(await p.evaluate(() => localStorage.getItem('dunya-atlasi:yan-panel-genisligi'))).toBe('640');
  // Pencere daralınca panel metne en az 360 px bırakır.
  await p.setViewportSize({ width: 950, height: 850 });
  expect(await genislik()).toBe(590);
  await p.setViewportSize({ width: 1400, height: 850 });
  await tutamak.dblclick();
  expect(await genislik()).toBe(380);
});

test('çıktıda bölüm ve sahne seçilir; hiçbiri seçili değilse indirme kapanır', async ({ page: p }) => {
  await sahneAc(p);
  const eser = await p.locator('.gezinti a', { hasText: 'Kuzey Yolu' }).first().getAttribute('href');
  await p.evaluate((h) => { location.hash = h!.replace('/yaz/', '/k/'); }, eser);
  await p.locator('summary', { hasText: 'Diğer bölümler' }).click();
  const secim = p.locator('.cikti-secimi');
  await secim.locator('summary').click();
  await expect(secim.locator('summary')).toContainText('1 sahnenin hepsi seçili');
  await expect(secim.getByText('metni yok')).toBeVisible();
  await secim.getByRole('checkbox', { name: 'Kuşatma' }).uncheck();
  await expect(secim.locator('summary')).toContainText('1 sahneden 0 tanesi seçili');
  await expect(p.getByRole('button', { name: 'EPUB indir' })).toBeDisabled();
  await expect(p.getByText('Çıktıya girecek sahne seçilmedi.')).toBeVisible();
  await secim.getByRole('button', { name: 'Hepsi' }).click();
  await expect(p.getByRole('button', { name: 'EPUB indir' })).toBeEnabled();
});
