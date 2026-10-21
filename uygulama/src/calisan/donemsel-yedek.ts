// Dönemsel yedek (§10.10, K21): Drive'da kullanıcının görebildiği "Dünya Atlası yedekleri" klasörüne, her evren
// için günde bir yedek. Varsayılan saklama: günlük yedekler 30 gün, her ayın ilk yedeği bir yıl. Görseller
// klasördeki "medya" alt klasöründe bir kez saklanır; her günlük yedekte yeniden kopyalanmaz.
// Uygulama kapalıyken kaçan yedek bir sonraki açılışta (ilk eşitlemede) alınır.
import { zipAc } from '../alan/zip';
import { icerikAdi, onizlemeAdi, type MedyaDeposu } from './medya';
import type { KurulumVt } from './kurulum-vt';
import type { Tasiyici, UzakDosya } from './esitleme';

const UYGULAMA = 'dunya-atlasi';
export const KLASOR_ADI = 'Dünya Atlası yedekleri';

/** Kullanıcının görebildiği klasörlerde çalışan taşıyıcı (drive.file). */
export interface YedekTasiyici extends Tasiyici {
  klasor(ad: string, ozellikler: Record<string, string>, ust?: string): Promise<string>;
  yukle(ad: string, ozellikler: Record<string, string>, veri: Uint8Array, id?: string, ust?: string): Promise<UzakDosya>;
}

export interface DonemselYedekErisimi {
  kurulum: KurulumVt;
  medya: MedyaDeposu | null;
  paketYaz(evren: string, medyaDahil: boolean): Promise<{ dosyaAdi: string; veri: Blob; zaman: number; medyaAdlari: string[]; ad: string; islemSayisi: number }>;
  /** Paketi açar ve her değişiklik satırını denetler (bozuksa hata atar); evrene dokunmaz. */
  yedekIncele(veri: Uint8Array | Blob): Promise<{ evrenKod: string; islemSayisi: number }>;
  yedektenYukle(veri: Uint8Array | Blob): Promise<{ kod: string; ayri: boolean; eksikGorseller: string[] }>;
}

import type { DriveYedegi, DonemselYedekDurumu as Durum } from '../veri/api';
export type { DriveYedegi };
export type DonemselYedekDurumu = Omit<Durum, 'bagli' | 'esitlenir'>;

/** Yerel saatle gün (YYYY-AA-GG). */
export const gunYaz = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const gunSayisiFarki = (a: string, b: string) => Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86_400_000);
const ayFarki = (a: string, b: string) => (Number(a.slice(0, 4)) - Number(b.slice(0, 4))) * 12 + Number(a.slice(5, 7)) - Number(b.slice(5, 7));

/**
 * Saklama kuralı: son `gunSayisi` gündeki yedekler ve son `aySayisi` aydaki her ayın ilk yedeği kalır.
 * Silinecek günleri döndürür. En yeni yedek hiçbir zaman silinmez.
 */
export function silinecekGunler(gunler: string[], bugun: string, gunSayisi = 30, aySayisi = 12): string[] {
  const sirali = [...new Set(gunler)].sort();
  const ayIlki = new Set<string>();
  const gorulenAy = new Set<string>();
  for (const g of sirali) { const ay = g.slice(0, 7); if (!gorulenAy.has(ay)) { gorulenAy.add(ay); ayIlki.add(g); } }
  const enYeni = sirali[sirali.length - 1];
  return sirali.filter((g) => g !== enYeni && gunSayisiFarki(bugun, g) >= gunSayisi && !(ayIlki.has(g) && ayFarki(bugun, g) < aySayisi));
}

export function yedekAyarlari(k: KurulumVt) {
  return { gunSayisi: Number(k.ayar('yedek_gun') ?? 30), aySayisi: Number(k.ayar('yedek_ay') ?? 12) };
}

export function donemselDurum(k: KurulumVt, evren: string): DonemselYedekDurumu {
  let son = null;
  try { son = JSON.parse(k.ayar(`donemsel:${evren}`) ?? 'null'); } catch { /* yok */ }
  return { son, ...yedekAyarlari(k), hata: k.ayar(`donemsel_hata:${evren}`) || null };
}

export class DonemselYedek {
  constructor(private readonly x: DonemselYedekErisimi, private readonly t: YedekTasiyici) {}

  private klasorler: { ana: string; medya: string } | null = null;
  private async klasorBul() {
    if (!this.klasorler) {
      const ana = await this.t.klasor(KLASOR_ADI, { uygulama: UYGULAMA, tur: 'yedek-klasoru' });
      const medya = await this.t.klasor('medya', { uygulama: UYGULAMA, tur: 'yedek-medya-klasoru' }, ana);
      this.klasorler = { ana, medya };
    }
    return this.klasorler;
  }

