// En sade yorum: mekân hedefli, adı birebir Konum/İkamet olan durumlar ve yasar ilişkileri kalış bildirir.
// Diğer özellik adları ve anlatı metni yorumlanmaz. Anlık katılım süre bildirmez; iki olay arası doldurulmaz.
import { karsilastir, tarihCoz, type EvrenTarihi } from '../alan/tarih';
import { yasHesapla } from '../alan/yas';
import { yasananSureHesapla, type AkistaKalma, type AkisGozlemi, type YasananSure } from '../alan/yasanan-sure';
import { durumlar, type DurumBaglami } from './durum';
import { tarihDegeri } from './sablon';
import { yonlendir, zamanSetiOku } from './izdusum';

export function kisiYasananSure(b: DurumBaglami, kisi: string, an: EvrenTarihi | null, anKodu?: string): YasananSure {
  const e = b.e, z = zamanSetiOku(e.db), kod = yonlendir(e.db, kisi);
  const baglam: DurumBaglami = { ...b, olayTarihi: (k) => b.olayTarihi(yonlendir(e.db, k)) };
  const catisma = new Set(e.db.selectObjects('SELECT nesne,alan FROM alan_yazanlari GROUP BY nesne,alan HAVING count(DISTINCT deger)>1').map((r) => `${r.nesne}\u0000${r.alan}`));
  const varMi = (k: string, a?: string) => a ? catisma.has(`${k}\u0000${a}`) : [...catisma].some((s) => s.startsWith(k + '\u0000'));
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
  for (const s of durumlar(baglam, kod)) {
    if (s.karar === 'vazgecildi' || !s.hedef || !['konum', 'ikamet'].includes(s.ozellik.toLocaleLowerCase('tr-TR'))) continue;
    if (sonradan(s.baslangic?.tarih ?? null) && !varMi(s.kod)) continue;
    const akislar = yerAkislari(s.hedef.kod), dayanak = `${s.ozellik}: ${s.hedef.ad}`;
    if (varMi(s.kod)) nedenler.push(`${dayanak}: iki cihazdaki kalış değerleri seçilmeyi bekliyor.`);
    for (const akis of akislar) {
      if (varMi(s.kod)) nedenler.push(`${dayanak}: iki cihazdaki kalış değerleri seçilmeyi bekliyor.`);
      for (const u of [s.baslangic, s.bitis, s.sonraki]) if (u?.olay && tarihCatismali(u.olay.kod)) nedenler.push(`${dayanak}: bağlı olayın iki tarihi var.`);
      if (s.kip === 'anlik') gozlemler.push({ akis: akis.kod, tarih: s.baslangic?.tarih ?? null, dayanak });
      else kalislar.push({ akis: akis.kod, baslangic: s.baslangic?.tarih ?? null, bitis: s.kip === 'sonraki' ? s.sonraki?.tarih ?? (s.sonraki ? null : an) : s.bitis?.tarih ?? null, dayanak });
    }
  }
  // Yalnızca yapısal ikamet ilişkisi; üyelik, sahiplik ve bir yeri bilmek bulunma sayılmaz.
  for (const r of e.db.selectObjects("SELECT kod,b,baslangic,bitis FROM iliskiler WHERE a=? AND tur='yasar' AND silindi IS NULL AND karar<>'vazgecildi'", [kod])) {
    const bas = r.baslangic ? JSON.parse(r.baslangic as string) as EvrenTarihi : null;
    if (sonradan(bas)) continue;
    const bit = r.bitis ? JSON.parse(r.bitis as string) as EvrenTarihi : null;
    for (const akis of yerAkislari(r.b as string)) {
      if (varMi(r.kod as string)) nedenler.push('İkamet ilişkisinin iki cihazdaki değerleri seçilmeyi bekliyor.');
      kalislar.push({ akis: akis.kod, baslangic: bas, bitis: bit, dayanak: `İkamet: ${ad(r.b as string)}` });
    }
  }
  for (const r of e.db.selectObjects(`SELECT i.kod,i.b,i.tur FROM iliskiler i JOIN kayitlar k ON k.kod=i.b
    WHERE i.a=? AND i.silindi IS NULL AND i.karar<>'vazgecildi' AND k.silindi IS NULL AND k.karar<>'vazgecildi'
    AND ((i.tur='sahnede' AND i.rol='bulunuyor') OR (i.tur='olayda' AND i.rol IN ('baslatan','katilan','tanik','zarar')))`, [kod])) {
    const t = tarih(r.b as string); if (sonradan(t) && !tarihCatismali(r.b as string)) continue;
    if (tarihCatismali(r.b as string)) nedenler.push('Katılımın olay tarihinin iki cihazdaki değerleri seçilmeyi bekliyor.');
    if (t?.akis && varMi(r.kod as string)) nedenler.push('Katılımın iki cihazdaki değerleri seçilmeyi bekliyor.');
    gozlemler.push({ akis: t?.akis ?? null, tarih: t, dayanak: `Fiziksel katılım: ${ad(r.b as string)}` });
  }
  // Bir durum sınırı akış tarihindeyse, kendi ifadesi de yeniden çözülür; oran değişince eski hesap kullanılmaz.
  for (const s of kalislar) for (const alan of ['baslangic', 'bitis'] as const) {
    const t = s[alan]; if (t?.akis && t.bicim !== 'goreli') s[alan] = tarihCoz(t.ifade, z);
  }
  const baskaAkis = kalislar.length > 0 || gozlemler.some((g) => g.akis);
  if (baskaAkis) {
    for (const a of z.akislar) if ((kalislar.some((k) => k.akis === a.kod) || gozlemler.some((g) => g.akis === a.kod)) && varMi('evren', `akis:${a.kod}`)) nedenler.push(`“${a.ad}”: akışın iki cihazdaki değerleri seçilmeyi bekliyor.`);
    if (varMi('evren', 'takvim')) nedenler.push('Takvimin iki cihazdaki değerleri seçilmeyi bekliyor.');
  }
  const dogumBelirsiz = varMi(kod, 'f:dogum');
  const anBelirsiz = !!anKodu && tarihCatismali(anKodu);
  if (dogumBelirsiz) nedenler.push('Doğum tarihinin çözülmemiş iki değeri var; takvim yaşı da belirlenemiyor.');
  if (anBelirsiz) nedenler.push('Bakılan olayın çözülmemiş iki tarihi var; takvim yaşı da belirlenemiyor.');
  if (varMi(kod, 'f:olum') && baskaAkis) nedenler.push('Ölüm tarihinin çözülmemiş iki değeri var.');
  const bitis = olum && an && karsilastir(olum, an) === 'once' ? olum : an;
  const sonuc = yasananSureHesapla(dogumBelirsiz ? null : dogum, bitis, z, kalislar, gozlemler, [...new Set(nedenler)]);
  sonuc.tarih = an?.ifade ?? null;
  sonuc.takvimYasi = dogumBelirsiz || anBelirsiz ? null : yasHesapla(dogum, an, olum, z)?.metin ?? null;
  sonuc.takvimBelirsiz = dogumBelirsiz || anBelirsiz;
  return sonuc;
}
