// İşlemlerin kullanıcıya gösterilen açıklaması. Programlama terimi kullanılmaz (§10.7).
import { KARARLAR, turBul } from './turler';

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
    if (alan === 'ozet') return `${ad(v.kod)}: kısa özet değişti`;
    const once = deger(alan, v.onceki), sonra = deger(alan, v.deger);
    return `${ad(v.kod)}: ${ALAN_ADI[alan] ?? alan} ${once ? `“${once}” → ` : ''}“${sonra}”`;
  },
  kayit_lakap: (v, ad) => v.ekle ? `${ad(v.kod)}: lakap eklendi “${v.ekle}”` : `${ad(v.kod)}: lakap çıkarıldı “${v.cikar}”`,
  kayit_etiket: (v, ad) => v.ekle ? `${ad(v.kod)}: etiket eklendi “${v.ekle}”` : `${ad(v.kod)}: etiket çıkarıldı “${v.cikar}”`,
  kayit_sil: (v, ad) => `${ad(v.kod)}: çöp kutusuna taşındı`,
  kayit_geri_yukle: (v, ad) => `${ad(v.kod)}: çöp kutusundan geri getirildi`,
  metin: (v, ad) => v.geriYukleme ? `${ad(v.kayit)}: metnin eski bir sürümü geri getirildi` : `${ad(v.kayit)}: metin kaydedildi`,
};

/** Bir işlemin açıklaması. `ad`, kayıt kodunu kullanıcının tanıdığı ada çevirir. */
export function islemAciklamasi(tur: string, veri: Record<string, unknown>, ad: (kod: unknown) => string = () => 'Kayıt'): string {
  return ACIKLAMALAR[tur]?.(veri, ad) ?? 'Bu sürümün tanımadığı bir değişiklik (korunuyor)';
}

const saatBicimi = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
const yalnizSaat = new Intl.DateTimeFormat('tr-TR', { timeStyle: 'short' });
export const zamanYaz = (t: number) => saatBicimi.format(new Date(t));
export const saatYaz = (t: number) => yalnizSaat.format(new Date(t));
