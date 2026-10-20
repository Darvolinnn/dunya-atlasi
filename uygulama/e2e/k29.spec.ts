// Kullanım kolaylığı paketinin ikinci kısmı (K29) akışları. Örnek adlar uydurmadır.
import { test, expect } from '@playwright/test';
import { editor, kaydedildi, sahneAc, yaz } from './yardimci';

test('kelime başındaki "@" bağlantı kutusunu açar; kelime içindeki açmaz', async ({ page: p }) => {
  await sahneAc(p);
  const kutu = p.getByRole('dialog', { name: 'Bağlantı' });
  await yaz(p, 'Mektup lale@arsiv adresine gitti. ');
  await expect(kutu).toBeHidden();
  await yaz(p, 'Yolcular @Kuzey');
  await expect(kutu.getByRole('option', { name: /Kuzey Yolu/ }).first()).toBeVisible();
  await p.keyboard.press('Enter');
  await expect(kutu).toBeHidden();
  await expect(editor(p).locator('a, [data-kayit], .baglanti').filter({ hasText: 'Kuzey Yolu' })).toHaveCount(1);
  await expect(editor(p)).toContainText('lale@arsiv');
  await expect(editor(p)).not.toContainText('@Kuzey');
  await kaydedildi(p);
});

test('"@" yazıp Esc: kutu kapanır, işaret düz yazı kalır', async ({ page: p }) => {
  await sahneAc(p);
  await yaz(p, 'Not: @');
  const kutu = p.getByRole('dialog', { name: 'Bağlantı' });
  await expect(kutu).toBeVisible();
  await p.keyboard.press('Escape');
  await expect(kutu).toBeHidden();
  await expect(editor(p)).toContainText('Not: @');
});

test('bağlantısız geçen adlar metnin altında listelenir; "Bağla" bağlantıyı kurar, "Bu adı hiç önerme" çıkarır', async ({ page: p }) => {
  test.setTimeout(90_000);
  await p.goto('/');
  await p.getByRole('button', { name: 'Örnek evreni aç' }).click();
  await expect(p.getByRole('heading', { name: 'Unutulanlar' })).toBeVisible({ timeout: 30_000 });
  await p.locator('nav a', { hasText: /^Arşiv$/ }).first().click();
  const satir = p.locator('details.bagsiz-adlar');
  await expect(satir.locator('summary')).toContainText('Bu metinde bağlantısız geçen 3 ad var');
  await satir.locator('summary').click();
  const deniz = satir.locator('.bagsiz-ad', { hasText: "Deniz'in adının" });
  await expect(deniz).toBeVisible();
  await deniz.getByRole('button', { name: 'Bağla' }).click();
  await kaydedildi(p);
  await expect(satir.locator('summary')).toContainText('2 ad var');
  await expect(editor(p).locator('a, [data-kayit], .baglanti').filter({ hasText: "Deniz'in" })).toHaveCount(2);
  await satir.locator('.bagsiz-ad', { hasText: 'Lale' }).first().getByRole('button', { name: 'Bu adı hiç önerme' }).click();
  await expect(satir).toContainText('Önerilmeyen adlar: Lale');
  await expect(satir.locator('.bagsiz-ad')).toHaveCount(0);
  await satir.getByRole('button', { name: 'Yeniden öner' }).click();
  await expect(satir.locator('.bagsiz-ad')).toHaveCount(2);
});

test('sahne soru sorulmadan çöp kutusuna gider; alttaki şeritten "Geri al" ile döner', async ({ page: p }) => {
  let soruldu = false;
  p.on('dialog', (d) => { soruldu = true; void d.dismiss(); });
  const adres = await sahneAc(p, 'Silinecek Sahne');
  await yaz(p, 'Kısa bir sahne.');
  await kaydedildi(p);
  await p.locator('.islem-menusu summary').click();
  await p.getByRole('button', { name: 'Çöp kutusuna taşı' }).click();
  const serit = p.locator('.geri-al-seridi');
  await expect(serit).toContainText('“Silinecek Sahne” çöp kutusuna taşındı.');
  expect(soruldu).toBe(false);
  await expect(p).not.toHaveURL(adres);
  await serit.getByRole('button', { name: 'Geri al' }).click();
  await expect(serit).toBeHidden();
  await expect(p).toHaveURL(adres);
  await expect(editor(p)).toContainText('Kısa bir sahne.');
});

test('soy ağacında kişiler arası bağlar: ağaçta olmayan kişi çizilmez, adıyla yazılır; katman kapatılabilir', async ({ page: p }) => {
  test.setTimeout(90_000);
  await p.goto('/');
  await p.getByRole('button', { name: 'Örnek evreni aç' }).click();
  await expect(p.getByRole('heading', { name: 'Unutulanlar' })).toBeVisible({ timeout: 30_000 });
  const ev = p.url().match(/#\/e\/([^/]+)/)![1];
  await p.goto(`/#/e/${ev}/kayitlar`);
  await p.getByRole('link', { name: /^Deniz Karakter/ }).first().click();
  await expect(p).toHaveURL(/\/k\//);
  const deniz = p.url().match(/\/k\/([^/?]+)/)![1];
  await p.goto(`/#/e/${ev}/soy/${deniz}`);
  const not = p.getByText('Ağaçta olmayan kişilerle bağlar çizilmez');
  await expect(not).toContainText('Deniz – düşmanı – Orhun');
  await expect(p.locator('g.soy-kutu[aria-label="Orhun"]')).toHaveCount(0);
  await p.getByLabel('Kişiler arası bağları göster').uncheck();
  await expect(not).toBeHidden();
});
