// Windows uygulamasında bu bilgisayardaki günlük yedekler (K31): kabuk (Tauri) sayfada sahte bir nesneyle taklit edilir;
// dosyalar sayfanın belleğindeki bir klasörde durur. Veri bölümü kabuğa gerçek programdaki yoldan (istemci üzerinden)
// ulaşır. Örnek adlar uydurmadır.
import { test, expect, type Page } from '@playwright/test';

async function kabukla(p: Page) {
  await p.addInitScript(() => {
    const dosyalar = new Map<string, Uint8Array>();
    const w = window as unknown as Record<string, unknown>;
    w.__sahteKlasor = dosyalar;
    w.__acilanKlasor = 0;
    const yol = (alt: string, ad: string) => (alt ? `${alt}/${ad}` : ad);
    w.__TAURI_INTERNALS__ = {
      async invoke(komut: string, arg: Record<string, string> | Uint8Array, secenek?: { headers?: Record<string, string> }) {
        const a = arg as Record<string, string>;
        switch (komut) {
          case 'google_izin': return null; // saklı Google bağlantısı yok
          case 'google_cikis': return null;
          case 'yerel_yedek_yeri': return 'C:\\Users\\Yazar\\Documents\\Dünya Atlası yedekleri';
          case 'yerel_yedek_klasoru_ac': w.__acilanKlasor = (w.__acilanKlasor as number) + 1; return null;
          case 'yerel_yedek_listele':
            return [...dosyalar].filter(([y]) => (a.alt ? y.startsWith(`${a.alt}/`) : !y.includes('/')))
              .map(([y, v]) => ({ ad: a.alt ? y.slice(a.alt.length + 1) : y, boy: v.byteLength }));
          case 'yerel_yedek_oku': {
            const v = dosyalar.get(yol(a.alt, a.ad));
            if (!v) throw 'Yedek dosyası okunamadı: dosya bulunamadı.';
            return v.slice().buffer;
          }
          case 'yerel_yedek_yaz': {
            const h = secenek!.headers!;
            dosyalar.set(yol(decodeURIComponent(h.alt), decodeURIComponent(h.ad)), new Uint8Array(arg as Uint8Array));
            return null;
          }
          case 'yerel_yedek_sil': dosyalar.delete(yol(a.alt, a.ad)); return null;
        }
        throw `Command ${komut} not found`;
      },
    };
  });
}

const klasordekiler = (p: Page) => p.evaluate(() => [...(window as unknown as { __sahteKlasor: Map<string, Uint8Array> }).__sahteKlasor.keys()].sort());

test('Windows uygulamasında Yedek sekmesinde bu bilgisayardaki yedekler: yedek alınır, doğrulanır, ayrı evren olarak açılır', async ({ page: p }) => {
  await kabukla(p);
  await p.goto('/');
  await p.getByRole('button', { name: 'Yeni evren', exact: true }).click();
  await p.locator('#yeni-evren-adi').fill('Sisli Kıyı');
  await p.getByRole('button', { name: 'Oluştur', exact: true }).click();
  await expect(p).toHaveURL(/#\/e\//);
  const evren = /#\/e\/([^/]+)/.exec(p.url())![1];
  await p.goto(`/#/e/${evren}/yedek`);

  const kart = p.locator('.kart', { has: p.getByRole('heading', { name: 'Bu bilgisayardaki yedekler' }) });
  await expect(kart).toBeVisible();
  await expect(kart.getByRole('checkbox', { name: 'Her gün kendiliğinden yedek al' })).toBeChecked();
  await kart.getByRole('button', { name: 'Şimdi yedekle' }).click();
  await expect(kart.getByText('geri okunup doğrulandı')).toBeVisible();
  const dosyalar = await klasordekiler(p);
  expect(dosyalar.filter((d) => d.endsWith('.zip'))).toEqual([expect.stringMatching(/^sisli-kiyi-yedek-\d{4}-\d{2}-\d{2}\.zip$/)]);
  expect(dosyalar).toContain('yedek-listesi.json');

  await kart.getByRole('button', { name: 'Klasörü aç' }).click();
  await expect.poll(() => p.evaluate(() => (window as unknown as { __acilanKlasor: number }).__acilanKlasor)).toBe(1);

  // Günlük yedek kapatılıp açılabilir.
  await kart.getByRole('checkbox').uncheck();
  await expect(kart.getByText('Bu evren için günlük yedek kapalı')).toBeVisible();
  await kart.getByRole('checkbox').check();
  await expect(kart.getByText('Bu evren için günlük yedek kapalı')).toHaveCount(0);

  await kart.getByRole('button', { name: 'Ayrı evren olarak aç' }).click();
  await expect(kart.getByText('Yedek ayrı bir evren olarak açıldı')).toBeVisible();
  await kart.getByRole('button', { name: 'Evreni aç' }).click();
  await p.goto('/');
  await expect(p.locator('button.kart h3')).toHaveCount(2);
  await expect(p.locator('button.kart h3').filter({ hasText: 'yedekten' })).toHaveCount(1);

  // Evrenler sayfasındaki "Yedekten geri yükle" kutusu klasörü söyler.
  await p.getByRole('button', { name: 'Yedekten geri yükle' }).click();
  await expect(p.getByText('Belgeler › Dünya Atlası yedekleri klasöründedir')).toBeVisible();
});

test('tarayıcıda bu bilgisayardaki yedekler kartı görünmez', async ({ page: p }) => {
  await p.goto('/');
  await p.getByRole('button', { name: 'Yeni evren', exact: true }).click();
  await p.locator('#yeni-evren-adi').fill('Sisli Kıyı');
  await p.getByRole('button', { name: 'Oluştur', exact: true }).click();
  await expect(p).toHaveURL(/#\/e\//);
  const evren = /#\/e\/([^/]+)/.exec(p.url())![1];
  await p.goto(`/#/e/${evren}/yedek`);
  await expect(p.getByRole('heading', { name: 'Dosyaya tam yedek' })).toBeVisible();
  await expect(p.getByRole('heading', { name: 'Bu bilgisayardaki yedekler' })).toHaveCount(0);
  await p.goto('/');
  await p.getByRole('button', { name: 'Yedekten geri yükle' }).click();
  await expect(p.getByText('Belgeler › Dünya Atlası yedekleri klasöründedir')).toHaveCount(0);
});
