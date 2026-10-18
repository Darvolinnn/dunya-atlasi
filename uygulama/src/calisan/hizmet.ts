// İsteklerin karşılandığı yer. Dosya açma dışarıdan verilir: tarayıcıda SAH havuzu, sınamada bellek.
import type { Database } from '@sqlite.org/sqlite-wasm';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import type { Istekler } from '../veri/api';
import { EvrenVt } from './evren-vt';
import { KurulumVt } from './kurulum-vt';

export type DosyaAcici = (ad: string) => Database;
export type Bildirici = (evren: string, turler: string[]) => void;

const adTemizle = (ad: unknown) => {
  const s = String(ad ?? '').replace(/\s+/g, ' ').trim();
  if (!s) throw new Error('Ad boş olamaz.');
  if (s.length > 200) throw new Error('Ad çok uzun.');
  return s;
};

export class Hizmet implements Istekler {
  private readonly kurulum: KurulumVt;
  private readonly acik = new Map<string, EvrenVt>();

  constructor(private readonly ac: DosyaAcici, varsayilanKurulumAdi: string, private readonly sqliteSurumu: string,
    private readonly bildir: Bildirici = () => {}) {
    this.kurulum = new KurulumVt(ac('/kurulum.db'), varsayilanKurulumAdi);
  }

  private evren(kod: string): EvrenVt {
    if (!kodGecerliMi(kod)) throw new Error('Geçersiz evren kodu.');
    let e = this.acik.get(kod);
    if (!e) {
      if (!this.kurulum.evrenler().some((x) => x.kod === kod)) throw new Error('Bu evren bu cihazda yok.');
      e = new EvrenVt(this.ac(`/evren-${kod}.db`), this.kurulum.kod);
      this.acik.set(kod, e);
    }
    return e;
  }

  baslat() { return { kod: this.kurulum.kod, ad: this.kurulum.ad, sqlite: this.sqliteSurumu }; }

  evrenler() { return this.kurulum.evrenler(); }

  evrenOlustur({ ad }: { ad: string }) {
    const temiz = adTemizle(ad);
    const kod = yeniKod();
    const e = new EvrenVt(this.ac(`/evren-${kod}.db`), this.kurulum.kod);
    const [islem] = e.islemYap([{ tur: 'evren_olustur', veri: { kod, ad: temiz } }]);
    this.kurulum.evrenEkle(kod, temiz, islem.zaman);
    this.acik.set(kod, e);
    return { kod };
  }

  evrenAdlandir({ evren, ad }: { evren: string; ad: string }) {
    const temiz = adTemizle(ad);
    this.evren(evren).islemYap([{ tur: 'evren_adlandir', veri: { ad: temiz } }]);
    this.kurulum.evrenAdi(evren, temiz);
    this.bildir(evren, ['evren_adlandir']);
  }

  evrenBilgisi({ evren }: { evren: string }) {
    const e = this.evren(evren);
    const oz = this.kurulum.evrenler().find((x) => x.kod === evren)!;
    this.kurulum.acildi(evren);
    const ad = e.db.selectValue("SELECT v FROM evren WHERE k='ad'") as string | undefined;
    return { ...oz, ad: ad ?? oz.ad, islemSayisi: e.islemSayisi() };
  }

  islemGunlugu({ evren, sinir }: { evren: string; sinir: number }) {
    return this.evren(evren).islemler(Math.min(Math.max(1, sinir), 1000), true)
      .map(({ ikili, ...i }) => ({ ...i, ikiliBoyut: ikili?.length ?? 0 }));
  }
}
