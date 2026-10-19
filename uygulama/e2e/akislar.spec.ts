// Kullanıcı akışları ve hata anları (inceleme 9). Örnek adlar uydurmadır.
import { test, expect } from '@playwright/test';
import { editor, kaydedildi, sahneAc, yaz } from './yardimci';

test('yeni evren, eser ve sahne; yazılan metin yeniden açınca yerinde', async ({ page: p }) => {
  await sahneAc(p);
  await yaz(p, 'Sur kapısı şafakta açıldı.');
  await kaydedildi(p);
  await p.reload();
  await expect(editor(p)).toContainText('Sur kapısı şafakta açıldı.');
});

test('"[[" ile kayda bağlantı', async ({ page: p }) => {
  await sahneAc(p);
  await yaz(p, 'Yolcular [[Kuzey');
  const kutu = p.getByRole('dialog', { name: 'Bağlantı' });
  await expect(kutu.getByRole('option', { name: /Kuzey Yolu/ }).first()).toBeVisible();
  await p.keyboard.press('Enter');
  await expect(kutu).toBeHidden();
  await expect(editor(p).locator('a, [data-kayit], .baglanti').filter({ hasText: 'Kuzey Yolu' })).toHaveCount(1);
  await kaydedildi(p);
  await p.reload();
  await expect(editor(p).locator('a, [data-kayit], .baglanti').filter({ hasText: 'Kuzey Yolu' })).toHaveCount(1);
});

test('sayfa rehberi "?" ile açılır, Esc ile kapanır', async ({ page: p }) => {
  await p.goto('/');
  const dugme = p.getByRole('button', { name: 'Bu sayfa ne işe yarar?' });
  await dugme.click();
  const panel = p.locator('aside.rehber-paneli');
  await expect(panel).toBeVisible();
  await p.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(dugme).toBeFocused();
});

test('dosyaya tam yedek, sonra ayrı evren olarak geri yükleme', async ({ page: p }) => {
  const adres = await sahneAc(p);
  await yaz(p, 'Yedekte kalacak cümle.');
  await kaydedildi(p);
  const evren = /#\/e\/([^/]+)/.exec(adres)![1];
  await p.goto(`/#/e/${evren}/yedek`);
  const [indirme] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Yedek al' }).click()]);
  const dosya = await indirme.path();
  await p.goto('/');
  await p.getByRole('button', { name: 'Yedekten geri yükle' }).click();
  await p.locator('input[type=file][accept*=zip]').setInputFiles(dosya);
  await expect(p.getByText('Bu evren bu cihazda zaten var')).toBeVisible();
  await p.getByRole('button', { name: 'Geri yükle', exact: true }).click();
  await expect(p.getByText('Yedek ayrı bir evren olarak açıldı. Asıl evrene dokunulmadı.')).toBeVisible();
  await p.getByRole('button', { name: 'Evreni aç' }).click();
  await p.getByRole('link', { name: 'Kuşatma' }).first().click();
  await expect(editor(p)).toContainText('Yedekte kalacak cümle.');
  await p.goto('/');
  await expect(p.locator('button.kart h3')).toHaveCount(2);
});

test('kayıt sürerken başka sahneye geçmek yazıyı kaybettirmez', async ({ page: p }) => {
  const ilk = await sahneAc(p);
  await p.getByRole('button', { name: '+ Sahne' }).click();
  await p.getByPlaceholder('Sahnenin adı', { exact: true }).fill('Geri çekilme');
  await p.getByPlaceholder('Sahnenin adı', { exact: true }).press('Enter');
  await expect(p).not.toHaveURL(ilk);
  const ikinci = p.url();
  await p.goto(ilk);
  await expect(p.getByLabel('Başlık', { exact: true })).toHaveValue('Kuşatma');
  await yaz(p, 'Hemen ardından geçilen yazı.');
  await p.goto(ikinci); // beklemeden
  await expect(p.getByLabel('Başlık', { exact: true })).toHaveValue('Geri çekilme');
  await p.goto(ilk);
  await expect(p.getByLabel('Başlık', { exact: true })).toHaveValue('Kuşatma');
  await expect(editor(p)).toContainText('Hemen ardından geçilen yazı.');
});

test('yazıp beklemeden sayfa kapanırsa yazı kaybolmaz ve iki kez eklenmez', async ({ page: p }) => {
  const adres = await sahneAc(p);
  const cumle = 'Kapanmadan önceki son cümle.';
  await yaz(p, cumle);
  await p.reload(); // kayıt için beklemeden
  await p.goto(adres);
  await expect(editor(p)).toBeVisible();
  await p.waitForTimeout(1500); // açılıştaki taslak denetimi bitsin
  const kurtar = p.getByRole('button', { name: 'Kurtar' });
  if (await kurtar.isVisible()) await kurtar.click();
  await expect(editor(p)).toContainText(cumle);
  await expect(editor(p)).not.toContainText(cumle + cumle);
  // Kayıtlı yazının eski taslağı "kaydedilmemiş yazı" diye sunulmaz.
  await p.reload();
  await expect(editor(p)).toContainText(cumle);
  await p.waitForTimeout(1500);
  await expect(kurtar).toBeHidden();
});

test('veri bölümü yüklenemezse "Açılıyor…"da kalmaz, yeniden deneme yolu görünür', async ({ page: p }) => {
  await p.route('**/calisan/vt.ts**', (r) => r.abort());
  await p.goto('/');
  await expect(p.getByText('Bu cihazdaki veriler açılamadı')).toBeVisible({ timeout: 15_000 });
  await expect(p.getByRole('button', { name: 'Yeniden dene' })).toBeVisible();
});
