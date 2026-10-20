import { expect, type Page } from '@playwright/test';

/** Boş profilde evren, eser ve sahne oluşturup sahnenin yazma ekranında bırakır; sahnenin adresini döndürür. */
export async function sahneAc(p: Page, sahne = 'Kuşatma'): Promise<string> {
  await p.goto('/');
  await p.getByRole('button', { name: 'Yeni evren', exact: true }).click();
  await p.locator('#yeni-evren-adi').fill('Deneme Evreni');
  await p.getByRole('button', { name: 'Oluştur', exact: true }).click();
  await p.getByPlaceholder('Yeni eserin adı').fill('Kuzey Yolu');
  await p.getByRole('button', { name: 'Eser oluştur', exact: true }).click();
  // Eser oluşturulunca eserin sayfası açılır ve ilk sahnenin adı hemen sorulur (K26).
  await expect(p).toHaveURL(/\/yaz\/./);
  await expect(p.getByPlaceholder('Sahnenin adı', { exact: true })).toBeFocused();
  const eserAdresi = p.url();
  await p.getByPlaceholder('Sahnenin adı', { exact: true }).fill(sahne);
  await p.getByPlaceholder('Sahnenin adı', { exact: true }).press('Enter');
  await expect(p).not.toHaveURL(eserAdresi);
  await expect(editor(p)).toBeVisible();
  return p.url();
}

export const editor = (p: Page) => p.locator('.ProseMirror[aria-label="Metin"]');

/** Editörün sonuna yazar. */
export async function yaz(p: Page, metin: string) {
  await editor(p).click();
  await p.keyboard.press('Control+End');
  await p.keyboard.type(metin);
}

export const kaydedildi = (p: Page) => expect(p.getByText(/^Kaydedildi/)).toBeVisible({ timeout: 15_000 });
