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
  anlati_yerlestir: (v, ad) => v.ust ? `${ad(v.kod)}: ${ad(v.ust)} içinde yeri değişti` : `${ad(v.kod)}: eser yapısından çıkarıldı`,
  durum_ekle: (v, ad) => `${ad(v.konu)}: durum eklendi “${v.ozellik}: ${v.hedef ? ad(v.hedef) : v.deger}”`,
  durum_degistir: (v, ad) => `${ad(v.konu)}: “${v.ozellik}” durumunun ${({ deger: 'değeri', hedef: 'değeri', kip: 'süresi', baslangic: 'başlangıcı', bitis: 'bitişi', karar: 'karar durumu', ozellik: 'adı' } as Record<string, string>)[String(v.alan)] ?? 'bir alanı'} değişti`,
  durum_sil: (v, ad) => `${ad(v.konu)}: “${v.ozellik}” durumu kaldırıldı`,
  durum_geri_yukle: (v, ad) => `${ad(v.konu)}: “${v.ozellik}” durumu geri getirildi`,
  takvim_yaz: (v) => v.takvim ? `Evrenin takvimi değişti (sürüm ${(v.takvim as { surum: number }).surum}); tarihlerin yeri yeniden hesaplandı` : 'Evrenin takvimi varsayılana döndü',
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
