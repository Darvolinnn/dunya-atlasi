import { beforeAll, describe, expect, it } from 'vitest';
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { pmNodeToSpans } from '@automerge/prosemirror';
import { Hizmet } from '../src/calisan/hizmet';
import { EvrenVt } from '../src/calisan/evren-vt';
import { acikBirakilanKayitlar } from '../src/calisan/anlati-sozlesmesi';
import { metinSemasi } from '../src/alan/metin-sema';
import { yeniKod } from '../src/alan/kod';
import type { SozlesmeTanimi } from '../src/veri/api';

let sqlite: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite = await sqlite3InitModule(); });
function cihaz() {
  const dosyalar = new Map<string, Database>();
  const ac = (ad: string) => { if (!dosyalar.has(ad)) dosyalar.set(ad, new sqlite.oo1.DB(':memory:')); return dosyalar.get(ad)!; };
  return { h: new Hizmet(ac, 'Uydurma aygıt', 'x'), ac };
}
const tanim = (t: Partial<SozlesmeTanimi> = {}): SozlesmeTanimi => ({ metin: 'Uydurma köken açıklanmayacak.', tur: 'aciklanmayacak', karar: 'kesin', kapsam: { tur: 'evren' }, bagliKayitlar: [], ...t });
function kur() {
  const { h, ac } = cihaz(), evren = h.evrenOlustur({ ad: 'Uydurma sözleşme evreni' }).kod;
  const kayit = (ad: string, tur = 'eser') => h.kayitOlustur({ evren, ad, tur }).kod;
  const a = kayit('Uydurma ilk kitap'), b = kayit('Uydurma öteki kitap'), kisi = kayit('Uydurma gözlemci', 'karakter');
  const madde = (t: Partial<SozlesmeTanimi> = {}) => h.sozlesmeMaddeYaz({ evren, tanim: tanim({ bagliKayitlar: [kisi], ...t }) }).kod;
  const gecerli = (eser: string) => h.eserSozlesmesi({ evren, eser }).maddeler.filter((m) => m.durum === 'gecerli').map((m) => m.madde.kod);
  const hatirlatma = (kod: string) => h.sozlesmeHatirlatmalari({ evren, kayit: kod });
  const e = () => new EvrenVt(ac(`/evren-${evren}.db`), yeniKod());
  return { h, ac, e, evren, kayit, a, b, kisi, madde, gecerli, hatirlatma };
}
function bagYaz(h: Hizmet, evren: string, kayit: string, hedef?: string) {
  const s = metinSemasi.schema;
  const metin = s.text('Uydurma gözlemci', hedef ? [s.marks.bag.create({ hedef })] : []);
  const spans = pmNodeToSpans(metinSemasi, s.node('doc', null, [s.node('paragraph', null, [metin])]));
  h.metinKaydet({ evren, kayit, alan: 'govde', spans: spans as never, temel: h.metinAc({ evren, kayit, alan: 'govde' }).basliklar });
}

