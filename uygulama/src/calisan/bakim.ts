// Bakım ve tekrarlar (§16.1 F32): bakım tanımları, bakım kayıtları, durum hesabı ve ters görünüm.
import {
  BAKIM_BIRIMLERI,
  BAKIM_HESAP_DURUM_ADLARI,
  BAKIM_KAYDI_DURUMLARI,
  BAKIM_KAYDI_DURUM_ADLARI,
  BAKIM_SONUC_NOTU,
  bakimSahibiMi,
  siklikYazisi,
  sureYazisi,
  type BakimHesapDurumu,
  type BakimKaydiDurumu,
  type BakimMalzemesi,
  type BakimSuresi,
} from '../alan/bakim';
import type { IslemGirdisi } from '../alan/islem';
import { kodGecerliMi, yeniKod } from '../alan/kod';
import {
  anaTakvim,
  eksenAraligi,
  GUN_PARCA,
  karsilastir,
  tarihCoz,
  yilGunu,
  yilParcasi,
  type EvrenTarihi,
  type TakvimYa,
} from '../alan/tarih';
import { kararGecerli } from '../alan/turler';
import type {
  BakimDosyasi,
  BakimDurumuSonucu,
  BakimKaydiOkumasi,
  BakimKaydiTanimi,
  BakimTanimi,
  BakimTanimiDurumu,
  BakimTanimiOkumasi,
  BakimUzmanligiSonucu,
  Catisma,
  KisaKayit,
} from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir, zamanSetiOku } from './izdusum';
import { tarihDegeri } from './sablon';

export interface BakimBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar?: string[]): void;
}

export const UZMAN_DISI_NOTU = 'Bakımı yapan, tanımdaki uzmanlar arasında değil.';

function kisaKayit(e: EvrenVt, kod: string | null): KisaKayit | null {
  if (!kod) return null;
  const k = yonlendir(e.db, kod);
  const r = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [k]);
  if (r) return { kod: r.kod as string, ad: r.ad as string, tur: r.tur as string };
  const silinmis = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=?', [k]);
  return silinmis
    ? { kod: silinmis.kod as string, ad: silinmis.ad as string, tur: silinmis.tur as string }
    : { kod: k, ad: 'Silinmiş kayıt', tur: 'diger' };
}

function aktifKayitKontrol(e: EvrenVt, kod: unknown, hata = 'Kayıt bulunamadı.'): { kod: string; ad: string; tur: string } {
  if (typeof kod !== 'string' || !kodGecerliMi(kod)) throw new Error(hata);
  const k = yonlendir(e.db, kod);
  const r = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [k]);
  if (!r) throw new Error(hata);
  return { kod: r.kod as string, ad: r.ad as string, tur: r.tur as string };
}

function sureDogrula(s: unknown, etiket: string): BakimSuresi | null {
  if (s === null || s === undefined) return null;
  if (typeof s !== 'object') throw new Error(`${etiket} geçersiz.`);
  const x = s as BakimSuresi;
  const deger = Number(x.deger);
  if (!Number.isFinite(deger) || deger <= 0 || deger > 100000) {
    throw new Error(`${etiket} sıfırdan büyük bir sayı olmalıdır.`);
  }
  if (!BAKIM_BIRIMLERI.includes(x.birim)) {
    throw new Error(`Geçersiz ${etiket.toLocaleLowerCase('tr-TR')} birimi.`);
  }
  return { deger, birim: x.birim };
}

