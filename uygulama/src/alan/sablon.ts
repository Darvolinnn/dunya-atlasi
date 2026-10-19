// Düzenlenebilir şablonlar ve soru kütüphanesi (§3.1, §4, §6, Ek A). Şablon bir türün alanları ve soru
// listesidir; değerler kayıtta durur. Şablondan bir alan kaldırılınca değerler silinmez, kayıtta
// "Şablonda olmayan alanlar" altında kalır (§3.1). Bütün sorular isteğe bağlıdır; doluluk ölçülmez.

import { birimGecerli, EN_COK_HASSASIYET, type NicelikTuru } from './nicelik';

/** metin: tek satır · uzun: paragraf · tarih: evren tarihi · secim: seçeneklerden biri · onay: evet/hayır · sayi: birimli sayı */
export type AlanTuru = 'metin' | 'uzun' | 'tarih' | 'secim' | 'onay' | 'sayi';
export const ALAN_TURLERI: { kod: AlanTuru; ad: string }[] = [
  { kod: 'metin', ad: 'Kısa metin' },
  { kod: 'uzun', ad: 'Uzun metin' },
  { kod: 'tarih', ad: 'Evren tarihi' },
  { kod: 'secim', ad: 'Seçeneklerden biri' },
  { kod: 'onay', ad: 'Evet / hayır' },
  { kod: 'sayi', ad: 'Birimli sayı' },
];

export interface Secenek { kod: string; ad: string }
export interface SablonAlani {
  kod: string; ad: string; tur: AlanTuru; ipucu?: string; secenekler?: Secenek[];
  /** Birimli sayı alanında nicelik türü, birim ve ondalık basamak sayısı (§18.1). */
  nicelik?: NicelikTuru; birim?: string; hassasiyet?: number;
  /** Programın anlamını bildiği alan (doğum tarihi, açık meselenin durumu); adı değişebilir, kaldırılamaz. */
  sabit?: boolean;
  /** Boşken hangi eksenden varsayılan alır (§3.7); yoksa varsayılan almaz. */
  varsayilan?: VarsayilanEkseni;
}
export type VarsayilanEkseni = 'kapsama' | 'bagli' | 'kultur' | 'tur';
export const VARSAYILAN_EKSENLERI: { kod: VarsayilanEkseni; ad: string; ornek: string }[] = [
  { kod: 'kapsama', ad: 'Fiziksel kapsamadan', ornek: 'iklim, doğa' },
  { kod: 'bagli', ad: 'Siyasi bağlılıktan', ornek: 'resmî para, vergi, hukuk, resmî takvim' },
  { kod: 'kultur', ad: 'Kültürel aidiyetten', ornek: 'dil, hitap, gelenek, mimari' },
  { kod: 'tur', ad: 'Tür tanımından', ornek: 'yaşam süresi, beden, doğal yetenekler' },
];
export interface Soru { kod: string; metin: string; ipucu?: string }
export interface Sablon { alanlar: SablonAlani[]; sorular: Soru[] }
export interface SoruSeti { kod: string; ad: string; sorular: Soru[] }

const set = (kod: string, ad: string, sorular: (string | [string, string])[]): SoruSeti => ({
  kod, ad, sorular: sorular.map((s, i) => (typeof s === 'string' ? { kod: `${kod}.${i + 1}`, metin: s } : { kod: `${kod}.${i + 1}`, metin: s[0], ipucu: s[1] })),
});

