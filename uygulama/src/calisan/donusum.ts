// F25: dönüşüm ve geri alma tek, bölünmez bir bildirimdir. Devirler yalnızca yazarın beyanıdır;
// ilişkiler, kaynaklar ve yeni devam kayıtları geri almada da silinmez. Olay bağlantısı bilgi amaçlıdır;
// tarih bağımsız saklanır. Adlardan anlam çıkarılmaz ve editoryal yönlendirme kullanılmaz.
import { kodGecerliMi, yeniKod } from '../alan/kod';
import { turGecerli } from '../alan/turler';
import { tarihCoz } from '../alan/tarih';
import { iliskiTuruBul } from '../alan/iliski-turleri';
import type { IslemGirdisi } from '../alan/islem';
import type { DonusumDegeri, DonusumGirdisi, DonusumYeniKaydi, DonusumOkumasi, DonusumSecenekleri, KisaKayit } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir, zamanSetiOku } from './izdusum';

export interface DonusumBaglami {
  e: EvrenVt;
  yaz(girdiler: IslemGirdisi[], kayitlar: string[]): void;
  kayitGirdileri(kod: string, v: { ad: string; tur: string; karar: string; ozet: string }): IslemGirdisi[];
}
const BICIMLER = ['birlesme', 'bolunme', 'donusum'];
const DEVIRLER = ['uyeler', 'esya', 'haklar', 'ad', 'adlandirilan', 'iliski'];
const metin = (v: unknown, en: number, zorunlu = false) => {
  if (typeof v !== 'string' || v.length > en || (zorunlu && !v.trim())) throw new Error('Metni ve uzunluğunu kontrol edin.');
  return v.trim();
};
function aktif(e: EvrenVt, kod: string): void {
  if (!kodGecerliMi(kod) || !e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod])) throw new Error('Kayıt bulunamadı ya da silinmiş.');
}
export function ilgili(t: DonusumDegeri): string[] { return [...new Set([...t.tanim.kaynaklar, ...t.tanim.hedefler, ...(t.tanim.olay ? [t.tanim.olay] : [])])]; }
function oku(e: EvrenVt, kod: string): DonusumDegeri {
  const v = e.db.selectValue('SELECT deger FROM donusum_kayitlari WHERE kod=?', [kod]);
  if (typeof v !== 'string') throw new Error('Dönüşüm bulunamadı.');
  return JSON.parse(v) as DonusumDegeri;
}
export function secenekler(e: EvrenVt): DonusumSecenekleri {
  return {
    kayitlar: e.db.selectObjects('SELECT kod, ad, tur FROM kayitlar WHERE silindi IS NULL ORDER BY ad, kod') as unknown as KisaKayit[],
    iliskiler: e.db.selectObjects(`SELECT i.kod,i.a,i.b,i.tur,a.ad aa,b.ad ba FROM iliskiler i
      JOIN kayitlar a ON a.kod=i.a JOIN kayitlar b ON b.kod=i.b WHERE i.silindi IS NULL AND a.silindi IS NULL AND b.silindi IS NULL ORDER BY i.kod`)
      .map((r) => ({ kod: String(r.kod), a: String(r.a), b: String(r.b), ad: `${r.aa} — ${iliskiTuruBul(String(r.tur)).aIcin} — ${r.ba}` })),
  };
}
export function yaz(b: DonusumBaglami, kod: string | null, t: DonusumGirdisi, yeniler: DonusumYeniKaydi[] = []) {
  if (!t || !BICIMLER.includes(t.bicim) || !Array.isArray(t.kaynaklar) || !Array.isArray(t.hedefler) || !Array.isArray(t.devirler) || !Array.isArray(yeniler)) throw new Error('Dönüşüm seçimi geçersiz.');
  if (t.kaynaklar.length > 50 || t.hedefler.length > 50 || t.devirler.length > 200 || yeniler.length > 50) throw new Error('Çok fazla seçim var.');
  // Birleştirilmiş kayıtların eski kodları birleştikleri kayda çevrilir.
  const y = (k: unknown) => typeof k === 'string' ? yonlendir(b.e.db, k) : k as string;
  t = { ...t, kaynaklar: t.kaynaklar.map(y), hedefler: t.hedefler.map(y), olay: t.olay ? y(t.olay) : t.olay,
    devirler: t.devirler.map((d) => d && typeof d === 'object' ? { ...d, kaynak: y(d.kaynak), hedef: y(d.hedef) } : d) };
  const kaynaklar = [...new Set(t.kaynaklar)], hedefler = [...new Set(t.hedefler)];
  if (kaynaklar.length !== t.kaynaklar.length || hedefler.length !== t.hedefler.length) throw new Error('Aynı kayıt iki kez seçilemez.');
  const uygun = t.bicim === 'birlesme' ? kaynaklar.length >= 2 && hedefler.length === 1
    : t.bicim === 'bolunme' ? kaynaklar.length === 1 && hedefler.length >= 2 : kaynaklar.length === 1 && hedefler.length === 1;
  if (!uygun) throw new Error('Birleşmede en az iki önceki ve bir devam; bölünmede bir önceki ve en az iki devam; dönüşümde birer kayıt seçin.');
  if (kaynaklar.some((k) => hedefler.includes(k))) throw new Error('Bir kayıt kendisinin devamı olamaz.');
  kaynaklar.forEach((k) => aktif(b.e, k));
  if (kod) { if (!kodGecerliMi(kod)) throw new Error('Dönüşüm bulunamadı.'); oku(b.e, kod); }
  const yeniKodlar = new Set<string>();
  const yeniGirdiler: IslemGirdisi[] = [];
  for (const y of yeniler) {
    if (!y || !kodGecerliMi(y.kod) || yeniKodlar.has(y.kod) || !hedefler.includes(y.kod) || b.e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=?', [y.kod])) throw new Error('Yeni devam kaydı geçersiz.');
    if (!turGecerli(y.tur)) throw new Error('Yeni kaydın türünü seçin.');
    yeniKodlar.add(y.kod);
    yeniGirdiler.push(...b.kayitGirdileri(y.kod, { ad: metin(y.ad, 200, true), tur: y.tur, karar: 'kesin', ozet: '' }));
  }
  hedefler.filter((k) => !yeniKodlar.has(k)).forEach((k) => aktif(b.e, k));
  const ifade = metin(t.tarih, 200, true), tarih = tarihCoz(ifade, zamanSetiOku(b.e.db));
  if (!tarih) throw new Error('Dönüşümün tarihini yazın.');
  const olay = t.olay ?? null;
  if (olay) {
    aktif(b.e, olay);
    if (b.e.db.selectValue('SELECT tur FROM kayitlar WHERE kod=?', [olay]) !== 'olay') throw new Error('Bağlantı için bir olay seçin.');
  }
  const iliskiler = secenekler(b.e).iliskiler;
  const devirler = t.devirler.map((d) => {
    if (!d || !kaynaklar.includes(d.kaynak) || !hedefler.includes(d.hedef) || !DEVIRLER.includes(d.tur)) throw new Error('Devrin önceki ve devam kaydını seçin.');
    const aciklama = metin(d.aciklama, 300, d.tur === 'adlandirilan');
    if (d.tur === 'iliski') {
      const i = iliskiler.find((i) => i.kod === d.iliski);
      if (!i || (i.a !== d.kaynak && i.b !== d.kaynak)) throw new Error('Önceki kaydın mevcut ilişkilerinden birini seçin.');
      // Seçildiği günkü açıklama da korunur; ilişki daha sonra değişse bile beyan değişmez.
      return { kaynak: d.kaynak, hedef: d.hedef, tur: d.tur, aciklama: i.ad, iliski: i.kod };
    }
    if (d.iliski) throw new Error('İlişki devri için ilişki seçeneğini kullanın.');
    return { kaynak: d.kaynak, hedef: d.hedef, tur: d.tur, aciklama, iliski: null };
  });
  const deger: DonusumDegeri = { tanim: { bicim: t.bicim, kaynaklar, hedefler, tarih, olay, devirler, not: metin(t.not, 1000) }, geriAlindi: false };
  const onceki = kod ? oku(b.e, kod) : null;
  if (onceki && JSON.stringify(onceki) === JSON.stringify(deger) && !catismali(b.e, kod!)) return { kod: kod! };
  const yeni = kod ?? yeniKod();
  if (b.e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=?', [yeni]) || yeniKodlar.has(yeni)) throw new Error('Dönüşüm kimliği başka bir kayıtta kullanılıyor.');
  b.yaz([...yeniGirdiler, { tur: 'donusum_yaz', veri: { kod: yeni, deger } }], [...new Set([...ilgili(deger), ...(onceki ? ilgili(onceki) : [])])]);
  return { kod: yeni };
}
export function geriAl(b: DonusumBaglami, kod: string) {
  const onceki = oku(b.e, kod);
  if (onceki.geriAlindi && !catismali(b.e, kod)) return;
  b.yaz([{ tur: 'donusum_geri_al', veri: { kod, deger: { ...onceki, geriAlindi: true } } }], ilgili(onceki));
}
function catismali(e: EvrenVt, kod: string): boolean {
  return Number(e.db.selectValue("SELECT count(DISTINCT deger) FROM alan_yazanlari WHERE nesne=? AND alan='donusum_degeri'", [kod])) > 1;
}
export function liste(e: EvrenVt, kayit: string): DonusumOkumasi[] {
  kayit = yonlendir(e.db, kayit);
  const kisa = (eski: string): KisaKayit => {
    const kod = yonlendir(e.db, eski);
    const r = e.db.selectObject('SELECT ad,tur,silindi FROM kayitlar WHERE kod=?', [kod]);
    return { kod, ad: r ? `${r.ad}${r.silindi !== null ? ' (silinmiş)' : ''}` : 'Bulunamayan kayıt', tur: String(r?.tur ?? 'diger') };
  };
  return e.db.selectObjects('SELECT kod,deger FROM donusum_kayitlari ORDER BY kod').flatMap((r) => {
    const kod = String(r.kod), d = JSON.parse(String(r.deger)) as DonusumDegeri;
    // Kaybeden eşzamanlı yazımın katılımcıları da inceleme ve çözüm yolunu görebilir.
    const varyantlar = e.db.selectObjects("SELECT deger FROM alan_yazanlari WHERE nesne=? AND alan='donusum_degeri'", [kod]);
    const ilgiliMi = (x: DonusumDegeri) => ilgili(x).some((k) => yonlendir(e.db, k) === kayit);
    if (!ilgiliMi(d) && !varyantlar.some((v) => ilgiliMi(JSON.parse(String(v.deger)) as DonusumDegeri))) return [];
    const tanim = { ...d.tanim, kaynaklar: d.tanim.kaynaklar.map((k) => yonlendir(e.db, k)), hedefler: d.tanim.hedefler.map((k) => yonlendir(e.db, k)),
      olay: yonlendir(e.db, d.tanim.olay), devirler: d.tanim.devirler.map((v) => ({ ...v, kaynak: yonlendir(e.db, v.kaynak), hedef: yonlendir(e.db, v.hedef) })) };
    return [{ kod, ...d, tanim, kaynaklar: d.tanim.kaynaklar.map(kisa), hedefler: d.tanim.hedefler.map(kisa), olay: d.tanim.olay ? kisa(d.tanim.olay) : null, catismali: catismali(e, kod) }];
  }).sort((a, b) => (a.tanim.tarih.eksen?.enErken ?? Infinity) - (b.tanim.tarih.eksen?.enErken ?? Infinity) || a.kod.localeCompare(b.kod));
}
export function catismaYazisi(d: DonusumDegeri, ad: (k: string) => string): string {
  return `${d.geriAlindi ? 'Geri alındı' : ({ birlesme: 'Birleşme', bolunme: 'Bölünme', donusum: 'Dönüşüm' })[d.tanim.bicim]} · ${d.tanim.tarih.ifade} · ${d.tanim.kaynaklar.map(ad).join(', ')} → ${d.tanim.hedefler.map(ad).join(', ')} · ${d.tanim.olay ? `Olay: ${ad(d.tanim.olay)}` : 'Olay bağlantısı yok'} · ${d.tanim.devirler.map((v) => `${ad(v.kaynak)} → ${ad(v.hedef)}: ${v.tur === 'adlandirilan' || v.tur === 'iliski' ? '' : ({ uyeler: 'Üyeler', esya: 'Eşya', haklar: 'Haklar', ad: 'Adı' })[v.tur]} ${v.aciklama}`).join('; ')} · ${d.tanim.not}`;
}
