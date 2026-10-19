import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { GUN_PARCA, VARSAYILAN_TAKVIM, tarihCoz, yilParcasi, type Akis, type EvrenTarihi, type ZamanSeti } from '../src/alan/tarih';
import { yasananSureHesapla, type AkistaKalma } from '../src/alan/yasanan-sure';
import { yasHesapla } from '../src/alan/yas';
import { Hizmet } from '../src/calisan/hizmet';

const yp = yilParcasi(VARSAYILAN_TAKVIM);
const nokta = (n: number): EvrenTarihi => ({ ifade: `Uydurma an ${n}`, bicim: 'kesin', hassasiyet: 'bolum', takvim: 'varsayilan', takvimSurumu: 1, eksen: { enErken: n, enGec: n } });
const akis = (oran: Akis['oranlar'] = [{ bas: null, akis: 10, ana: [1, 1] }]): Akis => ({ kod: 'uydurma1', ad: 'Uydurma Fey', bagli: null, cap: '0', oranlar: oran });
const zaman = (a = akis()): ZamanSeti => ({ ana: VARSAYILAN_TAKVIM, diger: [], akislar: [a] });
const kalis = (bas: number, bit: number, kod = 'uydurma1'): AkistaKalma => ({ akis: kod, baslangic: nokta(bas), bitis: nokta(bit), dayanak: 'Uydurma kalış' });

describe('zaman akışlarında yaşanan süre (§3.4)', () => {
  it('başka akış kaydı yoksa eski takvim yaşını aynen korur ve ek gösterim yapmaz', () => {
    const d = tarihCoz('1000')!, an = tarihCoz('1040')!;
    const s = yasananSureHesapla(d, an, zaman());
    expect(s.goster).toBe(false); expect(s.takvimYasi).toBe(yasHesapla(d, an)?.metin);
    expect([s.enAz, s.enCok]).toEqual([yasHesapla(d, an)?.enAz, yasHesapla(d, an)?.enCok]);
  });
  it('akışta on gün dışarıda bir gün oranını ters yönde doğru uygular; küçük fark da gösterilir', () => {
    const s = yasananSureHesapla(nokta(0), nokta(GUN_PARCA), zaman(), [kalis(0, GUN_PARCA)]);
    expect(s).toMatchObject({ gunEnAz: 10, gunEnCok: 10, goster: true, metin: 'Yaşadığı süre 10 gün' });
  });
  it('ana akıştaki süreye yalnızca akışta geçen süreyi ekler; 40 yıl 52–55 olabilir', () => {
    const z = zaman(akis([{ bas: null, akis: 208, ana: [13, 16] }])); // 13–16 kat hız.
    const s = yasananSureHesapla(nokta(0), nokta(40 * yp), z, [kalis(10 * yp, 11 * yp)]);
    expect(s).toMatchObject({ enAz: 52, enCok: 55, goster: true, metin: 'Yaşadığı süre 52–55 yıl' });
  });
  it('hız geçişini parçalar; yıl düzeyindeki geçiş tarihini gün gibi kesinleştirmez', () => {
    const z = zaman(akis([{ bas: null, akis: 10, ana: [1, 1] }, { bas: '5', akis: 2, ana: [1, 1] }]));
    const s = yasananSureHesapla(nokta(0), nokta(10 * yp), z, [kalis(0, 10 * yp)]);
    expect(s.enAz).toBe(60); expect(s.enCok).toBe(67); // Geçiş beşinci yılın herhangi bir anında olabilir.
    expect(s.gunEnCok).toBeGreaterThan(60 * 365);
  });
  it('aynı tam yıl içine düşen oran aralığını tek sayı gibi göstermez', () => {
    const z = zaman(akis([{ bas: null, akis: 132, ana: [10, 10.1] }]));
    const s = yasananSureHesapla(nokta(0), nokta(40 * yp), z, [kalis(10 * yp, 11 * yp)]);
    expect(s.enAz).toBe(s.enCok); expect(s.metin).toMatch(/–.*gün/); expect(s.goster).toBe(true);
  });
  it('bilinmeyen ya da ana akışta sıfır gün süren oranı kesin süreye çeviremez', () => {
    for (const ana of [null, [0, 0]] as (null | [number, number])[]) {
      const s = yasananSureHesapla(nokta(0), nokta(2 * yp), zaman(akis([{ bas: null, akis: 10, ana }])), [kalis(yp, 2 * yp)]);
      expect(s.enAz).toBeNull(); expect(s.metin).toMatch(/hesaplanamıyor.*hızı bilinmiyor/);
    }
  });
  it('iki gözlem arasında kaldığını varsaymaz; anlık katılım kalış süresi değildir', () => {
    const s = yasananSureHesapla(nokta(0), nokta(40 * yp), zaman(), [], [
      { akis: 'uydurma1', tarih: nokta(yp), dayanak: 'Uydurma birinci sahne' },
      { akis: 'uydurma1', tarih: nokta(2 * yp), dayanak: 'Uydurma ikinci sahne' },
    ]);
    expect(s.metin).toMatch(/hesaplanamıyor.*başlangıç ve bitişi/); expect(s.enCok).toBeNull();
  });
  it('aynı akıştaki üst üste kayıtları iki kez saymaz; farklı akışlarda öncelik seçmez', () => {
    const z = zaman(akis([{ bas: null, akis: 2, ana: [1, 1] }]));
    const s = yasananSureHesapla(nokta(0), nokta(10 * yp), z, [kalis(yp, 3 * yp), kalis(2 * yp, 4 * yp)]);
    expect(s.enAz).toBe(13); expect(s.enCok).toBe(13);
    z.akislar.push({ ...z.akislar[0], kod: 'uydurma2' });
    expect(yasananSureHesapla(nokta(0), nokta(10 * yp), z, [kalis(yp, 3 * yp), kalis(2 * yp, 4 * yp, 'uydurma2')]).metin).toMatch(/örtüşüyor/);
  });
  it('yıl düzeyindeki doğum hassasiyetini korur; gelecekteki kalış bugünkü yaşı etkilemez', () => {
    const s = yasananSureHesapla(tarihCoz('0'), tarihCoz('40'), zaman(), [kalis(10 * yp, 11 * yp)]);
    expect(s.enAz).not.toBe(s.enCok);
    expect(yasananSureHesapla(tarihCoz('0'), tarihCoz('40'), zaman(), [kalis(50 * yp, 51 * yp)]).goster).toBe(false);
  });
});

