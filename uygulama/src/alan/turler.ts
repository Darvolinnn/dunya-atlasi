import { katla } from './turkce';

// Başlangıç kayıt türleri (§4). Kod değişmez; görünen ad değişebilir. Kullanıcının tür ve şablon
// düzenlemesi sonraki aşamadadır (§14.1 aşama 2). Bilinmeyen tür kodu korunur ve "Diğer" gösterilir.

export interface Tur { kod: string; ad: string; grup: string; kisa: string }

export const TURLER: Tur[] = [
  { kod: 'karakter', ad: 'Karakter', grup: 'İnsanlar ve gruplar', kisa: 'Kr' },
  { kod: 'topluluk', ad: 'Topluluk / kurum', grup: 'İnsanlar ve gruplar', kisa: 'Tp' },
  { kod: 'siyasi', ad: 'Siyasi varlık', grup: 'İnsanlar ve gruplar', kisa: 'Sy' },
  { kod: 'makam', ad: 'Makam', grup: 'İnsanlar ve gruplar', kisa: 'Mk' },
  { kod: 'kafile', ad: 'Kafile', grup: 'İnsanlar ve gruplar', kisa: 'Kf' },
  { kod: 'mekan', ad: 'Mekân', grup: 'Yerler', kisa: 'Me' },
  { kod: 'sehir', ad: 'Şehir', grup: 'Yerler', kisa: 'Şe' },
  { kod: 'rota', ad: 'Rota', grup: 'Yerler', kisa: 'Ro' },
  { kod: 'yolculuk', ad: 'Yolculuk', grup: 'Yerler', kisa: 'Yo' },
  { kod: 'esya', ad: 'Eşya', grup: 'Yerler', kisa: 'Eş' },
  { kod: 'kultur', ad: 'Kültür', grup: 'Kültür ve inanç', kisa: 'Kü' },
  { kod: 'inanc', ad: 'İnanç / mezhep', grup: 'Kültür ve inanç', kisa: 'İn' },
  { kod: 'rituel', ad: 'Ritüel', grup: 'Kültür ve inanç', kisa: 'Ri' },
  { kod: 'dil', ad: 'Dil', grup: 'Kültür ve inanç', kisa: 'Di' },
  { kod: 'evren_kurali', ad: 'Evren kuralı', grup: 'Evrenin işleyişi', kisa: 'Ek' },
  { kod: 'buyu_sistemi', ad: 'Büyü sistemi', grup: 'Evrenin işleyişi', kisa: 'Bs' },
  { kod: 'buyu_uygulamasi', ad: 'Büyü uygulaması', grup: 'Evrenin işleyişi', kisa: 'Bu' },
  { kod: 'teknoloji', ad: 'Teknoloji / buluş', grup: 'Evrenin işleyişi', kisa: 'Te' },
  { kod: 'canli', ad: 'Canlı türü / bitki', grup: 'Evrenin işleyişi', kisa: 'Ca' },
  { kod: 'urun', ad: 'Ürün / üretim', grup: 'Evrenin işleyişi', kisa: 'Ür' },
  { kod: 'para', ad: 'Para birimi ve ölçü', grup: 'Evrenin işleyişi', kisa: 'Pa' },
  { kod: 'olay', ad: 'Olay', grup: 'Zaman ve tarih', kisa: 'Ol' },
  { kod: 'donem', ad: 'Dönem / çağ', grup: 'Zaman ve tarih', kisa: 'Dö' },
  { kod: 'antlasma', ad: 'Antlaşma / yükümlülük', grup: 'Zaman ve tarih', kisa: 'An' },
  { kod: 'haber', ad: 'Haber / söylenti', grup: 'Zaman ve tarih', kisa: 'Ha' },
  { kod: 'haberlesme', ad: 'Haberleşme yöntemi', grup: 'Zaman ve tarih', kisa: 'Hy' },
  { kod: 'belge', ad: 'Evren içi belge', grup: 'Zaman ve tarih', kisa: 'Be' },
  { kod: 'eser', ad: 'Eser', grup: 'Anlatı ve yazarlık', kisa: 'Es' },
  { kod: 'bolum', ad: 'Bölüm', grup: 'Anlatı ve yazarlık', kisa: 'Bö' },
  { kod: 'sahne', ad: 'Sahne', grup: 'Anlatı ve yazarlık', kisa: 'Sa' },
  { kod: 'kurgu_hatti', ad: 'Kurgu hattı', grup: 'Anlatı ve yazarlık', kisa: 'Kh' },
  { kod: 'motif', ad: 'Motif / simge', grup: 'Anlatı ve yazarlık', kisa: 'Mo' },
  { kod: 'not', ad: 'Not', grup: 'Anlatı ve yazarlık', kisa: 'No' },
  { kod: 'acik_mesele', ad: 'Açık mesele', grup: 'Anlatı ve yazarlık', kisa: 'Am' },
  { kod: 'gerekce', ad: 'Gerekçe kaydı', grup: 'Anlatı ve yazarlık', kisa: 'Ge' },
  { kod: 'kaynak', ad: 'Araştırma kaynağı', grup: 'Anlatı ve yazarlık', kisa: 'Ka' },
  { kod: 'diger', ad: 'Diğer', grup: 'Diğer', kisa: '··' },
];