  ayarlar() { return yedekAyarlari(this.x.kurulum); }
  durum(evren: string) { return donemselDurum(this.x.kurulum, evren); }

  /** Bugünün yedeği yoksa alır (zorla: her durumda yeni yedek). Başka cihaz bugün aldıysa yeniden alınmaz. */
  async al(evren: string, zorla = false): Promise<'alindi' | 'zaten-var'> {
    const bugun = gunYaz(Date.now());
    if (!zorla && this.x.kurulum.ayar(`donemsel_gun:${evren}`) === bugun) return 'zaten-var';
    // Başarısız denemeden sonra her eşitlemede yeniden denenmez; bir saat beklenir.
    const sonDeneme = Number(this.x.kurulum.ayar(`donemsel_deneme:${evren}`) ?? 0);
    if (!zorla && this.x.kurulum.ayar(`donemsel_hata:${evren}`) && Date.now() - sonDeneme < 3_600_000) return 'zaten-var';
    this.x.kurulum.ayarYaz(`donemsel_deneme:${evren}`, String(Date.now()));
    try {
      const { ana, medya } = await this.klasorBul();
      const mevcut = await this.liste(evren);
      const bugunku = mevcut.find((y) => y.gun === bugun);
      if (bugunku && !zorla) {
        this.kaydet(evren, { zaman: bugunku.zaman, gun: bugun, dogrulandi: true });
        return 'zaten-var';
      }
      const p = await this.x.paketYaz(evren, false);
      // Görseller: klasörde olmayanlar bir kez yüklenir. Bu cihazda olmayan görsel yedeğe giremez; sayısı yazılır.
      let eksikGorsel = 0;
      if (this.x.medya && p.medyaAdlari.length) {
        const uzak = new Set((await this.t.listele({ uygulama: UYGULAMA, tur: 'yedek-medya' })).map((d) => d.ozellikler.ad));
        for (const ad of p.medyaAdlari) for (const dosya of [ad, onizlemeAdi(ad)]) {
          if (uzak.has(dosya)) continue;
          const veri = await this.x.medya.oku(dosya);
          // Bozuk görsel yedeğe konmaz (içeriği adıyla tutmuyor); eksik sayılır.
          const saglam = veri && (dosya !== ad || (await icerikAdi(veri)) === ad);
          if (saglam) { await this.t.yukle(dosya, { uygulama: UYGULAMA, tur: 'yedek-medya', ad: dosya }, veri, undefined, medya); uzak.add(dosya); }
          else if (dosya === ad) eksikGorsel++;
        }
      }
      const dosyaAdi = p.dosyaAdi.replace(/-yedek-\d{4}-\d{2}-\d{2}\.zip$/, `-yedek-${bugun}.zip`);
      // Yeni yedek her zaman yeni bir dosyadır: bugünün önceki yedeği, yenisi doğrulanana kadar yerinde kalır.
      const d = await this.t.yukle(dosyaAdi, { uygulama: UYGULAMA, tur: 'yedek', evren, gun: bugun, zaman: String(p.zaman), kurulum: this.x.kurulum.kod, islem: String(p.islemSayisi) },
        new Uint8Array(await p.veri.arrayBuffer()), undefined, ana);
      // Doğrulama (§10.10): yedek geri indirilir, açılır, her değişiklik satırı okunur ve sayı karşılaştırılır.
      let sorun: string | null = null;
      try {
        const geri = await this.t.indir(d.id);
        const inc = await this.x.yedekIncele(geri);
        if (inc.evrenKod !== evren) sorun = 'yedekteki evren farklı';
        else if (inc.islemSayisi !== p.islemSayisi) sorun = `yedekte ${inc.islemSayisi} değişiklik var, ${p.islemSayisi} olmalıydı`;
      } catch (e) { sorun = (e as Error).message; }
      if (sorun) {
        // Doğrulanamayan yedek başarılı sayılmaz ve hiçbir eski yedek silinmez.
        try { await this.t.sil(d.id); } catch { /* kalsa da eski yedekler yerinde */ }
        throw new Error(`Yeni yedek geri okunurken doğrulanamadı (${sorun}). Eski yedeklerin hiçbiri silinmedi.`);
      }
      this.kaydet(evren, { zaman: p.zaman, gun: bugun, dogrulandi: true, ...(eksikGorsel ? { eksikGorsel } : {}) });
      this.x.kurulum.ayarYaz(`donemsel_hata:${evren}`, '');
      // Bir evrenin değişiklik geçmişi yalnızca büyür. Yeni yedekte eski bir yedekten daha az değişiklik varsa bir şey
      // kaybolmuş olabilir (ya da bu cihaz henüz her şeyi almamış): o zaman hiçbir eski yedek silinmez.
      const enCok = Math.max(0, ...mevcut.map((y) => y.islemSayisi ?? 0));
      if (p.islemSayisi < enCok) {
        this.x.kurulum.ayarYaz(`donemsel_hata:${evren}`, `Yedek alındı ve doğrulandı, ama içinde ${p.islemSayisi} değişiklik var; daha önceki bir yedekte ${enCok} vardı. `
          + 'Bu cihaz başka cihazların bütün değişikliklerini henüz almamış olabilir. Eski yedeklerin hiçbiri silinmedi.');
        return 'alindi';
      }
      // Ancak şimdi: bugünün eski yedeği ve saklama süresi dolanlar silinir. Silme hatası yeni yedeği bozmaz.
      const { gunSayisi, aySayisi } = this.ayarlar();
      const sil = new Set(silinecekGunler([...mevcut.map((y) => y.gun), bugun], bugun, gunSayisi, aySayisi));
      try {
        for (const y of mevcut) if (y.gun === bugun || sil.has(y.gun)) await this.t.sil(y.id);
      } catch (e) {
        this.x.kurulum.ayarYaz(`donemsel_hata:${evren}`, `Yedek alındı ve doğrulandı, ama eski yedekler kaldırılamadı: ${(e as Error).message}`);
      }
      return 'alindi';
    } catch (e) {
      this.x.kurulum.ayarYaz(`donemsel_hata:${evren}`, (e as Error).message);
      throw e;
    }
  }

