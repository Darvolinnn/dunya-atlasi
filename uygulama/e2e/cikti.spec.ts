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
