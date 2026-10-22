// Silme ve kaldırma (§10.8, K29). Geri dönüşü olan işler hemen yapılır ve altta birkaç saniye "Geri al" şeridi
// görünür; onay sorusu yalnız geri dönüşü olmayan işlerde kalır (evreni bu cihazdan kaldırmak, çöp kutusunu boşaltmak,
// yedeği mevcut evrenin üzerine yüklemek) ya da bir karar sorulurken.
export const onayla = (soru: string) => window.confirm(soru);

type YedekDurumu = { son: { zaman: number; dogrulandi: boolean } | null } | null;
/**
 * Evreni kaldırma sorusundaki "son yedek" (§10.1): dosyaya alınan tam yedek, Drive'daki ve bu bilgisayardaki doğrulanmış
 * günlük yedeklerin en yenisi; hiçbiri yoksa 0.
 */
export const sonYedekZamani = (dosya: number | null, ...gunlukler: YedekDurumu[]) =>
  Math.max(dosya ?? 0, ...gunlukler.map((d) => (d?.son?.dogrulandi ? d.son.zaman : 0)));

export interface GeriAlinabilirIs { ileti: string; geriAl: () => Promise<unknown> }
type Dinleyici = (is: GeriAlinabilirIs | null) => void;
const dinleyiciler = new Set<Dinleyici>();
export const geriAlDinle = (f: Dinleyici) => { dinleyiciler.add(f); return () => { dinleyiciler.delete(f); }; };

/**
 * İşi yapar ve başarılı olursa "Geri al" şeridini gösterir. Hata olursa şerit çıkmaz, hata çağırana döner.
 * `geriAl` işin tersini yeni bir işlem olarak yapar (çöp kutusundan geri getirme, eski listeyi yeniden yazma).
 */
export async function geriAlinabilir<T>(ileti: string, yap: () => Promise<T>, geriAl: () => Promise<unknown>): Promise<T> {
  const sonuc = await yap();
  // Hatayı kendisi gösterip false döndüren yazma işlevleri: iş olmadıysa şerit de çıkmaz.
  if ((sonuc as unknown) === false) return sonuc;
  for (const f of dinleyiciler) f({ ileti, geriAl });
  return sonuc;
}
