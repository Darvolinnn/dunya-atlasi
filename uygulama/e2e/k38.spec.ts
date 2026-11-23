// K38: öneri raporundaki açıklar (örnek evrende; adlar uydurmadır).
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { editor, kaydedildi, sahneAc, yaz } from './yardimci';

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

test('büyük harita görseli döşemeyle gösterilir; yakınlaşınca yalnız ekrandaki parçalar çözülür', async ({ page: p }) => {
  test.setTimeout(150_000);
  await p.setViewportSize({ width: 1400, height: 900 });
  const ev = await ornekEvren(p);
  await p.goto(`/#/e/${ev}/haritalar`);
  // 6000×3000 piksellik uydurma bir harita: dama deseni.
  const b64 = await p.evaluate(async () => {
    const c = new OffscreenCanvas(6000, 3000); const x = c.getContext('2d')!;
    for (let i = 0; i < 60; i++) for (let j = 0; j < 30; j++) { x.fillStyle = (i + j) % 2 ? '#d9c9a3' : '#efe6d4'; x.fillRect(i * 100, j * 100, 100, 100); }
    const v = new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer());
    let s = ''; for (let i = 0; i < v.length; i += 0x8000) s += String.fromCharCode(...v.subarray(i, i + 0x8000));
    return btoa(s);
  });
  await p.getByRole('button', { name: 'Harita yükle' }).click();
  await p.getByLabel('Harita görseli').setInputFiles({ name: 'kita.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') });
  await p.getByLabel('Haritanın adı').fill('Büyük kıta');
  await p.locator('form.harita-yukle').getByRole('button', { name: 'Yükle', exact: true }).click();
  const doseme = p.locator('.harita-katman .doseme');
  await expect(doseme).toBeVisible({ timeout: 30_000 });
  await expect(doseme.locator('img.doseme-kaba')).toHaveAttribute('src', /^blob:/);
  // Sığdırılmış hâlde kaba görsel yeter; yakınlaşınca ince seviye parçaları gelir.
  const tuval = p.locator('.harita-tuval');
  const k = (await tuval.boundingBox())!;
  await p.mouse.move(k.x + k.width * 0.4, k.y + k.height * 0.4);
  for (let i = 0; i < 8; i++) await p.mouse.wheel(0, -400);
  await expect.poll(() => doseme.locator('img.doseme-parca[src]').count(), { timeout: 20_000 }).toBeGreaterThan(0);
  const toplam = await doseme.locator('img.doseme-parca').count();
  const cozulen = await doseme.locator('img.doseme-parca[src]').count();
  expect(cozulen).toBeLessThan(toplam);
});

test('paragraf odağı ve yalnız diyaloglar görünüşü değiştirir, metne dokunmaz', async ({ page: p }) => {
  await sahneAc(p);
  await yaz(p, 'Kapı gıcırdadı.');
  await p.keyboard.press('Enter');
  await p.keyboard.type('— Kim var orada?');
  await p.keyboard.press('Enter');
  await p.keyboard.type('Kimse cevap vermedi.');
  const paragraflar = editor(p).locator('> p');
  const saydamlik = (i: number) => paragraflar.nth(i).evaluate((e) => Number(getComputedStyle(e).opacity));
  await p.locator('.islem-menusu summary').click();
  await p.getByRole('button', { name: 'Paragraf odağı' }).click();
  await expect.poll(() => saydamlik(0)).toBeLessThan(0.5);
  await expect.poll(() => saydamlik(2)).toBe(1); // imleç son paragrafta
  await p.locator('.islem-menusu summary').click();
  await p.getByRole('button', { name: /Paragraf odağı/ }).click();
  await p.locator('.islem-menusu summary').click();
  await p.getByRole('button', { name: 'Yalnız diyaloglar' }).click();
  await expect(p.getByRole('region', { name: 'Sahnedekilerin dilleri ve hitaplar' })).toBeVisible();
  await expect.poll(() => saydamlik(0)).toBeLessThan(0.5);
  await expect(paragraflar.nth(1)).toHaveClass(/diyalog-paragrafi/);
  await expect.poll(() => saydamlik(1)).toBe(1);
  await p.getByRole('button', { name: 'Yalnız diyaloglar ✕' }).click();
  await expect.poll(() => saydamlik(0)).toBe(1);
  await expect(editor(p)).toHaveText('Kapı gıcırdadı.— Kim var orada?Kimse cevap vermedi.');
});