function tanimDogrula(e: EvrenVt, g: BakimTanimi) {
  if (!g || typeof g !== 'object') throw new Error('Bakım tanımı geçersiz.');
  const sahip = aktifKayitKontrol(e, g.kayit, 'Bakım sahibi kayıt bulunamadı.');
  if (!bakimSahibiMi(sahip.tur)) {
    throw new Error('Bu kayıt türünde bakım tanımlanamaz.');
  }
  const ad = String(g.ad ?? '').replace(/\s+/g, ' ').trim();
  if (!ad) throw new Error('Bakım adı boş olamaz.');
  if (ad.length > 80) throw new Error('Bakım adı en çok 80 harf olabilir.');

  const siklik = sureDogrula(g.siklik, 'Bakım sıklığı');
  const kesintiSuresi = sureDogrula(g.kesintiSuresi, 'Kesinti süresi');

  const hamUzmanlar = g.uzmanlar ?? [];
  if (!Array.isArray(hamUzmanlar) || hamUzmanlar.length > 20) {
    throw new Error('En çok 20 uzman seçilebilir.');
  }
  const uzmanlar: string[] = [];
  for (const u of hamUzmanlar) {
    const k = aktifKayitKontrol(e, u, 'Uzman kaydı bulunamadı.').kod;
    if (!uzmanlar.includes(k)) uzmanlar.push(k);
  }

  const hamMalzemeler = g.malzemeler ?? [];
  if (!Array.isArray(hamMalzemeler) || hamMalzemeler.length > 20) {
    throw new Error('En çok 20 malzeme eklenebilir.');
  }
  const malzemeler: BakimMalzemesi[] = hamMalzemeler.map((m) => {
    if (!m || typeof m !== 'object') throw new Error('Malzeme bilgisi geçersiz.');
    const metin = String(m.metin ?? '').replace(/\s+/g, ' ').trim();
    if (metin.length > 80) throw new Error('Malzeme açıklaması en çok 80 harf olabilir.');
    const kayit = m.kayit ? aktifKayitKontrol(e, m.kayit, 'Malzeme kaydı bulunamadı.').kod : null;
    if (!kayit && !metin) throw new Error('Malzeme için bir kayıt seçin ya da açıklama yazın.');
    return { kayit, metin };
  });

  const bedel = String(g.bedel ?? '').replace(/\s+/g, ' ').trim();
  if (bedel.length > 200) throw new Error('Bedel en çok 200 harf olabilir.');

  const kesinti = String(g.kesinti ?? '').replace(/[ \t]+/g, ' ').trim();
  if (kesinti.length > 500) throw new Error('Kesintideki davranış en çok 500 harf olabilir.');

  const karar = g.karar === undefined ? 'kesin' : g.karar;
  if (!kararGecerli(karar)) throw new Error('Geçersiz karar durumu.');

  return {
    kayit: sahip.kod,
    ad,
    siklik,
    uzmanlar,
    malzemeler,
    bedel,
    kesinti,
    kesintiSuresi,
    karar,
  };
}

export function bakimTanimYaz(b: BakimBaglami, kod: string | null, g: BakimTanimi): { kod: string } {
  const temiz = tanimDogrula(b.e, g);
  let k = kod ?? null;
  let olusturma = Date.now();
  if (k !== null) {
    if (!kodGecerliMi(k)) throw new Error('Bakım tanımı bulunamadı.');
    const mevcut = b.e.db.selectObject('SELECT olusturma FROM bakim_tanimlari WHERE kod=?', [k]);
    if (!mevcut) throw new Error('Bakım tanımı bulunamadı.');
    olusturma = Number(mevcut.olusturma);
  } else {
    k = yeniKod();
  }
  b.yaz(
    [{ tur: 'bakim_tanim_yaz', veri: { kod: k, ...temiz, olusturma } }],
    [temiz.kayit],
  );
  return { kod: k };
}

export function bakimTanimKaldir(b: BakimBaglami, kod: string, geri: boolean): void {
  if (!kodGecerliMi(kod)) throw new Error('Bakım tanımı bulunamadı.');
  const r = b.e.db.selectObject('SELECT kayit, silindi FROM bakim_tanimlari WHERE kod=?', [kod]);
  if (!r) throw new Error('Bakım tanımı bulunamadı.');
  if (geri ? r.silindi === null : r.silindi !== null) return;
  const sahip = yonlendir(b.e.db, r.kayit as string);
  b.yaz([{ tur: geri ? 'bakim_tanim_geri_yukle' : 'bakim_tanim_sil', veri: { kod } }], [sahip]);
}

export function bakimKaydiYaz(
  b: BakimBaglami,
  kod: string | null,
  g: BakimKaydiTanimi,
): { kod: string; bilgiNotu: string | null } {
  if (!g || typeof g !== 'object') throw new Error('Bakım kaydı geçersiz.');
  if (typeof g.tanim !== 'string' || !kodGecerliMi(g.tanim)) {
    throw new Error('Bakım tanımı bulunamadı.');
  }
  const tr = b.e.db.selectObject('SELECT kod, kayit, uzmanlar FROM bakim_tanimlari WHERE kod=? AND silindi IS NULL', [g.tanim]);
  if (!tr) throw new Error('Bakım tanımı bulunamadı.');

  const ifade = String(g.tarih ?? '').replace(/\s+/g, ' ').trim();
  if (!ifade) throw new Error('Tarih boş olamaz.');
  const tarih = tarihCoz(ifade, zamanSetiOku(b.e.db));
  if (!tarih?.eksen || (tarih.eksen.enErken === null && tarih.eksen.enGec === null)) {
    throw new Error(`Tarih okunamadı: “${ifade}”.`);
  }

  if (!BAKIM_KAYDI_DURUMLARI.includes(g.durum)) {
    throw new Error('Geçersiz bakım durumu.');
  }

  const yapan = g.yapan ? aktifKayitKontrol(b.e, g.yapan, 'Bakımı yapan kayıt bulunamadı.').kod : null;
  const olay = g.olay ? aktifKayitKontrol(b.e, g.olay, 'Olay kaydı bulunamadı.').kod : null;
  const not = String(g.not ?? '').replace(/\s+/g, ' ').trim();
  if (not.length > 200) throw new Error('Not en çok 200 harf olabilir.');

  let k = kod ?? null;
  let olusturma = Date.now();
  if (k !== null) {
    if (!kodGecerliMi(k)) throw new Error('Bakım kaydı bulunamadı.');
    const mevcut = b.e.db.selectObject('SELECT olusturma FROM bakim_kayitlari WHERE kod=?', [k]);
    if (!mevcut) throw new Error('Bakım kaydı bulunamadı.');
    olusturma = Number(mevcut.olusturma);
  } else {
    k = yeniKod();
  }

  const sahip = yonlendir(b.e.db, tr.kayit as string);
  const uzmanlar = (JSON.parse((tr.uzmanlar as string) || '[]') as string[]).map((u) => yonlendir(b.e.db, u));
  const uzmanDisi = yapan !== null && !uzmanlar.includes(yapan);

  b.yaz(
    [{
      tur: 'bakim_kaydi_yaz',
      veri: { kod: k, tanim: g.tanim, kayit: sahip, tarih, durum: g.durum, yapan, olay, not, olusturma },
    }],
    [sahip],
  );
  return { kod: k, bilgiNotu: uzmanDisi ? UZMAN_DISI_NOTU : null };
}

