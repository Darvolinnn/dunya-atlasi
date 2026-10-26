// Temel ilişkiler (§3.2): tipli, yönlü ve zamana bağlı bağlar. Her tür iki yönden okunur: A'nın
// sayfasında "aIcin", B'nin sayfasında "bIcin" yazar. Karşılıklı türlerde ikisi aynıdır ve bağ tek kayıttır.
// Düzenlenebilir ilişki türleri ve çokluk kuralları sonraki aşamalardadır (§9.1, §14.1).

export interface IliskiTuru {
  kod: string;
  /** A, B'yi nasıl görür (A'nın sayfasında B'nin önündeki etiket). */
  aIcin: string;
  /** B, A'yı nasıl görür. */
  bIcin: string;
  karsilikli: boolean;
  grup: string;
  /** Katılım rolü seçilen türler (§3.2): A katılımcı, B sahne ya da olay. Aile bağlarında bağın niteliği (§7 soy ağacı). */
  roller?: { kod: string; ad: string }[];
  /** Rol seçmek isteğe bağlı mı (boş bırakılınca "belirtilmemiş"). */
  rolIstegeBagli?: boolean;
}

export const SAHNE_ROLLERI = [
  { kod: 'bulunuyor', ad: 'Bulunuyor' },
  { kod: 'aniliyor', ad: 'Adı anılıyor' },
  { kod: 'hatirlaniyor', ad: 'Hatırlanıyor' },
  { kod: 'haber', ad: 'Hakkında haber alınıyor' },
];
export const OLAY_ROLLERI = [
  { kod: 'baslatan', ad: 'Başlatan' },
  { kod: 'emir', ad: 'Emri veren' },
  { kod: 'katilan', ad: 'Katılan' },
  { kod: 'tanik', ad: 'Tanık' },
  { kod: 'zarar', ad: 'Zarar gören' },
  { kod: 'sonradan', ad: 'Sonradan öğrenen' },
  // Beden olayları (§3.12, §9.1): ölüm, bedensiz dönem, dirilme ve beden değişimi ayrı olaylardır.
  { kod: 'olen', ad: 'Ölen' },
  { kod: 'bedensiz', ad: 'Bedensiz kalan' },
  { kod: 'dirilen', ad: 'Dirilen' },
  { kod: 'beden_degisen', ad: 'Bedeni değişen' },
];

/** Yolculukta bulunma (§4.2): yolcu yolculuğun aşamalarında fiziksel olarak bulunur; taşınan eşya da yolculukla gider. */
export const YOLCULUK_ROLLERI = [
  { kod: 'yolcu', ad: 'Yolcu' },
  { kod: 'tasinan', ad: 'Taşınan' },
];

/** Ebeveynlik ve evliliğin niteliği; soy ağacında farklı çizgiyle gösterilir (§7). Soybilim ile hukuki ebeveynlik ayrıdır (§15-8). */
export const EBEVEYN_ROLLERI = [
  { kod: 'kan', ad: 'Kan bağı' },
  { kod: 'evlatlik', ad: 'Evlatlık' },
  { kod: 'evlilik_disi', ad: 'Evlilik dışı' },
];
export const ES_ROLLERI = [
  { kod: 'siyasi', ad: 'Siyasi evlilik' },
];

/** Kurgu hattına bağlı sahne (§4.6): hattı ilerletir ya da bir ipucu taşır; ipucunun durumu. */
export const HAT_ROLLERI = [
  { kod: 'gelisme', ad: 'Hattı ilerletir' },
  { kod: 'ipucu_planlandi', ad: 'İpucu: planlandı' },
  { kod: 'ipucu_yerlesti', ad: 'İpucu: metne yerleştirildi' },
  { kod: 'ipucu_karsilik', ad: 'İpucu: karşılığı verildi' },
  { kod: 'ipucu_vazgecildi', ad: 'İpucu: vazgeçildi' },
];

