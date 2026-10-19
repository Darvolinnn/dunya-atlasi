// §3.4 Yaş: yalnızca açık kalış aralıkları süre verir; iki gözlem arasındaki zaman kalış sayılmaz.
// Kayıtsız kalan süre ana akışta sayılır. Belirsiz sınırlar ve hızlar olası alt/üst sınırlarla korunur;
// bu aralıkların ortası seçilmez. Çakışan farklı akışlar arasında gizli öncelik kurulmaz.
import { GUN_PARCA, tarihCoz, yilParcasi, type EvrenTarihi, type ZamanSeti } from './tarih';
import { yasHesapla } from './yas';

export interface AkistaKalma { akis: string; baslangic: EvrenTarihi | null; bitis: EvrenTarihi | null; dayanak: string }
export interface AkisGozlemi { akis: string | null; tarih: EvrenTarihi | null; dayanak: string }
export interface YasananSure {
  metin: string; takvimYasi: string | null; enAz: number | null; enCok: number | null;
  gunEnAz: number | null; gunEnCok: number | null;
  goster: boolean; takvimBelirsiz: boolean; tarih: string | null; nedenler: string[]; dayanak: string[];
}
type Aralik = { enErken: number; enGec: number };
const sonlu = (t: EvrenTarihi | null): Aralik | null => {
  const e = t?.eksen;
  return e && e.enErken !== null && e.enGec !== null && Number.isFinite(e.enErken) && Number.isFinite(e.enGec) && e.enErken <= e.enGec ? { enErken: e.enErken, enGec: e.enGec } : null;
};