export function bakimKaydiKaldir(b: BakimBaglami, kod: string, geri: boolean): void {
  if (!kodGecerliMi(kod)) throw new Error('Bakım kaydı bulunamadı.');
  const r = b.e.db.selectObject('SELECT kayit, silindi FROM bakim_kayitlari WHERE kod=?', [kod]);
  if (!r) throw new Error('Bakım kaydı bulunamadı.');
  if (geri ? r.silindi === null : r.silindi !== null) return;
  const sahip = yonlendir(b.e.db, r.kayit as string);
  b.yaz([{ tur: geri ? 'bakim_kaydi_geri_yukle' : 'bakim_kaydi_sil', veri: { kod } }], [sahip]);
}

/**
 * Bir süreyi (gün/ay/yıl) takvim üzerinden parça aralığına [enAz, enCok] çevirir.
 * Sabit 30/365 KULLANMAZ; tarih.ts içindeki takvim yardımcılarını kullanır.
 * Takvimde ay tanımı yoksa 'ay' birimi çevrilemez ve null döner.
 */
export function sureParcaAraligi(
  sure: BakimSuresi | null,
  takvimSeti: TakvimYa,
  referansTarih?: EvrenTarihi | null,
): [number, number] | null {
  if (!sure || sure.deger <= 0) return null;
  const ana = anaTakvim(takvimSeti);
  if (sure.birim === 'gun') {
    const p = Math.round(sure.deger * GUN_PARCA);
    return [p, p];
  }
  if (sure.birim === 'yil') {
    const yp = yilParcasi(ana);
    if (yp <= 0) return null;
    const p = Math.round(sure.deger * yp);
    return [p, p];
  }
  if (sure.birim === 'ay') {
    const aylar = ana.aylar;
    if (!aylar || aylar.length === 0) return null;
    const m = aylar.length;
    const yg = yilGunu(ana);
    const tamYil = Math.floor(sure.deger / m);
    const kalan = sure.deger - tamYil * m;
    if (kalan === 0) {
      const p = tamYil * yg * GUN_PARCA;
      return [p, p];
    }
    if (Number.isInteger(kalan)) {
      // Referans tarih tek bir ayın içindeyse o aydan başlayan ardışık ayları al; değilse olası en kısa ve en uzun ay toplamını koru.
      const baslangicAyi = referansAyIndeksi(referansTarih ?? null, takvimSeti);
      if (baslangicAyi !== null) {
        let gun = tamYil * yg;
        for (let i = 0; i < kalan; i++) gun += aylar[(baslangicAyi + i) % m].gun;
        const p = gun * GUN_PARCA;
        return [p, p];
      }
      let enAz = Infinity;
      let enCok = -Infinity;
      for (let bas = 0; bas < m; bas++) {
        let top = 0;
        for (let i = 0; i < kalan; i++) top += aylar[(bas + i) % m].gun;
        if (top < enAz) enAz = top;
        if (top > enCok) enCok = top;
      }
      return [(tamYil * yg + enAz) * GUN_PARCA, (tamYil * yg + enCok) * GUN_PARCA];
    }
    const ayGunleri = aylar.map((a) => a.gun);
    const minAy = Math.min(...ayGunleri);
    const maxAy = Math.max(...ayGunleri);
    return [
      Math.round((tamYil * yg + kalan * minAy) * GUN_PARCA),
      Math.round((tamYil * yg + kalan * maxAy) * GUN_PARCA),
    ];
  }
  return null;
}

