// Windows uygulamasının kabuğu (Tauri, src-tauri/). Tarayıcıda yoktur. Kabuğun istekleri yalnızca sayfadan çağrılabilir;
// veri bölümü (çalışan) bu bilgisayardaki yedek klasörüne istemci üzerinden ulaşır (K31).
type Kabuk = { invoke<T>(komut: string, arg?: unknown, secenek?: { headers?: Record<string, string> }): Promise<T> };
export const kabuk = (): Kabuk | undefined => (globalThis as { window?: { __TAURI_INTERNALS__?: Kabuk } }).window?.__TAURI_INTERNALS__;

/** Çalışanın isteyebildiği klasör istekleri; başkası iletilmez. */
const KLASOR_ISTEKLERI = new Set(['yerel_yedek_listele', 'yerel_yedek_oku', 'yerel_yedek_yaz', 'yerel_yedek_sil']);

const hataMetni = (e: unknown, yedek: string) => (typeof e === 'string' ? e : e instanceof Error ? e.message : yedek);

/** Kabuk baytları doğrudan (ArrayBuffer) ya da yedek yolda sayı dizisi olarak döndürür. */
function baytlar(r: unknown): Uint8Array {
  if (r instanceof ArrayBuffer) return new Uint8Array(r);
  if (ArrayBuffer.isView(r)) return new Uint8Array(r.buffer, r.byteOffset, r.byteLength);
  if (Array.isArray(r)) return Uint8Array.from(r as number[]);
  throw new Error('Yedek dosyası okunamadı.');
}

/** Çalışandan gelen bir klasör isteğini kabuğa iletir. */
export async function klasorIstegi(komut: string, arg: { alt?: unknown; ad?: unknown } | undefined, veri?: Uint8Array): Promise<unknown> {
  const k = kabuk();
  if (!k) throw new Error('Bu bilgisayardaki yedek klasörüne yalnız Windows uygulaması ulaşabilir.');
  if (!KLASOR_ISTEKLERI.has(komut)) throw new Error('Bilinmeyen istek.');
  const alt = typeof arg?.alt === 'string' ? arg.alt : '';
  const ad = typeof arg?.ad === 'string' ? arg.ad : '';
  try {
    if (komut === 'yerel_yedek_yaz') {
      // Baytlar isteğin gövdesinde, yer ve ad başlıkta (Türkçe harfler için yüzde kodlu).
      await k.invoke(komut, veri ?? new Uint8Array(), { headers: { alt: encodeURIComponent(alt), ad: encodeURIComponent(ad) } });
      return null;
    }
    const r = await k.invoke<unknown>(komut, komut === 'yerel_yedek_listele' ? { alt } : { alt, ad });
    return komut === 'yerel_yedek_oku' ? baytlar(r) : r;
  } catch (e) { throw new Error(hataMetni(e, 'Yedek klasörüne ulaşılamadı.')); }
}

/** Windows uygulamasındaysa yedek klasörünün yeri; tarayıcıda ya da bu isteği bilmeyen eski kabukta null. */
export async function yedekKlasoruYeri(): Promise<string | null> {
  const k = kabuk();
  if (!k) return null;
  try { return await k.invoke<string>('yerel_yedek_yeri'); } catch { return null; }
}

/** Yedek klasörünü Dosya Gezgini'nde açar. */
export async function yedekKlasorunuAc(): Promise<void> {
  const k = kabuk();
  if (!k) throw new Error('Klasör yalnız Windows uygulamasında açılabilir.');
  try { await k.invoke('yerel_yedek_klasoru_ac'); } catch (e) { throw new Error(hataMetni(e, 'Klasör açılamadı.')); }
}
