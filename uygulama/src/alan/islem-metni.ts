// İşlemlerin kullanıcıya gösterilen açıklaması. Programlama terimi kullanılmaz (§10.7).

type Aciklayici = (veri: Record<string, unknown>) => string;

const ACIKLAMALAR: Record<string, Aciklayici> = {
  evren_olustur: (v) => `Evren oluşturuldu: “${v.ad}”`,
  evren_adlandir: (v) => `Evrenin adı “${v.ad}” oldu`,
};

export function islemAciklamasi(tur: string, veri: Record<string, unknown>): string {
  return ACIKLAMALAR[tur]?.(veri) ?? 'Bu sürümün tanımadığı bir değişiklik (korunuyor)';
}

const saatBicimi = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
export const zamanYaz = (t: number) => saatBicimi.format(new Date(t));
