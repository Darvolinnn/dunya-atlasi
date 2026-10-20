// Arayüz taslakları (yazma ekranı 1A+1C, ağ 2A+2B, zaman çizelgesi 3A+3B, harita 4A+4B) örnek evrende.
import { test, expect } from '@playwright/test';

test('yazma, ağ, zaman çizelgesi ve harita yeni düzenleriyle açılır', async ({ page: p }) => {
  test.setTimeout(120_000);
  await p.goto('/');
  await p.getByRole('button', { name: 'Örnek evreni aç' }).click();
  await expect(p.getByRole('heading', { name: 'Unutulanlar' })).toBeVisible({ timeout: 40_000 });
  const ev = /#\/e\/([^/]+)/.exec(p.url())![1];
  for (const ad of ['Bir daha gösterme', 'Gizle']) { const d = p.getByRole('button', { name: ad }); if (await d.count()) await d.first().click(); }

  // Yazma: üstte tek satır; seyrek işler "Sahne ⋯" menüsünde; bağlam sekmeli, özet kartı "Düzenle" ile açılır.
  await p.locator('nav a', { hasText: /^Arşiv$/ }).first().click();
  // Açık sahnenin eseri ve bölümü açık, öbür eserler katlı.
  await expect(p.getByRole('button', { name: 'Hatırlayanlar: aç' })).toHaveAttribute('aria-expanded', 'false');
  await expect(p.getByRole('button', { name: 'Çöp kutusuna taşı' })).toBeHidden();
  await p.locator('.islem-menusu summary').click();
  await expect(p.getByRole('link', { name: 'Bütün alanlar' })).toBeVisible();
  await expect(p.getByRole('button', { name: 'Çöp kutusuna taşı' })).toBeVisible();
  await p.keyboard.press('Escape');
  await expect(p.getByRole('button', { name: 'Çöp kutusuna taşı' })).toBeHidden();
  const panel = p.getByRole('complementary', { name: 'Sahnenin bağlamı' });
  const ozet = panel.getByRole('region', { name: 'Bu sahne' });
  await expect(ozet).toContainText('Sonbahar 412');
  await expect(ozet).toContainText('Başkent Arşivi');
  await expect(ozet.getByLabel('Evren tarihi', { exact: true })).toHaveCount(0);
  await ozet.getByRole('button', { name: 'Düzenle' }).click();
  await expect(ozet.getByLabel('Evren tarihi', { exact: true })).toHaveValue('Sonbahar 412');
  await panel.getByRole('tab', { name: 'Bilgi' }).click();
  await expect(panel).toContainText('Lale bu anda ne biliyor?');
  await panel.getByRole('tab', { name: 'Bağlam' }).click();

  // Ağ: odak halkası, bağ türleri çiplerle gizlenir, yanda liste; "Tablo" kim kimin nesi.
  await p.goto(`/#/e/${ev}/kayitlar`);
  await p.getByRole('link', { name: /^Deniz Karakter/ }).first().click();
  await p.waitForURL(/\/k\//);
  const deniz = /\/k\/([^/?]+)/.exec(p.url())![1];
  await p.goto(`/#/e/${ev}/ag/${deniz}`);
  const liste = p.getByRole('complementary', { name: 'Liste olarak' });
  await expect(liste).toContainText('Orhun');
  await expect(p.getByRole('button', { name: 'Orhun, Karakter' })).toBeVisible();
  await p.getByRole('button', { name: 'Düşmanlık' }).click();
  await expect(p.getByRole('button', { name: 'Orhun, Karakter' })).toHaveCount(0);
  await p.getByRole('button', { name: 'Düşmanlık' }).click();
  await p.getByRole('button', { name: 'Lale, Karakter' }).click();
  await expect(liste.getByRole('status')).toContainText('Lale');
  await p.getByRole('button', { name: 'Tablo', exact: true }).click();
  await expect(p.getByRole('heading', { name: 'Kim kimin nesi?' })).toBeVisible();
  await p.getByRole('button', { name: 'Orhun, Deniz kaydının düşmanı' }).click();
  await expect(p.locator('.secili-bag')).toContainText('Orhun');
  await p.getByRole('button', { name: 'Çizim', exact: true }).click();

  // Zaman çizelgesi: eserler kendi şeridinde, uzun boşluk "≈" ile kısalır; tarih defteri yıl yıl akar.
  await p.goto(`/#/e/${ev}/cizelge`);
  const cizim = p.getByRole('region', { name: 'Zaman çizelgesi çizimi' });
  await expect(cizim).toContainText('Olaylar');
  await expect(cizim).toContainText('Unutulanlar');
  await expect(cizim.locator('.cizelge-kirik')).not.toHaveCount(0);
  await expect(cizim.getByRole('link', { name: /^Arşiv · Sahne/ })).toBeVisible();
  await p.getByRole('button', { name: 'Tarih defteri' }).click();
  await expect(p.getByRole('list', { name: 'Tarih defteri' })).toContainText('yıl kayıt yok');
  await expect(p.getByRole('list', { name: 'Tarih defteri' })).toContainText('4 sahne');
  await p.getByRole('button', { name: 'Çizelge' }).click();

  // Harita: araçlar solda yazılı; bir yer seçilince yer kartı; künye sekmesinde haritayı kaldırma.
  await p.goto(`/#/e/${ev}/haritalar`);
  await p.getByText('Başkent planı').first().click();
  const araclar = p.getByRole('toolbar', { name: 'Harita araçları' });
  await expect(araclar.getByRole('button', { name: 'Kesin yer' })).toBeVisible();
  await expect(araclar.getByRole('button', { name: 'Gez ve seç' })).toHaveAttribute('aria-pressed', 'true');
  await p.getByRole('button', { name: /^Başkent Arşivi \(kesin/ }).click();
  const kart = p.getByRole('region', { name: 'Seçili yer' });
  await expect(kart).toContainText('Burada geçenler');
  await expect(kart).toContainText('Arşiv');
  await kart.locator('xpath=..').getByRole('button', { name: 'Seçimi kaldır' }).click();
  await p.getByRole('tab', { name: 'Künye' }).click();
  await expect(p.getByRole('button', { name: 'Haritayı kaldır' })).toBeVisible();
  await expect(p.getByLabel('Lejant')).toContainText('Kesin yer');
});
