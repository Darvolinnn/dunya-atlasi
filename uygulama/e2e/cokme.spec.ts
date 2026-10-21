// Tarayıcı aniden çökerse (görev yöneticisinden kapatma, elektrik kesintisinde programın ölmesi) veriler bozulmamalı.
// Tarayıcıyı kalıcı bir profille kendimiz başlatır, bütün süreçlerini tek seferde öldürür (SIGKILL: kapanış işi
// yapılamaz), aynı profille yeniden açarız. Örnek adlar uydurmadır.
import { test, expect, chromium, type Browser, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { editor, kaydedildi, sahneAc, yaz } from './yardimci';

const KOK = 'http://localhost:5173/';
test.skip(process.platform === 'win32', 'süreç grubunu öldürme Linux ve macOS içindir');

interface Acik { surec: ChildProcess; tarayici: Browser; sayfa: Page }

async function ac(profil: string): Promise<Acik> {
  const yol = process.env.PW_CHROMIUM || chromium.executablePath();
  const surec = spawn(yol, ['--headless=new', '--no-sandbox', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profil}`, 'about:blank'], { detached: true, stdio: ['ignore', 'ignore', 'pipe'] });
  const adres = await new Promise<string>((tamam, hata) => {
    let birikim = '';
    const sure = setTimeout(() => hata(new Error('Tarayıcı açılmadı: ' + birikim)), 30_000);
    surec.stderr!.on('data', (p: Buffer) => {
      birikim += p.toString();
      const m = /DevTools listening on (ws:\/\/\S+)/.exec(birikim);
      if (m) { clearTimeout(sure); tamam(m[1]); }
    });
    surec.on('exit', () => { clearTimeout(sure); hata(new Error('Tarayıcı kapandı: ' + birikim)); });
  });
  const tarayici = await chromium.connectOverCDP(adres);
  const sayfa = tarayici.contexts()[0].pages()[0] ?? await tarayici.contexts()[0].newPage();
  return { surec, tarayici, sayfa };
}

/** Elektrik kesilmiş gibi: tarayıcının bütün süreçleri bir anda ölür. */
async function cokert(a: Acik) {
  const bitti = new Promise((t) => a.surec.once('exit', t));
  process.kill(-a.surec.pid!, 'SIGKILL');
  await bitti;
  await a.tarayici.close().catch(() => {});
}

let profil: string;
test.beforeEach(() => { profil = mkdtempSync(join(tmpdir(), 'dunya-atlasi-cokme-')); });
test.afterEach(() => { rmSync(profil, { recursive: true, force: true }); });

test('kaydedilmiş yazı tarayıcı çöktükten sonra yerinde; program açılır ve yazmaya devam edilir', async () => {
  let a = await ac(profil);
  const adres = await sahneAc(a.sayfa, 'Kuşatma', KOK);
  await yaz(a.sayfa, 'Çökmeden önce kaydedilen cümle.');
  await kaydedildi(a.sayfa);
  await cokert(a);

  a = await ac(profil);
  await a.sayfa.goto(adres);
  await expect(editor(a.sayfa)).toContainText('Çökmeden önce kaydedilen cümle.', { timeout: 15_000 });
  await yaz(a.sayfa, ' Çöküşten sonra eklenen cümle.');
  await kaydedildi(a.sayfa);
  await a.sayfa.reload();
  await expect(editor(a.sayfa)).toContainText('Çöküşten sonra eklenen cümle.');
  await cokert(a);
});

test('yazarken defalarca çökse de evren bozulmaz: kaydedilen her şey yerinde, evren listede, yedek alınabilir', async () => {
  test.setTimeout(180_000);
  let a = await ac(profil);
  const adres = await sahneAc(a.sayfa, 'Kuşatma', KOK);
  const kalicilar: string[] = [];
  // Her turda: bir cümle yazılıp kaydedilir, sonra uzun bir yazı sürerken (kaydedici her an veritabanına yazıyor
  // olabilir) tarayıcı farklı bir anda ölür.
  for (const [tur, bekleme] of [150, 500, 900, 1400, 2200].entries()) {
    if (tur > 0) {
      a = await ac(profil);
      await a.sayfa.goto(KOK);
      await expect(a.sayfa.locator('button.kart h3')).toHaveText(['Deneme Evreni'], { timeout: 15_000 });
      await a.sayfa.goto(adres);
      for (const c of kalicilar) await expect(editor(a.sayfa)).toContainText(c, { timeout: 15_000 });
      // Kaydedilmemiş yazı için kurtarma sorusu çıkarsa kurtarılır.
      await a.sayfa.waitForTimeout(1500);
      const kurtar = a.sayfa.getByRole('button', { name: 'Kurtar' });
      if (await kurtar.isVisible()) await kurtar.click();
      for (const c of kalicilar) await expect(editor(a.sayfa)).toContainText(c);
    }
    const cumle = `Kalıcı cümle ${tur + 1}.`;
    await yaz(a.sayfa, ' ' + cumle);
    await kaydedildi(a.sayfa);
    kalicilar.push(cumle);
    const yaziyor = yaz(a.sayfa, ' Gece boyunca kale surlarında nöbet tutuldu ve sabaha karşı kuşatma kalktı.'.repeat(6)).catch(() => {});
    await a.sayfa.waitForTimeout(bekleme);
    await cokert(a);
    await yaziyor;
  }

  a = await ac(profil);
  await a.sayfa.goto(adres);
  for (const c of kalicilar) await expect(editor(a.sayfa)).toContainText(c, { timeout: 15_000 });
  // Bütün evren okunabiliyor: tam yedek alınır.
  const evren = /#\/e\/([^/]+)/.exec(adres)![1];
  await a.sayfa.goto(`${KOK}#/e/${evren}/yedek`);
  const [indirme] = await Promise.all([a.sayfa.waitForEvent('download'), a.sayfa.getByRole('button', { name: 'Yedek al' }).click()]);
  expect(await indirme.failure()).toBeNull();
  await cokert(a);
});