/** Girdi ve sonuç ana takvimin yıl uzunluğuyla ölçülür; hız dönüşümü ana gün → akış günü yönündedir. */
export function yasananSureHesapla(dogum: EvrenTarihi | null, an: EvrenTarihi | null, z: ZamanSeti,
  kalislar: AkistaKalma[] = [], gozlemler: AkisGozlemi[] = [], eksikler: string[] = []): YasananSure {
  const takvim = yasHesapla(dogum, an, null, z);
  const d = sonlu(dogum), a = sonlu(an);
  const ilgili = (t: EvrenTarihi | null) => {
    const e = t?.eksen;
    return !(a && e?.enErken != null && e.enErken > a.enGec) && !(d && e?.enGec != null && e.enGec < d.enErken);
  };
  const k = kalislar.filter((s) => !(a && s.baslangic?.eksen?.enErken != null && s.baslangic.eksen.enErken > a.enGec) && !(d && s.bitis?.eksen?.enGec != null && s.bitis.eksen.enGec < d.enErken));
  const izler = gozlemler.filter((s) => ilgili(s.tarih));
  const goster = k.length > 0 || izler.some((s) => s.akis) || eksikler.length > 0;
  const sonuc: YasananSure = { metin: takvim?.metin ?? 'Yaşadığı süre hesaplanamıyor.', takvimYasi: takvim?.metin ?? null,
    enAz: takvim?.enAz ?? null, enCok: takvim?.enCok ?? null, gunEnAz: d && a ? Math.max(0, a.enErken - d.enGec) / GUN_PARCA : null, gunEnCok: d && a ? Math.max(0, a.enGec - d.enErken) / GUN_PARCA : null, goster, takvimBelirsiz: false, tarih: an?.ifade ?? null,
    nedenler: [...eksikler], dayanak: [...new Set([...k, ...izler.filter((s) => s.akis)].map((s) => s.dayanak))] };
  const dur = (neden: string): YasananSure => { if (neden && !sonuc.nedenler.includes(neden)) sonuc.nedenler.push(neden); return { ...sonuc, metin: `Yaşadığı süre hesaplanamıyor: ${sonuc.nedenler.join(' ')}`, enAz: null, enCok: null, gunEnAz: null, gunEnCok: null }; };
  if (!goster) return sonuc;
  if (!d || !a) return dur('Doğum veya bakılan tarih sonlu bir tarih aralığına çevrilemiyor.');
  if (a.enGec < d.enErken) return dur('Bakılan tarih doğumdan önce.');
  if (eksikler.length) return dur('');
  const araliklar: { akis: string; bas: Aralik; bit: Aralik }[] = [];
  for (const s of k) {
    const bas = sonlu(s.baslangic), bit = sonlu(s.bitis);
    if (!bas || !bit) return dur(`${s.dayanak}: akışta ne kadar kaldığı belirlenemiyor.`);
    if (bas.enErken > bit.enGec) return dur(`${s.dayanak}: kalışın bitişi başlangıcından önce.`);
    araliklar.push({ akis: s.akis, bas, bit });
  }
  for (const s of izler) {
    const t = sonlu(s.tarih);
    const kapsayan = araliklar.filter((r) => t && r.bas.enErken <= t.enErken && r.bit.enGec >= t.enGec);
    if (s.akis && !kapsayan.some((r) => r.akis === s.akis)) return dur(`${s.dayanak}: akışa katılım kayıtlı, kalışın başlangıç ve bitişi belirlenemiyor.`);
    if (t && araliklar.some((r) => r.akis !== s.akis && r.bas.enGec < t.enErken && r.bit.enErken > t.enGec)) return dur(`${s.dayanak}: aynı dönemde farklı akışlarda bulunma kayıtları var.`);
  }
  const noktalar = new Set([d.enErken, d.enGec, a.enErken, a.enGec]);
  for (const r of araliklar) for (const n of [r.bas.enErken, r.bas.enGec, r.bit.enErken, r.bit.enGec]) if (n > d.enErken && n < a.enGec) noktalar.add(n);
  const donemler = new Map<string, { bas: Aralik; az: number | null; cok: number | null }[]>();
  for (const kod of new Set(araliklar.map((r) => r.akis))) {
    const akis = z.akislar.find((s) => s.kod === kod);
    if (!akis) return dur('Kalışın bağlı olduğu zaman akışı bulunamadı.');
    const donem: { bas: Aralik; az: number | null; cok: number | null }[] = [];
    for (let i = 0; i < akis.oranlar.length; i++) {
      const o = akis.oranlar[i], bas = sonlu(tarihCoz(i === 0 ? akis.cap : o.bas ?? '', z.ana));
      if (!bas) return dur(`“${akis.ad}”: hızın geçiş tarihi çözülemiyor.`);
      if (donem.length && bas.enErken <= donem[donem.length - 1].bas.enErken) return dur(`“${akis.ad}”: hızların geçiş sırası belirlenemiyor.`);
      const bilinen = o.ana && o.ana[0] > 0 && o.ana[1] >= o.ana[0] && o.akis > 0;
      donem.push({ bas, az: bilinen ? o.akis / o.ana![1] : null, cok: bilinen ? o.akis / o.ana![0] : null });
      for (const n of [bas.enErken, bas.enGec]) if (n > d.enErken && n < a.enGec) noktalar.add(n);
    }
    donemler.set(kod, donem);
  }
  const sirali = [...noktalar].filter((n) => n >= d.enErken && n <= a.enGec).sort((x, y) => x - y);
  let en = 0, cok = 0;
  for (let i = 1; i < sirali.length; i++) {
    const bas = sirali[i - 1], bit = sirali[i], orta = bas + (bit - bas) / 2;
    if (bit <= bas) continue;
    const olasi = araliklar.filter((r) => r.bas.enErken <= orta && r.bit.enGec >= orta);
    const akislar = [...new Set(olasi.map((r) => r.akis))];
    if (akislar.length > 1) return dur('Kalış aralıkları farklı zaman akışlarında örtüşüyor; biri seçilemez.');
    let az = 1, ust = 1;
    if (akislar.length) {
      const fazlar = donemler.get(akislar[0])!;
      const faz = fazlar.filter((r, j) => r.bas.enErken <= orta && (j === fazlar.length - 1 || fazlar[j + 1].bas.enGec >= orta));
      if (!faz.length || faz.some((r) => r.az === null || r.cok === null)) return dur('Kalış sırasında akışın hızı bilinmiyor veya başlangıç tarihi yeterince kesin değil.');
      az = Math.min(...faz.map((r) => r.az!)); ust = Math.max(...faz.map((r) => r.cok!));
      const kesin = olasi.some((r) => r.bas.enGec <= orta && r.bit.enErken >= orta);
      if (!kesin) { az = Math.min(1, az); ust = Math.max(1, ust); }
    }
    if (bas >= d.enGec && bit <= a.enErken) en += (bit - bas) * az;
    cok += (bit - bas) * ust;
  }
  const yp = yilParcasi(z.ana);
  sonuc.enAz = Math.max(0, Math.floor(en / yp)); sonuc.enCok = Math.max(0, Math.floor(cok / yp));
  sonuc.gunEnAz = en / GUN_PARCA; sonuc.gunEnCok = cok / GUN_PARCA;
  sonuc.metin = `Yaşadığı süre ${sonuc.enAz === sonuc.enCok ? sonuc.enAz : `${sonuc.enAz}–${sonuc.enCok}`} yıl`;
  // Yıl gösteriminin saklayacağı fark gün aralığıyla gösterilir; günün ortası seçilmez.
  if (sonuc.enCok < 1 || (sonuc.enAz === sonuc.enCok && cok - en > 1e-7) || (sonuc.enAz === takvim?.enAz && sonuc.enCok === takvim?.enCok)) {
    const alt = Math.floor(sonuc.gunEnAz), ust = Math.ceil(sonuc.gunEnCok);
    sonuc.metin = `Yaşadığı süre ${alt === ust ? alt : `${alt}–${ust}`} gün`;
  }
  sonuc.goster = Math.abs(en - Math.max(0, a.enErken - d.enGec)) > 1e-7 || Math.abs(cok - Math.max(0, a.enGec - d.enErken)) > 1e-7;
  return sonuc;
}
