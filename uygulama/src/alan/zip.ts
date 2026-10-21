// Küçük ZIP okuyucu ve yazıcı (taşınabilir evren paketi için, §10.11). Sıkıştırma tarayıcının kendi
// "deflate-raw" akışıyla yapılır; zaten sıkıştırılmış görseller sıkıştırılmadan saklanır.
//
// Büyük evren (§10.1: yüz binlerce değişiklik, gigabaytlarca görsel) için paket parça parça yazılır ve okunur:
// hiçbir yerde paketin tamamı tek bir metin olarak bellekte kurulmaz. Dosya içeriği bir bayt dizisi, bir dosya
// (Blob) ya da parça parça üreten bir kaynak olabilir; okurken de içerik akış olarak açılabilir. 4 GB'ı ya da
// 65.535 dosyayı aşan paketler ZIP64 biçimiyle yazılır ve okunur.

const CRC_TABLOSU = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** Sağlama toplamını parça parça hesaplar: başlangıç 0xffffffff, sonunda `crcBitir`. */
export function crcGuncelle(c: number, b: Uint8Array): number {
  for (let i = 0; i < b.length; i++) c = CRC_TABLOSU[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return c;
}
const crcBitir = (c: number) => (c ^ 0xffffffff) >>> 0;

export function crc32(b: Uint8Array): number {
  return crcBitir(crcGuncelle(0xffffffff, b));
}

async function akistan(veri: Uint8Array, akis: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const cikis = new Blob([veri as BlobPart]).stream().pipeThrough(akis);
  return new Uint8Array(await new Response(cikis).arrayBuffer());
}

/** Paketteki bir dosya. `veri` bayt dizisi, dosya (Blob) ya da parça parça üreten bir kaynak olabilir. */
export interface ZipDosyasi { ad: string; veri: Uint8Array | Blob | (() => AsyncIterable<Uint8Array>); sikistirma?: boolean }

const yaziKodla = (s: string) => new TextEncoder().encode(s);
const SINIR32 = 0xffffffff;
const SINIR16 = 0xffff;

async function* blobParcalari(b: Blob): AsyncIterable<Uint8Array> {
  const r = b.stream().getReader();
  for (;;) {
    const { done, value } = await r.read();
    if (done) return;
    yield value;
  }
}

/** Kaynağı sıkıştırır; sıkışmış parçaları, boyları ve sağlama toplamını döner (parçalar bellekte, ham hâl değil). */
async function akisiSikistir(kaynak: AsyncIterable<Uint8Array>) {
  const cs = new CompressionStream('deflate-raw');
  const yazici = cs.writable.getWriter();
  const parcalar: Uint8Array[] = [];
  let boy = 0;
  const okuma = (async () => {
    const r = cs.readable.getReader();
    for (;;) {
      const { done, value } = await r.read();
      if (done) return;
      parcalar.push(value);
      boy += value.length;
    }
  })();
  let crc = 0xffffffff, hamBoy = 0;
  try {
    for await (const p of kaynak) {
      if (!p.length) continue;
      crc = crcGuncelle(crc, p);
      hamBoy += p.length;
      await yazici.write(p as unknown as BufferSource);
    }
    await yazici.close();
  } catch (e) { void yazici.abort(e).catch(() => {}); await okuma.catch(() => {}); throw e; }
  await okuma;
  return { parcalar, boy, hamBoy, crc: crcBitir(crc) };
}

interface Hazir { ad: Uint8Array; yontem: number; crc: number; boy: number; hamBoy: number; govde: BlobPart[] }

async function hazirla(d: ZipDosyasi): Promise<Hazir> {
  const ad = yaziKodla(d.ad);
  const v = d.veri;
  if (v instanceof Uint8Array) {
    if (d.sikistirma !== false && v.length > 64) {
      const s = await akistan(v, new CompressionStream('deflate-raw'));
      if (s.length < v.length) return { ad, yontem: 8, crc: crc32(v), boy: s.length, hamBoy: v.length, govde: [s as BlobPart] };
    }
    return { ad, yontem: 0, crc: crc32(v), boy: v.length, hamBoy: v.length, govde: [v as BlobPart] };
  }
  if (v instanceof Blob && d.sikistirma === false) {
    // Görsel gibi büyük ve zaten sıkışmış dosya: içeriği kopyalanmaz, yalnızca sağlama toplamı için okunur.
    let crc = 0xffffffff;
    for await (const p of blobParcalari(v)) crc = crcGuncelle(crc, p);
    return { ad, yontem: 0, crc: crcBitir(crc), boy: v.size, hamBoy: v.size, govde: [v] };
  }
  const s = await akisiSikistir(v instanceof Blob ? blobParcalari(v) : v());
  return { ad, yontem: 8, crc: s.crc, boy: s.boy, hamBoy: s.hamBoy, govde: s.parcalar as BlobPart[] };
}

function dosZamani(zaman: Date) {
  return {
    saat: ((zaman.getHours() << 11) | (zaman.getMinutes() << 5) | (zaman.getSeconds() >> 1)) & 0xffff,
    tarih: (((zaman.getFullYear() - 1980) << 9) | ((zaman.getMonth() + 1) << 5) | zaman.getDate()) & 0xffff,
  };
}

/** Dosyaları tek bir ZIP'e yazar; sonuç dosya (Blob) olarak döner, büyük içerik bellekte kopyalanmaz. */
export async function zipYazBlob(dosyalar: ZipDosyasi[], zaman = new Date()): Promise<Blob> {
  const z = dosZamani(zaman);
  const parcalar: BlobPart[] = [];
  const merkez: Uint8Array[] = [];
  let konum = 0;
  for (const d of dosyalar) {
    const h = await hazirla(d);
    const buyuk = h.boy >= SINIR32 || h.hamBoy >= SINIR32 || konum >= SINIR32;
    // Yerel başlık (ZIP64'te boylar ek alanda).
    const yerelEk = buyuk ? new DataView(new ArrayBuffer(20)) : null;
    if (yerelEk) {
      yerelEk.setUint16(0, 0x0001, true); yerelEk.setUint16(2, 16, true);
      yerelEk.setBigUint64(4, BigInt(h.hamBoy), true); yerelEk.setBigUint64(12, BigInt(h.boy), true);
    }
    const yerel = new DataView(new ArrayBuffer(30));
    yerel.setUint32(0, 0x04034b50, true);
    yerel.setUint16(4, buyuk ? 45 : 20, true);
    yerel.setUint16(6, 0x0800, true); // adlar UTF-8
    yerel.setUint16(8, h.yontem, true);
    yerel.setUint16(10, z.saat, true);
    yerel.setUint16(12, z.tarih, true);
    yerel.setUint32(14, h.crc, true);
    yerel.setUint32(18, buyuk ? SINIR32 : h.boy, true);
    yerel.setUint32(22, buyuk ? SINIR32 : h.hamBoy, true);
    yerel.setUint16(26, h.ad.length, true);
    yerel.setUint16(28, yerelEk ? yerelEk.byteLength : 0, true);
    parcalar.push(new Uint8Array(yerel.buffer) as BlobPart, h.ad as BlobPart);
    if (yerelEk) parcalar.push(new Uint8Array(yerelEk.buffer) as BlobPart);
    parcalar.push(...h.govde);
    // Merkezî dizin satırı.
    const merkezEk = buyuk ? new DataView(new ArrayBuffer(28)) : null;
    if (merkezEk) {
      merkezEk.setUint16(0, 0x0001, true); merkezEk.setUint16(2, 24, true);
      merkezEk.setBigUint64(4, BigInt(h.hamBoy), true); merkezEk.setBigUint64(12, BigInt(h.boy), true); merkezEk.setBigUint64(20, BigInt(konum), true);
    }
    const m = new DataView(new ArrayBuffer(46));
    m.setUint32(0, 0x02014b50, true);
    m.setUint16(4, buyuk ? 45 : 20, true);
    m.setUint16(6, buyuk ? 45 : 20, true);
    m.setUint16(8, 0x0800, true);
    m.setUint16(10, h.yontem, true);
    m.setUint16(12, z.saat, true);
    m.setUint16(14, z.tarih, true);
    m.setUint32(16, h.crc, true);
    m.setUint32(20, buyuk ? SINIR32 : h.boy, true);
    m.setUint32(24, buyuk ? SINIR32 : h.hamBoy, true);
    m.setUint16(28, h.ad.length, true);
    m.setUint16(30, merkezEk ? merkezEk.byteLength : 0, true);
    m.setUint32(42, buyuk ? SINIR32 : konum, true);
    merkez.push(new Uint8Array(m.buffer), h.ad);
    if (merkezEk) merkez.push(new Uint8Array(merkezEk.buffer));
    konum += 30 + h.ad.length + (yerelEk ? yerelEk.byteLength : 0) + h.boy;
  }
  const merkezBoyu = merkez.reduce((n, p) => n + p.length, 0);
  const son: Uint8Array[] = [];
  const buyukArsiv = dosyalar.length >= SINIR16 || konum >= SINIR32 || merkezBoyu >= SINIR32;
  if (buyukArsiv) {
    const z64 = new DataView(new ArrayBuffer(56));
    z64.setUint32(0, 0x06064b50, true);
    z64.setBigUint64(4, 44n, true);
    z64.setUint16(12, 45, true); z64.setUint16(14, 45, true);
    z64.setBigUint64(24, BigInt(dosyalar.length), true); z64.setBigUint64(32, BigInt(dosyalar.length), true);
    z64.setBigUint64(40, BigInt(merkezBoyu), true); z64.setBigUint64(48, BigInt(konum), true);
    const yer = new DataView(new ArrayBuffer(20));
    yer.setUint32(0, 0x07064b50, true);
    yer.setBigUint64(8, BigInt(konum + merkezBoyu), true);
    yer.setUint32(16, 1, true);
    son.push(new Uint8Array(z64.buffer), new Uint8Array(yer.buffer));
  }
  const sonKayit = new DataView(new ArrayBuffer(22));
  sonKayit.setUint32(0, 0x06054b50, true);
  sonKayit.setUint16(8, buyukArsiv ? SINIR16 : dosyalar.length, true);
  sonKayit.setUint16(10, buyukArsiv ? SINIR16 : dosyalar.length, true);
  sonKayit.setUint32(12, buyukArsiv ? SINIR32 : merkezBoyu, true);
  sonKayit.setUint32(16, buyukArsiv ? SINIR32 : konum, true);
  son.push(new Uint8Array(sonKayit.buffer));
  return new Blob([...parcalar, ...(merkez as BlobPart[]), ...(son as BlobPart[])], { type: 'application/zip' });
}

/** Dosyaları tek bir ZIP'e yazar (küçük paketler için bayt dizisi olarak). */
export async function zipYaz(dosyalar: ZipDosyasi[], zaman = new Date()): Promise<Uint8Array> {
  return new Uint8Array(await (await zipYazBlob(dosyalar, zaman)).arrayBuffer());
}

// ---------- Okuma ----------

interface Kaynak { boy: number; oku(bas: number, son: number): Promise<Uint8Array>; akis(bas: number, son: number): ReadableStream<Uint8Array> }

function kaynakYap(k: Uint8Array | Blob): Kaynak {
  if (k instanceof Uint8Array) {
    return {
      boy: k.length,
      oku: async (bas, son) => k.subarray(bas, son),
      akis: (bas, son) => {
        let o = bas;
        return new ReadableStream<Uint8Array>({
          pull(c) {
            if (o >= son) { c.close(); return; }
            const s = Math.min(son, o + 1024 * 1024);
            c.enqueue(k.slice(o, s));
            o = s;
          },
        });
      },
    };
  }
  return {
    boy: k.size,
    oku: async (bas, son) => new Uint8Array(await k.slice(bas, son).arrayBuffer()),
    akis: (bas, son) => k.slice(bas, son).stream(),
  };
}

interface Girdi { ad: string; yontem: number; crc: number; boy: number; hamBoy: number; yerelKonum: number }

/** Açılmış bir ZIP: dosyalar istendikçe okunur; her dosyanın sağlama toplamı okunurken denetlenir. */
export interface ZipArsivi {
  readonly adlar: string[];
  var(ad: string): boolean;
  oku(ad: string): Promise<Uint8Array>;
  /** Dosyanın içeriği akış olarak; sonunda sağlama toplamı tutmazsa akış hatayla biter. */
  akis(ad: string): ReadableStream<Uint8Array>;
  /** Metin dosyasının satırları (boş satırlar atlanır), parça parça. */
  satirlar(ad: string): AsyncIterable<string>;
}

const bozukDosya = (ad: string) => new Error(`Yedek paketinde bozuk dosya: ${ad}`);

/** ZIP'i açar. Bozuk ya da desteklenmeyen dosyada anlaşılır bir hata verir. */
export async function zipAc(k: Uint8Array | Blob): Promise<ZipArsivi> {
  const kaynak = kaynakYap(k);
  const kuyrukBas = Math.max(0, kaynak.boy - 22 - 65535);
  const kuyruk = await kaynak.oku(kuyrukBas, kaynak.boy);
  const kv = new DataView(kuyruk.buffer, kuyruk.byteOffset, kuyruk.byteLength);
  let son = -1;
  for (let i = kuyruk.length - 22; i >= 0; i--) {
    if (kv.getUint32(i, true) === 0x06054b50) { son = i; break; }
  }
  if (son < 0) throw new Error('Dosya bir yedek paketi değil ya da bozuk.');
  let sayi = kv.getUint16(son + 10, true);
  let merkezBoyu = kv.getUint32(son + 12, true);
  let merkezKonum = kv.getUint32(son + 16, true);
  if (sayi === SINIR16 || merkezBoyu === SINIR32 || merkezKonum === SINIR32) {
    // ZIP64: bulucu kaydı son kaydın hemen önündedir.
    const yerKonum = kuyrukBas + son - 20;
    const yer = await kaynak.oku(yerKonum, yerKonum + 20);
    const yv = new DataView(yer.buffer, yer.byteOffset, yer.byteLength);
    if (yer.length < 20 || yv.getUint32(0, true) !== 0x07064b50) throw new Error('Yedek paketinin içindekiler listesi bozuk.');
    const z64Konum = Number(yv.getBigUint64(8, true));
    const z = await kaynak.oku(z64Konum, z64Konum + 56);
    const zv = new DataView(z.buffer, z.byteOffset, z.byteLength);
    if (z.length < 56 || zv.getUint32(0, true) !== 0x06064b50) throw new Error('Yedek paketinin içindekiler listesi bozuk.');
    sayi = Number(zv.getBigUint64(32, true));
    merkezBoyu = Number(zv.getBigUint64(40, true));
    merkezKonum = Number(zv.getBigUint64(48, true));
  }
  if (merkezKonum + merkezBoyu > kaynak.boy) throw new Error('Yedek paketinin içindekiler listesi bozuk.');
  const merkez = await kaynak.oku(merkezKonum, merkezKonum + merkezBoyu);
  const v = new DataView(merkez.buffer, merkez.byteOffset, merkez.byteLength);
  const girdiler = new Map<string, Girdi>();
  let m = 0;
  for (let n = 0; n < sayi; n++) {
    if (m + 46 > merkez.length || v.getUint32(m, true) !== 0x02014b50) throw new Error('Yedek paketinin içindekiler listesi bozuk.');
    const yontem = v.getUint16(m + 10, true);
    const crc = v.getUint32(m + 16, true);
    let boy = v.getUint32(m + 20, true);
    let hamBoy = v.getUint32(m + 24, true);
    const adBoyu = v.getUint16(m + 28, true);
    const ekBoyu = v.getUint16(m + 30, true);
    const notBoyu = v.getUint16(m + 32, true);
    let yerelKonum = v.getUint32(m + 42, true);
    const ad = new TextDecoder().decode(merkez.subarray(m + 46, m + 46 + adBoyu));
    // ZIP64 ek alanı: yalnızca taşan alanlar, sırasıyla.
    let e = m + 46 + adBoyu;
    const ekSonu = e + ekBoyu;
    while (e + 4 <= ekSonu) {
      const tur = v.getUint16(e, true), uz = v.getUint16(e + 2, true);
      if (tur === 0x0001) {
        let o = e + 4;
        if (hamBoy === SINIR32) { hamBoy = Number(v.getBigUint64(o, true)); o += 8; }
        if (boy === SINIR32) { boy = Number(v.getBigUint64(o, true)); o += 8; }
        if (yerelKonum === SINIR32) { yerelKonum = Number(v.getBigUint64(o, true)); o += 8; }
      }
      e += 4 + uz;
    }
    m += 46 + adBoyu + ekBoyu + notBoyu;
    if (!ad.endsWith('/')) girdiler.set(ad, { ad, yontem, crc, boy, hamBoy, yerelKonum });
  }

  const veriBasi = async (g: Girdi) => {
    const y = await kaynak.oku(g.yerelKonum, g.yerelKonum + 30);
    const yv = new DataView(y.buffer, y.byteOffset, y.byteLength);
    if (y.length < 30 || yv.getUint32(0, true) !== 0x04034b50) throw bozukDosya(g.ad);
    return g.yerelKonum + 30 + yv.getUint16(26, true) + yv.getUint16(28, true);
  };
  const girdi = (ad: string) => {
    const g = girdiler.get(ad);
    if (!g) throw new Error(`Yedek paketinde dosya yok: ${ad}`);
    if (g.yontem !== 0 && g.yontem !== 8) throw new Error(`Yedek paketinde desteklenmeyen sıkıştırma: ${ad}`);
    return g;
  };
  const akis = (ad: string): ReadableStream<Uint8Array> => {
    const g = girdi(ad);
    let crc = 0xffffffff;
    let okunan = 0;
    const denetim = new TransformStream<Uint8Array, Uint8Array>({
      transform(p, c) { crc = crcGuncelle(crc, p); okunan += p.length; c.enqueue(p); },
      flush(c) { if (crcBitir(crc) !== g.crc || okunan !== g.hamBoy) c.error(bozukDosya(ad)); },
    });
    let kaynakAkis: ReadableStream<Uint8Array> | null = null;
    return new ReadableStream<Uint8Array>({
      async start(c) {
        try {
          const bas = await veriBasi(g);
          if (bas + g.boy > kaynak.boy) throw bozukDosya(ad);
          let a = kaynak.akis(bas, bas + g.boy);
          if (g.yontem === 8) a = a.pipeThrough(new DecompressionStream('deflate-raw') as unknown as TransformStream<Uint8Array, Uint8Array>);
          kaynakAkis = a.pipeThrough(denetim);
        } catch (e) { c.error(e); }
      },
      async pull(c) {
        try {
          const r = kaynakAkis!.getReader();
          try {
            const { done, value } = await r.read();
            if (done) c.close(); else c.enqueue(value);
          } finally { r.releaseLock(); }
        } catch { c.error(bozukDosya(ad)); }
      },
    });
  };
  const oku = async (ad: string): Promise<Uint8Array> => {
    const g = girdi(ad);
    const parcalar: Uint8Array[] = [];
    const r = akis(ad).getReader();
    for (;;) {
      const { done, value } = await r.read();
      if (done) break;
      parcalar.push(value);
    }
    if (parcalar.length === 1) return parcalar[0];
    const sonuc = new Uint8Array(g.hamBoy);
    let o = 0;
    for (const p of parcalar) { sonuc.set(p, o); o += p.length; }
    return sonuc;
  };
  async function* satirlar(ad: string): AsyncIterable<string> {
    const r = akis(ad).pipeThrough(new TextDecoderStream() as unknown as TransformStream<Uint8Array, string>).getReader();
    let kalan = '';
    for (;;) {
      const { done, value } = await r.read();
      if (done) break;
      const parca = kalan + value;
      let bas = 0;
      for (let i = parca.indexOf('\n'); i >= 0; i = parca.indexOf('\n', bas)) {
        if (i > bas) yield parca.slice(bas, i);
        bas = i + 1;
      }
      kalan = parca.slice(bas);
    }
    if (kalan) yield kalan;
  }
  return { adlar: [...girdiler.keys()], var: (ad) => girdiler.has(ad), oku, akis, satirlar };
}

/** ZIP'in bütün dosyalarını okur (küçük paketler için). */
export async function zipOku(b: Uint8Array | Blob): Promise<Map<string, Uint8Array>> {
  const z = await zipAc(b);
  const sonuc = new Map<string, Uint8Array>();
  for (const ad of z.adlar) sonuc.set(ad, await z.oku(ad));
  return sonuc;
}
