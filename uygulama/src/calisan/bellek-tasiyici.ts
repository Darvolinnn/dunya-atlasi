// Bellekte sahte uzak depo: sınamalarda Drive'ın yerine geçer. Bütün cihazlar aynı nesneyi paylaşır.
import type { Tasiyici, UzakDosya } from './esitleme';
import { IzinHatasi } from './esitleme';

export class BellekTasiyici implements Tasiyici {
  readonly dosyalar = new Map<string, UzakDosya & { veri: Uint8Array; ust?: string }>();
  readonly klasorler = new Map<string, { ad: string; ozellikler: Record<string, string>; ust?: string }>();
  private sayac = 0;
  /** true iken her istek izin hatası verir (izni dolmuş Google oturumu gibi). */
  izinYok = false;
  istekSayisi = 0;

  private denetle() { this.istekSayisi++; if (this.izinYok) throw new IzinHatasi('Google izni gerekli.'); }

  async listele(oz: Record<string, string>) {
    this.denetle();
    return [...this.dosyalar.values()].filter((d) => Object.entries(oz).every(([k, v]) => d.ozellikler[k] === v))
      .map(({ veri: _v, ust: _u, ...d }) => ({ ...d, ozellikler: { ...d.ozellikler } }));
  }
  async indir(id: string) {
    this.denetle();
    const d = this.dosyalar.get(id);
    if (!d) throw new Error('Dosya yok.');
    return d.veri.slice();
  }
  async yukle(ad: string, ozellikler: Record<string, string>, veri: Uint8Array, id?: string, ust?: string) {
    this.denetle();
    const kod = id ?? `d${++this.sayac}`;
    if (id && !this.dosyalar.has(id)) throw new Error('Dosya yok.');
    if (ust && !this.klasorler.has(ust)) throw new Error('Klasör yok.');
    this.dosyalar.set(kod, { id: kod, ad, ozellikler: { ...ozellikler }, veri: veri.slice(), ust: id ? this.dosyalar.get(id)!.ust : ust });
    return { id: kod, ad, ozellikler: { ...ozellikler } };
  }
  async sil(id: string) { this.denetle(); this.dosyalar.delete(id); }
  async klasor(ad: string, ozellikler: Record<string, string>, ust?: string) {
    this.denetle();
    for (const [id, k] of this.klasorler) if (k.ust === ust && Object.entries(ozellikler).every(([a, v]) => k.ozellikler[a] === v)) return id;
    const id = `k${++this.sayac}`;
    this.klasorler.set(id, { ad, ozellikler: { ...ozellikler }, ust });
    return id;
  }
}
