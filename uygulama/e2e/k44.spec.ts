// K44: metin denetimi, ad benzerliği uyarısı ve sesli okuma. Örnek adlar ve metinler uydurmadır.
// RESIM=<klasör> verilirse ekran resimleri o klasöre yazılır (taslak onayı için; depoya konmaz).
import { test, expect, type Page } from '@playwright/test';
import { editor, kaydedildi, sahneAc } from './yardimci';

const RESIM = process.env.RESIM;
const resim = async (p: Page, ad: string) => { if (RESIM) await p.screenshot({ path: `${RESIM}/${ad}.png` }); };
const evrenKodu = (url: string) => url.match(/#\/e\/([^/]+)/)![1];

async function kayitOlustur(p: Page, evren: string, ad: string) {
  await p.goto(`/#/e/${evren}/kayitlar`);
  await p.getByLabel('Yeni kaydın adı').fill(ad);
  await p.getByRole('button', { name: 'Oluştur', exact: true }).click();
  await expect(p).toHaveURL(/\/k\//);
}

test('metin denetimi ve ad benzerliği', async ({ page: p }) => {
  await p.setViewportSize({ width: 1280, height: 800 });
  const sahne = await sahneAc(p, 'Liman');
  const evren = evrenKodu(sahne);
  await editor(p).click();
  await p.keyboard.type("Kael'a baktı ve sustu.  Ansızın kapı açıldı, ansızın rüzgâr girdi, ansızın her şey sustu .");
  await p.keyboard.press('Enter');
  await p.keyboard.type('— Gel buraya.');
  await p.keyboard.press('Enter');
  await p.keyboard.type('— Gelmem.');
  await p.keyboard.press('Enter');
  await p.keyboard.type('- Neden?');
  await kaydedildi(p);

  await kayitOlustur(p, evren, 'Kael');
  await kayitOlustur(p, evren, 'Alder');
  await p.goto(`/#/e/${evren}/kayitlar`);
  await p.getByLabel('Yeni kaydın adı').fill('Alden');
  await expect(p.locator('.benzer-ad')).toContainText('Benzer adlı kayıt var: Alder (karakter)');
  await resim(p, '1-benzer-ad');

  await p.goto(`/#/e/${evren}/araclar`);
  await expect(p.getByRole('link', { name: 'Metin denetimi' })).toBeVisible();
  await p.getByRole('link', { name: 'Metin denetimi' }).scrollIntoViewIfNeeded();
  await resim(p, '2-araclar-karti');
  await p.getByRole('link', { name: 'Metin denetimi' }).click();
  await p.getByRole('button', { name: 'Denetle', exact: true }).click();
  await expect(p.getByText(/sahne, .* kelime tarandı/)).toContainText('1 sahne');
  await resim(p, '3-denetim-kapali');
  for (const g of ['Özel adların ekleri', 'Dizgi', 'Yakın tekrar']) await p.locator('summary', { hasText: g }).click();
  const bulgular = p.locator('.denetim-bulgusu');
  await expect(bulgular.filter({ hasText: "“Kael'e” olmalı" })).toHaveCount(1);
  await expect(bulgular.filter({ hasText: 'Çift boşluk.' })).toHaveCount(1);
  await expect(bulgular.filter({ hasText: 'Noktalama işaretinden önce boşluk.' })).toHaveCount(1);
  await expect(bulgular.filter({ hasText: 'Konuşmalar çoğunlukla uzun çizgi' })).toHaveCount(1);
  await expect(bulgular.filter({ hasText: '3 kez' })).toContainText('ansızın');
  await resim(p, '4-denetim-acik');
});

test('sesli okuma: Türkçe ses varsa okunan paragraf vurgulanır', async ({ page: p }) => {
  // Sınama tarayıcısında ses yoktur; konuşma sentezi taklit edilir (her paragraf 300 ms sürer).
  await p.addInitScript(() => {
    const ses = { name: 'Türkçe (yerel)', lang: 'tr-TR', localService: true, default: true, voiceURI: 'tr' };
    let zaman: ReturnType<typeof setTimeout> | null = null;
    const s = speechSynthesis as unknown as Record<string, unknown>;
    s.getVoices = () => [ses];
    s.speak = (u: SpeechSynthesisUtterance) => { (window as unknown as { okunan: string[] }).okunan = [...((window as unknown as { okunan?: string[] }).okunan ?? []), u.text]; zaman = setTimeout(() => u.onend?.(new Event('end') as SpeechSynthesisEvent), 300); };
    s.cancel = () => { if (zaman) clearTimeout(zaman); };
    s.pause = () => {}; s.resume = () => {};
  });
  await p.setViewportSize({ width: 1280, height: 800 });
  await sahneAc(p, 'Liman');
  await editor(p).click();
  await p.keyboard.type('Gemi limana girdi.');
  await p.keyboard.press('Enter');
  await p.keyboard.type('— Kim var orada? diye seslendi bekçi.');
  await kaydedildi(p);
  await p.locator('.okuma-sahne-basi, .yol a, a').filter({ hasText: 'Kuzey Yolu' }).first().click();
  await p.getByRole('button', { name: 'Okuma', exact: true }).click();
  await p.getByRole('button', { name: '▶ Dinle' }).click();
  await expect(p.locator('.okunan-paragraf')).toContainText('Gemi limana girdi.');
  await resim(p, '5-sesli-okuma');
  await expect(p.locator('.okunan-paragraf')).toContainText('Kim var orada');
  await expect(p.getByRole('button', { name: '▶ Dinle' })).toBeVisible({ timeout: 5000 });
  expect(await p.evaluate(() => (window as unknown as { okunan: string[] }).okunan)).toEqual(['Gemi limana girdi.', '— Kim var orada? diye seslendi bekçi.']);
});