const harita = new Map(TURLER.map((t) => [t.kod, t]));
export const turBul = (kod: string): Tur => harita.get(kod) ?? { kod, ad: 'Diğer', grup: 'Diğer', kisa: '··' };
export const turGecerli = (kod: unknown): kod is string => typeof kod === 'string' && harita.has(kod);

/** Karar durumu (§3.6). */
export const KARARLAR = [
  { kod: 'fikir', ad: 'Fikir' },
  { kod: 'kesin', ad: 'Kesinleşmiş' },
  { kod: 'vazgecildi', ad: 'Vazgeçilmiş' },
] as const;
export type Karar = (typeof KARARLAR)[number]['kod'];
export const kararGecerli = (k: unknown): k is Karar => KARARLAR.some((x) => x.kod === k);

/**
 * Yazılmış bir tür adını koda çevirir ("Ad::Tür::özet", içe aktarımda ön bilgi ve klasör adı):
 * görünen ad ya da kod; ad parçası; çoğul klasör adı ("Karakterler"). Bulunamazsa null.
 */
// Başka programlardan (ve eski prototipten) gelen İngilizce tür adları; yalnızca içe aktarımda işe yarar.
const INGILIZCE: Record<string, string> = {
  character: 'karakter', person: 'karakter', people: 'karakter', npc: 'karakter',
  faction: 'topluluk', organization: 'topluluk', organisation: 'topluluk', group: 'topluluk', guild: 'topluluk',
  nation: 'siyasi', kingdom: 'siyasi', empire: 'siyasi', country: 'siyasi', state: 'siyasi',
  place: 'mekan', location: 'mekan', region: 'mekan', landmark: 'mekan', city: 'sehir', town: 'sehir', settlement: 'sehir', village: 'sehir',
  route: 'rota', journey: 'yolculuk', item: 'esya', object: 'esya', artifact: 'esya', artefact: 'esya',
  culture: 'kultur', religion: 'inanc', faith: 'inanc', ritual: 'rituel', language: 'dil',
  magic: 'buyu_sistemi', spell: 'buyu_uygulamasi', technology: 'teknoloji', creature: 'canli', species: 'canli', plant: 'canli',
  currency: 'para', event: 'olay', era: 'donem', age: 'donem', period: 'donem', treaty: 'antlasma', rumor: 'haber', rumour: 'haber',
  document: 'belge', scene: 'sahne', plot: 'kurgu_hatti', note: 'not', source: 'kaynak',
};

export function turBulYazidan(yazilan: string): string | null {
  const k = katla(yazilan.trim());
  if (!k) return null;
  const ing = INGILIZCE[k] ?? INGILIZCE[k.replace(/(ies)$/, 'y').replace(/s$/, '')];
  if (ing) return ing;
  const t = TURLER.find((t) => katla(t.ad) === k || t.kod === k)
    ?? TURLER.find((t) => katla(t.ad).split(/[\s/]+/).some((p) => p === k))
    ?? TURLER.find((t) => k.length >= 3 && katla(t.ad).startsWith(k))
    ?? TURLER.find((t) => katla(t.ad).split(/[\s/]+/).some((p) => p.length >= 3 && k.startsWith(p) && /^(ler|lar)?$/.test(k.slice(p.length))));
  return t?.kod ?? null;
}
export const turCoz = (yazilan: string) => turBulYazidan(yazilan) ?? 'diger';
