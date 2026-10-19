// F33 bir sonraki yararlı soru: yazar bir hesabı çözmek istediğini söyler ("bu sahnenin yolculuğu"), program o
// hesabın girdilerinden hangisinin eksik olduğunu ve eksik bilginin başka hangi hesaplarda kullanıldığını gösterir.
// "Üç hesapta kullanılıyor" bir önem puanı değildir; eksik alanlar kusur sayılmaz (K5). Hiçbir şey yazılmaz.
import type { EvrenTarihi } from '../alan/tarih';
import { tarihCoz } from '../alan/tarih';
import type { KisaKayit, SonrakiSoru, SonrakiSoruGirdisi } from '../veri/api';
import type { EvrenVt } from './evren-vt';
import { yonlendir, zamanSetiOku } from './izdusum';
import { asamalarOku, rotalar } from './yol';
import { enKisaRota, haberCikisiOku, kanalOku } from './haber';
import { tanimOku as gokyuzuTanimi } from './gokyuzu';
import { tarihDegeri } from './sablon';
import { acikBirakilanKayitlar } from './anlati-sozlesmesi';

export type Hesap = SonrakiSoru['hesap'];
export const HESAP_ADLARI: Record<Hesap, string> = {
  yolculuk: 'Yolculuğun süresi ve varış günleri', yol: 'Bu yere yolculuk', haber: 'Haberin yayılımı', yas: 'Yaşı', gokyuzu: 'O günkü gökyüzü', yaslar: 'Katılımcıların yaşı',
};
const YER_TURLERI = ['mekan', 'sehir', 'siyasi'];
/** Kayıt türüne göre sorulabilecek hesaplar. */
export function hesaplar(tur: string): Hesap[] {
  if (tur === 'yolculuk') return ['yolculuk'];
  if (tur === 'sahne') return ['yol', 'yaslar', 'gokyuzu'];
  if (tur === 'olay') return ['gokyuzu'];
  if (tur === 'haber') return ['haber'];
  if (tur === 'karakter') return ['yas'];
  if (YER_TURLERI.includes(tur)) return ['yol'];
  return [];
}

export interface SoruBaglami { olayTarihi(kod: string): EvrenTarihi | null; sahneYeri(kod: string): KisaKayit | null; katilimcilar(kod: string): KisaKayit[] }

function kisa(e: EvrenVt, kod: string): KisaKayit {
  const k = yonlendir(e.db, kod);
  const r = e.db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=?', [k]);
  return r ? { kod: k, ad: r.ad as string, tur: r.tur as string } : { kod: k, ad: 'Silinmiş kayıt', tur: 'diger' };
}

// Bir bilgi türünün kullanıldığı hesaplar. Sabit bir listedir; somut kayıtlar varsa onlar da sayılır.
function rotaKullanimi(e: EvrenVt, rota: string): string[] {
  const l: string[] = [];
  for (const r of e.db.selectObjects(`SELECT y.kod, k.ad FROM yolculuklar y JOIN kayitlar k ON k.kod=y.kod WHERE k.silindi IS NULL AND k.karar<>'vazgecildi'`)) {
    if (asamalarOku(e, r.kod as string).some((a) => a.rota === rota)) l.push(`“${r.ad}” yolculuğu`);
  }
  for (const r of e.db.selectObjects(`SELECT kod, ad FROM kayitlar WHERE tur='haberlesme' AND silindi IS NULL AND karar<>'vazgecildi'`)) {
    if (kanalOku(e, r.kod as string).rotalar) l.push(`“${r.ad}” ile haber yayılımı`);
  }
  return [...l, 'yerler arası en kısa yol', 'sonuçtan koşullara masası'];
}
const TARIH_KULLANIMI = ['zaman çizelgesi', 'katılımcıların yaşı', 'o günkü gökyüzü', 'değişiklik masası'];
const DOGUM_KULLANIMI = ['her tarihteki yaşı', 'doğumundan önceki olay denetimi', 'soy ağacı'];

const var_ = (ad: string, aciklama = '', kayit: KisaKayit | null = null): SonrakiSoruGirdisi => ({ ad, durum: 'var', aciklama, kayit, kullanim: [] });
const eksik = (ad: string, aciklama: string, kayit: KisaKayit | null, kullanim: string[]): SonrakiSoruGirdisi => ({ ad, durum: 'eksik', aciklama, kayit, kullanim });
const kismen = (ad: string, aciklama: string, kayit: KisaKayit | null, kullanim: string[]): SonrakiSoruGirdisi => ({ ad, durum: 'kısmen', aciklama, kayit, kullanim });