describe('anlatı ve evren sözleşmesi (F15)', () => {
  it('madde işlemden geri okunur ve başka cihazda yeniden kurulur', () => {
    const { h, evren, kisi, madde } = kur(), kod = madde();
    expect(h.sozlesmeMaddeleri({ evren })[0]).toMatchObject({ kod, ...tanim({ bagliKayitlar: [kisi] }), catismali: false, silindi: false });
    const b = cihaz().h;
    b.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    expect(b.sozlesmeMaddeleri({ evren })).toEqual(h.sozlesmeMaddeleri({ evren }));
    expect(h.islemGunlugu({ evren, sinir: 100 }).some((i) => i.tur === 'sozlesme_madde_yaz')).toBe(true);
  });
  it('evren maddesi şimdiki ve sonradan eklenen her esere uygulanır; dışarıda bırakma esere özeldir', () => {
    const { h, evren, a, b, kayit, madde, gecerli } = kur(), kod = madde();
    expect(gecerli(a)).toEqual([kod]); expect(gecerli(b)).toEqual([kod]);
    h.sozlesmeDisaridaYaz({ evren, madde: kod, eser: a, disarida: true });
    expect(gecerli(a)).toEqual([]); expect(gecerli(b)).toEqual([kod]);
    expect(h.eserSozlesmesi({ evren, eser: a }).maddeler[0].durum).toBe('disarida');
    expect(gecerli(kayit('Uydurma sonradan eklenen kitap'))).toEqual([kod]);
    h.sozlesmeDisaridaYaz({ evren, madde: kod, eser: a, disarida: false });
    expect(gecerli(a)).toEqual([kod]);
  });
  it('esere özel ve birden çok eser kapsamlı maddeler seçilmeyen esere gelmez', () => {
    const { h, evren, a, b, madde, gecerli, kayit } = kur();
    const tek = madde({ kapsam: { tur: 'eserler', eserler: [a] } });
    expect(gecerli(a)).toEqual([tek]); expect(gecerli(b)).toEqual([]);
    const cok = madde({ metin: 'Uydurma ortak anlatı kuralı.', kapsam: { tur: 'eserler', eserler: [a, b] } });
    expect(gecerli(a)).toContain(cok); expect(gecerli(b)).toContain(cok);
    expect(gecerli(kayit('Uydurma kapsam dışı kitap'))).toEqual([]);
    expect(() => h.sozlesmeDisaridaYaz({ evren, madde: tek, eser: a, disarida: true })).toThrow(/evren/);
  });
  it('bağlı kaydın hatırlatması yalnız doğru eserleri ve dışarıda bırakılan kapsamı taşır', () => {
    const { h, evren, a, b, kisi, madde, hatirlatma, kayit } = kur();
    const global = madde(), ozel = madde({ kapsam: { tur: 'eserler', eserler: [a] } });
    h.sozlesmeDisaridaYaz({ evren, madde: global, eser: a, disarida: true });
    const l = hatirlatma(kisi), g = l.find((s) => s.madde.kod === global)!, o = l.find((s) => s.madde.kod === ozel)!;
    expect(g.eserler.map((s) => s.kod)).toEqual([b]); expect(g.disaridaEserler.map((s) => s.kod)).toEqual([a]);
    expect(o.eserler.map((s) => s.kod)).toEqual([a]); expect(o.evren).toBe(false);
    expect(hatirlatma(kayit('Uydurma ilgisiz kişi', 'karakter'))).toEqual([]);
  });
  it('sahnenin hatırlatması kendi eserinden ve açık katılımdan gelir; bölüm üyeliği ve sahne taşıma izlenir', () => {
    const { h, evren, a, b, kisi, madde, hatirlatma } = kur();
    const ilk = madde({ kapsam: { tur: 'eserler', eserler: [a] } }), diger = madde({ kapsam: { tur: 'eserler', eserler: [b] } });
    const bolum = h.anlatiOlustur({ evren, ust: a, ad: 'Uydurma bölüm', tur: 'bolum' }).kod;
    const sahne = h.anlatiOlustur({ evren, ust: bolum, ad: 'Uydurma sahne', tur: 'sahne' }).kod;
    const iliski = h.iliskiEkle({ evren, tur: 'sahnede', a: kisi, b: sahne, rol: 'bulunuyor' }).kod;
    expect(hatirlatma(sahne).map((m) => m.madde.kod)).toEqual([ilk]);
    h.anlatiYerlestir({ evren, kod: sahne, ust: b, sira: 0 });
    expect(hatirlatma(sahne).map((m) => m.madde.kod)).toEqual([diger]);
    h.iliskiSil({ evren, kod: iliski }); expect(hatirlatma(sahne)).toEqual([]);
  });
  it('yalnız açık metin bağlantısını kullanır; sıradan metinden ve madde cümlesinden anlam çıkarmaz', () => {
    const { h, evren, a, kisi, madde, hatirlatma } = kur(), kod = madde();
    const sahne = h.anlatiOlustur({ evren, ust: a, ad: 'Uydurma metin sahnesi', tur: 'sahne' }).kod;
    bagYaz(h, evren, sahne); expect(hatirlatma(sahne)).toEqual([]);
    bagYaz(h, evren, sahne, kisi); expect(hatirlatma(sahne).map((m) => m.madde.kod)).toEqual([kod]);
    h.sozlesmeMaddeYaz({ evren, kod, tanim: tanim({ metin: 'Bu metin hiçbir şeyi süzmez.', bagliKayitlar: [kisi] }) });
    expect(hatirlatma(sahne).map((m) => m.madde.kod)).toEqual([kod]);
    h.sozlesmeDisaridaYaz({ evren, madde: kod, eser: a, disarida: true }); expect(hatirlatma(sahne)).toEqual([]);
  });
  it('esere yerleşmemiş sahne başka bir eserin sözleşmesini kendiliğinden almaz', () => {
    const { h, evren, kisi, madde, hatirlatma, kayit } = kur(); madde();
    const sahne = kayit('Uydurma bağımsız sahne', 'sahne');
    h.iliskiEkle({ evren, tur: 'sahnede', a: kisi, b: sahne }); expect(hatirlatma(sahne)).toEqual([]);
  });
  it('vazgeçilmiş ve kaldırılmış madde hatırlatılmaz; düzenleme silineni diriltmez, geri getirme işlemle olur', () => {
    const { h, evren, kisi, madde, hatirlatma } = kur();
    const kod = madde({ karar: 'vazgecildi' }); expect(hatirlatma(kisi)).toEqual([]);
    h.sozlesmeMaddeYaz({ evren, kod, tanim: tanim({ karar: 'fikir', bagliKayitlar: [kisi] }) });
    expect(hatirlatma(kisi)[0].madde.karar).toBe('fikir');
    h.sozlesmeMaddeSil({ evren, kod }); expect(hatirlatma(kisi)).toEqual([]);
    h.sozlesmeMaddeYaz({ evren, kod, tanim: tanim({ bagliKayitlar: [kisi] }) });
    expect(h.sozlesmeMaddeleri({ evren })).toEqual([]); expect(h.sozlesmeMaddeleri({ evren, cop: true })).toHaveLength(1);
    h.sozlesmeMaddeGeriYukle({ evren, kod }); expect(hatirlatma(kisi)).toHaveLength(1);
  });
  it('açık bırakılan kayıt kümesi kapsamı, kararı, kaldırmayı ve birleşme hedefini korur', () => {
    const { h, e, evren, a, b, kisi, madde, kayit, hatirlatma } = kur();
    const kod = madde({ tur: 'acik_birakildi' }); expect(acikBirakilanKayitlar(e())).toEqual(new Set([kisi]));
    h.sozlesmeDisaridaYaz({ evren, madde: kod, eser: a, disarida: true });
    expect(acikBirakilanKayitlar(e(), a)).toEqual(new Set()); expect(acikBirakilanKayitlar(e(), b)).toEqual(new Set([kisi]));
    const hedef = kayit('Uydurma birleşmiş gözlemci', 'karakter'); h.birlestir({ evren, kaynak: kisi, hedef });
    expect(h.sozlesmeMaddeleri({ evren })[0].bagliKayitlar).toEqual([hedef]);
    expect(hatirlatma(hedef)[0].madde.kod).toBe(kod); expect(acikBirakilanKayitlar(e())).toEqual(new Set([hedef]));
    h.sozlesmeMaddeSil({ evren, kod }); expect(acikBirakilanKayitlar(e())).toEqual(new Set());
  });
  it('birleşmeden sonra gelen eski bağlantıları uygulayıcıda da hedefe çevirir', () => {
    const { h, evren, a, kisi, kayit } = kur(), b = cihaz().h;
    b.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    const hedef = kayit('Uydurma son kişi', 'karakter'); h.birlestir({ evren, kaynak: kisi, hedef });
    b.sozlesmeMaddeYaz({ evren, tanim: tanim({ kapsam: { tur: 'eserler', eserler: [a] }, bagliKayitlar: [kisi] }) });
    h.islemleriAl({ evren, islemler: b.islemleriVer({ evren, gorulen: h.gorulenler({ evren }) }) });
    expect(h.sozlesmeMaddeleri({ evren })[0].bagliKayitlar).toEqual([hedef]);
  });
  it('iki cihazın madde çatışmasını hatırlatmaz; mevcut seçim ekranıyla çözülür', () => {
    const { h, e, evren, kisi, madde, hatirlatma } = kur(), kod = madde({ tur: 'acik_birakildi' }), b = cihaz().h;
    b.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    h.sozlesmeMaddeYaz({ evren, kod, tanim: tanim({ metin: 'Uydurma birinci karar.', tur: 'acik_birakildi', bagliKayitlar: [kisi] }) });
    b.sozlesmeMaddeYaz({ evren, kod, tanim: tanim({ metin: 'Uydurma ikinci karar.', tur: 'acik_birakildi', bagliKayitlar: [kisi] }) });
    h.islemleriAl({ evren, islemler: b.islemleriVer({ evren, gorulen: h.gorulenler({ evren }) }) });
    expect(hatirlatma(kisi)).toEqual([]); expect(acikBirakilanKayitlar(e())).toEqual(new Set());
    const c = h.catismalar({ evren }).find((c) => c.tur === 'alan' && c.alan === 'sozlesme_tanim');
    if (c?.tur !== 'alan') throw new Error('Madde çatışması bekleniyordu.');
    expect(c.alanEtiketi).toBe('Sözleşme maddesi');
    h.alanCatismasiCoz({ evren, nesne: kod, alan: c.alan, islem: c.degerler[0].islem });
    expect(hatirlatma(kisi)).toHaveLength(1);
  });
  it('eserde dışarıda bırakma çatışması gizli bir değer seçmez ve işlemle çözülür', () => {
    const { h, evren, a, madde, gecerli } = kur(), kod = madde(), b = cihaz().h;
    b.evreniDisaridanKur({ kod: evren, islemler: h.islemleriVer({ evren, gorulen: {} }) });
    h.sozlesmeDisaridaYaz({ evren, madde: kod, eser: a, disarida: true });
    b.sozlesmeDisaridaYaz({ evren, madde: kod, eser: a, disarida: false });
    h.islemleriAl({ evren, islemler: b.islemleriVer({ evren, gorulen: h.gorulenler({ evren }) }) });
    expect(gecerli(a)).toEqual([]); expect(h.eserSozlesmesi({ evren, eser: a }).maddeler[0].durum).toBe('belirsiz');
    const alan = `sozlesme_disarida:${a}`, c = h.catismalar({ evren }).find((c) => c.tur === 'alan' && c.alan === alan);
    if (c?.tur !== 'alan') throw new Error('Eser seçimi çatışması bekleniyordu.');
    h.alanCatismasiCoz({ evren, nesne: kod, alan, islem: c.degerler[0].islem });
    expect(h.eserSozlesmesi({ evren, eser: a }).maddeler[0].durum).not.toBe('belirsiz');
  });
  it('uzun/boş metni, var olmayan kayıtları ve yanlış kapsamı Türkçe hatayla reddeder; bağlı kayıt zorunlu değildir', () => {
    const { h, evren, kisi, madde } = kur();
    expect(() => madde({ metin: ' ' })).toThrow(/Madde/); expect(() => madde({ metin: 'a'.repeat(501) })).toThrow(/500/);
    expect(() => madde({ bagliKayitlar: [yeniKod()] })).toThrow(/kayıt/);
    expect(() => madde({ kapsam: { tur: 'eserler', eserler: [] } })).toThrow(/eser/);
    expect(() => madde({ kapsam: { tur: 'eserler', eserler: [kisi] } })).toThrow(/eser/);
    expect(() => madde({ bagliKayitlar: [] })).not.toThrow();
    expect(() => h.sozlesmeMaddeYaz({ evren, kod: '', tanim: tanim() })).toThrow(/maddesi/);
    expect(h.sozlesmeMaddeleri({ evren })[0].bagli).toEqual([]);
  });
  it('birleşen eserlerin kapsamlarını yönlendirir; farklı dışarıda bırakma seçimleri açıkça çözülür', () => {
    const { h, evren, a, b, madde, gecerli } = kur();
    const global = madde(), ozel = madde({ kapsam: { tur: 'eserler', eserler: [a] } });
    h.sozlesmeDisaridaYaz({ evren, madde: global, eser: a, disarida: true });
    h.sozlesmeDisaridaYaz({ evren, madde: global, eser: b, disarida: false });
    h.birlestir({ evren, kaynak: a, hedef: b });
    expect(h.eserSozlesmesi({ evren, eser: b }).maddeler.find((m) => m.madde.kod === global)?.durum).toBe('belirsiz');
    expect(gecerli(b)).toContain(ozel);
    h.sozlesmeDisaridaYaz({ evren, madde: global, eser: b, disarida: false });
    expect(gecerli(b)).toContain(global);
  });
  it('tablolar işlemden yeniden kurulur ve eski izdüşüm sürümü değiştirilmez', () => {
    const { h, ac, e, evren, a, madde, gecerli } = kur(), kod = madde();
    h.sozlesmeDisaridaYaz({ evren, madde: kod, eser: a, disarida: true });
    const db = ac(`/evren-${evren}.db`), once = db.selectValue("SELECT v FROM meta WHERE k='izdusum_surumu'");
    e().yenidenKur(); expect(gecerli(a)).toEqual([]);
    db.exec('DROP TABLE sozlesme_disarida; DROP TABLE sozlesme_maddeleri');
    e().yenidenKur(); expect(h.sozlesmeMaddeleri({ evren })).toHaveLength(1); expect(gecerli(a)).toEqual([]);
    expect(db.selectValue("SELECT v FROM meta WHERE k='izdusum_surumu'")).toBe(once);
  });
});
