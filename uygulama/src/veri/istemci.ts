// Arayüz tarafındaki veritabanı istemcisi: çalışana istek gönderir, değişiklik bildirimlerini dağıtır.
import type { IstekAdi, IstekArg, IstekSonuc, DegisiklikBildirimi } from './api';

type Bekleyen = { ok: (v: unknown) => void; no: (e: Error) => void };

/** Çalışanın istemcinin kullandığı kısmı; sınamada sahtesi verilebilir. */
export interface CalisanBenzeri {
  onmessage: ((e: MessageEvent) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
  onmessageerror: ((e: MessageEvent) => void) | null;
  postMessage(m: unknown): void;
}

/** Çalışan yüklenemez ya da çökerse bekleyen ve sonraki istekler bu iletiyle sonuçlanır; ekran "Açılıyor…"da kalmaz. */
export const CALISAN_HATASI = 'Programın veri bölümü başlatılamadı ya da durdu. Sayfayı yenileyip yeniden deneyin.';
export const ILETI_HATASI = 'Veri bölümünden gelen yanıt okunamadı. İşlem tamamlanmamış olabilir; sayfayı yenileyip denetleyin.';

export class Istemci {
  private readonly calisan: CalisanBenzeri;
  private no = 0;
  private readonly bekleyen = new Map<number, Bekleyen>();
  private readonly dinleyiciler = new Set<(b: DegisiklikBildirimi['degisti']) => void>();
  private durdu: string | null = null;

  constructor(calisan?: CalisanBenzeri) {
    this.calisan = calisan ?? new Worker(new URL('../calisan/vt.ts', import.meta.url), { type: 'module' });
    this.calisan.onmessage = (e: MessageEvent) => {
      const m = e.data;
      if (m.degisti) { for (const d of this.dinleyiciler) d(m.degisti); return; }
      const b = this.bekleyen.get(m.no);
      if (!b) return;
      this.bekleyen.delete(m.no);
      if ('hata' in m) b.no(new Error(m.hata)); else b.ok(m.sonuc);
    };
    // İstek hataları çalışanın içinde yakalanıp yanıt olarak döner; buraya gelen hata yükleme ya da çökme demektir.
    this.calisan.onerror = () => { this.durdu = CALISAN_HATASI; this.hepsiniBitir(CALISAN_HATASI); };
    // Okunamayan yanıtın hangi isteğe ait olduğu bilinemez; bekleyenlerin hiçbiri sonsuza dek beklemesin.
    this.calisan.onmessageerror = () => this.hepsiniBitir(ILETI_HATASI);
  }

  private hepsiniBitir(ileti: string) {
    const b = [...this.bekleyen.values()];
    this.bekleyen.clear();
    for (const x of b) x.no(new Error(ileti));
  }

  iste<K extends IstekAdi>(ad: K, ...arg: IstekArg<K> extends undefined ? [] : [IstekArg<K>]): Promise<IstekSonuc<K>> {
    return new Promise((ok, no) => {
      if (this.durdu) { no(new Error(this.durdu)); return; }
      const no_ = ++this.no;
      this.bekleyen.set(no_, { ok: ok as (v: unknown) => void, no });
      this.calisan.postMessage({ no: no_, ad, arg: arg[0] });
    });
  }

  dinle(fn: (b: DegisiklikBildirimi['degisti']) => void): () => void {
    this.dinleyiciler.add(fn);
    return () => this.dinleyiciler.delete(fn);
  }
}

/**
 * Aynı kurulumda veritabanını tek sekme açar (§10.5, TK1). Kilit alınamazsa false döner.
 * Kilit sekme kapanana kadar tutulur.
 */
export function tekSekmeKilidi(): Promise<boolean> {
  if (!navigator.locks) return Promise.resolve(true);
  return new Promise((sonuc) => {
    navigator.locks.request('dunya-atlasi-veritabani', { ifAvailable: true }, (kilit) => {
      if (!kilit) { sonuc(false); return; }
      sonuc(true);
      return new Promise(() => {}); // sekme açık kaldıkça bırakılmaz
    });
  });
}