function yolGirdileri(e: EvrenVt, nereden: string | null, nereye: string | null, tarih: EvrenTarihi | null, tarihKaydi: KisaKayit | null): SonrakiSoruGirdisi[] {
  const g: SonrakiSoruGirdisi[] = [];
  g.push(nereden ? var_('Nereden', '', kisa(e, nereden)) : eksik('Nereden', 'Yolculuğun başladığı yeri seçin.', null, []));
  g.push(nereye ? var_('Nereye', '', kisa(e, nereye)) : eksik('Nereye', 'Sahnenin yeri yazılmamış.', tarihKaydi, ['sahnedeki yerin durumu', 'harita üzerinde sahneler']));
  const ucsuz = e.db.selectObjects(`SELECT k.kod, k.ad FROM kayitlar k LEFT JOIN rotalar r ON r.kod=k.kod
      WHERE k.tur='rota' AND k.silindi IS NULL AND k.karar<>'vazgecildi' AND (r.a IS NULL OR r.b IS NULL)`).map((r) => ({ kod: r.kod as string, ad: r.ad as string }));
  if (nereden && nereye && nereden !== nereye) {
    const s = enKisaRota(e, nereden, nereye, null, null, null);
    if (s.kip === 'sure') {
      g.push(var_('Süre ağı', `Kayıtlı rotalarla en kısa ${s.toplam!.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} gün.`));
      const kosullar = new Set(s.adimlar.flatMap((a) => rotalar(e).find((r) => r.kod === a.rota.kod)?.sureler.map((x) => x.kosul).filter(Boolean) ?? []));
      g.push(kosullar.size > 1 ? kismen('Ulaşım biçimi', `Yoldaki rotalarda birden çok koşul var (${[...kosullar].join(', ')}); hangisiyle gidildiği seçilirse süre kesinleşir.`, null, ['yerler arası en kısa yol', 'sonuçtan koşullara masası'])
        : var_('Ulaşım biçimi', kosullar.size ? `Tek koşul: ${[...kosullar][0]}.` : 'Rotalarda koşul ayrımı yok.'));
    } else if (s.kip === 'kroki') {
      for (const r of s.eksik) g.push(eksik('Rota süresi', `“${r.ad}” rotasının süresi yazılmamış; bağlantı var ama süre bilinmiyor.`, r, rotaKullanimi(e, r.kod)));
    } else {
      g.push(eksik('Süre ağı', 'Bu iki yer arasında kayıtlı rota zinciri yok. Bir rota kaydı ekleyip uçlarını ve süresini yazın.', null, ['yerler arası en kısa yol', 'haber yayılımı', 'sonuçtan koşullara masası']));
      for (const r of ucsuz.slice(0, 5)) g.push(kismen('Rota uçları', `“${r.ad}” rotasının uçları yazılmamış; hesaba katılamıyor.`, kisa(e, r.kod), rotaKullanimi(e, r.kod)));
    }
  }
  g.push(tarih?.eksen ? var_('Başlangıç ya da varış tarihi', tarih.ifade, tarihKaydi) : eksik('Başlangıç ya da varış tarihi', 'Tarih olmadan süre gün olarak verilir, takvimde yere oturmaz.', tarihKaydi, TARIH_KULLANIMI));
  return g;
}