/** Ek A: başlangıç seti. Kodlar değişmez; cevaplar bu kodlarla saklanır. */
export const SORU_SETLERI: SoruSeti[] = [
  set('pusula', 'Dünya Pusulası', [
    ['Bu evrenin ana çatışması ne?', 'Kıtlık, inanç, iktidar, hayatta kalma, özgürlük, intikam…'],
    ['İnsanlar burada nasıl yaşıyor?', 'Geçim, ritüeller, korkular, alışkanlıklar'],
    ['Güç kimde ve bedeli ne?', 'Büyü, bilgi, para, soy…'],
    'Hangi kural kırılırsa her şey değişir?',
    'Bu evren karakteri nasıl dönüştürüyor?',
  ]),
  set('baslangic', 'Yeni evren başlangıcı', [
    ['Temel fikir', 'Evreni farklı kılan tek kural'],
    ['Çatışma', 'İki taraf'],
    ['Ortadaki karakter', 'Yeni bir karakter kaydıyla da cevaplayabilirsiniz'],
  ]),
  set('karakter', 'Karakter: temel altı soru', [
    'En çok ne istiyor?', 'En büyük korkusu ne?', 'En büyük kusuru ne?', 'Ne saklıyor?',
    ['Sınırı nerede?', 'Asla yapmayacağını düşündüğü şey'], 'Geçmişi onu nasıl değiştirdi?',
  ]),
  set('olay_izi', 'Karakter geçmişindeki bir olay', [
    ['Bu olay onda ne bıraktı?', 'Korku, özlem, öfke, utanç, inanç'], 'Bugün neyi farklı yapıyor?', 'Kime karşı tavrı değişti?',
    'Hangi yanlış sonuca vardı?', 'Hikâye bu yarayı nasıl sınayacak?',
  ]),
  set('aliskanlik', 'Kötü alışkanlık', ['Alışkanlık ne?', 'Tetikleyicisi ne?', 'Kimi rahatsız ediyor?', 'Neyi gizliyor?', 'Karakter farkında mı?', 'Değişebilir mi?']),
  set('karsit', 'Karşıt karakter', ['Ne istiyor?', 'Neden kendini haklı görüyor?', 'Neyi kaybetmekten korkuyor?', 'Hangi sınırı aşmaz?', 'Ana karakterle ortak yanı ne?']),
  set('iliski', 'İlişki', [
    ['Geçmişlerini ne bağlıyor?', 'Bir karşılaşma, ortak bir kayıp, çözülmemiş bir mesele'], 'İki tarafın beklentisi ne?',
    ['Gerilim noktası ne?', 'Söylenmemiş bir söz, yanlış anlaşılmış bir karar, tutulmamış bir söz'],
  ]),
  set('mekan', 'Mekân: gerçek hissettiren altı ayrıntı', [
    'Nasıl kokuyor?', 'Nasıl ses çıkarıyor?', 'İnsanlar nasıl hareket ediyor?', 'Gece ne değişiyor?', 'Yerliler neyi normal buluyor?', 'Geçmişten hangi iz kaldı?',
  ]),
  set('sehir', 'Şehir lojistiği', ['Su nereden geliyor?', 'Yemek nasıl geliyor?', 'Atık nereye gidiyor?', 'Gece nasıl işliyor?', 'Mahalleler neden farklı?', 'Şehri gerçekte kim yönetiyor?']),
  set('siyasi', 'Siyasi varlık', ['Taht kime geçiyor?', 'Hükümdarı kim sınırlıyor?', 'Para nereden geliyor?', 'Halk ne bekliyor?', 'Din ne kadar güçlü?', 'Zayıf noktası ne?']),
  set('topluluk', 'Topluluk', ['Neyi korur?', 'Ne ister?', 'Neden korkar?']),
  set('buyu', 'Büyü sistemi', [
    ['Kuralı ne?', 'Okurun anlayabileceği mantık'], ['Bedeli ne?', 'Zaman, enerji, hafıza, sağlık, para…'], ['Sınırı ne?', 'Kesinlikle yapamadığı şey'],
    'Riski ne?', 'Sonucu ne?', 'Dengesi nasıl kuruluyor?',
  ]),
  set('kultur', 'Kültür', [
    ['Coğrafya onu nasıl şekillendiriyor?', 'Ulaşım, yemek, ticaret, korku'], 'Gelenekleri ne?', 'Yasakları ve tabuları ne?', 'Ayıp sayılanlar ne?', 'Kutsal sayılanlar ne?',
    ['Gündelik hayat nasıl?', 'Selam, sofra, para, inanç, çatışma'],
  ]),
  set('dil', 'Dil ve adlar', [
    ['Ses paleti ne?', 'Tekrar eden heceler; sert ↔ akıcı; kısa ↔ uzun. Aynı kültürün karakter, şehir ve ülke adları bu seslerden türetilir.'],
  ]),
  set('haritasiz', 'Haritasız evren büyütme', ['Uzak yerlerden nasıl söz ettiriliyor?', 'Hangi ticaret izleri var?', 'Hangi farklı diller duyuluyor?', 'Hangi eski olaylar anılıyor?', 'Hangi söylentiler dolaşıyor?']),
  // Anlatı soruları (K27): eser, sahne ve kurgu hattı için. Evrenin kuralı (`baslangic.1`) ile hikâyenin çekirdeği ayrıdır.
  set('cekirdek', 'Hikâye çekirdeği', [
    ['Kim, ne istiyor?', 'Somut bir hedef: "kardeşinin dosyasını bulmak", "mutlu olmak" değil'],
    ['Ona ne engel oluyor?', 'Bir kişi, bir kurum, bir kural ya da kendi inancı olabilir'],
    'Başaramazsa ne kaybeder?',
    'Okur hangi sorunun cevabını merak edecek?',
    ['Bu hikâye hangi soruyu soruyor?', 'Cevap vermeden, soru biçiminde yazın'],
  ]),
  set('eser', 'Bu kitabın görevi', [
    'Bu kitabın merkez sorusu ne?',
    ['Dengeyi bozan olay ne?', 'Karakterin artık eskisi gibi yaşayamadığı an'],
    'Doruk noktası ne?',
    'Bu kitapta ne çözülüyor?',
    ['Ne açık kalıyor?', 'Sonraki kitaba ya da bilerek cevapsız bırakılanlar'],
  ]),
  set('sahne_plani', 'Sahne planı', [
    'Kim ne istiyor?',
    'Ne engel oluyor?',
    ['Sahne sonunda ne değişiyor?', 'Bir karar, yeni bir bilgi, bir ilişki ya da dış bir olay. Atmosfer sahnesinde "İlgisiz" diyebilirsiniz'],
    'Okur ne öğreniyor?',
  ]),
  set('hat', 'Kurgu hattı', [
    ['Bu hattın sorusu ne?', 'Ör. "Deniz\'e ne oldu?"'],
    'Şu anki durumu ne?',
    'Olası karşılığı ne?',
    ['Bilerek açık mı kalacak?', 'Bazı hatlar bilinçli olarak belirsiz kalır'],
  ]),
  set('rehber', 'Evren kurma rehberi', [
    ['Kim hüküm sürüyor?', 'Bir topluluk kaydıyla da cevaplayabilirsiniz'], 'Büyünün bedeli ne?', ['İnsanlar neye inanıyor?', 'Bir inanç kaydıyla da cevaplayabilirsiniz'],
  ]),
];
const setler = new Map(SORU_SETLERI.map((s) => [s.kod, s]));
export const soruSetiBul = (kod: string) => setler.get(kod);
/** Kaydın değil evrenin soruları (Masa'da durur). */
export const EVREN_SETLERI = ['pusula', 'baslangic', 'rehber', 'haritasiz'];

