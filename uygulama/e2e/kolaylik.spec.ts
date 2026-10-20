// Kullanım kolaylığı paketi (K28) akışları. Örnek adlar uydurmadır.
import { test, expect } from '@playwright/test';
import { editor, kaydedildi, sahneAc, yaz } from './yardimci';

test('boş sahnede başlama yardımı; yazınca kaybolur, kelime sayacı artar', async ({ page: p }) => {
  await sahneAc(p);
  const yardim = p.locator('.bos-yardim');
  await expect(yardim).toBeVisible();
  await expect(yardim).toContainText('Kim ne istiyor?');
  await yaz(p, 'Lale arşivin kapısını itti.');
  await expect(yardim).toBeHidden();
  await expect(p.locator('.kelime-sayaci')).toContainText('Bu sahne 4 kelime');
  await expect(p.locator('.kelime-sayaci')).toContainText('bugün +4');
  await kaydedildi(p);
});

test('odak kipi Ctrl+Shift+F ile açılır, Esc ile kapanır; gezinti gizlenir', async ({ page: p }) => {
  await sahneAc(p);
  await editor(p).click();
  await p.keyboard.press('Control+Shift+F');
  await expect(p.locator('html.odak-kipi')).toHaveCount(1);
  await expect(p.locator('nav.gezinti')).toBeHidden();
  await p.keyboard.press('Escape');
  await expect(p.locator('html.odak-kipi')).toHaveCount(0);
  await expect(p.locator('nav.gezinti')).toBeVisible();
  await p.getByRole('button', { name: 'Odak', exact: true }).click();
  await expect(p.locator('html.odak-kipi')).toHaveCount(1);
});

test('"?" kısayol listesini açar; palette kayıt türü ve kısayol görünür', async ({ page: p }) => {
  await sahneAc(p);
  await p.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await p.keyboard.press('?');
  const liste = p.getByRole('dialog', { name: 'Kısayollar' });
  await expect(liste).toBeVisible();
  await expect(liste).toContainText('Ctrl+Shift+F');
  await p.keyboard.press('Escape');
  await expect(liste).toBeHidden();
  await p.keyboard.press('Control+K');
  await p.keyboard.type('hızlı not');
  await expect(p.locator('.palet-tus').filter({ hasText: 'Alt+N' })).toBeVisible();
});

test('yeni evrende "Ne yazıyorsunuz?" seçilir; uzak türler en sona katlanır', async ({ page: p }) => {
  await p.goto('/');
  await p.getByRole('button', { name: 'Yeni evren', exact: true }).click();
  await p.locator('#yeni-evren-adi').fill('Çağdaş Deneme');
  await p.getByRole('radio', { name: /Gerçekçi/ }).click();
  await p.getByRole('button', { name: 'Oluştur', exact: true }).click();
  await expect(p).toHaveURL(/#\/e\//);
  await p.locator('nav.gezinti a[href$="/kayitlar"]').click();
  // Boş sayfanın düğmesi sayfanın kendi girdisine götürür.
  await p.getByRole('button', { name: 'Kayıt ekle', exact: true }).click();
  await expect(p.getByPlaceholder('Yeni kaydın adı')).toBeFocused();
  const uzak = p.locator('optgroup[label="Diğer türler (kurgunuza uzak)"]').first();
  await expect(uzak.locator('option', { hasText: 'Büyü sistemi' })).toHaveCount(1);
});

test('program koyu temayla açılır; Görünüm ayarı açık temaya geçirir ve hatırlar', async ({ page: p }) => {
  await p.goto('/');
  await expect(p.locator('html')).toHaveAttribute('data-tema', 'koyu');
  await p.getByRole('link', { name: 'Eşitleme ve cihazlar' }).click();
  await p.getByRole('radio', { name: 'Açık' }).check();
  await expect(p.locator('html')).toHaveAttribute('data-tema', 'acik');
  await p.reload();
  await expect(p.locator('html')).toHaveAttribute('data-tema', 'acik');
  await p.getByRole('radio', { name: 'Cihazın ayarı' }).check();
  await expect(p.locator('html')).not.toHaveAttribute('data-tema', /./);
});

test('Genel bakışta kaldığınız yerin altında son çalışmanın özeti', async ({ page: p }) => {
  await sahneAc(p, 'Arşiv');
  await yaz(p, 'Lale arşivin kapısını itti.');
  await kaydedildi(p);
  await p.locator('nav.gezinti a[href$="/masa"]').first().click();
  const ozet = p.getByRole('region', { name: 'Son çalışmanız' });
  await expect(ozet).toContainText('Metnini yazdığınız: Arşiv');
  await expect(p.getByRole('region', { name: 'Kaldığınız yer' }).getByRole('region', { name: 'Son çalışmanız' })).toHaveCount(1);
  await ozet.getByRole('link', { name: 'Arşiv' }).click();
  await expect(p).toHaveURL(/\/yaz\//);
});

test('örnek evren ayrı bir evren olarak açılır; kitaplar, sahneler ve harita dolu', async ({ page: p }) => {
  await p.goto('/');
  await p.getByRole('button', { name: 'Örnek evreni aç' }).click();
  await expect(p).toHaveURL(/#\/e\//, { timeout: 20_000 });
  await expect(p.getByRole('heading', { name: 'Unutulanlar' })).toBeVisible();
  await p.locator('nav.gezinti a[href$="/haritalar"]').click();
  await expect(p.getByText('Başkent planı').first()).toBeVisible();
  await p.goto('/');
  await expect(p.getByRole('button', { name: 'Örnek evreni aç' })).toHaveCount(0);
  await expect(p.getByRole('heading', { name: 'Hatıra İmparatorluğu (örnek)' })).toBeVisible();
});
