import { expect, type Page } from '@playwright/test';

/** Boş profilde evren, eser ve sahne oluşturup sahnenin yazma ekranında bırakır; sahnenin adresini döndürür. */
export async function sahneAc(p: Page, sahne = 'Kuşatma', kok = '/'): Promise<string> {
  await p.goto(kok);
  await p.getByRole('button', { name: 'Yeni evren', exact: true }).click();
  await p.locator('#yeni-evren-adi').fill('Deneme Evreni');
  await bosEvrenTam(p);
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

/** Yeni evren formunu "Boş evren olarak aç" ile bitirir ve Tam kipe geçer (K43): sınamalar bütün araçları görür. */
export async function bosEvrenTam(p: Page) {
  await p.getByRole('button', { name: 'Boş evren olarak aç', exact: true }).click();
  await p.getByRole('radio', { name: 'Tam', exact: true }).click();
}
