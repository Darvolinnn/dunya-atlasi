// İkinci öneri raporu (K39). Örnek metin uydurmadır.
import { test, expect } from '@playwright/test';
import { editor, sahneAc } from './yardimci';

test('"-- " uzun çizgiye döner; hemen Geri silme tuşu geri çevirir; "---" dokunulmaz', async ({ page: p }) => {
  await sahneAc(p);
  await editor(p).focus();
  await p.keyboard.type('Elin -- geldi');
  await expect(editor(p)).toContainText('Elin — geldi');
  await p.keyboard.press('Enter');
  await p.keyboard.type('Velkar -- ');
  await p.keyboard.press('Backspace');
  await p.keyboard.type('x');
  await expect(editor(p)).toContainText('Velkar -- x');
  await p.keyboard.press('Enter');
  await p.keyboard.type('a --- b');
  await expect(editor(p)).toContainText('a --- b');
});

test('uzun parça silinince çekmeceye düşer ve imlece geri konur; kısa silme düşmez', async ({ page: p }) => {
  await sahneAc(p);
  await editor(p).focus();
  await p.keyboard.type('Lale dosya dolabının çekmecesini kendisi açtı ve satırın boş olduğunu gördü.');
  await p.keyboard.press('Enter');
  await p.keyboard.type('Kısa söz.');
  await p.keyboard.press('Shift+Home');
  await p.keyboard.press('Backspace');
  await p.waitForTimeout(500);
  await p.getByLabel('Sahne işlemleri').click();
  await p.getByRole('button', { name: 'Kesilen parçalar' }).click();
  const kutu = p.getByRole('list', { name: 'Kesilen parçalar' });
  await expect(kutu).toContainText('Bu sahneden kesilen parça yok');
  await editor(p).focus();
  await p.keyboard.press('Control+a');
  await p.keyboard.press('Backspace');
  await expect(editor(p)).not.toContainText('dolabının');
  await expect(kutu.getByRole('listitem')).toHaveCount(1);
  await p.getByRole('button', { name: 'İmlece ekle' }).click();
  await expect(editor(p)).toContainText('Lale dosya dolabının çekmecesini kendisi açtı');
});
