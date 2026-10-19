// Kişi, kimlik ve beden (F06, §3.12). Bir kimlik ("Kara Tilki") ayrı bir kayıttır; kişiyle bağı tarihli bir
// ilişkidir ("kullandığı kimlik"), bir kimliği birden çok kişi, bir kişi birden çok kimliği kullanabilir. Yazar
// görünümünde kimlikler kişide birleşir: kişinin sayfası kimliklerinin olay ve sahnelerini de gösterir. Okur
// görünümü yayına bağlıdır (§11.2) ve burada yoktur. Kişiyi iki kimliğe ayırmak ya da iki kaydı bir kişinin iki
// kimliği olarak birleştirmek tek işlem grubudur ve önce önizlenir; eski metinlerdeki adlar değişmez.
// Beden olayları (ölüm, bedensiz dönem, dirilme, beden değişimi) olaydaki rollerdir; denetim dirilmeyi tanır (§9.1).
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { iliskiTuruBul } from '../alan/iliski-turleri';
import { turBul } from '../alan/turler';
import type { EvrenTarihi } from '../alan/tarih';
import type { IslemGirdisi } from '../alan/islem';
import type { KimlikAyirmaAdayi, KimlikBilgisi, KimlikKullanimi, KisaKayit } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir } from './izdusum';

export const KISI_TURU = 'karakter', KIMLIK_TURU = 'kimlik', KIMLIK_ILISKISI = 'kimligi';

export interface KimlikBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
  kayitGirdileri(kod: string, ad: string, tur: string): IslemGirdisi[];
  tarih(ifade: string): EvrenTarihi | null;
}

const kayit = (e: EvrenVt, kod: unknown, hata = 'Kayıt bulunamadı.') => {
  const k = kodGecerliMi(kod) ? yonlendir(e.db, kod) : null;
  const r = k ? e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [k]) : undefined;
  if (!r) throw new Error(hata);
  return { kod: r.kod as string, ad: r.ad as string, tur: r.tur as string };
};
const ifade = (s: unknown) => (s ? (JSON.parse(s as string) as EvrenTarihi | null)?.ifade ?? '' : '');

function katilimlar(e: EvrenVt, kod: string) {
  const l = e.db.selectObjects(`SELECT i.tur, k.kod, k.ad, k.tur ktur FROM iliskiler i JOIN kayitlar k ON k.kod=i.b
    WHERE i.a=? AND i.tur IN ('olayda','sahnede') AND i.silindi IS NULL AND k.silindi IS NULL ORDER BY k.ad`, [kod]);
  const kisa = (r: Record<string, unknown>): KisaKayit => ({ kod: r.kod as string, ad: r.ad as string, tur: r.ktur as string });
  return { olaylar: l.filter((r) => r.tur === 'olayda').map(kisa), sahneler: l.filter((r) => r.tur === 'sahnede').map(kisa) };
}

function kullanimlar(e: EvrenVt, alan: 'a' | 'b', kod: string): KimlikKullanimi[] {
  return e.db.selectObjects(`SELECT i.kod, i.a, i.b, i.baslangic, i.bitis FROM iliskiler i JOIN kayitlar p ON p.kod=i.a JOIN kayitlar k ON k.kod=i.b
      WHERE i.tur=? AND i.${alan}=? AND i.silindi IS NULL AND p.silindi IS NULL AND k.silindi IS NULL ORDER BY i.olusturma, i.kod`, [KIMLIK_ILISKISI, kod]).map((r) => ({
    iliski: r.kod as string, kisi: kayit(e, r.a), kimlik: kayit(e, r.b), baslangic: ifade(r.baslangic), bitis: ifade(r.bitis),
    ...katilimlar(e, r.b as string),
  }));
}

export function kimlikBilgisi(e: EvrenVt, kod: string): KimlikBilgisi {
  const k = kayit(e, kod);
  return { kayit: k, kimlikler: kullanimlar(e, 'a', k.kod), kullananlar: kullanimlar(e, 'b', k.kod) };
}

/** Ayrılırken yeni kimliğe taşınabilecek bağlar: kişinin öbür kayıtlarla ilişkileri (kimlik bağları hariç). */
export function kimlikAyirmaAdaylari(e: EvrenVt, kisi: string): KimlikAyirmaAdayi[] {
  const k = kayit(e, kisi);
  kisi = k.kod;
  if (k.tur !== KISI_TURU) throw new Error('Yalnızca bir karakter kimliklere ayrılabilir.');
  return e.db.selectObjects(`SELECT i.kod, i.tur, i.a, i.b, o.ad FROM iliskiler i JOIN kayitlar o ON o.kod=(CASE WHEN i.a=? THEN i.b ELSE i.a END)
      WHERE (i.a=? OR i.b=?) AND i.tur<>? AND i.silindi IS NULL AND o.silindi IS NULL ORDER BY i.tur, o.ad`, [kisi, kisi, kisi, KIMLIK_ILISKISI]).map((r) => {
    const t = iliskiTuruBul(r.tur as string);
    return { iliski: r.kod as string, baslik: `${r.a === kisi ? t.aIcin : t.bIcin}: ${r.ad}` };
  });
}

