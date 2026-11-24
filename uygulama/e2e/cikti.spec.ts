// Eserin PDF ve Word çıktısı gerçek tarayıcıda (§10.11): yazı tipleri programın içinden gelir.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { kaydedildi, sahneAc, yaz } from './yardimci';

test('Yedek sekmesinden eserin PDF ve Word dosyası iner', async ({ page: p }) => {
  const adres = await sahneAc(p);
  await yaz(p, 'Çığ düştü; ılık İstanbul öğleni şöyleydi.');
  await kaydedildi(p);
  const evren = /#\/e\/([^/]+)/.exec(adres)![1];
  await p.goto(`/#/e/${evren}/yedek`);
  const kart = p.locator('.kart').filter({ has: p.getByRole('heading', { name: 'Eseri dışa aktar (PDF, Word, EPUB)' }) });
  await expect(kart).toContainText('Eser: Kuzey Yolu');
  const [pdf] = await Promise.all([p.waitForEvent('download'), kart.getByRole('button', { name: 'PDF indir' }).click()]);
  expect(pdf.suggestedFilename()).toBe('kuzey-yolu.pdf');
  expect(readFileSync((await pdf.path())!).subarray(0, 5).toString()).toBe('%PDF-');
  const [docx] = await Promise.all([p.waitForEvent('download'), kart.getByRole('button', { name: 'Word (.docx) indir' }).click()]);
  expect(docx.suggestedFilename()).toBe('kuzey-yolu.docx');
  expect(readFileSync((await docx.path())!).subarray(0, 2).toString()).toBe('PK');
});

test('Literata\'da olmayan ses yazısı işaretleri PDF\'e yedek yazı tipiyle girer', async ({ page: p }) => {
  const { PDFDocument, PDFDict, PDFName } = await import('pdf-lib');
  const yazilar = async (yol: string) => (await PDFDocument.load(readFileSync(yol))).context.enumerateIndirectObjects()
    .map(([, o]) => (o instanceof PDFDict && o.has(PDFName.of('FontFile2')) ? String(o.get(PDFName.of('FontName'))) : ''))
    .filter(Boolean).map((x) => x.replace(/^\/(?:[A-Z]{6}\+)?/, '').replace(/-\d+$/, '')).sort();
  const adres = await sahneAc(p);
  await yaz(p, 'Adı [ʃaˈʒɛ] diye okunur ※.');
  await kaydedildi(p);
  const evren = /#\/e\/([^/]+)/.exec(adres)![1];
  await p.goto(`/#/e/${evren}/yedek`);
  const kart = p.locator('.kart').filter({ has: p.getByRole('heading', { name: 'Eseri dışa aktar (PDF, Word, EPUB)' }) });
  const [pdf] = await Promise.all([p.waitForEvent('download'), kart.getByRole('button', { name: 'PDF indir' }).click()]);
  expect(await yazilar((await pdf.path())!)).toEqual(expect.arrayContaining(['Literata-Regular', 'NotoSerif-Regular']));
});

test('PDF yazı tipinde olmayan karakterleri söyler', async ({ page: p }) => {
  const adres = await sahneAc(p);
  await yaz(p, 'Kalenin kapısında bir işaret vardı: 🗝 ve 漢, okunuşu [ʃa].');
  await kaydedildi(p);
  const evren = /#\/e\/([^/]+)/.exec(adres)![1];
  await p.goto(`/#/e/${evren}/yedek`);
  const kart = p.locator('.kart').filter({ has: p.getByRole('heading', { name: 'Eseri dışa aktar (PDF, Word, EPUB)' }) });
  await Promise.all([p.waitForEvent('download'), kart.getByRole('button', { name: 'PDF indir' }).click()]);
  // Yedek yazı tipindeki ʃ sayılmaz; yalnız iki yazı tipinde de olmayanlar.
  await expect(kart.getByRole('status')).toHaveText("PDF'in yazı tipinde olmayan karakterler boş çıktı: 🗝 漢. Word ve EPUB çıktısında görünürler.");
});
