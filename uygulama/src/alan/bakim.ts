// Bakım ve tekrarlar (§16.1 F32): bakım tanımı sahipliği, sıklık ve durum sabitleri.

export const BAKIM_SAHIPLERI = [
  'mekan',
  'sehir',
  'esya',
  'teknoloji',
  'buyu_uygulamasi',
  'buyu_sistemi',
  'evren_kurali',
  'topluluk',
  'siyasi',
  'makam',
] as const;

export const bakimSahibiMi = (tur: string): boolean => (BAKIM_SAHIPLERI as readonly string[]).includes(tur);

export type BakimBirimi = 'gun' | 'ay' | 'yil';
export const BAKIM_BIRIMLERI: readonly BakimBirimi[] = ['gun', 'ay', 'yil'] as const;
export const BAKIM_BIRIM_ADLARI: Record<BakimBirimi, string> = { gun: 'gün', ay: 'ay', yil: 'yıl' };
export const BAKIM_BIRIM_DE_ADLARI: Record<BakimBirimi, string> = { gun: 'günde', ay: 'ayda', yil: 'yılda' };

export interface BakimSuresi {
  deger: number;
  birim: BakimBirimi;
}

export interface BakimMalzemesi {
  kayit: string | null;
  metin: string;
}

export type BakimKaydiDurumu = 'yapildi' | 'yapilmadi' | 'yarida';
export const BAKIM_KAYDI_DURUMLARI: readonly BakimKaydiDurumu[] = ['yapildi', 'yapilmadi', 'yarida'] as const;
export const BAKIM_KAYDI_DURUM_ADLARI: Record<BakimKaydiDurumu, string> = {
  yapildi: 'Yapıldı',
  yapilmadi: 'Yapılmadı',
  yarida: 'Yarıda kaldı',
};

export type BakimHesapDurumu = 'zamaninda' | 'gecikmis_olabilir' | 'gecikmis' | 'kesinti_olabilir' | 'bilinmiyor';
export const BAKIM_HESAP_DURUM_ADLARI: Record<BakimHesapDurumu, string> = {
  zamaninda: 'zamanında',
  gecikmis_olabilir: 'gecikmiş olabilir',
  gecikmis: 'gecikmiş',
  kesinti_olabilir: 'kesinti başlamış olabilir',
  bilinmiyor: 'hesaplanamıyor',
};

export const BAKIM_SONUC_NOTU =
  'Bu bir hesap; evrende bir şey olduğu anlamına gelmez. Grev, ihmal ya da sabotaj kendiliğinden eklenmez.';

export function siklikYazisi(s: BakimSuresi | null): string {
  if (!s) return 'Sıklığı belirtilmemiş';
  return s.deger === 1 ? `Her ${BAKIM_BIRIM_DE_ADLARI[s.birim]} bir` : `Her ${s.deger} ${BAKIM_BIRIM_DE_ADLARI[s.birim]} bir`;
}

export function sureYazisi(s: BakimSuresi | null): string {
  if (!s) return '';
  return `${s.deger} ${BAKIM_BIRIM_ADLARI[s.birim]}`;
}
