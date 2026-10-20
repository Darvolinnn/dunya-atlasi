// Örnek evren (§5.10, K28): programla gelen uydurma "Hatıra İmparatorluğu" serisi. Kayıtlar ve metinleri içe
// aktarma yoluyla (§10.11) yeni bir evrene yazılır; seri, kitaplar, sahneler, ilişkiler, takvim, harita ve
// sorular ardından programın olağan istekleriyle eklenir. Her yazı işlem günlüğünden geçer. Bütün içerik
// uydurmadır; kullanıcının evrenlerine karışmaz, öbür evrenler gibi kaldırılır.
import { pmNodeToSpans } from '@automerge/prosemirror';
import { belgeYap, bloklar } from '../alan/markdown';
import { metinSemasi } from '../alan/metin-sema';
import { katla } from '../alan/turkce';
import { kokAdaylari } from '../alan/turkce-ek';
import type { Takvim } from '../alan/tarih';
import type { Spans } from '../veri/api';
import type { IceDosya } from './ice-aktarim';
import type { Hizmet } from './hizmet';
import { BASKENT_PLANI_PNG } from './ornek-harita';

export const ORNEK_EVREN_ADI = 'Hatıra İmparatorluğu (örnek)';

const AYLAR: [string, number][] = [['Ocak', 31], ['Şubat', 28], ['Mart', 31], ['Nisan', 30], ['Mayıs', 31], ['Haziran', 30],
  ['Temmuz', 31], ['Ağustos', 31], ['Eylül', 30], ['Ekim', 31], ['Kasım', 30], ['Aralık', 31]];
/** Divan takvimi: yıllar Divan'ın kuruluşundan sayılır (D.Y.); ay adları gerçek takvimdeki gibi. */
export const DIVAN_TAKVIMI: Takvim = {
  kod: 'ana', surum: 1, ad: 'D.Y.', yilGun: 365,
  aylar: AYLAR.map(([ad, gun]) => ({ ad, gun })),
  mevsimler: [{ ad: 'Kış', ilkAy: 11, sonAy: 1 }, { ad: 'İlkbahar', ilkAy: 2, sonAy: 4 }, { ad: 'Yaz', ilkAy: 5, sonAy: 7 }, { ad: 'Sonbahar', ilkAy: 8, sonAy: 10 }],
};

interface OrnekKayit { ad: string; tur: string; ozet: string; govde?: string; karar?: 'fikir' | 'kesin' }