export const MESELE_DURUMLARI: Secenek[] = [
  { kod: 'dusunulecek', ad: 'Düşünülecek' },
  { kod: 'kararlastirildi', ad: 'Kararlaştırıldı' },
  { kod: 'gerekmiyor', ad: 'Şu an gerekmiyor' },
];

const sorular = (...kodlar: string[]) => kodlar.flatMap((k) => soruSetiBul(k)!.sorular);

/** Türlerin varsayılan şablonları. Yazar değiştirince evrene kaydedilir; değiştirmediği tür bunları kullanır. */
const VARSAYILANLAR: Record<string, Sablon> = {
  karakter: {
    alanlar: [
      { kod: 'dogum', ad: 'Doğum tarihi', tur: 'tarih', sabit: true, ipucu: 'Biliniyorsa her sahnedeki yaşı hesaplanır' },
      { kod: 'olum', ad: 'Ölüm tarihi', tur: 'tarih', sabit: true },
    ],
    sorular: sorular('karakter'),
  },
  mekan: { alanlar: [], sorular: sorular('mekan') },
  sehir: { alanlar: [], sorular: sorular('mekan', 'sehir') },
  siyasi: { alanlar: [], sorular: sorular('siyasi') },
  topluluk: { alanlar: [], sorular: sorular('topluluk') },
  buyu_sistemi: { alanlar: [], sorular: sorular('buyu') },
  kultur: { alanlar: [], sorular: sorular('kultur') },
  dil: { alanlar: [], sorular: sorular('dil') },
  eser: { alanlar: [], sorular: sorular('cekirdek', 'eser') },
  sahne: { alanlar: [], sorular: sorular('sahne_plani') },
  kurgu_hatti: { alanlar: [], sorular: sorular('hat') },
  acik_mesele: {
    alanlar: [
      { kod: 'durum', ad: 'Durum', tur: 'secim', secenekler: MESELE_DURUMLARI, sabit: true },
      { kod: 'onemli', ad: 'Önemli', tur: 'onay', sabit: true, ipucu: 'Önemli olarak işaretlenen meseleler Genel bakış sayfasında öne çıkar' },
    ],
    sorular: [],
  },
  gerekce: {
    alanlar: [
      { kod: 'soru', ad: 'Soru', tur: 'metin', sabit: true },
      { kod: 'secenekler', ad: 'Düşünülen seçenekler', tur: 'uzun', sabit: true },
      { kod: 'cozum', ad: 'Seçilen çözüm', tur: 'metin', sabit: true },
      { kod: 'gerekce', ad: 'Gerekçe', tur: 'uzun', sabit: true },
    ],
    sorular: [],
  },
};
const BOS: Sablon = { alanlar: [], sorular: [] };

