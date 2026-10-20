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

test('evren bu cihazdan kaldırılır; onaydan vazgeçilirse yerinde kalır', async ({ page: p }) => {
  await p.goto('/');
  for (const ad of ['Kalacak Evren', 'Gidecek Evren']) {
    await p.getByRole('button', { name: 'Yeni evren' }).click();
    await p.locator('#yeni-evren-adi').fill(ad);
    await p.getByRole('button', { name: 'Oluştur', exact: true }).click();
    await expect(p).toHaveURL(/#\/e\//);
    await p.goto('/');
  }
  const kartlar = p.locator('button.kart h3');
  await expect(kartlar).toHaveCount(2);
  const kaldir = p.getByRole('button', { name: '“Gidecek Evren” evrenini bu cihazdan kaldır' });
  // Önce vazgeç: hiçbir şey silinmez.
  const [ilk] = await Promise.all([p.waitForEvent('dialog'), kaldir.click()]);
  expect(ilk.message()).toContain('yalnızca bu cihazda');
  expect(ilk.message()).toContain('hiç yedeği yok');
  await ilk.dismiss();
  await expect(kartlar).toHaveCount(2);
  // Yedeği olmayan evren için iki kez sorulur.
  const sorular: string[] = [];
  p.on('dialog', (d) => { sorular.push(d.message()); void d.accept(); });
  await kaldir.click();
  await expect(kartlar).toHaveCount(1);
  expect(sorular).toHaveLength(2);
  await expect(kartlar).toHaveText('Kalacak Evren');
  expect(sorular.at(-1)).toContain('Son kez soruyoruz');
  await p.reload();
  await expect(kartlar).toHaveText('Kalacak Evren');
});

test('yeni evrende "İlk adımlar" yapıldıkça ilerler; gizlenince gizli kalır', async ({ page: p }) => {
  await p.goto('/');
  await p.getByRole('button', { name: 'Yeni evren' }).click();
  await p.locator('#yeni-evren-adi').fill('Adım Evreni');
  await p.getByRole('button', { name: 'Oluştur', exact: true }).click();
  const liste = p.getByRole('region', { name: 'İlk adımlar' });
  await expect(liste).toContainText('0 / 4 tamam');
  await p.getByPlaceholder('Yeni eserin adı').fill('Kuzey Yolu');
  await p.getByRole('button', { name: 'Eser oluştur', exact: true }).click();
  await expect(p).toHaveURL(/\/yaz\/./);
  // Eser oluşturulunca ilk sahnenin adı hemen sorulur; Yaz dışında sıradaki adım üstte görünür.
  await expect(p.getByPlaceholder('Sahnenin adı', { exact: true })).toBeFocused();
  await expect(p.getByRole('status', { name: 'Sıradaki adım' })).toContainText('İlk sahnenizi ekleyin');
  await p.getByRole('link', { name: 'Yaz', exact: true }).click();
  await expect(liste).toContainText('1 / 4 tamam');
  await liste.getByRole('button', { name: 'Yap: İlk sahnenizi ekleyin' }).click();
  await expect(p.getByPlaceholder('Sahnenin adı', { exact: true })).toBeFocused();
  await p.getByPlaceholder('Sahnenin adı', { exact: true }).fill('Kuşatma');
  const eserAdresi = p.url();
  await p.getByPlaceholder('Sahnenin adı', { exact: true }).press('Enter');
  await expect(p).not.toHaveURL(eserAdresi);
  await p.getByRole('link', { name: 'Yaz', exact: true }).click();
  await expect(liste).toContainText('2 / 4 tamam');
  await liste.getByRole('button', { name: 'Gizle' }).click();
  await expect(liste).toBeHidden();
  await p.reload();
  await expect(p.getByRole('heading', { name: 'Yaz' })).toBeVisible();
  await expect(liste).toBeHidden();
});

test('yazarlık rehberi sayfa rehberinden ve komut paletinden açılır, Esc ile kapanır', async ({ page: p }) => {
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await sahneAc(p);
  await p.getByRole('button', { name: 'Bu sayfa ne işe yarar?' }).click();
  await p.getByRole('link', { name: 'Yazarlık rehberinin bütün konuları' }).click();
  const rehber = p.getByRole('complementary', { name: 'Yazarlık rehberi' });
  await expect(rehber).toBeVisible();
  await rehber.getByRole('link', { name: 'Sahnede amaç, engel, sonuç' }).click();
  await expect(rehber.getByRole('heading', { name: 'Sahnede amaç, engel, sonuç' })).toBeVisible();
  await rehber.getByText('Ayrıntı ve örnekler').click();
  await expect(rehber.getByRole('heading', { name: 'Yanıltıcı örnek' })).toBeVisible();
  await p.keyboard.press('Escape');
  await expect(rehber).toBeHidden();
  await p.keyboard.press('Control+k');
  await p.getByLabel('Kayıt ya da komut ara').fill('hikâyenin çekirdeği');
  await p.keyboard.press('Enter');
  await expect(rehber.getByRole('heading', { name: 'Hikâyenin çekirdeği (tek cümlelik özet)' })).toBeVisible();
});

test('sahne planı bağlam panelinde katlı; cevap kaydedilir ve yeniden açınca yerinde', async ({ page: p }) => {
  const adres = await sahneAc(p);
  await p.getByRole('button', { name: 'Bağlam ekle' }).click();
  const plan = p.locator('.sahne-plani');
  await expect(plan.getByLabel('Kim ne istiyor?')).toBeHidden();
  await plan.locator('summary').click();
  const alan = plan.locator('textarea').first();
  await alan.fill('Lale dosyayı arıyor.');
  await alan.blur();
  await expect(plan.locator('summary')).toContainText('Lale dosyayı arıyor.');
  await p.goto('/');
  await p.goto(adres);
  await p.locator('.sahne-plani summary').click();
  await expect(p.locator('.sahne-plani textarea').first()).toHaveValue('Lale dosyayı arıyor.');
});

test('İlk adımlarda yol seçilir; "Geç" adımı yapılmış saymaz; seçim yeniden açılışta korunur', async ({ page: p }) => {
  await p.goto('/');
  await p.getByRole('button', { name: 'Yeni evren' }).click();
  await p.locator('#yeni-evren-adi').fill('Yol Evreni');
  await p.getByRole('button', { name: 'Oluştur', exact: true }).click();
  const liste = p.getByRole('region', { name: 'İlk adımlar' });
  await liste.getByLabel('Bir dünyayla').check();
  await expect(liste).toContainText('Dünyanızın kuralını yazın');
  await liste.locator('li').nth(1).getByRole('button', { name: 'Geç' }).click();
  await expect(liste.locator('li').nth(1)).toContainText('Geçildi');
  await expect(liste).toContainText('0 / 4 tamam');
  await p.reload();
  await expect(liste.getByLabel('Bir dünyayla')).toBeChecked();
  await expect(liste.locator('li').nth(1)).toContainText('Geçildi');
  await liste.getByLabel('Bir sahneyle').check();
  await expect(liste).toContainText('Bir eser oluşturun');
});

test('seri: yazma ağacında serinin altında kitaplar; seriden çıkarılan kitap silinmez', async ({ page: p }) => {
  await sahneAc(p);
  await p.getByRole('button', { name: '+ Yeni seri' }).click();
  await p.getByPlaceholder('Serinin adı').fill('Hatıra İmparatorluğu');
  await p.getByPlaceholder('Serinin adı').press('Enter');
  await expect(p.getByRole('heading', { name: 'Kitaplar' })).toBeVisible();
  await expect(p.getByText('Serinin büyük sorusu ne?')).toBeVisible();
  await p.getByLabel('Seriye kitap ekle').selectOption({ label: 'Kuzey Yolu' });
  const kitaplar = p.getByRole('region', { name: 'Serinin kitapları' });
  await expect(kitaplar.getByRole('link', { name: 'Kuzey Yolu' })).toBeVisible();
  await p.getByRole('link', { name: 'Yaz', exact: true }).click();
  await expect(p.locator('.agac-seri .agac-eser-ad', { hasText: 'Kuzey Yolu' })).toBeVisible();
  await p.locator('.agac-seri-ad').click();
  await kitaplar.getByRole('button', { name: 'Kuzey Yolu: seriden çıkar' }).click();
  await expect(kitaplar).toContainText('Bu seride henüz kitap yok.');
  await p.getByRole('link', { name: 'Yaz', exact: true }).click();
  await expect(p.locator('.eser-agaci > .agac-eser .agac-eser-ad', { hasText: 'Kuzey Yolu' })).toBeVisible();
});

test('eser sayfasında odak karakter eklenir, bu kitaptaki yolu yazılır; seri tablosunda görünür', async ({ page: p }) => {
  await sahneAc(p);
  await p.keyboard.press('Control+k');
  await p.getByLabel('Kayıt ya da komut ara').fill('Lale');
  await p.getByText('Yeni kayıt: “Lale”').click();
  await p.getByRole('option', { name: /^Karakter/ }).first().click();
  await expect(p.getByRole('textbox', { name: 'Ad' })).toHaveValue('Lale');
  await p.getByRole('link', { name: 'Yaz', exact: true }).click();
  await p.getByRole('button', { name: '+ Yeni seri' }).click();
  await p.getByPlaceholder('Serinin adı').fill('Hatıra İmparatorluğu');
  await p.getByPlaceholder('Serinin adı').press('Enter');
  await p.getByLabel('Seriye kitap ekle').selectOption({ label: 'Kuzey Yolu' });
  await p.getByRole('region', { name: 'Serinin kitapları' }).getByRole('link', { name: 'Kuzey Yolu' }).click();
  const odak = p.getByRole('region', { name: 'Odak karakterler' });
  await odak.getByLabel('Odak karakter ekle').selectOption({ label: 'Lale' });
  await odak.locator('summary', { hasText: 'Lale' }).click();
  await odak.getByLabel('Kitabın başında ne istiyor?').fill('Kardeşini bulmak.');
  await odak.getByLabel('Kitabın başında ne istiyor?').blur();
  await expect(odak.locator('summary')).toContainText('Kardeşini bulmak.');
  await expect(odak.getByRole('button', { name: 'Yeni kayıtla cevapla' })).toHaveCount(0);
  await p.getByRole('link', { name: 'Hatıra İmparatorluğu' }).first().click();
  await expect(p.getByRole('region', { name: 'Karakterlerin yolu' })).toContainText('başta: Kardeşini bulmak.');
});

test('olay örgüsü masası: boş sahne eklenir, dönüm noktası işaretlenir, taşınır ve taşıma geri alınır', async ({ page: p }) => {
  const adres = await sahneAc(p);
  const evren = adres.match(/#\/e\/([^/]+)/)![1];
  await p.goto(`/#/e/${evren}/orgu`);
  const tablo = p.locator('.orgu-tablosu');
  await expect(tablo.getByRole('button', { name: 'Kuşatma' })).toBeVisible();
  await p.getByLabel('Yeni sahnenin adı').fill('Liman');
  await p.getByRole('button', { name: '+ Sona boş sahne' }).click();
  await expect(tablo.locator('thead tr').nth(1).getByRole('button')).toHaveText(['Kuşatma', 'Liman']);
  // Yeni sahne seçili gelir.
  await expect(tablo.getByRole('button', { name: 'Liman' })).toHaveAttribute('aria-pressed', 'true');
  const secili = p.locator('.orgu-secili');
  await expect(secili).toContainText('metni yok (plan sahnesi)');
  await secili.getByRole('button', { name: 'Dönüm noktası olarak işaretle' }).click();
  await expect(tablo.locator('tr', { hasText: 'Dönüm noktaları' }).locator('td').nth(1)).toContainText('dönüm');
  await secili.getByRole('button', { name: '← Bir öne' }).click();
  await expect(tablo.locator('thead tr').nth(1).getByRole('button')).toHaveText(['Liman', 'Kuşatma']);
  await expect(p.locator('.orgu-ozet')).toContainText('“Liman” 2. sahneden 1. sahneye geçti.');
  await p.getByRole('button', { name: 'Taşımayı geri al' }).click();
  await expect(tablo.locator('thead tr').nth(1).getByRole('button')).toHaveText(['Kuşatma', 'Liman']);
});

test('seri planı: olası finaller birbirinin alternatifi; okuma yolu kurulur ve kitaplar sıralanır', async ({ page: p }) => {
  await sahneAc(p);
  await p.getByRole('button', { name: '+ Yeni seri' }).click();
  await p.getByPlaceholder('Serinin adı').fill('Hatıra İmparatorluğu');
  await p.getByPlaceholder('Serinin adı').press('Enter');
  await p.getByLabel('Seriye kitap ekle').selectOption({ label: 'Kuzey Yolu' });
  await p.locator('.seri-finaller > summary').click();
  for (const ad of ['Anı vergisi kaldırılır', 'Vergi halka devredilir']) {
    await p.getByLabel('Olası finalin adı').fill(ad);
    await p.getByRole('button', { name: '+ Olası final' }).click();
    await expect(p.locator('.seri-finaller li', { hasText: ad })).toBeVisible();
  }
  await expect(p.locator('.seri-finaller summary')).toContainText('Olası finaller (2 · seçilmedi)');
  await expect(p.locator('.seri-finaller li').first()).toContainText('Fikir');
  await p.locator('.seri-yollar > summary').click();
  await p.getByRole('button', { name: '+ Okuma yolu' }).click();
  const yol = p.locator('.okuma-yolu');
  await expect(yol.getByRole('link', { name: 'Kuzey Yolu' })).toBeVisible();
  await yol.getByLabel('Okuma yolunun adı').fill('Yayın sırası');
  await yol.getByLabel('Okuma yolunun adı').press('Enter');
  await expect(p.locator('.seri-yollar summary')).toContainText('Okuma yolları (1)');
  await p.reload();
  await expect(p.getByLabel('Okuma yolunun adı')).toHaveValue('Yayın sırası');
});

test('kayıt sayfasında boş alanlar gizli; "+" düğmesiyle açılır', async ({ page: p }) => {
  await sahneAc(p);
  await p.keyboard.press('Control+k');
  await p.getByLabel('Kayıt ya da komut ara').fill('Lale');
  await p.getByText('Yeni kayıt: “Lale”').click();
  await p.getByRole('option', { name: /^Karakter/ }).first().click();
  await expect(p.getByRole('textbox', { name: 'Ad' })).toHaveValue('Lale');
  const main = p.locator('main');
  await expect(main.locator('.alan-adi', { hasText: 'Ölüm tarihi' })).toHaveCount(0);
  await expect(main.getByRole('heading', { name: 'İlişkiler' })).toHaveCount(0);
  await main.getByRole('button', { name: '+ Ölüm tarihi' }).click();
  await expect(main.locator('.alan-adi', { hasText: 'Ölüm tarihi' })).toBeVisible();
  await expect(main.getByRole('button', { name: '+ Ölüm tarihi' })).toHaveCount(0);
  await main.getByRole('button', { name: '+ Okunuş, başka adlar, etiketler' }).click();
  await expect(main.getByRole('textbox', { name: 'Okunuş' })).toBeVisible();
  await main.getByRole('button', { name: '+ İlişki' }).click();
  await expect(main.getByRole('heading', { name: 'İlişkiler' })).toBeVisible();
  await expect(main.getByRole('button', { name: '+ Görsel' })).toBeVisible();
});

test('İlk adımlarda "Yap" işin yerine götürür: sıradaki adım satırından metne ve bağlam paneline', async ({ page: p }) => {
  await sahneAc(p);
  const satir = p.getByRole('status', { name: 'Sıradaki adım' });
  await expect(satir).toContainText('Metinde bir adı [[ ile bağlayın');
  await satir.getByRole('button', { name: 'Yap' }).click();
  await expect(editor(p)).toBeFocused();
  await satir.getByRole('button', { name: 'Geç' }).click();
  await expect(satir).toContainText('Sahneye bir tarih ya da mekân verin');
  await satir.getByRole('button', { name: 'Yap' }).click();
  await expect(p.getByRole('complementary', { name: 'Sahnenin bağlamı' })).toBeVisible();
  await expect(p.locator('.yaz-baglami input').first()).toBeFocused();
  // Yol değişince Yap başka yere götürür: dünya yolunda Genel bakıştaki Dünya Pusulası sorusuna.
  await p.getByRole('link', { name: 'Yaz', exact: true }).click();
  const liste = p.getByRole('region', { name: 'İlk adımlar' });
  await liste.getByLabel('Bir dünyayla').check();
  await liste.getByRole('button', { name: 'Yap: Dünyanızın kuralını yazın' }).click();
  await expect(p.getByRole('textbox', { name: 'Hangi kural kırılırsa her şey değişir?' })).toBeFocused();
});

test('İlk adımlar karakter yolu: "Yap" komut paletini açar, sonra karakterin sorusuna götürür', async ({ page: p }) => {
  await p.goto('/');
  await p.getByRole('button', { name: 'Yeni evren' }).click();
  await p.locator('#yeni-evren-adi').fill('Adım Evreni');
  await p.getByRole('button', { name: 'Oluştur', exact: true }).click();
  const liste = p.getByRole('region', { name: 'İlk adımlar' });
  await liste.getByLabel('Bir karakterle').check();
  await liste.getByRole('button', { name: 'Yap: Bir karakter oluşturun' }).click();
  await p.getByLabel('Kayıt ya da komut ara').fill('Lale');
  await p.getByText('Yeni kayıt: “Lale”').click();
  await p.getByRole('option', { name: /^Karakter/ }).first().click();
  await expect(p.getByRole('textbox', { name: 'Ad' })).toHaveValue('Lale');
  const satir = p.getByRole('status', { name: 'Sıradaki adım' });
  await expect(satir).toContainText('Karakter en çok ne istiyor?');
  await satir.getByRole('button', { name: 'Yap' }).click();
  await expect(p.getByRole('textbox', { name: 'En çok ne istiyor?' })).toBeFocused();
});