function referansAyIndeksi(tarih: EvrenTarihi | null, takvimSeti: TakvimYa): number | null {
  const ana = anaTakvim(takvimSeti);
  if (!tarih?.eksen || tarih.eksen.enErken === null || tarih.eksen.enGec === null || !ana.aylar?.length) return null;
  const yp = yilParcasi(ana);
  const y1 = Math.floor(tarih.eksen.enErken / yp);
  const y2 = Math.floor(tarih.eksen.enGec / yp);
  if (y1 !== y2) return null;
  const ayBul = (parca: number) => {
    let kalanGun = Math.floor((parca - y1 * yp) / GUN_PARCA);
    let ay = 0;
    while (ay < ana.aylar!.length - 1 && kalanGun >= ana.aylar![ay].gun) {
      kalanGun -= ana.aylar![ay].gun;
      ay++;
    }
    return ay;
  };
  const a1 = ayBul(tarih.eksen.enErken);
  const a2 = ayBul(tarih.eksen.enGec);
  return a1 === a2 ? a1 : null;
}

function catismaliSeti(e: EvrenVt): Set<string> {
  return new Set(
    e.db
      .selectObjects(
        `SELECT nesne FROM alan_yazanlari
         WHERE alan IN ('bakim_tanim','bakim_tanim_silindi','bakim_kaydi','bakim_kaydi_silindi')
         GROUP BY nesne, alan HAVING count(DISTINCT deger) > 1`,
      )
      .map((r) => r.nesne as string),
  );
}

function kayitOkuSatiri(
  e: EvrenVt,
  r: Record<string, unknown>,
  uzmanKodlari: string[],
  zamanSeti: TakvimYa,
  catisma: Set<string>,
): BakimKaydiOkumasi {
  const sakliTarih = JSON.parse(r.tarih as string) as EvrenTarihi;
  const tarih = tarihCoz(sakliTarih.ifade, zamanSeti) ?? sakliTarih;
  const yapanKod = r.yapan ? yonlendir(e.db, r.yapan as string) : null;
  const olayKod = r.olay ? yonlendir(e.db, r.olay as string) : null;
  const uzmanDisi = yapanKod !== null && !uzmanKodlari.includes(yapanKod);
  return {
    kod: r.kod as string,
    tanim: r.tanim as string,
    kayit: yonlendir(e.db, r.kayit as string),
    tarih,
    durum: r.durum as BakimKaydiDurumu,
    yapan: kisaKayit(e, yapanKod),
    olay: kisaKayit(e, olayKod),
    not: (r.not_metni as string) ?? '',
    uzmanDisi,
    bilgiNotu: uzmanDisi ? UZMAN_DISI_NOTU : null,
    olusturma: Number(r.olusturma),
    duzenleme: Number(r.duzenleme),
    silindi: r.silindi === null ? null : Number(r.silindi),
    catismali: catisma.has(r.kod as string),
  };
}

function tanimOkuSatiri(
  e: EvrenVt,
  r: Record<string, unknown>,
  cop: boolean,
  zamanSeti: TakvimYa,
  catisma: Set<string>,
): BakimTanimiOkumasi {
  const kod = r.kod as string;
  const hamUzmanlar = JSON.parse((r.uzmanlar as string) || '[]') as string[];
  const uzmanKodlari: string[] = [];
  for (const u of hamUzmanlar) {
    const y = yonlendir(e.db, u);
    if (!uzmanKodlari.includes(y)) uzmanKodlari.push(y);
  }
  const uzmanlar = uzmanKodlari.map((u) => kisaKayit(e, u)!).filter(Boolean);

  const hamMalzemeler = JSON.parse((r.malzemeler as string) || '[]') as BakimMalzemesi[];
  const malzemeler = hamMalzemeler.map((m) => ({
    kayit: m.kayit ? kisaKayit(e, yonlendir(e.db, m.kayit)) : null,
    metin: m.metin ?? '',
  }));

  const kayitSatirlari = e.db
    .selectObjects(
      `SELECT * FROM bakim_kayitlari WHERE tanim=? ${cop ? '' : 'AND silindi IS NULL'} ORDER BY olusturma ASC`,
      [kod],
    )
    .map((kr) => kayitOkuSatiri(e, kr, uzmanKodlari, zamanSeti, catisma))
    .sort((a, b) => {
      const aEksen = a.tarih.eksen?.enErken ?? Infinity;
      const bEksen = b.tarih.eksen?.enErken ?? Infinity;
      return aEksen - bEksen || a.olusturma - b.olusturma;
    });

  return {
    kod,
    kayit: yonlendir(e.db, r.kayit as string),
    ad: r.ad as string,
    siklik: r.siklik ? (JSON.parse(r.siklik as string) as BakimSuresi) : null,
    uzmanlar,
    malzemeler,
    bedel: (r.bedel as string) ?? '',
    kesinti: (r.kesinti as string) ?? '',
    kesintiSuresi: r.kesinti_suresi ? (JSON.parse(r.kesinti_suresi as string) as BakimSuresi) : null,
    karar: (r.karar as string) ?? 'kesin',
    olusturma: Number(r.olusturma),
    duzenleme: Number(r.duzenleme),
    silindi: r.silindi === null ? null : Number(r.silindi),
    catismali: catisma.has(kod),
    kayitlar: kayitSatirlari,
  };
}

