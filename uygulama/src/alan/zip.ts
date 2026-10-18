// Küçük ZIP okuyucu ve yazıcı (taşınabilir evren paketi için, §10.11). Sıkıştırma tarayıcının kendi
// "deflate-raw" akışıyla yapılır; zaten sıkıştırılmış görseller sıkıştırılmadan saklanır.

const CRC_TABLOSU = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLOSU[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function akistan(veri: Uint8Array, akis: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const cikis = new Blob([veri as BlobPart]).stream().pipeThrough(akis);
  return new Uint8Array(await new Response(cikis).arrayBuffer());
}

export interface ZipDosyasi { ad: string; veri: Uint8Array; sikistirma?: boolean }

const yaziKodla = (s: string) => new TextEncoder().encode(s);

/** Dosyaları tek bir ZIP'e yazar. */
export async function zipYaz(dosyalar: ZipDosyasi[], zaman = new Date()): Promise<Uint8Array> {
  const dosZaman = ((zaman.getHours() << 11) | (zaman.getMinutes() << 5) | (zaman.getSeconds() >> 1)) & 0xffff;
  const dosTarih = (((zaman.getFullYear() - 1980) << 9) | ((zaman.getMonth() + 1) << 5) | zaman.getDate()) & 0xffff;
  const parcalar: Uint8Array[] = [];
  const merkez: Uint8Array[] = [];
  let konum = 0;
  for (const d of dosyalar) {
    const ad = yaziKodla(d.ad);
    const crc = crc32(d.veri);
    let govde = d.veri;
    let yontem = 0;
    if (d.sikistirma !== false && d.veri.length > 64) {
      const s = await akistan(d.veri, new CompressionStream('deflate-raw'));
      if (s.length < d.veri.length) { govde = s; yontem = 8; }
    }
    const yerel = new DataView(new ArrayBuffer(30));
    yerel.setUint32(0, 0x04034b50, true);
    yerel.setUint16(4, 20, true);
    yerel.setUint16(6, 0x0800, true); // adlar UTF-8
    yerel.setUint16(8, yontem, true);
    yerel.setUint16(10, dosZaman, true);
    yerel.setUint16(12, dosTarih, true);
    yerel.setUint32(14, crc, true);
    yerel.setUint32(18, govde.length, true);
    yerel.setUint32(22, d.veri.length, true);
    yerel.setUint16(26, ad.length, true);
    yerel.setUint16(28, 0, true);
    parcalar.push(new Uint8Array(yerel.buffer), ad, govde);
    const m = new DataView(new ArrayBuffer(46));
    m.setUint32(0, 0x02014b50, true);
    m.setUint16(4, 20, true);
    m.setUint16(6, 20, true);
    m.setUint16(8, 0x0800, true);
    m.setUint16(10, yontem, true);
    m.setUint16(12, dosZaman, true);
    m.setUint16(14, dosTarih, true);
    m.setUint32(16, crc, true);
    m.setUint32(20, govde.length, true);
    m.setUint32(24, d.veri.length, true);
    m.setUint16(28, ad.length, true);
    m.setUint32(42, konum, true);
    merkez.push(new Uint8Array(m.buffer), ad);
    konum += 30 + ad.length + govde.length;
  }
  const merkezBoyu = merkez.reduce((n, p) => n + p.length, 0);
  const son = new DataView(new ArrayBuffer(22));
  son.setUint32(0, 0x06054b50, true);
  son.setUint16(8, dosyalar.length, true);
  son.setUint16(10, dosyalar.length, true);
  son.setUint32(12, merkezBoyu, true);
  son.setUint32(16, konum, true);
  const hepsi = [...parcalar, ...merkez, new Uint8Array(son.buffer)];
  const cikis = new Uint8Array(hepsi.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of hepsi) { cikis.set(p, o); o += p.length; }
  return cikis;
}

/** ZIP'i okur. Bozuk ya da desteklenmeyen dosyada anlaşılır bir hata verir. */
export async function zipOku(b: Uint8Array): Promise<Map<string, Uint8Array>> {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let son = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 65535); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { son = i; break; }
  }
  if (son < 0) throw new Error('Dosya bir yedek paketi değil ya da bozuk.');
  const sayi = v.getUint16(son + 10, true);
  let m = v.getUint32(son + 16, true);
  const sonuc = new Map<string, Uint8Array>();
  for (let n = 0; n < sayi; n++) {
    if (v.getUint32(m, true) !== 0x02014b50) throw new Error('Yedek paketinin içindekiler listesi bozuk.');
    const yontem = v.getUint16(m + 10, true);
    const crc = v.getUint32(m + 16, true);
    const sikisik = v.getUint32(m + 20, true);
    const adBoyu = v.getUint16(m + 28, true);
    const ekBoyu = v.getUint16(m + 30, true);
    const notBoyu = v.getUint16(m + 32, true);
    const yerelKonum = v.getUint32(m + 42, true);
    const ad = new TextDecoder().decode(b.subarray(m + 46, m + 46 + adBoyu));
    m += 46 + adBoyu + ekBoyu + notBoyu;
    const yAd = v.getUint16(yerelKonum + 26, true);
    const yEk = v.getUint16(yerelKonum + 28, true);
    const bas = yerelKonum + 30 + yAd + yEk;
    const govde = b.subarray(bas, bas + sikisik);
    let veri: Uint8Array;
    if (yontem === 0) veri = govde.slice();
    else if (yontem === 8) veri = await akistan(govde, new DecompressionStream('deflate-raw'));
    else throw new Error(`Yedek paketinde desteklenmeyen sıkıştırma: ${ad}`);
    if (crc32(veri) !== crc) throw new Error(`Yedek paketinde bozuk dosya: ${ad}`);
    if (!ad.endsWith('/')) sonuc.set(ad, veri);
  }
  return sonuc;
}
