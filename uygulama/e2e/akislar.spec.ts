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
  // Görüntüsüz tarayıcıda kareler geç gelebilir; panel göründüğü an basılan Esc de yakalanmalı.
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
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

test('boş sahnede bağlam paneli kapalı; "Bağlam ekle" açar, seçim yeniden açılışta korunur', async ({ page: p }) => {
  const adres = await sahneAc(p);
  const panel = p.getByRole('complementary', { name: 'Sahnenin bağlamı' });
  await expect(panel).toBeHidden();
  await p.getByRole('button', { name: 'Bağlam ekle' }).click();
  await expect(panel).toBeVisible();
  await expect(panel.getByText('Tarih ve mekân eklediğinizde sahnenin o andaki bağlamı burada görünür.')).toBeVisible();
  await expect(panel.getByText('· bu sahneye kadar kayıt yok')).toBeVisible();
  await p.reload();
  await p.goto(adres);
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'Bağlam panelini kapat' }).click();
  await expect(panel).toBeHidden();
  await p.reload();
  await expect(p.getByRole('button', { name: 'Bağlam ekle' })).toBeVisible();
  await expect(panel).toBeHidden();
});

test('durum özeti açılınca cihaz, Drive ve yedek ayrı satırlarda görünür', async ({ page: p }) => {
  await sahneAc(p);
  const ozet = p.locator('details.durum-ozeti');
  await expect(ozet.locator('summary')).toHaveText('Yalnız bu cihazda kayıtlı');
  await ozet.locator('summary').click();
  await expect(ozet.getByText('Bu cihazda kaydedildi.')).toBeVisible();
  await expect(ozet.getByText(/Drive'a bağlı değil/)).toBeVisible();
  await expect(ozet.getByText('Henüz yedek yok.')).toBeVisible();
  await expect(ozet.getByText('Eşitleme başka cihazlara taşır; yedek, geri dönebileceğiniz ayrı bir kopyadır.')).toBeVisible();
  await ozet.getByRole('link', { name: 'Yedek al' }).click();
  await expect(p).toHaveURL(/\/yedek$/);
});

test('tarihi olan sahnede bağlam paneli kendiliğinden açık; kapatınca "Bağlamı göster"', async ({ page: p }) => {
  await sahneAc(p);
  // Kareler geç gelirken de panel açılır açılmaz yazılan tarih silinmemeli.
  await p.evaluate(() => { window.requestAnimationFrame = () => 0; });
  const panel = p.getByRole('complementary', { name: 'Sahnenin bağlamı' });
  await p.getByRole('button', { name: 'Bağlam ekle' }).click();
  await panel.getByLabel('Evren tarihi', { exact: true }).fill('1200');
  await panel.getByLabel('Evren tarihi', { exact: true }).press('Enter');
  await expect(panel.getByText('Tarih ve mekân eklediğinizde')).toBeHidden();
  await p.evaluate(() => localStorage.removeItem('dunya-atlasi:yazma-baglami-kapali'));
  await p.reload();
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'Bağlam panelini kapat' }).click();
  await expect(p.getByRole('button', { name: 'Bağlamı göster' })).toBeVisible();
});

test('komut paletinden takvim günü hesabı ve yolculuk süresi açılır', async ({ page: p }) => {
  await sahneAc(p);
  await p.keyboard.press('Control+k');
  await p.getByLabel('Kayıt ya da komut ara').fill('takvim günü');
  await p.keyboard.press('Enter');
  const takvim = p.getByRole('dialog', { name: 'Takvim günü hesabı' });
  await takvim.getByLabel('Tarih', { exact: true }).fill('412');
  await takvim.getByLabel('Fark').fill('3 yıl sonra');
  await expect(takvim.getByRole('status')).toHaveText('Yıl 415');
  await takvim.getByText('İki tarih arası').click();
  await takvim.getByLabel('İkinci tarih').fill('414');
  await expect(takvim.getByRole('status')).toHaveText('366–1.094 gün sonra');
  await p.keyboard.press('Escape');
  await expect(takvim).toBeHidden();
  await p.keyboard.press('Control+k');
  await p.getByLabel('Kayıt ya da komut ara').fill('yolculuk');
  await p.keyboard.press('Enter');
  const yol = p.getByRole('dialog', { name: 'Yolculuk süresi' });
  await expect(yol.getByRole('button', { name: 'Hesapla' })).toBeDisabled();
});