export function bakimOku(e: EvrenVt, kayitKodu: string, cop = false): BakimDosyasi {
  const sahip = aktifKayitKontrol(e, kayitKodu);
  const zamanSeti = zamanSetiOku(e.db);
  const catisma = catismaliSeti(e);
  const tumTanimlar = e.db
    .selectObjects(`SELECT * FROM bakim_tanimlari ${cop ? '' : 'WHERE silindi IS NULL'} ORDER BY olusturma ASC`)
    .filter((r) => yonlendir(e.db, r.kayit as string) === sahip.kod);
  return {
    kayit: sahip,
    tanimlar: tumTanimlar.map((r) => tanimOkuSatiri(e, r, cop, zamanSeti, catisma)),
  };
}

function uzmanYasamNotlari(e: EvrenVt, uzmanlar: KisaKayit[], secilenTarih: EvrenTarihi | null, zamanSeti: TakvimYa): string[] {
  if (!secilenTarih?.eksen) return [];
  const notlar: string[] = [];
  for (const u of uzmanlar) {
    const olumHam = tarihDegeri(e, u.kod, 'olum');
    const olum = olumHam ? (tarihCoz(olumHam.ifade, zamanSeti) ?? olumHam) : null;
    const dogumHam = tarihDegeri(e, u.kod, 'dogum');
    const dogum = dogumHam ? (tarihCoz(dogumHam.ifade, zamanSeti) ?? dogumHam) : null;
    if ((olum && karsilastir(olum, secilenTarih) === 'once') || (dogum && karsilastir(secilenTarih, dogum) === 'once')) {
      notlar.push(`Tanımdaki uzmanlardan ${u.ad} bu tarihte yaşamıyor olabilir.`);
    }
  }
  return notlar;
}