/** İçe aktarılan kayıtlar. Gövdedeki [[Ad]] bağlantıları içe aktarmada çözülür. */
const KAYITLAR: OrnekKayit[] = [
  { ad: 'Hatıra İmparatorluğu', tur: 'seri', ozet: 'Anıların vergi olarak toplandığı bir imparatorlukta geçen seri' },
  { ad: 'Unutulanlar', tur: 'eser', ozet: 'Birinci kitap: Lale kayıp kardeşinin izini sürer' },
  { ad: 'Hatırlayanlar', tur: 'eser', ozet: 'İkinci kitap: silinen anılar geri istenir' },
  { ad: 'İlk Vergi', tur: 'eser', ozet: 'Ek kitap (novella): anı vergisinin ilk toplandığı yıl', karar: 'fikir' },
  { ad: 'Lale', tur: 'karakter', ozet: 'Arşiv memuru; kardeşini arıyor',
    govde: '[[Başkent Arşivi]]nde kâtip yardımcısı. Kardeşi [[Deniz]] kaybolduğundan beri dosyasını arıyor. Annesi [[Selvi]]nin yüzünü hatırlayamıyor.' },
  { ad: 'Deniz', tur: 'karakter', ozet: 'Lale\'nin kardeşi; kayıp',
    govde: 'Kız kardeşi [[Lale]]den iki yaş küçük. [[Anı Kaçakçıları]] ile görüldüğü söyleniyor.' },
  { ad: 'Orhun', tur: 'karakter', ozet: 'Divan başkâtibi; savaşı önlemek istiyor',
    govde: '[[Hafıza Divanı]]nın başkâtibi. Acı anılar alınmazsa isyanın yeniden başlayacağına inanıyor.' },
  { ad: 'Selvi', tur: 'karakter', ozet: 'Lale ile Deniz\'in annesi' },
  { ad: 'Hafıza Divanı', tur: 'topluluk', ozet: 'Anı vergisini toplar',
    govde: 'İmparatorluğun anılarını toplayan kurum. Toplanan anılar mühürlü şişelerde [[Başkent Arşivi]]nde saklanır.' },
  { ad: 'Anı Kaçakçıları', tur: 'topluluk', ozet: 'Çalınan anıların yeraltı ticareti' },
  { ad: 'Başkent', tur: 'sehir', ozet: 'İmparatorluğun merkezi' },
  { ad: 'Başkent Arşivi', tur: 'mekan', ozet: 'Başkentte; anı şişelerinin deposu' },
  { ad: 'Kuzey Çarşısı', tur: 'mekan', ozet: 'Başkentte; kaçakçıların buluştuğu yer' },
  { ad: 'Divan Sarayı', tur: 'mekan', ozet: 'Başkentte; Divan\'ın toplandığı yer' },
  { ad: 'Arşiv yolu', tur: 'rota', ozet: 'Divan Sarayı ile Başkent Arşivi arası' },
  { ad: 'Çarşı yolu', tur: 'rota', ozet: 'Başkent Arşivi ile Kuzey Çarşısı arası' },
  { ad: 'Kâtiplik', tur: 'buyu_sistemi', ozet: 'Dokunuşla anı alma',
    govde: 'Kâtip, bir kişinin şakağına dokunarak anıyı alır ve şişeye koyar. Anı alınınca ona bağlı duygu da gider.' },
  { ad: 'Anı vergisi', tur: 'evren_kurali', ozet: 'Yılda bir kez toplanan anı',
    govde: 'Her yetişkin yılda bir anı verir. Yoksullar zorla verir, zenginler gönüllü verir ve karşılığında vergiden düşülür.' },
  { ad: 'Salgın Yılı', tur: 'inanc', ozet: 'Halkın inancı: "İsyan olmadı, salgın oldu"',
    govde: 'Halkın çoğu D.Y. 392\'de bir salgın yaşandığına inanır. Gerçekte o yıl bir [[İsyan]] bastırılmış ve anıları toplu silinmiştir.' },
  { ad: 'İsyan', tur: 'olay', ozet: 'Anıları toplu silinen ayaklanma', karar: 'fikir' },
  { ad: 'Anı vergisi artırılır', tur: 'olay', ozet: 'İsyanın ardından Divan vergiyi ikiye katlar' },
  { ad: 'Divan\'ın kuruluşu', tur: 'olay', ozet: 'Divan takviminin başlangıcı' },
  { ad: 'Annenin kırık şişesi', tur: 'esya', ozet: 'Lale\'de; birinci kitapta hazırlık, ikincide karşılık' },
  { ad: 'Deniz\'in izi', tur: 'kurgu_hatti', ozet: 'Deniz\'e ne oldu?' },
  { ad: 'Divan\'ın sırrı', tur: 'kurgu_hatti', ozet: 'Divan isyanı neden sildi?' },
  { ad: 'Lale sarnıçta Divan\'ın eski mührünü bulsun', tur: 'not', ozet: '' },
  { ad: 'Deniz arşive girmiş miydi?', tur: 'not', ozet: '',
    govde: 'Deniz 2. bölümde arşive hiç girmemişti; 4. sahnede girmiş gibi konuşuyor.' },
  { ad: 'Orhun\'un sürgün yılları', tur: 'not', ozet: '' },
];

const NOTLAR: [string, string, string][] = [
  ['Lale sarnıçta Divan\'ın eski mührünü bulsun', 'sahne_fikri', 'fikir'],
  ['Deniz arşive girmiş miydi?', 'celiski', 'kontrol'],
  ['Orhun\'un sürgün yılları', 'karakter_fikri', 'gelisiyor'],
];

