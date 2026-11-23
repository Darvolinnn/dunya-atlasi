// Dosyayı kullanıcıya verme: tarayıcıda ve Windows uygulamasında indirme başlatılır; tablet uygulamasında sayfa
// görüntüleyicisi indirme yapamadığı için kabuk dosyayı tabletin İndirilenler klasörüne yazar (DEVIR §0.21).
import { kabuk } from './kabuk';

/** Tablet (Android) uygulamasının içinde mi? */
export const tabletUygulamasi = (): boolean => !!kabuk() && /Android/.test(navigator.userAgent);

/**
 * Dosyayı kaydeder. Tablet uygulamasında kaydedilen dosyanın adını döndürür (İndirilenler klasöründe; aynı adda dosya
 * varsa ek alır). Öbür yerlerde indirmeyi başlatır ve null döner; dosyanın kaydedildiğini program göremez.
 */
export async function dosyaKaydet(ad: string, veri: Uint8Array | Blob, tur: string): Promise<string | null> {
  const k = kabuk();
  if (k && tabletUygulamasi()) {
    const baytlar = veri instanceof Blob ? new Uint8Array(await veri.arrayBuffer()) : veri;
    try {
      return await k.invoke<string>('indirilenlere_kaydet', baytlar, { headers: { ad: encodeURIComponent(ad) } });
    } catch (e) { throw new Error(typeof e === 'string' ? e : e instanceof Error ? e.message : 'Dosya kaydedilemedi.'); }
  }
  const url = URL.createObjectURL(veri instanceof Blob ? veri : new Blob([veri as BlobPart], { type: tur }));
  const a = document.createElement('a');
  a.href = url; a.download = ad;
  a.style.display = 'none';
  document.body.append(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 60_000);
  return null;
}