export function bakimTanimiDurumuHesapla(
  e: EvrenVt,
  tanim: BakimTanimiOkumasi,
  secilenTarih: EvrenTarihi | null,
  tarihSoruldu: boolean,
  zamanSeti: TakvimYa,
): BakimTanimiDurumu {
  const ana = anaTakvim(zamanSeti);
  const aktifKayitlar = tanim.kayitlar.filter(
    (k) => k.silindi === null && k.tarih.eksen && k.tarih.eksen.enErken !== null && k.tarih.eksen.enGec !== null,
  );

  // Seçilen tarih varsa, o tarihten kesin sonra olan kayıtları dışarıda bırak.
  const gecmisKayitlar = secilenTarih?.eksen
    ? aktifKayitlar.filter((k) => karsilastir(k.tarih, secilenTarih) !== 'sonra')
    : aktifKayitlar;

  // Sıralama: enErken, sonra enGec, sonra olusturma.
  const sirali = [...gecmisKayitlar].sort((a, b) => {
    const a1 = a.tarih.eksen!.enErken!;
    const b1 = b.tarih.eksen!.enErken!;
    if (a1 !== b1) return a1 - b1;
    const a2 = a.tarih.eksen!.enGec!;
    const b2 = b.tarih.eksen!.enGec!;
    return a2 - b2 || a.olusturma - b.olusturma;
  });

  const yapildilar = sirali.filter((k) => k.durum === 'yapildi');
  const sonYapildi = yapildilar.length ? yapildilar[yapildilar.length - 1] : null;

  // Son "yapildi" kaydından sonra (ya da hiç "yapildi" yoksa) gelen "yapilmadi" / "yarida" kaydı.
  const aksamalar = sirali.filter((k) => {
    if (k.durum !== 'yapilmadi' && k.durum !== 'yarida') return false;
    if (!sonYapildi) return true;
    return k.tarih.eksen!.enErken! >= sonYapildi.tarih.eksen!.enErken!;
  });
  const sonAksama = aksamalar.length ? aksamalar[aksamalar.length - 1] : null;

  const sureParca = sonYapildi ? sureParcaAraligi(tanim.siklik, zamanSeti, sonYapildi.tarih) : null;
  const sonrakiAralik =
    sonYapildi && sureParca
      ? (() => {
          const enErken = sonYapildi.tarih.eksen!.enErken! + sureParca[0];
          const enGec = sonYapildi.tarih.eksen!.enGec! + sureParca[1];
          return {
            enErken,
            enGec,
            yazi: eksenAraligi({ enErken, enGec }, ana),
          };
        })()
      : null;

  const kesintiParca = sureParcaAraligi(tanim.kesintiSuresi, zamanSeti, sonYapildi?.tarih ?? sonAksama?.tarih ?? null);
  const uzmanNotlari = uzmanYasamNotlari(e, tanim.uzmanlar, secilenTarih, zamanSeti);

  // Seçilen tarih çözülemediyse:
  if (tarihSoruldu && (!secilenTarih?.eksen || secilenTarih.eksen.enErken === null || secilenTarih.eksen.enGec === null)) {
    const durum: BakimHesapDurumu = 'bilinmiyor';
    return {
      tanim,
      sonYapildi,
      sonrakiAralik,
      durum,
      durumEtiketi: BAKIM_HESAP_DURUM_ADLARI[durum],
      kesinti: null,
      ozet: 'Seçilen tarih takvime çevrilemediği için bakım durumu hesaplanamıyor.',
      dayanak: `Seçilen tarih ifadesi (“${secilenTarih?.ifade ?? ''}”) takvim eksenine yerleştirilemedi.`,
      not: BAKIM_SONUC_NOTU,
      uzmanNotlari,
    };
  }

  // Bu aralıkta hiç bakım kaydı yoksa ("kayıt yok" !== "bakım yapılmadı", §2.2 kural 4):
  if (!sonYapildi && !sonAksama) {
    const durum: BakimHesapDurumu = 'bilinmiyor';
    return {
      tanim,
      sonYapildi: null,
      sonrakiAralik: null,
      durum,
      durumEtiketi: BAKIM_HESAP_DURUM_ADLARI[durum],
      kesinti: null,
      ozet: 'Bu aralıkta bakım kaydı yok.',
      dayanak: 'Bu aralıkta bakım kaydı yok; yalnızca sıklık tanımı var.',
      not: BAKIM_SONUC_NOTU,
      uzmanNotlari,
    };
  }

  const hedefEksen =
    secilenTarih?.eksen && secilenTarih.eksen.enErken !== null && secilenTarih.eksen.enGec !== null
      ? { enErken: secilenTarih.eksen.enErken, enGec: secilenTarih.eksen.enGec }
      : sonAksama
        ? { enErken: sonAksama.tarih.eksen!.enErken!, enGec: sonAksama.tarih.eksen!.enGec! }
        : sonYapildi
          ? { enErken: sonYapildi.tarih.eksen!.enErken!, enGec: sonYapildi.tarih.eksen!.enGec! }
          : null;

  let durum: BakimHesapDurumu = 'bilinmiyor';

  if (sonYapildi && sonrakiAralik && hedefEksen) {
    const { enErken: s1, enGec: s2 } = sonrakiAralik;
    const { enErken: h1, enGec: h2 } = hedefEksen;
    // Son "yapildi" kaydından sonra "yapilmadi" / "yarida" kaydı varsa o tarihten itibaren gecikme sayılır.
    const etkinGecikmeBas = sonAksama ? Math.min(s1, sonAksama.tarih.eksen!.enErken!) : s1;
    const etkinGecikmeSon = sonAksama ? Math.min(s2, sonAksama.tarih.eksen!.enGec!) : s2;

    if (sonAksama && h1 >= sonAksama.tarih.eksen!.enErken!) {
      if (tanim.kesintiSuresi && kesintiParca && h2 >= etkinGecikmeBas + kesintiParca[0] && h1 > etkinGecikmeSon) {
        durum = 'kesinti_olabilir';
      } else {
        durum = 'gecikmis';
      }
    } else if (h2 < s1) {
      durum = 'zamaninda';
    } else if (h1 <= s2) {
      durum = 'gecikmis_olabilir';
    } else {
      if (tanim.kesintiSuresi && kesintiParca && h2 >= s1 + kesintiParca[0]) {
        durum = 'kesinti_olabilir';
      } else {
        durum = 'gecikmis';
      }
    }
  } else if (!sonYapildi && sonAksama && hedefEksen) {
    // Hiç "yapildi" kaydı yok ama "yapilmadi" ya da "yarida" kaydı var: o tarihten itibaren gecikme sayılır.
    const a1 = sonAksama.tarih.eksen!.enErken!;
    const a2 = sonAksama.tarih.eksen!.enGec!;
    const { enErken: h1, enGec: h2 } = hedefEksen;
    if (tanim.kesintiSuresi && kesintiParca && h1 > a2 && h2 >= a1 + kesintiParca[0]) {
      durum = 'kesinti_olabilir';
    } else if (h2 >= a1) {
      durum = 'gecikmis';
    } else {
      durum = 'bilinmiyor';
    }
  }

  const kesinti = durum === 'kesinti_olabilir' && tanim.kesinti ? tanim.kesinti : null;
  const durumEtiketi = BAKIM_HESAP_DURUM_ADLARI[durum];

  let ozet: string;
  if (sonYapildi) {
    const parcalar: string[] = [`Son bakım ${sonYapildi.tarih.ifade} tarihinde.`];
    if (sonrakiAralik) {
      parcalar.push(`Bir sonraki ${sonrakiAralik.yazi} gerekir.`);
    } else if (tanim.siklik) {
      parcalar.push('Takvimde karşılığı bulunamadığından sonraki bakım aralığı hesaplanamıyor.');
    } else {
      parcalar.push('Bakım sıklığı belirtilmemiş.');
    }
    if (secilenTarih) {
      parcalar.push(`${secilenTarih.ifade} tarihinde: ${durumEtiketi}.`);
    } else {
      parcalar.push(`Durum: ${durumEtiketi}.`);
    }
    ozet = parcalar.join(' ');
  } else {
    const aksamaEtiketi = BAKIM_KAYDI_DURUM_ADLARI[sonAksama!.durum].toLocaleLowerCase('tr-TR');
    ozet = `Tamamlanmış bakım kaydı yok (${sonAksama!.tarih.ifade}: ${aksamaEtiketi}). ${
      secilenTarih ? `${secilenTarih.ifade} tarihinde: ${durumEtiketi}.` : `Durum: ${durumEtiketi}.`
    }`;
  }

  const dayanakParcalari: string[] = [];
  if (sonYapildi) {
    dayanakParcalari.push(`Son tamamlanan bakım kaydı: ${sonYapildi.tarih.ifade}`);
  }
  if (sonAksama) {
    dayanakParcalari.push(
      `Son aksayan bakım kaydı: ${sonAksama.tarih.ifade} (${BAKIM_KAYDI_DURUM_ADLARI[sonAksama.durum].toLocaleLowerCase('tr-TR')})`,
    );
  }
  dayanakParcalari.push(`Sıklık: ${siklikYazisi(tanim.siklik)}`);
  if (tanim.kesintiSuresi) {
    dayanakParcalari.push(`Kesinti süresi: ${sureYazisi(tanim.kesintiSuresi)}`);
  }

  return {
    tanim,
    sonYapildi,
    sonrakiAralik,
    durum,
    durumEtiketi,
    kesinti,
    ozet,
    dayanak: dayanakParcalari.join(' · '),
    not: BAKIM_SONUC_NOTU,
    uzmanNotlari,
  };
}

