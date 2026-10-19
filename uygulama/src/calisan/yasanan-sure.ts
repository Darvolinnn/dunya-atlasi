// Akışta kalış yalnızca yapısal kayıtlardan okunur: akışa bağlı bir yerde (ya da onun parçasında) "orada yaşayan"
// ilişkisi; bitişi yoksa bakılan ana kadar sürer. Durum özelliklerinin adları yorumlanmaz (alan anlamı adına bağlı
// değildir, §18). Fiziksel katılım yalnızca o anda akışta bulunduğunu gösterir, süre bildirmez; iki olay arası doldurulmaz.
import { karsilastir, tarihCoz, type EvrenTarihi } from '../alan/tarih';
import { yasHesapla } from '../alan/yas';
import { yasananSureHesapla, type AkistaKalma, type AkisGozlemi, type YasananSure } from '../alan/yasanan-sure';
import type { DurumBaglami } from './durum';
import { tarihDegeri } from './sablon';
import { yonlendir, zamanSetiOku } from './izdusum';

export function kisiYasananSure(b: DurumBaglami, kisi: string, an: EvrenTarihi | null, anKodu?: string): YasananSure {
  const e = b.e, z = zamanSetiOku(e.db), kod = yonlendir(e.db, kisi);
  const baglam: DurumBaglami = { ...b, olayTarihi: (k) => b.olayTarihi(yonlendir(e.db, k)) };
  // Çözülmemiş çatışma: aynı alana birbirini görmeden yazılmış farklı değerler (yalnızca ilgili nesneler sorulur).
  const varMi = (k: string, a?: string) => e.db.selectValue(`SELECT 1 FROM alan_yazanlari WHERE nesne=? ${a ? 'AND alan=?' : ''} GROUP BY alan HAVING count(DISTINCT deger)>1 LIMIT 1`, a ? [k, a] : [k]) !== undefined;
  const tarihCatismali = (k: string) => {
    const r = e.db.selectValue('SELECT sahne_olayi FROM kayitlar WHERE kod=?', [k]) as string | undefined;
    return varMi(k, 'tarih') || !!r && varMi(r, 'tarih');
  };
  const dogum = tarihDegeri(e, kod, 'dogum'), olum = tarihDegeri(e, kod, 'olum');
  const kalislar: AkistaKalma[] = [], gozlemler: AkisGozlemi[] = [], nedenler: string[] = [];
  if (dogum?.akis) gozlemler.push({ akis: dogum.akis, tarih: dogum, dayanak: 'Doğum tarihi' });
  const tarih = (k: string) => baglam.olayTarihi(k);
  const ad = (k: string) => e.db.selectValue('SELECT ad FROM kayitlar WHERE kod=?', [k]) as string | undefined ?? 'Kayıt';
  const sonradan = (t: EvrenTarihi | null) => !!an && !!t && karsilastir(t, an) === 'sonra';
  const yerAkislari = (yer: string) => {
    const yerler = [yonlendir(e.db, yer)];
    for (let i = 0; i < yerler.length; i++) {
      for (const r of e.db.selectObjects("SELECT b FROM iliskiler WHERE a=? AND tur='parca' AND silindi IS NULL AND bitis IS NULL AND karar<>'vazgecildi'", [yerler[i]])) {
        const k = yonlendir(e.db, r.b as string); if (!yerler.includes(k)) yerler.push(k);
      }
    }
    return z.akislar.filter((a) => a.bagli && yerler.includes(yonlendir(e.db, a.bagli)));
  };
  // Yalnızca yapısal ikamet ilişkisi; üyelik, sahiplik ve bir yeri bilmek bulunma sayılmaz.
  for (const r of e.db.selectObjects("SELECT kod,b,baslangic,bitis FROM iliskiler WHERE a=? AND tur='yasar' AND silindi IS NULL AND karar<>'vazgecildi'", [kod])) {
    const bas = r.baslangic ? JSON.parse(r.baslangic as string) as EvrenTarihi : null;
    if (sonradan(bas)) continue;
    const bit = r.bitis ? JSON.parse(r.bitis as string) as EvrenTarihi : an;
    for (const akis of yerAkislari(r.b as string)) {
      if (varMi(r.kod as string)) nedenler.push('İkamet ilişkisinin iki cihazda farklı değerleri var ve henüz biri seçilmedi.');
      kalislar.push({ akis: akis.kod, baslangic: bas, bitis: bit, dayanak: `İkamet: ${ad(r.b as string)}` });
    }
  }
  for (const r of e.db.selectObjects(`SELECT i.kod,i.b,i.tur FROM iliskiler i JOIN kayitlar k ON k.kod=i.b
    WHERE i.a=? AND i.silindi IS NULL AND i.karar<>'vazgecildi' AND k.silindi IS NULL AND k.karar<>'vazgecildi'
    AND ((i.tur='sahnede' AND i.rol='bulunuyor') OR (i.tur='olayda' AND i.rol IN ('baslatan','katilan','tanik','zarar')))`, [kod])) {
    const t = tarih(r.b as string); if (sonradan(t) && !tarihCatismali(r.b as string)) continue;
    if (tarihCatismali(r.b as string)) nedenler.push('Katıldığı olayın tarihi iki cihazda farklı ve henüz biri seçilmedi.');
    if (t?.akis && varMi(r.kod as string)) nedenler.push('Katılım bilgisinin iki cihazda farklı değerleri var ve henüz biri seçilmedi.');
    gozlemler.push({ akis: t?.akis ?? null, tarih: t, dayanak: `Fiziksel katılım: ${ad(r.b as string)}` });
  }
  // Bir durum sınırı akış tarihindeyse, kendi ifadesi de yeniden çözülür; oran değişince eski hesap kullanılmaz.
  for (const s of kalislar) for (const alan of ['baslangic', 'bitis'] as const) {
    const t = s[alan]; if (t?.akis && t.bicim !== 'goreli') s[alan] = tarihCoz(t.ifade, z);
  }
  const baskaAkis = kalislar.length > 0 || gozlemler.some((g) => g.akis);
  if (baskaAkis) {
    for (const a of z.akislar) if ((kalislar.some((k) => k.akis === a.kod) || gozlemler.some((g) => g.akis === a.kod)) && varMi('evren', `akis:${a.kod}`)) nedenler.push(`“${a.ad}” zaman akışının iki cihazda farklı değerleri var ve henüz biri seçilmedi.`);
    if (varMi('evren', 'takvim')) nedenler.push('Takvimin iki cihazda farklı değerleri var ve henüz biri seçilmedi.');
  }
  const dogumBelirsiz = varMi(kod, 'f:dogum');
  const anBelirsiz = !!anKodu && tarihCatismali(anKodu);
  if (dogumBelirsiz) nedenler.push('Doğum tarihi için iki farklı değer var ve henüz biri seçilmedi. Bu yüzden takvim yaşı da belirlenemiyor.');
  if (anBelirsiz) nedenler.push('Bakılan olay için iki farklı tarih var ve henüz biri seçilmedi. Bu yüzden takvim yaşı da belirlenemiyor.');
  if (varMi(kod, 'f:olum') && baskaAkis) nedenler.push('Ölüm tarihi için iki farklı değer var ve henüz biri seçilmedi.');
  const bitis = olum && an && karsilastir(olum, an) === 'once' ? olum : an;
  const sonuc = yasananSureHesapla(dogumBelirsiz ? null : dogum, bitis, z, kalislar, gozlemler, [...new Set(nedenler)]);
  sonuc.tarih = an?.ifade ?? null;
  sonuc.takvimYasi = dogumBelirsiz || anBelirsiz ? null : yasHesapla(dogum, an, olum, z)?.metin ?? null;
  sonuc.takvimBelirsiz = dogumBelirsiz || anBelirsiz;
  return sonuc;
}