interface OrnekSahne {
  ad: string; bakis: string; yer: string; kimler: string[]; tarih?: string; donum?: boolean; metin?: string;
  plan?: [string, string, string, string?];
}
const UNUTULANLAR: { bolum: string; sahneler: OrnekSahne[] }[] = [
  { bolum: 'Vergi Günü', sahneler: [
    { ad: 'Arşiv', bakis: 'Lale', yer: 'Başkent Arşivi', kimler: ['Lale'], tarih: 'Sonbahar 412', donum: true,
      plan: ['Lale, Deniz\'in kaydını bulmak istiyor.', 'Kayıt silinmiş.', 'Kendi anısının da eksik olduğunu fark ediyor.', 'Devlet arşivinde anı silme uygulaması var.'],
      metin: `Vergi günü arşivin taş merdivenleri her zamankinden soğuktu. [[Lale]], kardeşi [[Deniz]]'in dosyasını üçüncü kez istedi; kâtip üçüncü kez başını salladı. "Böyle bir kayıt yok."

Lale dosya dolabının çekmecesini kendisi açtı. Deniz'in adının yazılı olması gereken satır boştu; kâğıt yeni kazınmıştı. Parmağını satırın üstünde gezdirirken tuhaf bir şey fark etti: annesinin sesini hatırlamıyordu. Çocukluğundan bir akşam, sofrada biri şarkı söylüyordu, ama şarkı da yüz de yoktu. Yalnızca masanın tahtasına vuran bir yüzüğün sesi kalmıştı.

Masanın üstünde [[Hafıza Divanı]]'nın mührünü taşıyan bir şişe duruyordu, ağzı kırık. İçi boştu, ama camın dibinde kurumuş bir damla parlıyordu. Lale şişeyi cebine koymadı. Henüz değil. Çekmeceyi kapattı, kâtibe teşekkür etti ve merdivenleri inerken adımlarını saydı, sanki sayıları da biri elinden alacakmış gibi.` },
    { ad: 'Başkâtip', bakis: 'Lale', yer: 'Başkent Arşivi', kimler: ['Lale', 'Orhun'], tarih: 'Sonbahar 412',
      plan: ['Lale, kazınmış satırın nedenini öğrenmek istiyor.', 'Orhun konuyu kapatıyor.', 'Lale, Divan\'ın bir sınırı olduğunu öğreniyor.'],
      metin: `[[Orhun]] kapıyı vurmadan girdi. Başkâtiplerin kapı vurması gerekmezdi; arşiv onlarındı.

"Bir dosya arıyormuşsun," dedi. Sesi yorgundu, kızgın değil. Lale kazınmış satırı anlattı, sonra sustu. Orhun pencerenin önüne geçti, avludaki vergi kuyruğuna baktı. Kuyruktakilerin çoğu yaşlıydı; ellerinde sıra fişleri, yüzlerinde hiçbir şey.

"Divan her şeyi alır," dedi sonunda. "Ama çocukların anılarına dokunmayız. Bu bizim tek sınırımız. Kardeşin çocuk değildi."

Lale bunun bir cevap mı, bir uyarı mı olduğunu anlayamadı. Orhun masadaki kırık şişeye baktı ve hiçbir şey söylemeden onu kendi cebine koydu. Kapıdan çıkarken durdu. "Annenin adı neydi?" diye sordu. Lale cevap verdi. Orhun başını salladı, sanki bir defteri kapatıyormuş gibi.` },
  ] },
  { bolum: 'Şişe', sahneler: [
    { ad: 'Kaçakçılar', bakis: 'Lale', yer: 'Kuzey Çarşısı', kimler: ['Lale', 'Anı Kaçakçıları'], tarih: 'Sonbahar 412',
      plan: ['Lale, Deniz\'i görenleri bulmak istiyor.', 'Kaçakçılar ondan bir anı istiyor.', 'Lale, Deniz\'in buraya geldiğini öğreniyor.'],
      metin: `[[Kuzey Çarşısı]] akşamları balık ve mum kokardı. Tezgâhların arkasında, perdeli bir kapının ardında [[Anı Kaçakçıları]] otururdu.

Lale'yi içeri alan kadın şişeleri bir bir ışığa tuttu. "Burada her şeyin bir fiyatı var," dedi. "Bir soru için bir anı."

Lale düşündü. Hangi anısını verebilirdi? Sonunda ilk okul gününü seçti; ondan geriye pek bir şey kalmamıştı zaten. Kadın parmaklarını Lale'nin şakağına değdirdi. Bir an serinlik, sonra hiçbir şey.

"Kardeşin buradaydı," dedi kadın. "İki ay önce. Anı satmaya değil, almaya geldi. Annenizin bir anısını arıyordu. Bulamadı. Divan'ın şişeleri bizim raflarımıza düşmez."

Lale dışarı çıktığında ilk okul gününün yerinde küçük, düzgün bir boşluk vardı. Acımıyordu. Asıl korkutucu olan da buydu.` },
    { ad: 'Mühür', bakis: 'Lale', yer: 'Başkent Arşivi', kimler: ['Lale'], tarih: 'Sonbahar 412', donum: true,
      plan: ['Lale, annesinin anısını geri almak istiyor.', 'Şişeler mühürlü; mührü kırmak suç.', 'Lale sınırını çiğniyor ve bir şişeyi kaçırıyor.'],
      metin: `Gece arşiv başka bir yerdi. Raflar karanlıkta daha uzun, merdivenler daha dikti.

Lale anahtarı çoktan beri cebinde taşıyordu; kâtip yardımcılarına verilen sıradan bir anahtar. Alt kattaki şişe odası kilitli değildi. Divan, mührün yeteceğine inanırdı.

Raflarda binlerce şişe vardı ve her birinin üstünde bir ad. Lale annesinin adını buldu: [[Selvi]]. Şişe ötekilerden eskiydi, camı bulanıktı. Mühürde Divan'ın gözlü işareti duruyordu.

Mührü kırmak, arşivin tek yasasıydı. Lale bunu bir memur gibi biliyordu. Şişeyi kucağına aldı, bir an öyle bekledi. Sonra mührü kırmadan, şişeyi paltosunun içine soktu ve rafa onun yerine boş bir şişe koydu.

Merdivenleri çıkarken bu kez adımlarını saymadı.` },
  ] },
];
const HATIRLAYANLAR_SAHNELERI: OrnekSahne[] = [
  { ad: 'Deniz\'in sesi', bakis: 'Deniz', yer: 'Kuzey Çarşısı', kimler: ['Deniz'] },
  { ad: 'Kırık şişe', bakis: 'Lale', yer: 'Divan Sarayı', kimler: ['Lale', 'Orhun'] },
];