test('sahne imleçten bölünür, geri al ile birleşir; sonraki sahneyle birleştirilir', async ({ page: p }) => {
  await sahneAc(p, 'Arşiv');
  await yaz(p, 'Lale çekmeceyi açtı.');
  await p.keyboard.press('Enter');
  await p.keyboard.type('Masada bir şişe duruyordu.');
  await p.keyboard.press('Enter');
  await p.keyboard.type('Kimse yoktu.');
  // İmleç ilk paragrafın sonunda.
  await editor(p).locator('> p').first().click();
  await p.keyboard.press('End');
  await p.locator('.islem-menusu summary').click();
  await p.getByRole('button', { name: 'İmleçten sonrasını yeni sahneye böl' }).click();
  const pencere = p.getByRole('dialog', { name: 'Sahneyi böl' });
  await expect(pencere).toContainText('2 paragraf');
  await expect(pencere.getByLabel('Yeni sahnenin adı')).toHaveValue('Arşiv (2)');
  await pencere.getByRole('button', { name: 'Böl' }).click();
  await expect(pencere).toHaveCount(0);
  await expect(editor(p)).toHaveText('Lale çekmeceyi açtı.');
  await expect(p.getByText('Sahne bölündü.')).toBeVisible();
  // Geri al: metin eski hâline döner.
  await p.locator('.geri-al-seridi').getByRole('button', { name: 'Geri al' }).click();
  await expect(editor(p)).toHaveText('Lale çekmeceyi açtı.Masada bir şişe duruyordu.Kimse yoktu.');
  // Yeniden böl, sonra birleştir.
  await editor(p).locator('> p').first().click();
  await p.keyboard.press('End');
  await p.locator('.islem-menusu summary').click();
  await p.getByRole('button', { name: 'İmleçten sonrasını yeni sahneye böl' }).click();
  await p.getByRole('dialog', { name: 'Sahneyi böl' }).getByRole('button', { name: 'Böl' }).click();
  await expect(editor(p)).toHaveText('Lale çekmeceyi açtı.');
  await p.locator('.islem-menusu summary').click();
  await p.getByRole('button', { name: 'Sonraki sahneyle birleştir' }).click();
  const b = p.getByRole('dialog', { name: 'Sonraki sahneyle birleştir' });
  await expect(b).toContainText('“Arşiv (2)” sahnesinin metni');
  await b.getByRole('button', { name: 'Birleştir' }).click();
  await expect(editor(p)).toHaveText('Lale çekmeceyi açtı.Masada bir şişe duruyordu.Kimse yoktu.');
});

test('sürüm geçmişinde fark görünür ve tek paragraf geri alınır', async ({ page: p }) => {
  const adres = await sahneAc(p, 'Arşiv');
  await yaz(p, 'Merdivenler buz gibiydi.');
  await p.keyboard.press('Enter');
  await p.keyboard.type('Lale girdi.');
  await kaydedildi(p);
  // İkinci sürüm: ilk paragraf değişir.
  await editor(p).locator('> p').first().click();
  await p.keyboard.press('End');
  for (let i = 0; i < 'buz gibiydi.'.length; i++) await p.keyboard.press('Backspace');
  await p.keyboard.type('soğuktu.');
  await kaydedildi(p);
  await p.goto(adres.replace(/\/yaz\//, '/k/'));
  await p.getByRole('button', { name: 'Sürüm geçmişi' }).click();
  // En yeni ikinci sürüm; ondan önceki metin sürümü.
  await p.locator('.surum-gecmisi').getByRole('button', { name: 'Metni göster' }).nth(1).click();
  const fark = p.locator('.surum-farki');
  await expect(fark.locator('del')).toHaveText('buz gibiydi.');
  await expect(fark.locator('ins')).toHaveText('soğuktu.');
  await expect(fark).toContainText('1 paragraf değişmiş');
  await fark.getByRole('tab', { name: 'Yan yana' }).click();
  await expect(fark).toHaveClass(/yan-yana/);
  await fark.getByRole('button', { name: 'Bu paragrafı geri al' }).click();
  await expect(fark).toContainText('fark yok');
  await expect(editor(p)).toHaveText('Merdivenler buz gibiydi.Lale girdi.');
});

test('kitap görünümü eser başına saklanır, önizlenir ve PDF ile Word çıktısına girer', async ({ page: p }) => {
  const adres = await sahneAc(p);
  await yaz(p, 'Vergi günü arşivin taş merdivenleri soğuktu.');
  await kaydedildi(p);
  const evren = /#\/e\/([^/]+)/.exec(adres)![1];
  await p.goto(`/#/e/${evren}/yedek`);
  const kg = p.locator('.kitap-gorunumu');
  await expect(kg).toContainText('Kitap görünümü');
  await kg.getByRole('button', { name: 'Büyük baş harf' }).click();
  await kg.getByRole('button', { name: 'Bölüm numarası yazıyla (“Birinci Bölüm”)' }).click();
  await kg.getByRole('button', { name: 'Bölümler', exact: true }).click();
  await expect(kg.locator('.kitap-sayfa .bas-harfli')).toContainText('Vergi günü');
  if (process.env.EKRAN) await kg.screenshot({ path: process.env.EKRAN });
  await p.reload();
  await expect(p.locator('.kitap-gorunumu').getByRole('button', { name: 'Büyük baş harf' })).toHaveAttribute('aria-pressed', 'true');
  await expect(p.locator('.kitap-gorunumu').getByRole('button', { name: 'Bölümler', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const kart = p.locator('.kart').filter({ has: p.getByRole('heading', { name: 'Eseri dışa aktar (PDF, Word, EPUB)' }) });
  const [pdf] = await Promise.all([p.waitForEvent('download'), kart.getByRole('button', { name: 'PDF indir' }).click()]);
  expect(readFileSync((await pdf.path())!).subarray(0, 5).toString()).toBe('%PDF-');
  const [docx] = await Promise.all([p.waitForEvent('download'), kart.getByRole('button', { name: 'Word (.docx) indir' }).click()]);
  expect(readFileSync((await docx.path())!).subarray(0, 2).toString()).toBe('PK');
});
