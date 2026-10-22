// Tarayıcının ve SQLite'ın İngilizce teknik iletileri kullanıcıya gitmeden Türkçeleştirilir (kullanıcıya gösterilen
// metinde programlama terimi olmaz). Programın kendi Türkçe iletileri olduğu gibi geçer.
export const YER_YOK = 'Bu cihazda yer kalmadı. Yer açıp yeniden deneyin.';
export const VT_HATASI = 'Bu cihazdaki evren dosyasına ulaşılamadı. Programı kapatıp yeniden açın; sürerse yedekten geri yükleyin.';

export function kullaniciIletisi(err: unknown): string {
  const ad = err instanceof Error ? err.name : '';
  const m = err instanceof Error ? err.message : String(err);
  if (ad === 'QuotaExceededError' || /SQLITE_FULL|database or disk is full|quota ?exceeded/i.test(m)) return YER_YOK;
  if (/^SQLITE_|sqlite3 result code/i.test(m)) return VT_HATASI;
  return m;
}