// Ortak alanlar: aynı kodla birden çok türde bulunur; varsayılan, kaynağın aynı koddaki ya da aynı adlı alanından gelir.
const IKLIM: SablonAlani = { kod: 'iklim', ad: 'İklim', tur: 'metin', varsayilan: 'kapsama' };
const PARA: SablonAlani = { kod: 'resmi_para', ad: 'Resmî para', tur: 'metin', varsayilan: 'bagli' };
const HUKUK: SablonAlani = { kod: 'hukuk', ad: 'Hukuk', tur: 'metin', varsayilan: 'bagli' };
const DIL: SablonAlani = { kod: 'dil', ad: 'Dil', tur: 'metin', varsayilan: 'kultur' };
const MIMARI: SablonAlani = { kod: 'mimari', ad: 'Mimari', tur: 'metin', varsayilan: 'kultur' };
const YASAM: SablonAlani = { kod: 'yasam_suresi', ad: 'Yaşam süresi', tur: 'metin', varsayilan: 'tur' };
VARSAYILANLAR.karakter.alanlar.push(DIL, YASAM);
VARSAYILANLAR.mekan.alanlar.push(IKLIM, PARA, HUKUK, DIL, MIMARI);
VARSAYILANLAR.sehir.alanlar.push(IKLIM, PARA, HUKUK, DIL, MIMARI);
VARSAYILANLAR.siyasi.alanlar.push(PARA, HUKUK);
VARSAYILANLAR.kultur.alanlar.push({ ...DIL, varsayilan: undefined }, { ...MIMARI, varsayilan: undefined });
VARSAYILANLAR.canli = { alanlar: [{ ...YASAM, varsayilan: undefined }], sorular: [] };
// Eşyanın ve motifin gerçek geçmişi ile anlatılan efsanesi ayrıdır (§4.6).
const GERCEK: SablonAlani = { kod: 'gercek_gecmis', ad: 'Gerçek geçmişi', tur: 'uzun' };
const EFSANE: SablonAlani = { kod: 'efsane', ad: 'Anlatılan efsanesi', tur: 'uzun' };
VARSAYILANLAR.motif = { alanlar: [{ kod: 'gorunus', ad: 'Görünüşü', tur: 'uzun' }, GERCEK, EFSANE], sorular: [] };
VARSAYILANLAR.esya = { alanlar: [GERCEK, EFSANE], sorular: [] };
export const varsayilanSablon = (tur: string): Sablon => structuredClone(VARSAYILANLAR[tur] ?? BOS);