let sqlite: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite = await sqlite3InitModule(); });
function cihaz() {
  const dbler = new Map<string, Database>();
  return new Hizmet((d) => { let db = dbler.get(d); if (!db) { db = new sqlite.oo1.DB(':memory:'); dbler.set(d, db); } return db; }, 'Uydurma aygıt', 'x');
}
function kur() {
  const h = cihaz(), evren = h.evrenOlustur({ ad: 'Uydurma evren' }).kod;
  const kayit = (ad: string, tur = 'karakter') => h.kayitOlustur({ evren, ad, tur }).kod;
  const kisi = kayit('Uydurma gezgin'), yer = kayit('Uydurma geçit', 'mekan'), sahne = kayit('Uydurma sahne', 'sahne');
  h.kayitAlanYaz({ evren, kod: kisi, alan: 'dogum', deger: '1000' }); h.kayitTarih({ evren, kod: sahne, ifade: '1040' });
  const { kod: akisKodu } = h.akisYaz({ evren, akis: { ...akis(), bagli: yer, cap: '1000' } });
  h.sahneAlaniAyarla({ evren, sahne, alan: 'bakis', kayit: kisi });
  const kal = (bitis: string | null = '1020') => h.iliskiEkle({ evren, tur: 'yasar', a: kisi, b: yer, baslangic: '1010', ...(bitis ? { bitis } : {}) }).kod;
  const oku = () => h.yasananSure({ evren, kisi, olay: sahne });
  return { h, evren, kayit, kisi, yer, sahne, akisKodu, kal, oku };
}
describe('yaşanan sürenin kayıtlı verilerden toplanması', () => {
  it('tarihli "orada yaşayan" ilişkisini ve sahne katılımcısını bağlar; yeni işlem yazmaz', () => {
    const { h, evren, kisi, sahne, kal, oku } = kur(); kal();
    const once = h.islemleriVer({ evren, gorulen: {} }).length;
    const s = oku(); expect(s.goster).toBe(true); expect(s.enAz!).toBeGreaterThan(100);
    expect(h.sahneBaglami({ evren, sahne }).katilimcilar.find((k) => k.kod === kisi)?.yasananSure).toEqual(s);
    expect(h.islemleriVer({ evren, gorulen: {} })).toHaveLength(once);
  });
  it('bitişi yazılmamış ikamet bakılan ana kadar sürer', () => {
    const { kal, oku } = kur(); kal(null); expect(oku().enAz).not.toBeNull();
    const b = kur(); b.kal(); expect(oku().enAz).toBeGreaterThan(b.oku().enAz!);
  });
  it('yalnız fiziksel akış katılımını kullanır; adı anılan kişi için kalış çıkarmaz', () => {
    const { h, evren, kayit, kisi, oku } = kur(), s = kayit('Uydurma Fey sahnesi', 'sahne');
    h.kayitTarih({ evren, kod: s, ifade: 'Uydurma Fey 20. gün' });
    h.iliskiEkle({ evren, tur: 'sahnede', a: kisi, b: s, rol: 'aniliyor' }); expect(oku().goster).toBe(false);
    h.iliskiEkle({ evren, tur: 'sahnede', a: kisi, b: s, rol: 'bulunuyor' }); expect(oku().metin).toMatch(/hesaplanamıyor/);
  });
  it('durum özelliklerinin adlarını ve gelecekteki fiziksel katılımı yorumlamaz', () => {
    const { h, evren, kayit, kisi, yer, oku } = kur();
    h.durumEkle({ evren, kod: kisi, durum: { ozellik: 'Konum', hedef: yer, kip: 'aralik', baslangic: { ifade: '1010' }, bitis: { ifade: '1020' } } });
    const s = kayit('Uydurma gelecek sahne', 'sahne'); h.kayitTarih({ evren, kod: s, ifade: 'Uydurma Fey 200000. gün' });
    h.iliskiEkle({ evren, tur: 'sahnede', a: kisi, b: s, rol: 'bulunuyor' }); expect(oku().goster).toBe(false);
  });
  it('doğum çatışmalarından birini sessizce seçmez', () => {
    const { h, evren, kisi, kal, oku } = kur(); kal(); const b = cihaz();
    b.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    h.kayitAlanYaz({ evren, kod: kisi, alan: 'dogum', deger: '1001' }); b.kayitAlanYaz({ evren, kod: kisi, alan: 'dogum', deger: '1002' });
    h.islemleriAl({ evren, islemler: b.islemleriVer({ evren, gorulen: h.gorulenler({ evren }) }) });
    expect(oku()).toMatchObject({ takvimBelirsiz: true, takvimYasi: null, enAz: null }); expect(oku().metin).toMatch(/Doğum/);
  });
  it('akış oranının ve bakılan tarihin çözülmemiş iki değerini kesinleştirmez', () => {
    const { h, evren, akisKodu, kal, oku, sahne } = kur(); kal(); const b = cihaz();
    b.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    const a = h.zamanSeti({ evren }).akislar[0];
    h.akisYaz({ evren, kod: akisKodu, akis: { ...a, oranlar: [{ bas: null, akis: 2, ana: [1, 1] }] } });
    b.akisYaz({ evren, kod: akisKodu, akis: { ...a, oranlar: [{ bas: null, akis: 3, ana: [1, 1] }] } });
    h.kayitTarih({ evren, kod: sahne, ifade: '1041' }); b.kayitTarih({ evren, kod: sahne, ifade: '1042' });
    h.islemleriAl({ evren, islemler: b.islemleriVer({ evren, gorulen: h.gorulenler({ evren }) }) });
    expect(oku()).toMatchObject({ takvimBelirsiz: true, enAz: null }); expect(oku().nedenler.join(' ')).toMatch(/akışının iki/);
  });
});