  private kaydet(evren: string, son: { zaman: number; gun: string; dogrulandi: boolean; eksikGorsel?: number }) {
    this.x.kurulum.ayarYaz(`donemsel:${evren}`, JSON.stringify(son));
    this.x.kurulum.ayarYaz(`donemsel_gun:${evren}`, son.gun);
  }

  async liste(evren: string): Promise<DriveYedegi[]> {
    return (await this.t.listele({ uygulama: UYGULAMA, tur: 'yedek', evren }))
      .map((d) => ({ id: d.id, gun: d.ozellikler.gun, zaman: Number(d.ozellikler.zaman) || 0, ad: d.ad, kurulum: d.ozellikler.kurulum,
        ...(Number.isInteger(Number(d.ozellikler.islem)) && d.ozellikler.islem ? { islemSayisi: Number(d.ozellikler.islem) } : {}) }))
      .filter((y) => /^\d{4}-\d{2}-\d{2}$/.test(y.gun))
      .sort((a, b) => b.gun.localeCompare(a.gun));
  }

  /**
   * Drive'daki bir yedeği geri yükler: önce görseller yerel depoya, sonra paket (mevcut evrene dokunmaz).
   * Yedek klasöründe bulunmayan ya da bozuk görseller atlanmaz gibi yapılmaz: listesi sonuçla döner.
   */
  async geriYukle(id: string): Promise<{ kod: string; ayri: boolean; eksikGorseller: string[]; bozukGorseller: string[] }> {
    const veri = await this.t.indir(id);
    const icerik = await zipAc(veri);
    let paket;
    try { paket = JSON.parse(new TextDecoder().decode(await icerik.oku('paket.json'))); } catch { throw new Error('Bu dosya bir Dünya Atlası yedeği değil.'); }
    const adlar: string[] = Array.isArray(paket.medyaAdlari) ? paket.medyaAdlari : [];
    const eksikGorseller: string[] = [];
    const bozukGorseller: string[] = [];
    if (this.x.medya && adlar.length) {
      const uzak = new Map((await this.t.listele({ uygulama: UYGULAMA, tur: 'yedek-medya' })).map((d) => [d.ozellikler.ad, d.id]));
      for (const ad of adlar) for (const dosya of [ad, onizlemeAdi(ad)]) {
        if (!/^[0-9a-f]{64}(\.onizleme)?$/.test(dosya) || (await this.x.medya.var(dosya))) continue;
        const uid = uzak.get(dosya);
        // Önizleme yoksa görsel yine açılır; yalnızca asıl dosyanın eksikliği bildirilir.
        if (!uid) { if (dosya === ad) eksikGorseller.push(ad); continue; }
        const v = await this.t.indir(uid);
        if (dosya === ad && (await icerikAdi(v)) !== ad) { bozukGorseller.push(ad); continue; }
        await this.x.medya.yaz(dosya, v);
      }
    }
    return { ...(await this.x.yedektenYukle(veri)), eksikGorseller, bozukGorseller };
  }
}