export function bakimDurumu(e: EvrenVt, kayitKodu: string, tarihIfadesi: string | null = null): BakimDurumuSonucu {
  const dosya = bakimOku(e, kayitKodu, false);
  const zamanSeti = zamanSetiOku(e.db);
  const temizIfade = typeof tarihIfadesi === 'string' ? tarihIfadesi.replace(/\s+/g, ' ').trim() : '';
  const tarihSoruldu = temizIfade.length > 0;
  const secilenTarih = tarihSoruldu ? tarihCoz(temizIfade, zamanSeti) : null;

  // Vazgeçilmiş tanımlar ve silinmiş tanımlar hesaba girmez.
  const etkinTanimlar = dosya.tanimlar.filter((t) => t.silindi === null && t.karar !== 'vazgecildi');
  const tanimlar = etkinTanimlar.map((t) => bakimTanimiDurumuHesapla(e, t, secilenTarih, tarihSoruldu, zamanSeti));

  return {
    kayit: dosya.kayit,
    tarih: secilenTarih,
    tanimlar,
    not: BAKIM_SONUC_NOTU,
  };
}

export function bakimUzmanligi(e: EvrenVt, kayitKodu: string): BakimUzmanligiSonucu {
  const hedef = aktifKayitKontrol(e, kayitKodu);
  const uzmanOldugu: BakimUzmanligiSonucu['uzmanOldugu'] = [];
  const malzemeOldugu: BakimUzmanligiSonucu['malzemeOldugu'] = [];

  const satirlar = e.db.selectObjects(
    `SELECT * FROM bakim_tanimlari WHERE silindi IS NULL AND karar <> 'vazgecildi' ORDER BY olusturma ASC`,
  );

  for (const r of satirlar) {
    const sahipKod = yonlendir(e.db, r.kayit as string);
    const sahipRow = e.db.selectObject(
      `SELECT kod, ad, tur FROM kayitlar WHERE kod=? AND silindi IS NULL AND karar <> 'vazgecildi'`,
      [sahipKod],
    );
    if (!sahipRow) continue;
    const yer: KisaKayit = { kod: sahipRow.kod as string, ad: sahipRow.ad as string, tur: sahipRow.tur as string };
    const siklik = r.siklik ? (JSON.parse(r.siklik as string) as BakimSuresi) : null;
    const tanimKod = r.kod as string;
    const ad = r.ad as string;
    const kesinti = (r.kesinti as string) ?? '';

    const uzmanlar = (JSON.parse((r.uzmanlar as string) || '[]') as string[]).map((u) => yonlendir(e.db, u));
    if (uzmanlar.includes(hedef.kod)) {
      uzmanOldugu.push({ tanimKod, ad, siklik, kesinti, yer });
    }

    const malzemeler = JSON.parse((r.malzemeler as string) || '[]') as BakimMalzemesi[];
    for (const m of malzemeler) {
      if (m.kayit && yonlendir(e.db, m.kayit) === hedef.kod) {
        malzemeOldugu.push({ tanimKod, ad, siklik, metin: m.metin ?? '', yer });
        break;
      }
    }
  }

  return {
    kayit: hedef,
    uzmanOldugu,
    malzemeOldugu,
  };
}

