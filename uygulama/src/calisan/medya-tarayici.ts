// Tarayıcıda görsel işleme ve saklama: konum bilgisini silme, yönü düzeltme, ölçü ve küçük önizleme.
// Dosyalar tarayıcının özel dosya alanında "medya" klasöründe, içerik adlarıyla durur.
import { jpegBilgiSil, KABUL_EDILEN, ONIZLEME_BOYU, pngBilgiSil, webpBilgiVarMi, type GorselIsleyici, type MedyaDeposu } from './medya';

const baytlar = async (b: Blob) => new Uint8Array(await b.arrayBuffer());

export const tarayiciIsleyici: GorselIsleyici = async (veri, tur) => {
  if (!KABUL_EDILEN.includes(tur)) throw new Error('Bu dosya eklenemiyor. JPEG, PNG, WebP, GIF ya da AVIF bir görsel seçin.');
  let temiz = veri;
  let cikis = tur;
  let ciz = false;
  if (tur === 'image/jpeg') { const r = jpegBilgiSil(veri); temiz = r.veri; ciz = r.yon !== 1; }
  else if (tur === 'image/png') temiz = pngBilgiSil(veri);
  else if (tur === 'image/webp') ciz = webpBilgiVarMi(veri);
  else if (tur === 'image/avif') { ciz = true; cikis = 'image/webp'; }
  // Görüntü, fotoğrafın kendi yön bilgisiyle çizilir; yeniden kodlanan dosyada hiçbir ek bilgi kalmaz.
  const resim = await createImageBitmap(new Blob([veri as BlobPart], { type: tur }), { imageOrientation: 'from-image' });
  const en = resim.width, boy = resim.height;
  if (ciz) {
    const t = new OffscreenCanvas(en, boy);
    t.getContext('2d')!.drawImage(resim, 0, 0);
    temiz = await baytlar(await t.convertToBlob({ type: cikis === 'image/jpeg' ? 'image/jpeg' : 'image/webp', quality: 0.92 }));
    cikis = cikis === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
  }
  let onizleme: Uint8Array | null = null;
  const buyuk = Math.max(en, boy);
  if (buyuk > ONIZLEME_BOYU) {
    const o = ONIZLEME_BOYU / buyuk;
    const t = new OffscreenCanvas(Math.max(1, Math.round(en * o)), Math.max(1, Math.round(boy * o)));
    const c = t.getContext('2d')!;
    c.imageSmoothingQuality = 'high';
    c.drawImage(resim, 0, 0, t.width, t.height);
    onizleme = await baytlar(await t.convertToBlob({ type: 'image/webp', quality: 0.82 }));
  }
  resim.close();
  return { veri: temiz, tur: cikis, en, boy, onizleme };
};

export class OpfsDeposu implements MedyaDeposu {
  private klasor: Promise<FileSystemDirectoryHandle> | null = null;
  private dizin() {
    this.klasor ??= navigator.storage.getDirectory().then((k) => k.getDirectoryHandle('medya', { create: true }));
    return this.klasor;
  }
  /**
   * Görsel önce geçici bir adla yazılır, diske işlenince asıl adını alır: yazma yarıda kalırsa (program ya da
   * bilgisayar kapanırsa) asıl adla yarım bir dosya kalmaz; görsel bir sonraki eşitlemede ya da yedekten yeniden gelir.
   */
  async yaz(ad: string, veri: Uint8Array) {
    const d = await this.dizin();
    const tasinabilir = typeof (FileSystemFileHandle.prototype as { move?: unknown }).move === 'function';
    const gecici = tasinabilir ? `${ad}.yaziliyor` : ad;
    const dosya = await d.getFileHandle(gecici, { create: true });
    const h = await dosya.createSyncAccessHandle();
    try { h.truncate(0); h.write(veri, { at: 0 }); h.flush(); } finally { h.close(); }
    if (!tasinabilir) return;
    try { await d.removeEntry(ad); } catch { /* yoksa sorun değil */ }
    await (dosya as unknown as { move(ad: string): Promise<void> }).move(ad);
  }
  async oku(ad: string) {
    const d = await this.dizin();
    try { return new Uint8Array(await (await (await d.getFileHandle(ad)).getFile()).arrayBuffer()); }
    catch { return null; }
  }
  async dosya(ad: string) {
    const d = await this.dizin();
    try { return await (await d.getFileHandle(ad)).getFile(); }
    catch { return null; }
  }
  async var(ad: string) {
    const d = await this.dizin();
    try { await d.getFileHandle(ad); return true; } catch { return false; }
  }
}