const md = (k: OrnekKayit) => [
  '---', `ad: ${k.ad}`, `tur: ${k.tur}`, `ozet: ${k.ozet}`, `karar: ${k.karar ?? 'kesin'}`, '---', '', k.govde ?? '', '',
].join('\n');

/** İçe aktarma için örnek evrenin kayıt dosyaları. */
export const ornekDosyalari = (): IceDosya[] => KAYITLAR.map((k, i) => ({ yol: `ornek/${String(i + 1).padStart(2, '0')}.md`, metin: md(k) }));

function base64Coz(s: string) {
  const ikili = atob(s);
  const v = new Uint8Array(ikili.length);
  for (let i = 0; i < ikili.length; i++) v[i] = ikili.charCodeAt(i);
  return v;
}

/** Örnek evreni yeni bir evren olarak kurar ve kodunu döndürür. */
export async function ornekEvreniKur(h: Hizmet): Promise<{ kod: string }> {
  const { kod: evren } = await h.iceAktar({ dosyalar: ornekDosyalari(), evrenAdi: ORNEK_EVREN_ADI });
  h.kurguTuruYaz({ evren, kurgu: 'fantastik' });
  h.takvimYaz({ evren, takvim: DIVAN_TAKVIMI });

  const adlar = new Map(h.kayitlar({ evren }).map((k) => [katla(k.ad), k.kod]));
  const kod = (ad: string) => {
    const k = adlar.get(katla(ad)) ?? kokAdaylari(ad).map((x) => adlar.get(x)).find(Boolean);
    if (!k) throw new Error(`Örnek evrende “${ad}” kaydı yok.`);
    return k;
  };
  const iliski = (tur: string, a: string, b: string, ek: { rol?: string | null; baslangic?: string } = {}) =>
    h.iliskiEkle({ evren, tur, a: kod(a), b: kod(b), rol: ek.rol ?? null, baslangic: ek.baslangic ?? '' });
  const cevap = (kayit: string, soru: string, metin: string) =>
    h.soruCevapla({ evren, kod: kayit === 'evren' ? 'evren' : kod(kayit), soru, durum: 'cevaplandi', cevap: metin });
  const metinYaz = (kayit: string, yazi: string) => {
    const temel = h.metinAc({ evren, kayit, alan: 'govde' }).basliklar;
    const belge = belgeYap(bloklar(yazi, {}, []), kod);
    h.metinKaydet({ evren, kayit, alan: 'govde', spans: pmNodeToSpans(metinSemasi, belge) as Spans, temel });
  };

  // Tarihler (takvim yazıldıktan sonra çözülür).
  h.kayitTarih({ evren, kod: kod('Divan\'ın kuruluşu'), ifade: 'D.Y. 1' });
  h.kayitTarih({ evren, kod: kod('İsyan'), ifade: 'D.Y. 392' });
  h.kayitTarih({ evren, kod: kod('Anı vergisi artırılır'), ifade: 'D.Y. 393' });
  h.kayitAlanYaz({ evren, kod: kod('Lale'), alan: 'dogum', deger: 'D.Y. 389' });
  h.kayitAlanYaz({ evren, kod: kod('Deniz'), alan: 'dogum', deger: 'D.Y. 391' });
  h.kayitAlanYaz({ evren, kod: kod('Selvi'), alan: 'dogum', deger: 'D.Y. 360' });
  h.kayitAlanYaz({ evren, kod: kod('Selvi'), alan: 'olum', deger: 'D.Y. 402' });

  // Seri ve kitaplar.
  const seri = kod('Hatıra İmparatorluğu');
  const [i, ii, ek] = ['Unutulanlar', 'Hatırlayanlar', 'İlk Vergi'].map(kod);
  for (const x of [i, ii, ek]) h.anlatiYerlestir({ evren, kod: x, ust: seri });
  h.kayitAlanYaz({ evren, kod: i, alan: 'calisma', deger: 'ilk_taslak' });
  h.kayitAlanYaz({ evren, kod: ii, alan: 'calisma', deger: 'plan' });
  h.kayitAlanYaz({ evren, kod: ek, alan: 'calisma', deger: 'fikir' });
  cevap('Hatıra İmparatorluğu', 'seri.1', 'Bellek kimin olmalı: kişinin mi, devletin mi?');
  h.olasiFinalEkle({ evren, seri, ad: 'Anılar halka geri verilir ve Divan dağılır' });
  h.olasiFinalEkle({ evren, seri, ad: 'Divan kalır ama anı vermek gönüllü olur' });
  h.okumaYollariYaz({ evren, seri, yollar: [{ ad: 'Yayın sırası', eserler: [i, ii, ek] }, { ad: 'Kronoloji', eserler: [ek, i, ii] }] });
  cevap('Unutulanlar', 'cekirdek.1', 'Lale, kayıp kardeşi Deniz\'in dosyasını bulmak istiyor.');
  cevap('Unutulanlar', 'eser.1', 'Divan neyi, neden siliyor?');

  // Sahneler.
  const sahneKur = (ust: string, s: OrnekSahne) => {
    const k = h.anlatiOlustur({ evren, ust, ad: s.ad, tur: 'sahne' }).kod;
    adlar.set(katla(s.ad), k);
    h.sahneAlaniAyarla({ evren, sahne: k, alan: 'bakis', kayit: kod(s.bakis) });
    h.sahneAlaniAyarla({ evren, sahne: k, alan: 'sahne_yeri', kayit: kod(s.yer) });
    for (const x of s.kimler) h.iliskiEkle({ evren, tur: 'sahnede', a: kod(x), b: k, rol: 'bulunuyor' });
    if (s.tarih) h.kayitTarih({ evren, kod: k, ifade: s.tarih });
    if (s.donum) h.kayitListe({ evren, kod: k, liste: 'etiket', ekle: 'Dönüm noktası' });
    h.kayitAlanYaz({ evren, kod: k, alan: 'calisma', deger: s.metin ? 'ilk_taslak' : 'planlandi' });
    s.plan?.forEach((m, n) => { if (m) cevap(s.ad, `sahne_plani.${n + 1}`, m); });
    if (s.metin) metinYaz(k, s.metin);
    return k;
  };
  for (const b of UNUTULANLAR) {
    const bolum = h.anlatiOlustur({ evren, ust: i, ad: b.bolum, tur: 'bolum' }).kod;
    for (const s of b.sahneler) sahneKur(bolum, s);
  }
  const iiBolum = h.anlatiOlustur({ evren, ust: ii, ad: 'Geri Dönüş', tur: 'bolum' }).kod;
  for (const s of HATIRLAYANLAR_SAHNELERI) sahneKur(iiBolum, s);

  // Kurgu hatları.
  for (const s of ['Arşiv', 'Kaçakçılar', 'Mühür']) iliski('kurgu_hattinda', s, 'Deniz\'in izi', { rol: 'gelisme' });
  iliski('kurgu_hattinda', 'Başkâtip', 'Divan\'ın sırrı', { rol: 'ipucu_planlandi' });
  iliski('kurgu_hattinda', 'Mühür', 'Divan\'ın sırrı', { rol: 'gelisme' });
  cevap('Deniz\'in izi', 'hat.1', 'Deniz\'e ne oldu?');

  // Okurun bilgisi ve sorular.
  const silme = h.iddiaEkle({ evren, konu: kod('Hafıza Divanı'), soru: 'Divan kayıtları da siliyor mu?', secenekler: ['Evet, kayıtlar da siliniyor', 'Hayır, yalnızca anılar alınıyor'], gercek: 0 }).kod;
  const ss = h.iddialar({ evren }).find((x) => x.kod === silme)!.secenekler;
  h.sahneNiyetleriYaz({ evren, sahne: kod('Arşiv'), niyetler: [{ iddia: silme, secenek: ss[0].kod, tur: 'aciklar' }] });
  const deniz = h.iddiaEkle({ evren, konu: kod('Deniz'), soru: 'Deniz\'e ne oldu?', secenekler: ['Anısı silindi ve sürgüne gönderildi', 'Kaçakçılara katıldı'] }).kod;
  const ds = h.iddialar({ evren }).find((x) => x.kod === deniz)!.secenekler;
  h.sahneNiyetleriYaz({ evren, sahne: kod('Kaçakçılar'), niyetler: [{ iddia: deniz, secenek: ds[1].kod, tur: 'destekler' }] });
  h.sahneNiyetleriYaz({ evren, sahne: kod('Deniz\'in sesi'), niyetler: [{ iddia: deniz, secenek: ds[0].kod, tur: 'aciklar' }] });
  // Gerçekle çelişen inanç: halk salgına inanır, kaçakçılar isyanı bilir.
  const yil = h.iddiaEkle({ evren, konu: kod('İsyan'), soru: 'D.Y. 392\'de ne oldu?', secenekler: ['Bir isyan bastırıldı', 'Bir salgın yaşandı'], gercek: 0 }).kod;
  const ys = h.iddialar({ evren }).find((x) => x.kod === yil)!.secenekler;
  h.bilgiEkle({ evren, bilgi: { iddia: yil, bilen: kod('Lale'), inanc: 'inaniyor', secenek: ys[1].kod } });
  h.bilgiEkle({ evren, bilgi: { iddia: yil, bilen: kod('Anı Kaçakçıları'), inanc: 'inaniyor', secenek: ys[0].kod } });

  // İlişkiler.
  iliski('kardes', 'Lale', 'Deniz');
  iliski('ebeveyn', 'Selvi', 'Lale', { rol: 'kan' });
  iliski('ebeveyn', 'Selvi', 'Deniz', { rol: 'kan' });
  iliski('uye', 'Orhun', 'Hafıza Divanı');
  iliski('dusman', 'Orhun', 'Deniz');
  iliski('sahip', 'Lale', 'Annenin kırık şişesi', { baslangic: 'D.Y. 402' });
  iliski('neden', 'İsyan', 'Anı vergisi artırılır');
  for (const m of ['Başkent Arşivi', 'Kuzey Çarşısı', 'Divan Sarayı']) iliski('parca', m, 'Başkent');

  // Kayıtların soruları (bir kısmı bilerek boş).
  cevap('Lale', 'karakter.1', 'Kardeşi Deniz\'i bulmak.');
  cevap('Lale', 'karakter.2', 'Kendi anılarının da yalan olması.');
  cevap('Lale', 'karakter.5', 'Divan\'ın mührüne el sürmek.');
  cevap('Deniz', 'karakter.1', 'Annesinin sesini geri almak.');
  cevap('Deniz', 'karakter.4', 'Kaçakçılarla ne işi olduğu.');
  h.kayitSoruSeti({ evren, kod: kod('Orhun'), set: 'karsit', ekle: true });
  cevap('Orhun', 'karsit.1', 'İsyanın bir daha başlamaması.');
  cevap('Orhun', 'karsit.2', 'Acı anılar alınmazsa halkın birbirini yiyeceğine inanıyor.');
  cevap('Orhun', 'karsit.4', 'Çocukların anılarına dokunmaz.');
  cevap('Hafıza Divanı', 'topluluk.1', 'İmparatorluğun huzurunu.');
  cevap('Hafıza Divanı', 'topluluk.2', 'Acı anıların hepsini.');
  cevap('Hafıza Divanı', 'topluluk.3', 'Silinen geçmişin geri dönmesinden.');
  cevap('Kâtiplik', 'buyu.2', 'Alınan anıyla birlikte duygusu da gider.');
  cevap('Kâtiplik', 'buyu.3', 'Anı yalnızca sahibine geri verilebilir.');

  // Dünya Pusulası: beş sorudan üçü cevaplı.
  cevap('evren', 'pusula.1', 'Hafıza Divanı halkın acı anılarını alıyor; birileri silinen geçmişi geri istiyor.');
  cevap('evren', 'pusula.3', 'Anı alınınca duygusu da gider; yoksullar zorla, zenginler gönüllü verir.');
  cevap('evren', 'pusula.4', 'Anı yalnızca sahibine geri verilebilir.');

  // Notlar ve karar bekleyen.
  for (const [ad, tur, durum] of NOTLAR) {
    h.kayitAlanYaz({ evren, kod: kod(ad), alan: 'not_turu', deger: tur });
    if (durum !== 'fikir') h.kayitAlanYaz({ evren, kod: kod(ad), alan: 'not_durumu', deger: durum });
  }
  h.yazarKaydiEkle({ evren, tur: 'acik_mesele', ad: 'İsyan neden silindi?', bagla: kod('İsyan'), onemli: true });

  // Harita: programla gelen düz renkli başkent planı, üç işaret ve iki rota.
  const { kod: harita } = await h.haritaYukle({ evren, ad: 'Başkent planı', yer: kod('Başkent'), dosyaAdi: 'baskent-plani.png', tur: 'image/png', veri: base64Coz(BASKENT_PLANI_PNG) });
  const yerler: [string, number, number][] = [['Başkent Arşivi', 200, 160], ['Kuzey Çarşısı', 320, 90], ['Divan Sarayı', 300, 330]];
  for (const [ad, x, y] of yerler) h.isaretKoy({ evren, harita, kayit: kod(ad), konum: { kesinlik: 'kesin', x, y, yaricap: null } });
  const rotalar: [string, string, string, [number, number][]][] = [
    ['Arşiv yolu', 'Divan Sarayı', 'Başkent Arşivi', [[300, 330], [300, 250], [200, 250], [200, 160]]],
    ['Çarşı yolu', 'Başkent Arşivi', 'Kuzey Çarşısı', [[200, 160], [300, 160], [300, 90], [320, 90]]],
  ];
  for (const [ad, a, b, noktalar] of rotalar) {
    h.rotaYaz({ evren, kod: kod(ad), rota: { a: kod(a), b: kod(b), mesafe: null, sureler: [], duraklar: [] } });
    h.cizimEkle({ evren, harita, kayit: kod(ad), bicim: 'yol', noktalar });
  }
  return { kod: evren };
}
