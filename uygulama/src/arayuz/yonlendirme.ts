// "İlk adımlar"daki "Yap" düğmeleri (K26): kullanıcıyı işin yapılacağı yere götürür ve oradaki kutuyu açar ya da
// imleci oraya koyar. Sayfa çizilene kadar kısa bir süre bekler; öğe bulunamazsa sessizce durur (yalnız kolaylıktır).
import { git } from './Uygulama';

export type Eylem =
  /** Seçiciye uyan öğeye odaklanır (kapalı `<details>` içindeyse önce açar). */
  | { odak: string }
  /** Seçiciye uyan öğeye tıklar. */
  | { tikla: string }
  /** Yazısı verilenlerden birine eşit olan düğmeye tıklar; `yoksaGec` ise kısa bekler ve bulamazsa sonrakine geçer. */
  | { dugme: string[]; yoksaGec?: boolean }
  /** Seçici görününce pencereye bir olay gönderir. */
  | { bekle: string; olay: string; detay?: unknown };

const BEKLEME = 4000;

function bul(f: () => HTMLElement | null, sure = BEKLEME): Promise<HTMLElement | null> {
  return new Promise((ok) => {
    const bas = Date.now();
    const dene = () => {
      const x = f();
      if (x || Date.now() - bas > sure) ok(x);
      else setTimeout(dene, 80);
    };
    dene();
  });
}

function ac(x: HTMLElement) {
  for (let d = x.closest('details'); d; d = d.parentElement?.closest('details') ?? null) d.open = true;
  x.scrollIntoView({ block: 'center' });
}

export async function gitVeYap(adres: string | null, eylemler: Eylem[]) {
  if (adres && location.hash !== `#${adres}`) {
    git(adres);
    // Eski sayfanın öğeleri yenisi çizilmeden eşleşmesin.
    await new Promise((ok) => setTimeout(ok, 150));
  }
  for (const e of eylemler) {
    if ('odak' in e) {
      const x = await bul(() => document.querySelector<HTMLElement>(e.odak));
      if (!x) return;
      ac(x); x.focus();
    } else if ('tikla' in e) {
      const x = await bul(() => document.querySelector<HTMLElement>(e.tikla));
      if (!x) return;
      ac(x); x.click();
    } else if ('dugme' in e) {
      const x = await bul(() => [...document.querySelectorAll<HTMLElement>('main button, .yaz-baglami button')].find((b) => e.dugme.includes(b.textContent?.trim() ?? '')) ?? null, e.yoksaGec ? 1200 : BEKLEME);
      if (!x) { if (e.yoksaGec) continue; return; }
      ac(x); x.click();
    } else {
      if (!(await bul(() => document.querySelector<HTMLElement>(e.bekle)))) return;
      window.dispatchEvent(new CustomEvent(e.olay, { detail: e.detay }));
    }
  }
}

/** Yaz ağacında bir eserin altında yeni sahne adı kutusunu açar (eser oluşturulunca ve "Yap" ile). */
export const YENI_SAHNE_OLAYI = 'dunya-atlasi:agac-yeni-sahne';
export const PALET_OLAYI = 'dunya-atlasi:palet-ac';