export function sonrakiSoru(e: EvrenVt, b: SoruBaglami, hesap: Hesap, kodGirdi: string, secenek: { nereden?: string | null; tarih?: string | null }): SonrakiSoru {
  const kod = yonlendir(e.db, kodGirdi);
  const kayit = kisa(e, kod);
  if (e.db.selectValue('SELECT 1 FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]) === undefined) throw new Error('Kayıt bulunamadı.');
  if (!hesaplar(kayit.tur).includes(hesap)) throw new Error('Bu kayıt için bu hesap sorulamaz.');
  const z = zamanSetiOku(e.db);
  let girdiler: SonrakiSoruGirdisi[] = [];
  if (hesap === 'yolculuk') {
    const a = asamalarOku(e, kod);
    if (!a.length) girdiler.push(eksik('Aşamalar', 'Yolculuğun hiç aşaması yok; nereden nereye gidildiğini yazın.', kayit, ['harita üzerinde yolculuk', 'yolcuların bulunduğu yer denetimi']));
    const rs = new Map(rotalar(e).map((r) => [r.kod, r]));
    a.forEach((x, i) => {
      const ad = `${i + 1}. aşama`;
      if (!x.nereden || !x.nereye) girdiler.push(eksik(`${ad}: yerler`, 'Çıkış ya da varış yeri yazılmamış.', kayit, ['yolcuların bulunduğu yer denetimi', 'harita üzerinde yolculuk']));
      if (!x.cikis?.eksen) girdiler.push(eksik(`${ad}: çıkış tarihi`, 'Çıkış tarihi yok ya da takvime çevrilemiyor.', kayit, ['yolcuların bulunduğu yer denetimi', ...TARIH_KULLANIMI.slice(0, 1)]));
      if (!x.varis?.eksen) {
        const r = x.rota ? rs.get(x.rota) : undefined;
        if (r?.sureler.length) girdiler.push(kismen(`${ad}: varış tarihi`, `Varış yazılmamış; “${r.ad}” rotasının süresinden varış günü bulunabilir.`, kayit, ['yolcuların bulunduğu yer denetimi']));
        else if (r) girdiler.push(eksik(`${ad}: rota süresi`, `Varış yazılmamış ve “${r.ad}” rotasının süresi yok.`, kisa(e, r.kod), rotaKullanimi(e, r.kod)));
        else if (x.nereden && x.nereye) girdiler.push(...yolGirdileri(e, x.nereden, x.nereye, x.cikis, kayit).filter((g) => g.durum !== 'var' && !['Nereden', 'Nereye', 'Başlangıç ya da varış tarihi'].includes(g.ad)).map((g) => ({ ...g, ad: `${ad}: ${g.ad.toLocaleLowerCase('tr-TR')}` })));
        else girdiler.push(eksik(`${ad}: varış tarihi`, 'Varış tarihi de rota da yok.', kayit, ['yolcuların bulunduğu yer denetimi']));
      }
    });
    if (!e.db.selectValue(`SELECT 1 FROM iliskiler WHERE tur='yolculukta' AND b=? AND silindi IS NULL`, [kod])) girdiler.push(eksik('Yolcular', 'Yolculuğa kimin katıldığı yazılmamış.', kayit, ['yolcuların bulunduğu yer denetimi', 'harita üzerinde kim nerede']));
    if (!girdiler.length) girdiler.push(var_('Aşamalar', 'Her aşamanın yeri ve tarihi yazılmış.', kayit));
  } else if (hesap === 'yol') {
    const sahne = kayit.tur === 'sahne';
    const nereye = sahne ? b.sahneYeri(kod)?.kod ?? null : kod;
    const tarih = sahne ? b.olayTarihi(kod) : secenek.tarih?.trim() ? tarihCoz(secenek.tarih, z) : null;
    const nereden = secenek.nereden ? yonlendir(e.db, secenek.nereden) : null;
    girdiler = yolGirdileri(e, nereden, nereye, tarih, sahne ? kayit : null);
  } else if (hesap === 'haber') {
    const c = haberCikisiOku(e, kod);
    girdiler.push(c.yer ? var_('Çıkış yeri', '', c.yer) : eksik('Çıkış yeri', 'Haberin nereden çıktığı yazılmamış.', kayit, ['haber yayılımı']));
    girdiler.push(c.tarih?.eksen ? var_('Çıkış tarihi', c.tarih.ifade) : eksik('Çıkış tarihi', 'Tarih olmadan yalnızca gün sayısı verilir, takvimde yere oturmaz.', kayit, ['haber yayılımı']));
    const kanallar = c.kanallar.length ? c.kanallar.map((k) => k.kod) : e.db.selectObjects("SELECT kod FROM kayitlar WHERE tur='haberlesme' AND silindi IS NULL AND karar<>'vazgecildi'").map((r) => r.kod as string);
    if (!kanallar.length) girdiler.push(eksik('Haberleşme yöntemi', 'Evrende haberleşme yöntemi kaydı yok (ulak, güvercin…).', null, ['haber yayılımı']));
    for (const k of kanallar) {
      const t = kanalOku(e, k);
      if (!t.rotalar && !t.baglantilar.length) girdiler.push(eksik('Haberleşme yöntemi', `“${kisa(e, k).ad}” yönteminin bağlantısı tanımlı değil (rotaları kullanmıyor, elle bağlantı da yok).`, kisa(e, k), ['haber yayılımı']));
      else if (t.rotalar && !rotalar(e).some((r) => r.a && r.b && r.sureler.length)) girdiler.push(eksik('Rota süreleri', `“${kisa(e, k).ad}” rotaları kullanıyor ama süresi yazılmış rota yok.`, null, ['yerler arası en kısa yol', 'yolculuk', 'sonuçtan koşullara masası']));
      else girdiler.push(var_('Haberleşme yöntemi', '', kisa(e, k)));
    }
  } else if (hesap === 'yas') {
    const dogum = tarihDegeri(e, kod, 'dogum');
    girdiler.push(dogum?.eksen ? var_('Doğum', dogum.ifade) : eksik('Doğum', dogum ? 'Doğum tarihi takvime çevrilemiyor.' : 'Doğum tarihi yazılmamış.', kayit, DOGUM_KULLANIMI));
    const olum = tarihDegeri(e, kod, 'olum');
    girdiler.push(olum ? var_('Ölüm', olum.ifade) : var_('Ölüm', 'Yazılmamış; yaşadığı varsayılmaz, yalnızca yaş verilir.'));
    if (secenek.tarih?.trim()) girdiler.push(tarihCoz(secenek.tarih, z)?.eksen ? var_('Hangi tarihte', secenek.tarih.trim()) : eksik('Hangi tarihte', 'Yazdığınız tarih okunamadı.', null, []));
  } else if (hesap === 'yaslar') {
    const tarih = b.olayTarihi(kod);
    girdiler.push(tarih?.eksen ? var_('Sahnenin tarihi', tarih.ifade, kayit) : eksik('Sahnenin tarihi', 'Sahnenin tarihi yazılmamış.', kayit, TARIH_KULLANIMI));
    const k = b.katilimcilar(kod).filter((x) => x.tur === 'karakter');
    if (!k.length) girdiler.push(eksik('Katılımcılar', 'Sahnede kimin olduğu yazılmamış.', kayit, ['bölüm × kayıt matrisi', 'sahne paneli']));
    for (const x of k) {
      const d = tarihDegeri(e, x.kod, 'dogum');
      girdiler.push(d?.eksen ? var_(`${x.ad}: doğum`, d.ifade, x) : eksik(`${x.ad}: doğum`, 'Doğum tarihi yazılmamış.', x, DOGUM_KULLANIMI));
    }
  } else if (hesap === 'gokyuzu') {
    const t = gokyuzuTanimi(e);
    girdiler.push(t && t.aylar.length ? var_('Gökyüzü tanımı', `${t.aylar.length} ay tanımlı.`) : eksik('Gökyüzü tanımı', 'Evrenin aylarının döngüsü tanımlanmamış (Gökyüzü sekmesi).', null, ['o günkü gökyüzü (her sahne ve olay için)', 'gökyüzü çakışma araması']));
    const tarih = b.olayTarihi(kod);
    girdiler.push(tarih?.eksen ? var_('Tarih', tarih.ifade, kayit) : eksik('Tarih', 'Kaydın tarihi yazılmamış ya da takvime çevrilemiyor.', kayit, TARIH_KULLANIMI));
  }
  // Anlatı sözleşmesinde bilinçli olarak açık bırakılan kayda ait girdi eksik sayılmaz (F15).
  const acik = acikBirakilanKayitlar(e);
  girdiler = girdiler.map((g) => g.durum !== 'var' && g.kayit && acik.has(g.kayit.kod)
    ? { ...g, durum: 'var', aciklama: `Anlatı sözleşmesinde bilinçli olarak açık bırakıldı. (${g.aciklama})`, kullanim: [] } : g);
  const eksikler = girdiler.filter((g) => g.durum !== 'var');
  return {
    hesap, ad: HESAP_ADLARI[hesap], kayit, girdiler, hazir: !eksikler.some((g) => g.durum === 'eksik'),
    siradaki: eksikler[0] ?? null,
    not: '“Kaç hesapta kullanıldığı” bir önem puanı değildir; boş alanlar eksik sayılmaz. Yalnızca seçtiğiniz hesap için gerekenler gösterilir.',
  };
}
