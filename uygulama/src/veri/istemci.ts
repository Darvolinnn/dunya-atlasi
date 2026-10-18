// Arayüz tarafındaki veritabanı istemcisi: çalışana istek gönderir, değişiklik bildirimlerini dağıtır.
import type { IstekAdi, IstekArg, IstekSonuc, DegisiklikBildirimi } from './api';

type Bekleyen = { ok: (v: unknown) => void; no: (e: Error) => void };

export class Istemci {
  private readonly calisan: Worker;
  private no = 0;
  private readonly bekleyen = new Map<number, Bekleyen>();
  private readonly dinleyiciler = new Set<(b: DegisiklikBildirimi['degisti']) => void>();

  constructor() {
    this.calisan = new Worker(new URL('../calisan/vt.ts', import.meta.url), { type: 'module' });
    this.calisan.onmessage = (e: MessageEvent) => {
      const m = e.data;
      if (m.degisti) { for (const d of this.dinleyiciler) d(m.degisti); return; }
      const b = this.bekleyen.get(m.no);
      if (!b) return;
      this.bekleyen.delete(m.no);
      if ('hata' in m) b.no(new Error(m.hata)); else b.ok(m.sonuc);
    };
  }

  iste<K extends IstekAdi>(ad: K, ...arg: IstekArg<K> extends undefined ? [] : [IstekArg<K>]): Promise<IstekSonuc<K>> {
    return new Promise((ok, no) => {
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