export const ILISKI_TURLERI: IliskiTuru[] = [
  { kod: 'ebeveyn', aIcin: 'Çocuğu', bIcin: 'Ebeveyni', karsilikli: false, grup: 'Aile', roller: EBEVEYN_ROLLERI, rolIstegeBagli: true },
  { kod: 'es', aIcin: 'Eşi', bIcin: 'Eşi', karsilikli: true, grup: 'Aile', roller: ES_ROLLERI, rolIstegeBagli: true },
  { kod: 'kardes', aIcin: 'Kardeşi', bIcin: 'Kardeşi', karsilikli: true, grup: 'Aile' },
  { kod: 'akraba', aIcin: 'Akrabası', bIcin: 'Akrabası', karsilikli: true, grup: 'Aile' },
  { kod: 'arkadas', aIcin: 'Arkadaşı', bIcin: 'Arkadaşı', karsilikli: true, grup: 'Kişiler arası' },
  { kod: 'sevgili', aIcin: 'Sevgilisi', bIcin: 'Sevgilisi', karsilikli: true, grup: 'Kişiler arası' },
  { kod: 'rakip', aIcin: 'Rakibi', bIcin: 'Rakibi', karsilikli: true, grup: 'Kişiler arası' },
  { kod: 'dusman', aIcin: 'Düşmanı', bIcin: 'Düşmanı', karsilikli: true, grup: 'Kişiler arası' },
  { kod: 'muttefik', aIcin: 'Müttefiki', bIcin: 'Müttefiki', karsilikli: true, grup: 'Kişiler arası' },
  { kod: 'usta', aIcin: 'Çırağı', bIcin: 'Ustası', karsilikli: false, grup: 'Kişiler arası' },
  { kod: 'guvenir', aIcin: 'Güvendiği', bIcin: 'Ona güvenen', karsilikli: false, grup: 'Kişiler arası' },
  { kod: 'nefret', aIcin: 'Nefret ettiği', bIcin: 'Ondan nefret eden', karsilikli: false, grup: 'Kişiler arası' },
  { kod: 'borclu', aIcin: 'Borçlu olduğu', bIcin: 'Alacaklı olduğu', karsilikli: false, grup: 'Kişiler arası' },
  { kod: 'hizmet', aIcin: 'Hizmet ettiği', bIcin: 'Hizmetindeki', karsilikli: false, grup: 'Kişiler arası' },
  { kod: 'kimligi', aIcin: 'Kullandığı kimlik', bIcin: 'Bu kimliği kullanan', karsilikli: false, grup: 'Kişiler arası' },
  { kod: 'uye', aIcin: 'Üyesi olduğu', bIcin: 'Üyesi', karsilikli: false, grup: 'Gruplar ve yerler' },
  { kod: 'lider', aIcin: 'Başında olduğu', bIcin: 'Başındaki', karsilikli: false, grup: 'Gruplar ve yerler' },
  { kod: 'sahip', aIcin: 'Sahip olduğu', bIcin: 'Sahibi', karsilikli: false, grup: 'Gruplar ve yerler' },
  { kod: 'yasar', aIcin: 'Yaşadığı yer', bIcin: 'Burada yaşayan', karsilikli: false, grup: 'Gruplar ve yerler' },
  { kod: 'parca', aIcin: 'Parçası olduğu', bIcin: 'Parçası', karsilikli: false, grup: 'Gruplar ve yerler' },
  { kod: 'bagli', aIcin: 'Bağlı olduğu yönetim', bIcin: 'Ona bağlı', karsilikli: false, grup: 'Kapsama ve bağlılık' },
  { kod: 'kulturu', aIcin: 'Kültürü', bIcin: 'Bu kültürden', karsilikli: false, grup: 'Kapsama ve bağlılık' },
  { kod: 'turu', aIcin: 'Türü', bIcin: 'Bu türden', karsilikli: false, grup: 'Kapsama ve bağlılık' },
  { kod: 'kontrol', aIcin: 'Kontrol ettiği arazi', bIcin: 'Kontrol eden', karsilikli: false, grup: 'Kapsama ve bağlılık' },
  { kod: 'hak_iddiasi', aIcin: 'Hak iddia ettiği arazi', bIcin: 'Üzerinde hak iddia eden', karsilikli: false, grup: 'Kapsama ve bağlılık' },
  { kod: 'yurutur', aIcin: 'Yürüttüğü makam', bIcin: 'Yürüten', karsilikli: false, grup: 'Gruplar ve yerler' },
  { kod: 'merkez', aIcin: 'Yönetim merkezi', bIcin: 'Yönetim merkezi olduğu', karsilikli: false, grup: 'Kapsama ve bağlılık' },
  { kod: 'uretir', aIcin: 'Ürettiği', bIcin: 'Üreten', karsilikli: false, grup: 'Üretim ve ekoloji' },
  { kod: 'girdi', aIcin: 'Girdisi', bIcin: 'Girdi olduğu ürün', karsilikli: false, grup: 'Üretim ve ekoloji' },
  { kod: 'bagimli', aIcin: 'Bağımlı olduğu', bIcin: 'Ona bağımlı olan', karsilikli: false, grup: 'Üretim ve ekoloji' },
  { kod: 'tasir', aIcin: 'Taşıdığı ürün', bIcin: 'Taşıyan yol', karsilikli: false, grup: 'Üretim ve ekoloji' },
  { kod: 'fazlasi', aIcin: 'Fazlası olan ürün', bIcin: 'Fazlası olan yer', karsilikli: false, grup: 'Üretim ve ekoloji' },
  { kod: 'acigi', aIcin: 'Açığı olan ürün', bIcin: 'Açığı olan yer', karsilikli: false, grup: 'Üretim ve ekoloji' },
  { kod: 'besin', aIcin: 'Beslendiği', bIcin: 'Onunla beslenen', karsilikli: false, grup: 'Üretim ve ekoloji' },
  { kod: 'izinli', aIcin: 'Taşıdığı izin / mühür', bIcin: 'Bu izni taşıyan', karsilikli: false, grup: 'Gruplar ve yerler' },
  { kod: 'yolu_bilir', aIcin: 'Bildiği yol', bIcin: 'Bu yolu bilen', karsilikli: false, grup: 'Gruplar ve yerler' },
  { kod: 'haber_surumu', aIcin: 'Sonraki sürümü', bIcin: 'Önceki sürümü', karsilikli: false, grup: 'Sahne ve olay' },
  { kod: 'dil_kaynagi', aIcin: 'Türediği ya da sözcük aldığı dil', bIcin: 'Bu dilden türeyen ya da sözcük alan dil', karsilikli: false, grup: 'Kültür ve dil' },
  { kod: 'dil_bilir', aIcin: 'Bildiği dil', bIcin: 'Bu dili bilen', karsilikli: false, grup: 'Kültür ve dil' },
  { kod: 'teknoloji_bilir', aIcin: 'Bildiği teknoloji', bIcin: 'Bu teknolojiyi bilen', karsilikli: false, grup: 'Üretim ve ekoloji' },
  { kod: 'teknoloji_uretir', aIcin: 'Üretebildiği teknoloji', bIcin: 'Bu teknolojiyi üretebilen', karsilikli: false, grup: 'Üretim ve ekoloji' },
  { kod: 'teknoloji_kullanir', aIcin: 'Kullanabildiği teknoloji', bIcin: 'Bu teknolojiyi kullanabilen', karsilikli: false, grup: 'Üretim ve ekoloji' },
  // K29: alıntıyı söyleyen ya da yazan (A kişi, topluluk, inanç…; B alıntı) ve alıntının geçtiği sahne (A sahne, B alıntı).
  { kod: 'soyler', aIcin: 'Söylediği söz', bIcin: 'Söyleyen ya da yazan', karsilikli: false, grup: 'Kültür ve dil' },
  { kod: 'alinti_gecer', aIcin: 'Geçen alıntı', bIcin: 'Geçtiği sahne', karsilikli: false, grup: 'Sahne ve olay' },
  { kod: 'motif_gecer', aIcin: 'Geçen motif', bIcin: 'Geçtiği sahne', karsilikli: false, grup: 'Sahne ve olay' },
  { kod: 'anlatir', aIcin: 'Anlattığı olay', bIcin: 'Anlatıldığı sahne', karsilikli: false, grup: 'Sahne ve olay' },
  { kod: 'sahnede', aIcin: 'Yer aldığı sahne', bIcin: 'Sahnedekiler', karsilikli: false, grup: 'Sahne ve olay', roller: SAHNE_ROLLERI },
  { kod: 'olayda', aIcin: 'Yer aldığı olay', bIcin: 'Olaydakiler', karsilikli: false, grup: 'Sahne ve olay', roller: OLAY_ROLLERI },
  { kod: 'yolculukta', aIcin: 'Katıldığı yolculuk', bIcin: 'Yolculuktakiler', karsilikli: false, grup: 'Sahne ve olay', roller: YOLCULUK_ROLLERI, rolIstegeBagli: true },
  { kod: 'sahne_yeri', aIcin: 'Geçtiği yer', bIcin: 'Burada geçen sahne', karsilikli: false, grup: 'Sahne ve olay' },
  { kod: 'bakis', aIcin: 'Bakış açısı olduğu sahne', bIcin: 'Bakış açısı', karsilikli: false, grup: 'Sahne ve olay' },
  { kod: 'anlatici', aIcin: 'Anlatıcısı olduğu sahne', bIcin: 'Anlatıcı', karsilikli: false, grup: 'Sahne ve olay' },
  { kod: 'odak', aIcin: 'Odak karakteri olduğu sahne', bIcin: 'Odak karakter', karsilikli: false, grup: 'Sahne ve olay' },
  { kod: 'neden', aIcin: 'Yol açtığı', bIcin: 'Nedeni', karsilikli: false, grup: 'Neden ve sonuç' },
  { kod: 'kolaylastirdi', aIcin: 'Kolaylaştırdığı', bIcin: 'Onu kolaylaştıran', karsilikli: false, grup: 'Neden ve sonuç' },
  { kod: 'engelledi', aIcin: 'Engellediği', bIcin: 'Onu engelleyen', karsilikli: false, grup: 'Neden ve sonuç' },
  { kod: 'tepki', aIcin: 'Doğurduğu tepki', bIcin: 'Tepki verdiği', karsilikli: false, grup: 'Neden ve sonuç' },
  { kod: 'kurgu_hattinda', aIcin: 'Bağlı olduğu kurgu hattı', bIcin: 'Hattın sahnesi', karsilikli: false, grup: 'Yazarlık', roller: HAT_ROLLERI },
  { kod: 'mesele_konusu', aIcin: 'İlgili olduğu kayıt', bIcin: 'Açık meselesi', karsilikli: false, grup: 'Yazarlık' },
  { kod: 'gerekce_konusu', aIcin: 'Etkilediği kayıt', bIcin: 'Gerekçe kaydı', karsilikli: false, grup: 'Yazarlık' },
  // K27: aynı soruya iki olası cevap (iki final, iki sahne sırası). Biri kesinleşince öbürü kendiliğinden değişmez.
  { kod: 'alternatif', aIcin: 'Alternatifi', bIcin: 'Alternatifi', karsilikli: true, grup: 'Yazarlık' },
  // K27: karakterin bir eserdeki planlanan yolu; soruları ilişkinin kendisine bağlıdır. Sahne için olan `odak`tan ayrıdır.
  { kod: 'eser_odagi', aIcin: 'Odak karakteri olduğu eser', bIcin: 'Odak karakteri', karsilikli: false, grup: 'Yazarlık' },
  // K27: serinin olası finali (A olay, B seri); finaller birbirine `alternatif` ile bağlanır.
  { kod: 'olasi_final', aIcin: 'Olası finali olduğu seri', bIcin: 'Olası final', karsilikli: false, grup: 'Yazarlık' },
  // K27: eserin ana serisi dışında katıldığı seri (A seri, B eser); ana seri ağaçtaki yeridir.
  { kod: 'seri_eseri', aIcin: 'Ek kitabı', bIcin: 'Ayrıca yer aldığı seri', karsilikli: false, grup: 'Yazarlık' },
  { kod: 'nottan', aIcin: 'Dönüştüğü kayıt', bIcin: 'Doğduğu not', karsilikli: false, grup: 'Genel' },
  { kod: 'ilgili', aIcin: 'İlgili', bIcin: 'İlgili', karsilikli: true, grup: 'Genel' },
];

