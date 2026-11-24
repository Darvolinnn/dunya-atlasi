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
