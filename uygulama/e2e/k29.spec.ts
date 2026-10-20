// Kullanım kolaylığı paketinin ikinci kısmı (K29) akışları. Örnek adlar uydurmadır.
import { test, expect } from '@playwright/test';
import { editor, kaydedildi, sahneAc, yaz } from './yardimci';

test('kelime başındaki "@" bağlantı kutusunu açar; kelime içindeki açmaz', async ({ page: p }) => {
  await sahneAc(p);
  const kutu = p.getByRole('dialog', { name: 'Bağlantı' });
  await yaz(p, 'Mektup lale@arsiv adresine gitti. ');
  await expect(kutu).toBeHidden();
  await yaz(p, 'Yolcular @Kuzey');
  await expect(kutu.getByRole('option', { name: /Kuzey Yolu/ }).first()).toBeVisible();
  await p.keyboard.press('Enter');
  await expect(kutu).toBeHidden();
  await expect(editor(p).locator('a, [data-kayit], .baglanti').filter({ hasText: 'Kuzey Yolu' })).toHaveCount(1);
  await expect(editor(p)).toContainText('lale@arsiv');
  await expect(editor(p)).not.toContainText('@Kuzey');
  await kaydedildi(p);
});

test('"@" yazıp Esc: kutu kapanır, işaret düz yazı kalır', async ({ page: p }) => {
  await sahneAc(p);
  await yaz(p, 'Not: @');
  const kutu = p.getByRole('dialog', { name: 'Bağlantı' });
  await expect(kutu).toBeVisible();
  await p.keyboard.press('Escape');
  await expect(kutu).toBeHidden();
  await expect(editor(p)).toContainText('Not: @');
});
