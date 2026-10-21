// Görseller (§10.12, TK5): içerikleriyle adlandırılmış değişmez dosyalar. Aynı görsel iki kez eklenirse
// bir kez saklanır. İçe alınırken fotoğraf bilgisindeki konum (ve öbür kişisel bilgiler) silinir.
// Dosyalar işlem günlüğüne girmez; günlükte yalnızca adları ve ölçüleri vardır.

export interface MedyaDeposu {
  yaz(ad: string, veri: Uint8Array): Promise<void>;
  oku(ad: string): Promise<Uint8Array | null>;
  var(ad: string): Promise<boolean>;
  /** Görsel diskteki dosya olarak (içi istendikçe okunur); büyük yedekte görseller belleğe toplanmasın diye. */
  dosya?(ad: string): Promise<Blob | null>;
}

export interface IslenmisGorsel { veri: Uint8Array; tur: string; en: number | null; boy: number | null; onizleme: Uint8Array | null }
export type GorselIsleyici = (veri: Uint8Array, tur: string) => Promise<IslenmisGorsel>;

export const KABUL_EDILEN = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
export const ONIZLEME_BOYU = 640;
export const onizlemeAdi = (ad: string) => ad + '.onizleme';

export async function icerikAdi(veri: Uint8Array): Promise<string> {
  const ozet = await crypto.subtle.digest('SHA-256', veri as BufferSource);
  return [...new Uint8Array(ozet)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Bellekte depo (sınamalar için). */
export class BellekDeposu implements MedyaDeposu {
  readonly dosyalar = new Map<string, Uint8Array>();
  async yaz(ad: string, veri: Uint8Array) { this.dosyalar.set(ad, veri); }
  async oku(ad: string) { return this.dosyalar.get(ad) ?? null; }
  async var(ad: string) { return this.dosyalar.has(ad); }
}

// ---------- Fotoğraf bilgisini silme ----------

const tiffOku = (b: Uint8Array, bas: number) => {
  const le = b[bas] === 0x49; // "II"
  const u16 = (o: number) => le ? b[bas + o] | (b[bas + o + 1] << 8) : (b[bas + o] << 8) | b[bas + o + 1];
  const u32 = (o: number) => (le ? (b[bas + o] | (b[bas + o + 1] << 8) | (b[bas + o + 2] << 16) | (b[bas + o + 3] << 24))
    : ((b[bas + o] << 24) | (b[bas + o + 1] << 16) | (b[bas + o + 2] << 8) | b[bas + o + 3])) >>> 0;
  return { u16, u32 };
};

/**
 * JPEG'den Exif ve XMP bölümlerini (konum dahil) çıkarır; görüntü verisine dokunmaz.
 * Fotoğrafın yönü Exif'te yazıyorsa döndürülür; yön 1 değilse görüntünün yeniden çizilmesi gerekir.
 */
export function jpegBilgiSil(b: Uint8Array): { veri: Uint8Array; yon: number } {
  if (b[0] !== 0xff || b[1] !== 0xd8) return { veri: b, yon: 1 };
  const parcalar: Uint8Array[] = [b.subarray(0, 2)];
  let yon = 1;
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) break;
    const isaret = b[i + 1];
    if (isaret === 0xda) { parcalar.push(b.subarray(i)); i = b.length; break; } // görüntü verisi başladı
    const uzunluk = (b[i + 2] << 8) | b[i + 3];
    const son = i + 2 + uzunluk;
    if (son > b.length) break;
    const govde = b.subarray(i + 4, son);
    const exif = isaret === 0xe1 && govde[0] === 0x45 && govde[1] === 0x78 && govde[2] === 0x69 && govde[3] === 0x66; // "Exif"
    const xmp = isaret === 0xe1 && !exif;
    if (exif) {
      try {
        const t = 6; // "Exif\0\0"
        const { u16, u32 } = tiffOku(govde, t);
        const ifd = u32(4);
        const n = u16(ifd);
        for (let e = 0; e < n; e++) {
          const o = ifd + 2 + e * 12;
          if (u16(o) === 0x0112) yon = u16(o + 8);
        }
      } catch { /* bozuk bilgi: yön 1 sayılır */ }
    }
    if (!exif && !xmp) parcalar.push(b.subarray(i, son));
    i = son;
  }
  if (i < b.length) parcalar.push(b.subarray(i));
  const toplam = parcalar.reduce((n, p) => n + p.length, 0);
  const veri = new Uint8Array(toplam);
  let o = 0;
  for (const p of parcalar) { veri.set(p, o); o += p.length; }
  return { veri, yon: yon >= 1 && yon <= 8 ? yon : 1 };
}

/** PNG'den eXIf ve metin bölümlerini çıkarır. */
export function pngBilgiSil(b: Uint8Array): Uint8Array {
  const IMZA = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!IMZA.every((x, i) => b[i] === x)) return b;
  const parcalar: Uint8Array[] = [b.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= b.length) {
    const uzunluk = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
    const tur = String.fromCharCode(b[i + 4], b[i + 5], b[i + 6], b[i + 7]);
    const son = i + 12 + uzunluk;
    if (son > b.length) break;
    if (!['eXIf', 'tEXt', 'iTXt', 'zTXt'].includes(tur)) parcalar.push(b.subarray(i, son));
    i = son;
  }
  const veri = new Uint8Array(parcalar.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parcalar) { veri.set(p, o); o += p.length; }
  return veri;
}

/** WebP içinde EXIF ya da XMP bölümü var mı (varsa görüntü yeniden çizilir). */
export function webpBilgiVarMi(b: Uint8Array): boolean {
  if (String.fromCharCode(...b.subarray(0, 4)) !== 'RIFF' || String.fromCharCode(...b.subarray(8, 12)) !== 'WEBP') return false;
  let i = 12;
  while (i + 8 <= b.length) {
    const tur = String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);
    const uzunluk = (b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24)) >>> 0;
    if (tur === 'EXIF' || tur === 'XMP ') return true;
    i += 8 + uzunluk + (uzunluk & 1);
  }
  return false;
}