export function catismaSatiri(
  e: EvrenVt,
  nesne: string,
  alan: string,
  degerler: { islem: string; deger: unknown; yazi?: string; kurulum: string; zaman: number }[],
  kayitAdi: (k: string) => string,
): Catisma {
  if (alan === 'bakim_tanim' || alan === 'bakim_tanim_silindi') {
    const r = e.db.selectObject('SELECT kayit, ad FROM bakim_tanimlari WHERE kod=?', [nesne]);
    const sahip = r ? (r.kayit as string) : null;
    return {
      tur: 'alan',
      nesne,
      alan,
      nesneTuru: 'kayit',
      kayit: sahip,
      baslik: r ? `${kayitAdi(sahip!)} · ${r.ad as string}` : 'Bakım tanımı',
      alanEtiketi: alan === 'bakim_tanim' ? 'Bakım tanımı' : 'Bakım tanımının kaldırılması',
      degerler: degerler.map((d) => {
        if (alan === 'bakim_tanim_silindi') return { ...d, yazi: d.deger ? 'Evet' : 'Hayır' };
        const t = d.deger as BakimTanimi | null;
        return {
          ...d,
          yazi: t
            ? [t.ad, siklikYazisi(t.siklik ?? null), t.bedel, t.kesinti].filter(Boolean).join(' · ')
            : '(boş)',
        };
      }),
    };
  }
  const r = e.db.selectObject(
    'SELECT k.kayit, t.ad FROM bakim_kayitlari k LEFT JOIN bakim_tanimlari t ON t.kod=k.tanim WHERE k.kod=?',
    [nesne],
  );
  const sahip = r ? (r.kayit as string) : null;
  return {
    tur: 'alan',
    nesne,
    alan,
    nesneTuru: 'kayit',
    kayit: sahip,
    baslik: r ? `${kayitAdi(sahip!)} · ${(r.ad as string) ?? 'Bakım kaydı'}` : 'Bakım kaydı',
    alanEtiketi: alan === 'bakim_kaydi' ? 'Bakım kaydı' : 'Bakım kaydının kaldırılması',
    degerler: degerler.map((d) => {
      if (alan === 'bakim_kaydi_silindi') return { ...d, yazi: d.deger ? 'Evet' : 'Hayır' };
      const k = d.deger as { tarih?: { ifade?: string }; durum?: BakimKaydiDurumu; not?: string } | null;
      return {
        ...d,
        yazi: k
          ? [
              k.tarih?.ifade ?? '',
              k.durum ? BAKIM_KAYDI_DURUM_ADLARI[k.durum] : '',
              k.not ?? '',
            ]
              .filter(Boolean)
              .join(' · ')
          : '(boş)',
      };
    }),
  };
}

export function catismaCozumGirdisi(nesne: string, alan: string, deger: unknown): IslemGirdisi {
  if (alan === 'bakim_tanim') {
    const t = deger as Record<string, unknown>;
    return { tur: 'bakim_tanim_yaz', veri: { kod: nesne, ...t, cozum: true } };
  }
  if (alan === 'bakim_tanim_silindi') {
    return { tur: deger ? 'bakim_tanim_sil' : 'bakim_tanim_geri_yukle', veri: { kod: nesne, cozum: true } };
  }
  if (alan === 'bakim_kaydi') {
    const k = deger as Record<string, unknown>;
    return { tur: 'bakim_kaydi_yaz', veri: { kod: nesne, ...k, cozum: true } };
  }
  return { tur: deger ? 'bakim_kaydi_sil' : 'bakim_kaydi_geri_yukle', veri: { kod: nesne, cozum: true } };
}
