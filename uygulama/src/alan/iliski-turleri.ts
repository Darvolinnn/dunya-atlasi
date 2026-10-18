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
  /** Katılım rolü seçilen türler (§3.2): A katılımcı, B sahne ya da olay. */
  roller?: { kod: string; ad: string }[];
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
];

export const ILISKI_TURLERI: IliskiTuru[] = [
  { kod: 'ebeveyn', aIcin: 'Çocuğu', bIcin: 'Ebeveyni', karsilikli: false, grup: 'Aile' },
  { kod: 'es', aIcin: 'Eşi', bIcin: 'Eşi', karsilikli: true, grup: 'Aile' },
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
  { kod: 'uye', aIcin: 'Üyesi olduğu', bIcin: 'Üyesi', karsilikli: false, grup: 'Gruplar ve yerler' },
  { kod: 'lider', aIcin: 'Başında olduğu', bIcin: 'Başındaki', karsilikli: false, grup: 'Gruplar ve yerler' },
  { kod: 'sahip', aIcin: 'Sahip olduğu', bIcin: 'Sahibi', karsilikli: false, grup: 'Gruplar ve yerler' },
  { kod: 'yasar', aIcin: 'Yaşadığı yer', bIcin: 'Burada yaşayan', karsilikli: false, grup: 'Gruplar ve yerler' },
  { kod: 'parca', aIcin: 'Parçası olduğu', bIcin: 'Parçası', karsilikli: false, grup: 'Gruplar ve yerler' },
  { kod: 'anlatir', aIcin: 'Anlattığı olay', bIcin: 'Anlatıldığı sahne', karsilikli: false, grup: 'Sahne ve olay' },
  { kod: 'sahnede', aIcin: 'Yer aldığı sahne', bIcin: 'Sahnedekiler', karsilikli: false, grup: 'Sahne ve olay', roller: SAHNE_ROLLERI },
  { kod: 'olayda', aIcin: 'Yer aldığı olay', bIcin: 'Olaydakiler', karsilikli: false, grup: 'Sahne ve olay', roller: OLAY_ROLLERI },
  { kod: 'sahne_yeri', aIcin: 'Geçtiği yer', bIcin: 'Burada geçen sahne', karsilikli: false, grup: 'Sahne ve olay' },
  { kod: 'bakis', aIcin: 'Bakış açısı olduğu sahne', bIcin: 'Bakış açısı', karsilikli: false, grup: 'Sahne ve olay' },
  { kod: 'anlatici', aIcin: 'Anlatıcısı olduğu sahne', bIcin: 'Anlatıcı', karsilikli: false, grup: 'Sahne ve olay' },
  { kod: 'odak', aIcin: 'Odak karakteri olduğu sahne', bIcin: 'Odak karakter', karsilikli: false, grup: 'Sahne ve olay' },
  { kod: 'neden', aIcin: 'Yol açtığı', bIcin: 'Nedeni', karsilikli: false, grup: 'Sahne ve olay' },
  { kod: 'mesele_konusu', aIcin: 'İlgili olduğu kayıt', bIcin: 'Açık meselesi', karsilikli: false, grup: 'Yazarlık' },
  { kod: 'gerekce_konusu', aIcin: 'Etkilediği kayıt', bIcin: 'Gerekçe kaydı', karsilikli: false, grup: 'Yazarlık' },
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