const harita = new Map(ILISKI_TURLERI.map((t) => [t.kod, t]));
export const iliskiTuruBul = (kod: string): IliskiTuru =>
  harita.get(kod) ?? { kod, aIcin: 'Bağlı', bIcin: 'Bağlı', karsilikli: true, grup: 'Genel' };
export const iliskiTuruGecerli = (kod: unknown): kod is string => typeof kod === 'string' && harita.has(kod);
export const rolAdi = (tur: string, rol: string | null) => iliskiTuruBul(tur).roller?.find((r) => r.kod === rol)?.ad ?? null;

/**
 * Ekleme formu için seçenekler: her tür, karşılıklı değilse iki yönüyle ayrı seçenektir.
 * "ben" bu sayfanın kaydıdır; seçilen yön ben'in A mı B mi olduğunu söyler.
 */
export const ILISKI_SECENEKLERI = ILISKI_TURLERI.flatMap((t) => t.karsilikli
  ? [{ deger: `${t.kod}:a`, etiket: t.aIcin, grup: t.grup }]
  : [{ deger: `${t.kod}:a`, etiket: t.aIcin, grup: t.grup }, { deger: `${t.kod}:b`, etiket: t.bIcin, grup: t.grup }]);

/** Çizimlerde bağın görünen türü (taslak 2A): renk, çizgi biçimi ve yazıyla birlikte ayrılır; renk tek başına anlam
 *  taşımaz. Yalnızca ilişkinin türüne bakar. */
export type BagTuru = 'aile' | 'dusmanlik' | 'dostluk' | 'sahne' | 'baglanti' | 'diger';
export const BAG_TURLERI: { kod: BagTuru; ad: string }[] = [
  { kod: 'aile', ad: 'Aile' }, { kod: 'dostluk', ad: 'Dostluk ve bağlılık' }, { kod: 'dusmanlik', ad: 'Düşmanlık' },
  { kod: 'sahne', ad: 'Sahneler ve olaylar' }, { kod: 'diger', ad: 'Diğer bağlar' }, { kod: 'baglanti', ad: 'Metindeki bağlantılar' },
];
const DUSMANLIK = new Set(['dusman', 'rakip', 'nefret']);
export function bagTuru(tur: string, baglanti = false): BagTuru {
  if (baglanti) return 'baglanti';
  if (DUSMANLIK.has(tur)) return 'dusmanlik';
  const grup = ILISKI_TURLERI.find((t) => t.kod === tur)?.grup;
  if (grup === 'Aile') return 'aile';
  if (grup === 'Kişiler arası') return 'dostluk';
  if (grup === 'Sahne ve olay') return 'sahne';
  return 'diger';
}
