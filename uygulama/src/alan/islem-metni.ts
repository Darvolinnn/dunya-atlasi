// İşlemlerin kullanıcıya gösterilen açıklaması. Programlama terimi kullanılmaz (§10.7).
import { KARARLAR, turBul } from './turler';
import { iliskiTuruBul } from './iliski-turleri';

type Aciklayici = (veri: Record<string, unknown>, ad: (kod: unknown) => string) => string;

const ALAN_ADI: Record<string, string> = { ad: 'Ad', tur: 'Tür', ozet: 'Kısa özet', okunus: 'Okunuş', karar: 'Karar durumu' };
const kararAdi = (k: unknown) => KARARLAR.find((x) => x.kod === k)?.ad ?? String(k);
const deger = (alan: string, v: unknown) => alan === 'tur' ? turBul(String(v)).ad : alan === 'karar' ? kararAdi(v) : String(v ?? '');

const ACIKLAMALAR: Record<string, Aciklayici> = {
  evren_olustur: (v) => `Evren oluşturuldu: “${v.ad}”`,
  evren_adlandir: (v) => `Evrenin adı “${v.ad}” oldu`,
  kayit_olustur: (v) => `${turBul(String(v.tur)).ad} oluşturuldu: “${v.ad}”`,
  kayit_degistir: (v, ad) => {
    const alan = String(v.alan);
    if (v.cozum) return `${ad(v.kod)}: ${(ALAN_ADI[alan] ?? alan).toLocaleLowerCase('tr-TR')} için iki cihazdaki değerlerden biri seçildi${alan === 'ozet' ? '' : ` (“${deger(alan, v.deger)}”)`}`;
    if (alan === 'ozet') return `${ad(v.kod)}: kısa özet değişti`;
    const once = deger(alan, v.onceki), sonra = deger(alan, v.deger);
    return `${ad(v.kod)}: ${ALAN_ADI[alan] ?? alan} ${once ? `“${once}” → ` : ''}“${sonra}”`;
  },
  kayit_lakap: (v, ad) => v.ekle ? `${ad(v.kod)}: lakap eklendi “${v.ekle}”` : `${ad(v.kod)}: lakap çıkarıldı “${v.cikar}”`,
  kayit_etiket: (v, ad) => v.ekle ? `${ad(v.kod)}: etiket eklendi “${v.ekle}”` : `${ad(v.kod)}: etiket çıkarıldı “${v.cikar}”`,
  kayit_sil: (v, ad) => `${ad(v.kod)}: çöp kutusuna taşındı`,
  kayit_geri_yukle: (v, ad) => `${ad(v.kod)}: çöp kutusundan geri getirildi`,
  kayit_tarih: (v, ad) => {
    const t = (x: unknown) => (x as { ifade?: string } | null)?.ifade ?? '';
    return t(v.tarih) ? `${ad(v.kod)}: evren tarihi “${t(v.tarih)}”` : `${ad(v.kod)}: evren tarihi kaldırıldı`;
  },
  kayit_alan_karar: (v, ad) => `${ad(v.kod)}: ${(ALAN_ADI[String(v.alan)] ?? (v.alan === 'tarih' ? 'Evren tarihi' : String(v.ad ?? 'bir alan'))).toLocaleLowerCase('tr-TR')} artık “${kararAdi(v.karar)}”`,
  kayit_gorsel: (v, ad) => v.ekle ? `${ad(v.kod)}: görsel eklendi` : `${ad(v.kod)}: görsel çıkarıldı`,
  medya_ekle: (v) => `Görsel saklandı${v.dosyaAdi ? `: ${v.dosyaAdi}` : ''}`,
  iliski_ekle: (v, ad) => `${ad(v.a)} → ${iliskiTuruBul(String(v.tur)).aIcin.toLocaleLowerCase('tr-TR')}: ${ad(v.b)}`,
  iliski_degistir: (v) => {
    const alan = ({ baslangic: 'başlangıcı', bitis: 'bitişi', aciklama: 'açıklaması', karar: 'karar durumu', rol: 'rolü' } as Record<string, string>)[String(v.alan)] ?? 'bir alanı';
    return `Bir ilişkinin ${alan} değişti`;
  },
  iliski_sil: (v, ad) => `İlişki kaldırıldı: ${ad(v.a)} – ${ad(v.b)}`,
  iliski_geri_yukle: (v, ad) => `İlişki geri getirildi: ${ad(v.a)} – ${ad(v.b)}`,
  degisim_ekle: (v, ad) => `${ad(v.olay)}: değişim kaydedildi “${v.metin}”${v.konu ? ` (${ad(v.konu)})` : ''}`,
  degisim_sil: (v, ad) => `${ad(v.olay)}: değişim kaldırıldı “${v.metin}”`,
  masa_olustur: (v) => `Çalışma masası kuruldu: “${v.ad}”`,
  masa_yaz: (v) => `“${v.masaAd}” masası: ${({ ad: 'adı', amac: 'çözmeye çalışılan soru', notlar: 'notlar', bas: 'tarih aralığının başı', bit: 'tarih aralığının sonu', paket: 'seçili varsayım paketi', uyeler: 'bağlı kayıtlar' } as Record<string, string>)[String(v.alan)] ?? 'bir alanı'} değişti`,
  masa_sil: (v) => `“${v.masaAd}” masası kaldırıldı`,
  masa_geri_yukle: (v) => `“${v.masaAd}” masası geri getirildi`,
  paket_olustur: (v) => `Varsayım paketi oluşturuldu: “${v.ad}”`,
  paket_yaz: (v) => `“${v.paketAd}” paketi: ${({ ad: 'adı', aciklama: 'açıklaması', varsayimlar: 'varsayımları' } as Record<string, string>)[String(v.alan)] ?? 'bir alanı'} değişti`,
  paket_sil: (v) => `“${v.paketAd}” varsayım paketi kaldırıldı`,
  paket_geri_yukle: (v) => `“${v.paketAd}” varsayım paketi geri getirildi`,
  iz_olustur: (v, ad) => `${ad(v.konu)}: izlenen ayrıntı eklendi “${v.ad}”`,
  iz_degistir: (v, ad) => `${v.konu ? `${ad(v.konu)}: ` : ''}izlenen ayrıntının tanımı değişti “${(v.tanim as { ad?: string } | null)?.ad ?? ''}”`,
  iz_sil: (v, ad) => `${ad(v.konu)}: izlenen ayrıntı kaldırıldı “${v.ad}”`,
  iz_geri_yukle: (v, ad) => `${ad(v.konu)}: izlenen ayrıntı geri getirildi “${v.ad}”`,
  alan_boslugu: (v, ad) => `${ad(v.kod)}: “${v.ad ?? 'alan'}” ${({ acik: 'bilerek açık bırakıldı', bilinmiyor: 'evrende bilinmiyor olarak işaretlendi', gecersiz: 'bu kayıt için geçersiz sayıldı' } as Record<string, string>)[String(v.tur)] ?? 'yeniden düşünülecekler arasına alındı'}`,
  varsayilan_karari: (v, ad) => `${ad(v.kod)}: “${v.ad ?? 'alan'}” için kaynaklar ${({ birlikte: 'birlikte geçerli sayıldı', kapsam: 'kapsamları farklı sayıldı', oncelik: 'arasında öncelik seçildi' } as Record<string, string>)[String((v.karar as { durum?: string } | null)?.durum)] ?? 'yeniden çözülmemiş sayıldı'}`,
  dayaniklilik_yaz: (v, ad) => `${v.a ? `${ad(v.a)} – ${ad(v.b)}: ` : ''}${v.deger ? 'dayanma süresi ya da ikamesi yazıldı' : 'dayanma süresi kaldırıldı'}`,
  kanal_yaz: (v, ad) => `${ad(v.kod)}: haberleşme bağlantıları değişti`,
  haber_cikis_yaz: (v, ad) => `${ad(v.kod)}: haberin çıkışı ${(v.cikis as { yer?: string } | null)?.yer ? `“${ad((v.cikis as { yer: string }).yer)}” olarak ` : ''}yazıldı`,
  dil_yaz: (v, ad) => `${ad(v.kod)}: dil tanımı değişti`,
  ad_bicimi_yaz: (v, ad) => `${ad(v.kayit)}: ${ad(v.dil)} dilindeki biçimi ${v.deger ? `“${(v.deger as { bicim?: string }).bicim ?? ''}” olarak yazıldı` : 'kaldırıldı'}`,
  dil_yeterliligi_yaz: (v, ad) => `${v.a ? `${ad(v.a)} – ${ad(v.b)}: ` : ''}dil yeterliliği ${v.deger ? 'yazıldı' : 'kaldırıldı'}`,
  hukuk_kurali_olustur: (v, ad) => `${ad(v.sahip)}: hukuk kuralı eklendi “${(v.tanim as { ad?: string } | null)?.ad ?? ''}”`,
  hukuk_kurali_yaz: (v, ad) => `${v.sahip ? `${ad(v.sahip)}: ` : ''}“${(v.tanim as { ad?: string } | null)?.ad ?? 'hukuk'}” kuralının tanımı değişti`,
  hukuk_kurali_sil: (v, ad) => `${ad(v.sahip)}: hukuk kuralı kaldırıldı “${v.ad}”`,
  hukuk_kurali_geri_yukle: (v, ad) => `${ad(v.sahip)}: hukuk kuralı geri getirildi “${v.ad}”`,
  surec_kurali_olustur: (v, ad) => `${ad(v.sahip)}: süreç kuralı eklendi “${v.ad}”`,
  surec_kurali_yaz: (v, ad) => `${v.sahip ? `${ad(v.sahip)}: ` : ''}“${(v.tanim as { ad?: string } | null)?.ad ?? 'süreç'}” kuralının tanımı değişti`,
  surec_kurali_sil: (v, ad) => `${ad(v.sahip)}: süreç kuralı kaldırıldı “${v.ad}”`,
  surec_kurali_geri_yukle: (v, ad) => `${ad(v.sahip)}: süreç kuralı geri getirildi “${v.ad}”`,
  surec_bagla: (v, ad) => `${ad(v.olay)}: “${v.ad ?? 'süreç'}” kuralı ${v.bagli ? 'bağlandı' : 'çıkarıldı'}`,
  surec_adimi: (v, ad) => `${ad(v.olay)}: “${v.kuralAd ?? 'süreç'}” kuralında “${v.adimAd ?? 'adım'}” ${({ planlandi: 'planlandı', basladi: 'başladı', tamam: 'tamamlandı', yarida: 'yarıda kaldı', yapilmadi: 'yapılmadı' } as Record<string, string>)[String(v.durum)] ?? 'kaydı kaldırıldı'}`,
  surec_fiili: (v, ad) => `${ad(v.olay)}: ${v.ad ? `fiilen uygulanan kural “${v.ad}”` : 'fiilen uygulanan kural seçimi kaldırıldı'}`,
  fetih_cevabi: (v, ad) => {
    const c = v.cevap as { durum?: string; tarih?: { ifade?: string } | null } | null;
    const ne = !c ? 'henüz karar verilmedi' : c.durum === 'suruyor' ? 'eski uygulama sürüyor' : c.durum === 'birlikte' ? 'eski ve yeni uygulama birlikte geçerli' : `yeni uygulama ${c.tarih?.ifade ? `${c.tarih.ifade} tarihinde ` : ''}başladı`;
    return `${ad(v.kod)}: “${v.ad ?? 'alan'}” bağlılık değişikliğinden sonra ${ne}`;
  },
  iz_gozlem: (v, ad) => `${ad(v.sahne)}: “${v.izAd ?? 'ayrıntı'}” ${v.an === 'bas' ? 'başta' : 'sonda'} ${v.deger ? `“${v.deger}” olarak gözlendi` : 'gözlemi kaldırıldı'}`,
  anlati_yerlestir: (v, ad) => v.ust ? `${ad(v.kod)}: ${ad(v.ust)} içinde yeri değişti` : `${ad(v.kod)}: eser yapısından çıkarıldı`,
  durum_ekle: (v, ad) => `${ad(v.konu)}: durum eklendi “${v.ozellik}: ${v.hedef ? ad(v.hedef) : v.deger}”`,
  durum_degistir: (v, ad) => `${ad(v.konu)}: “${v.ozellik}” durumunun ${({ deger: 'değeri', hedef: 'değeri', kip: 'süresi', baslangic: 'başlangıcı', bitis: 'bitişi', karar: 'karar durumu', ozellik: 'adı' } as Record<string, string>)[String(v.alan)] ?? 'bir alanı'} değişti`,
  durum_sil: (v, ad) => `${ad(v.konu)}: “${v.ozellik}” durumu kaldırıldı`,
  durum_geri_yukle: (v, ad) => `${ad(v.konu)}: “${v.ozellik}” durumu geri getirildi`,
  harita_olustur: (v, ad) => `Harita eklendi: “${v.ad}”${v.yer ? ` (${ad(v.yer)})` : ''}`,
  harita_degistir: (v, ad) => v.alan === 'ad' ? `Haritanın adı değişti: “${v.deger}”` : v.deger ? `“${v.haritaAd}” haritası ${ad(v.deger)} kaydına bağlandı` : `“${v.haritaAd}” haritasının bağlı olduğu yer kaldırıldı`,
  harita_katman_ekle: (v) => `“${v.haritaAd}” haritasına katman eklendi: “${(v.katman as { ad: string }).ad}”`,
  harita_katman: (v) => v.alan === 'ad' ? `“${v.haritaAd}” haritasında katmanın adı değişti: “${v.deger}”`
    : v.alan === 'silindi' ? `“${v.haritaAd}” haritasında “${v.katmanAd ?? 'katman'}” ${v.deger ? 'kaldırıldı' : 'geri getirildi'}`
      : v.alan === 'gorsel' ? `“${v.haritaAd}” haritasında “${v.katmanAd ?? 'katman'}” görseli değişti`
        : `“${v.haritaAd}” haritasında “${v.katmanAd ?? 'katman'}” yeniden oturtuldu`,
  cizim_ekle: (v, ad) => `${ad(v.kayit)}: “${v.haritaAd}” haritasına ${v.bicim === 'yol' ? 'yol çizildi' : v.kip === 'iddia' ? 'iddia ettiği bölge çizildi' : 'bölgesi çizildi'}`,
  cizim_degistir: (v, ad) => `${ad(v.kayit)}: “${v.haritaAd}” haritasındaki ${v.bicim === 'yol' ? 'yolun' : 'bölgenin'} ${({ noktalar: 'sınırı', kayit: 'bağlı olduğu kayıt', kip: 'türü', baslangic: 'başlangıcı', bitis: 'bitişi' } as Record<string, string>)[v.alan as string] ?? 'bilgisi'} değişti`,
  cizim_sil: (v, ad) => `${ad(v.kayit)}: “${v.haritaAd}” haritasındaki ${v.bicim === 'yol' ? 'yol' : 'bölge'} kaldırıldı`,
  cizim_geri_yukle: (v, ad) => `${ad(v.kayit)}: “${v.haritaAd}” haritasındaki ${v.bicim === 'yol' ? 'yol' : 'bölge'} geri getirildi`,
  rota_yaz: (v, ad) => `${ad(v.kod)}: rotanın uçları, mesafesi ya da süreleri değişti`,
  yolculuk_yaz: (v, ad) => `${ad(v.kod)}: yolculuğun aşamaları değişti`,
  harita_sil: (v) => `“${v.haritaAd}” haritası kaldırıldı`,
  harita_geri_yukle: (v) => `“${v.haritaAd}” haritası geri getirildi`,
  isaret_koy: (v, ad) => `${ad(v.kayit)}: “${v.haritaAd}” haritasında işaretlendi`,
  isaret_degistir: (v, ad) => v.alan === 'konum' ? `${ad(v.kayit)}: “${v.haritaAd}” haritasındaki yeri değişti` : `“${v.haritaAd}” haritasındaki işaret ${ad(v.deger)} kaydına bağlandı`,
  isaret_sil: (v, ad) => `${ad(v.kayit)}: “${v.haritaAd}” haritasındaki işareti kaldırıldı`,
  isaret_geri_yukle: (v, ad) => `${ad(v.kayit)}: “${v.haritaAd}” haritasındaki işareti geri getirildi`,
  kayit_birlestir: (v, ad) => `“${v.kaynakAd}” kaydı ${ad(v.hedef)} ile birleştirildi`,
  birlesme_geri_al: (v, ad) => `“${v.kaynakAd}” ile ${ad(v.hedef)} birleştirmesi geri alındı`,
  inceleme_karari: (v) => v.durum === 'kabul' ? `İnceleme: “${v.baslik}” ${v.istisna === 'kapsam' ? 'bu kuralın kapsamı dışında sayıldı' : 'gerekçeyle kabul edildi'}` : v.durum === 'ertelendi' ? `İnceleme: “${v.baslik}” ertelendi` : v.durum === 'duzeltildi' ? `İnceleme: “${v.baslik}” düzeltildi olarak kapandı` : `İnceleme: “${v.baslik}” yeniden açıldı`,
  takvim_yaz: (v) => v.kod
    ? (v.takvim ? `“${(v.takvim as { ad: string }).ad}” takvimi ${(v.takvim as { surum: number }).surum === 1 ? 'eklendi' : 'değişti'}` : `“${v.ad ?? 'Paralel'}” takvimi kaldırıldı`)
    : v.takvim ? `Evrenin takvimi değişti (sürüm ${(v.takvim as { surum: number }).surum}); tarihlerin yeri yeniden hesaplandı` : 'Evrenin takvimi varsayılana döndü',
  akis_yaz: (v) => v.akis ? `“${(v.akis as { ad: string }).ad}” zaman akışı tanımlandı ya da değişti` : `“${v.ad ?? 'Bir'}” zaman akışı kaldırıldı`,
  sablon_yaz: (v) => v.sablon ? `“${turBul(String(v.tur)).ad}” şablonu değişti` : `“${turBul(String(v.tur)).ad}” şablonu varsayılana döndü`,
  kayit_alan: (v, ad) => `${ad(v.kod)}: “${v.ad ?? 'alan'}” ${v.deger === null || v.deger === '' || v.deger === false ? 'boşaltıldı' : 'değişti'}`,
  soru_cevapla: (v, ad) => {
    const kim = v.kod === 'evren' ? 'Evren' : ad(v.kod);
    const s = v.metin ? `“${v.metin}”` : 'bir soru';
    return v.durum === 'cevaplandi' ? `${kim}: ${s} cevaplandı` : v.durum === 'sonra' ? `${kim}: ${s} sonraya bırakıldı`
      : v.durum === 'ilgisiz' ? `${kim}: ${s} ilgisiz işaretlendi` : `${kim}: ${s} yeniden açıldı`;
  },
  kayit_soru_seti: (v, ad) => `${ad(v.kod)}: soru seti ${v.ekle ? 'eklendi' : 'çıkarıldı'}`,
  catisma_coz: (v, ad) => v.tur === 'silme' ? `${ad(v.kayit)}: silinmiş kalması kararlaştırıldı (başka cihazdaki değişiklikler incelendi)`
    : `${ad(v.kayit)}: iki cihazda birlikte değişen metin incelendi`,
  gorunurluk_yaz: (v, ad) => {
    const g = v.deger as { katman: string | null; bilenler: string[] } | null;
    const ne = v.nesne === 'iliski' ? 'Bir ilişki' : ad(v.kod);
    return !g ? `${ne}: evrenin gerçeği olarak işaretlendi` : g.katman ? `${ne}: yalnızca ${ad(g.katman)} böyle sanıyor` : `${ne}: gizli; yalnızca ${g.bilenler.map(ad).join(', ')} biliyor`;
  },
  iddia_ekle: (v, ad) => `${ad(v.konu)}: soru eklendi “${v.soru}”`,
  iddia_degistir: (v, ad) => `${ad(v.konu)}: “${v.soru}” sorusunun ${({ soru: 'metni', secenekler: 'olası cevapları', gercek: 'gerçeği', karar: 'karar durumu' } as Record<string, string>)[String(v.alan)] ?? 'bir alanı'} değişti`,
  iddia_sil: (v, ad) => `${ad(v.konu)}: “${v.soru}” sorusu kaldırıldı`,
  iddia_geri_yukle: (v, ad) => `${ad(v.konu)}: “${v.soru}” sorusu geri getirildi`,
  bilgi_ekle: (v, ad) => `${ad(v.bilen)}: “${v.soru}” hakkındaki bilgisi kaydedildi`,
  bilgi_degistir: (v, ad) => `${ad(v.bilen)}: “${v.soru}” hakkındaki bilgisi değişti`,
  bilgi_sil: (v, ad) => `${ad(v.bilen)}: “${v.soru}” hakkındaki bilgisi kaldırıldı`,
  bilgi_geri_yukle: (v, ad) => `${ad(v.bilen)}: “${v.soru}” hakkındaki bilgisi geri getirildi`,
  metin: (v, ad) => v.adDuzeltme ? `${ad(v.kayit)}: bağlantıda “${ad(v.adDuzeltme)}” adı düzeltildi` : v.geriYukleme ? `${ad(v.kayit)}: metnin eski bir sürümü geri getirildi` : `${ad(v.kayit)}: metin kaydedildi`,
};

/** Kullanıcının yaptığı bir değişiklik sayılmayan, başka bir işlemin parçası olan adımlar (listelerde gösterilmez). */
export const gizliAdimMi = (tur: string, veri: Record<string, unknown>) => tur === 'metin' && veri.ilk === true;

/** Bir işlemin açıklaması. `ad`, kayıt kodunu kullanıcının tanıdığı ada çevirir. */
export function islemAciklamasi(tur: string, veri: Record<string, unknown>, ad: (kod: unknown) => string = () => 'Kayıt'): string {
  return ACIKLAMALAR[tur]?.(veri, ad) ?? 'Bu sürümün tanımadığı bir değişiklik (korunuyor)';
}

const saatBicimi = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
const yalnizSaat = new Intl.DateTimeFormat('tr-TR', { timeStyle: 'short' });
export const zamanYaz = (t: number) => saatBicimi.format(new Date(t));
export const saatYaz = (t: number) => yalnizSaat.format(new Date(t));