const KOD = /^[a-z0-9_.-]{1,40}$/;
const metinMi = (s: unknown, n: number) => typeof s === 'string' && s.trim().length > 0 && s.length <= n;

/** Şablon biçimi doğru mu (arayüzden ya da başka cihazdan gelen). Kodlar tekrar etmez; sabit alanlar kalır. */
export function sablonGecerli(s: unknown, tur?: string): s is Sablon {
  if (!s || typeof s !== 'object') return false;
  const { alanlar, sorular: sr } = s as Sablon;
  if (!Array.isArray(alanlar) || !Array.isArray(sr) || alanlar.length > 60 || sr.length > 120) return false;
  const kodlar = new Set<string>();
  for (const a of alanlar) {
    if (!a || !KOD.test(a.kod) || kodlar.has(a.kod) || !metinMi(a.ad, 80) || !ALAN_TURLERI.some((t) => t.kod === a.tur)) return false;
    if (a.ipucu !== undefined && (typeof a.ipucu !== 'string' || a.ipucu.length > 200)) return false;
    if (a.varsayilan !== undefined && !VARSAYILAN_EKSENLERI.some((x) => x.kod === a.varsayilan)) return false;
    if (a.tur === 'secim' && (!Array.isArray(a.secenekler) || !a.secenekler.length || a.secenekler.length > 30
      || a.secenekler.some((x) => !KOD.test(x?.kod) || !metinMi(x.ad, 80)) || new Set(a.secenekler.map((x) => x.kod)).size !== a.secenekler.length)) return false;
    if (a.tur === 'sayi' && (!birimGecerli(a.nicelik, a.birim) || !Number.isInteger(a.hassasiyet ?? 0) || (a.hassasiyet ?? 0) < 0 || (a.hassasiyet ?? 0) > EN_COK_HASSASIYET)) return false;
    if (a.tur !== 'sayi' && (a.nicelik !== undefined || a.birim !== undefined || a.hassasiyet !== undefined)) return false;
    kodlar.add(a.kod);
  }
  const sk = new Set<string>();
  for (const q of sr) {
    if (!q || !KOD.test(q.kod) || sk.has(q.kod) || !metinMi(q.metin, 300)) return false;
    if (q.ipucu !== undefined && (typeof q.ipucu !== 'string' || q.ipucu.length > 300)) return false;
    sk.add(q.kod);
  }
  if (tur) for (const a of varsayilanSablon(tur).alanlar) if (a.sabit && !alanlar.some((x) => x.kod === a.kod && x.tur === a.tur)) return false;
  return true;
}

/** Yeni alan ya da soru kodu: rastgele, okunabilir değil (ad değişse de kod değişmez). */
export const yeniAlanKodu = (on: 'a' | 's') => `${on}${Math.random().toString(36).slice(2, 10)}`;

export type SoruDurumu = 'cevaplandi' | 'sonra' | 'ilgisiz';
export const SORU_DURUMLARI: { kod: SoruDurumu; ad: string }[] = [
  { kod: 'cevaplandi', ad: 'Cevaplandı' },
  { kod: 'sonra', ad: 'Sonraya bırakıldı' },
  { kod: 'ilgisiz', ad: 'Bu kayıtla ilgisiz' },
];
export const soruDurumuGecerli = (d: unknown): d is SoruDurumu => SORU_DURUMLARI.some((x) => x.kod === d);