/** Kişinin seçilen bağlarını yeni bir kimliğe taşır; kişi ile kimlik arasında "kullandığı kimlik" kurulur. */
export function kimlikAyir(b: KimlikBaglami, kisi: string, ad: string, iliskiler: string[], baslangic: string, bitis: string) {
  const k = kayit(b.e, kisi);
  kisi = k.kod;
  if (k.tur !== KISI_TURU) throw new Error('Yalnızca bir karakter kimliklere ayrılabilir.');
  const adaylar = new Set(kimlikAyirmaAdaylari(b.e, kisi).map((x) => x.iliski));
  if (!Array.isArray(iliskiler) || iliskiler.some((x) => !adaylar.has(x))) throw new Error('Taşınacak bağlardan biri bulunamadı.');
  const kimlik = yeniKod();
  const girdiler = [...b.kayitGirdileri(kimlik, ad, KIMLIK_TURU), kimlikBagi(b, kisi, kimlik, baslangic, bitis)];
  const ilgili = new Set([kisi, kimlik]);
  for (const kod of new Set(iliskiler)) {
    const r = b.e.db.selectObject('SELECT * FROM iliskiler WHERE kod=?', [kod])!;
    const a = r.a === kisi ? kimlik : r.a as string, bb = r.b === kisi ? kimlik : r.b as string;
    const yeniIliski = yeniKod();
    girdiler.push({ tur: 'iliski_sil', veri: { kod, a: r.a, b: r.b, iliski: r.tur } });
    girdiler.push({ tur: 'iliski_ekle', veri: {
      kod: yeniIliski, tur: r.tur, a, b: bb, ...(r.rol ? { rol: r.rol } : {}), karar: r.karar, aciklama: r.aciklama,
      baslangic: r.baslangic ? JSON.parse(r.baslangic as string) : null, bitis: r.bitis ? JSON.parse(r.bitis as string) : null,
    } });
    if (r.gorunurluk) girdiler.push({ tur: 'gorunurluk_yaz', veri: { nesne: 'iliski', kod: yeniIliski, deger: JSON.parse(r.gorunurluk as string) } });
    ilgili.add(r.a as string); ilgili.add(r.b as string);
  }
  b.yaz(girdiler, [...ilgili]);
  return { kod: kimlik };
}

function kimlikBagi(b: KimlikBaglami, kisi: string, kimlik: string, baslangic: string, bitis: string): IslemGirdisi {
  return { tur: 'iliski_ekle', veri: { kod: yeniKod(), tur: KIMLIK_ILISKISI, a: kisi, b: kimlik, karar: 'kesin', aciklama: '', baslangic: b.tarih(baslangic), bitis: b.tarih(bitis) } };
}

/** İki kaydı bir kişinin iki kimliği olarak birleştirmenin önizlemesi: yapılacaklar sırayla. */
export function kimlikBirlestirOnizle(e: EvrenVt, kisi: string, diger: string): string[] {
  const k = kayit(e, kisi), d = kayit(e, diger);
  if (k.kod === d.kod) throw new Error('Aynı kayıt seçildi.');
  if (k.tur !== KISI_TURU) throw new Error('Kimliği kullanan kayıt bir karakter olmalı.');
  if (d.tur !== KISI_TURU && d.tur !== KIMLIK_TURU) throw new Error('Kimlik olacak kayıt bir karakter ya da kimlik olmalı.');
  if (kullanimlar(e, 'a', k.kod).some((x) => x.kimlik.kod === d.kod)) throw new Error(`“${d.ad}” zaten ${k.ad} kişisinin kimliği.`);
  if (kullanimlar(e, 'a', d.kod).length) throw new Error(`“${d.ad}” kendisi başka kimlikler kullanıyor; önce o bağları kaldırın.`);
  const l: string[] = [];
  if (d.tur !== KIMLIK_TURU) l.push(`“${d.ad}” kaydının türü ${turBul(d.tur).ad} → Kimlik olur. Kaydın kendisi, geçmişi, ilişkileri ve metinleri yerinde kalır.`);
  l.push(`${k.ad} ile “${d.ad}” arasında “kullandığı kimlik” bağı kurulur.`);
  const { olaylar, sahneler } = katilimlar(e, d.kod);
  if (olaylar.length || sahneler.length) l.push(`“${d.ad}” olarak yer aldığı ${olaylar.length} olay ve ${sahneler.length} sahne ${k.ad} kişisinin sayfasında da görünür.`);
  const beden = e.db.selectValue("SELECT count(*) FROM alan_degerleri WHERE kayit=? AND alan IN ('dogum','olum')", [d.kod]) as number;
  if (beden) l.push(`“${d.ad}” kaydındaki doğum ve ölüm tarihleri silinmez; bir kimliğin bedeni olmadığı için denetimlerde kullanılmaz.`);
  l.push('Eski metinlerdeki adlar değişmez.');
  return l;
}

export function kimlikBirlestir(b: KimlikBaglami, kisi: string, diger: string, baslangic: string, bitis: string) {
  kimlikBirlestirOnizle(b.e, kisi, diger);
  kisi = kayit(b.e, kisi).kod;
  const d = kayit(b.e, diger);
  const girdiler: IslemGirdisi[] = [];
  if (d.tur !== KIMLIK_TURU) girdiler.push({ tur: 'kayit_degistir', veri: { kod: d.kod, alan: 'tur', deger: KIMLIK_TURU, onceki: d.tur } });
  girdiler.push(kimlikBagi(b, kisi, d.kod, baslangic, bitis));
  b.yaz(girdiler, [kisi, d.kod]);
}
