// İşlemlerin dosyaya yazılması (eşitleme parçası, anlık görüntü, yedek): ikili yükler base64 olur,
// eşitleme dosyaları gzip ile sıkıştırılır. Tarayıcının kendi sıkıştırma akışı kullanılır.
//
// Çok büyük evrende (yıllarca kullanım, yüz binlerce değişiklik) işlem dosyası tek bir metin olarak kurulamaz:
// tarayıcıda bir metnin boyu sınırlıdır. İşlem dosyaları bu yüzden parça parça yazılır ve okunur. Biçim yine
// geçerli JSON'dur (eski sürümler okuyabilir): başlık bir satırda, her değişiklik kendi satırında.
import type { Islem } from './islem';

export function b64(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}
export function b64Coz(s: string): Uint8Array {
  const ham = atob(s);
  const b = new Uint8Array(ham.length);
  for (let i = 0; i < ham.length; i++) b[i] = ham.charCodeAt(i);
  return b;
}

async function akis(veri: Uint8Array, a: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  return new Uint8Array(await new Response(new Blob([veri as BlobPart]).stream().pipeThrough(a)).arrayBuffer());
}
export const sikistir = (v: Uint8Array) => akis(v, new CompressionStream('gzip'));
export const sikistirmaAc = (v: Uint8Array) => akis(v, new DecompressionStream('gzip'));

export const islemSatiri = (i: Islem) => ({ ...i, ikili: i.ikili ? b64(i.ikili) : null });
export const satirdanIslem = (x: Record<string, unknown>): Islem => ({ ...(x as unknown as Islem), ikili: typeof x.ikili === 'string' ? b64Coz(x.ikili) : null });

/** Nesneyi sıkıştırılmış JSON olarak kodlar. */
export async function jsonPaketle(x: unknown): Promise<Uint8Array> {
  return sikistir(new TextEncoder().encode(JSON.stringify(x)));
}
export async function jsonAc<T>(v: Uint8Array): Promise<T> {
  return JSON.parse(new TextDecoder().decode(await sikistirmaAc(v))) as T;
}

/** Parçaları akışla sıkıştırır; ham hâlin tamamı hiçbir an bellekte durmaz. */
async function parcaliSikistir(kaynak: Iterable<Uint8Array> | AsyncIterable<Uint8Array>): Promise<Uint8Array> {
  const cs = new CompressionStream('gzip');
  const yazici = cs.writable.getWriter();
  const cikis: Uint8Array[] = [];
  let boy = 0;
  const okuma = (async () => {
    const r = cs.readable.getReader();
    for (;;) {
      const { done, value } = await r.read();
      if (done) return;
      cikis.push(value);
      boy += value.length;
    }
  })();
  try {
    for await (const p of kaynak) if (p.length) await yazici.write(p as unknown as BufferSource);
    await yazici.close();
  } catch (e) { void yazici.abort(e).catch(() => {}); await okuma.catch(() => {}); throw e; }
  await okuma;
  const sonuc = new Uint8Array(boy);
  let o = 0;
  for (const p of cikis) { sonuc.set(p, o); o += p.length; }
  return sonuc;
}

/**
 * İşlem dosyasını (eşitleme parçası, anlık görüntü) sayfa sayfa yazar: `{başlık…,"islemler":[` bir satırda, her
 * işlem kendi satırında, sonunda `]}`. Başlıkta `islemler` alanı olmamalı.
 */
export async function islemDosyasiYaz(baslik: Record<string, unknown>, sayfalar: Iterable<Islem[]>): Promise<Uint8Array> {
  const kodla = new TextEncoder();
  const bas = JSON.stringify(baslik);
  function* parcalar() {
    yield kodla.encode(`${bas.slice(0, -1)}${bas.length > 2 ? ',' : ''}"islemler":[\n`);
    let ilk = true;
    for (const sayfa of sayfalar) {
      let s = '';
      for (const i of sayfa) { s += (ilk ? '' : ',\n') + JSON.stringify(islemSatiri(i)); ilk = false; }
      yield kodla.encode(s);
    }
    yield kodla.encode('\n]}');
  }
  return parcaliSikistir(parcalar());
}

const SATIR_BASLIGI = '"islemler":[';

/**
 * İşlem dosyasını parça parça okur. `her` verilirse işlemler `parti` büyüklüğünde gruplar hâlinde ona verilir ve
 * bellekte birikmez; verilmezse hepsi döner. `basliktan` işlemlerden önce başlıkla çağrılır (ör. sürüm denetimi).
 * Eski sürümlerin tek satırlık dosyalarını da okur. Yarım ya da bozuk dosyada hata verir.
 */
export async function islemDosyasiOku(
  v: Uint8Array,
  secenek: { her?: (islemler: Islem[]) => void; parti?: number; basliktan?: (baslik: Record<string, unknown>) => void } = {},
): Promise<{ baslik: Record<string, unknown>; islemler: Islem[] }> {
  const { her, parti = 5000, basliktan } = secenek;
  const hepsi: Islem[] = [];
  let birikim: Islem[] = [];
  const ver = (i: Islem) => {
    if (!her) { hepsi.push(i); return; }
    birikim.push(i);
    if (birikim.length >= parti) { const b = birikim; birikim = []; her(b); }
  };
  const r = new Blob([v as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))
    .pipeThrough(new TextDecoderStream() as unknown as TransformStream<Uint8Array, string>).getReader();
  let baslik: Record<string, unknown> | null = null;
  let tekSatir: string[] | null = null; // eski biçim: bütün dosya tek satır
  let bitti = false;
  let kalan = '';
  const satir = (s: string) => {
    if (bitti) { if (s.trim()) throw new Error('İşlem dosyası bozuk.'); return; }
    if (!baslik) {
      if (!s.endsWith(SATIR_BASLIGI)) throw new Error('İşlem dosyası bozuk.');
      baslik = JSON.parse(s.slice(0, -SATIR_BASLIGI.length).replace(/,$/, '') + '}') as Record<string, unknown>;
      basliktan?.(baslik);
      return;
    }
    if (!s) return;
    if (s === ']}') { bitti = true; return; }
    ver(satirdanIslem(JSON.parse(s.endsWith(',') ? s.slice(0, -1) : s)));
  };
  for (;;) {
    const { done, value } = await r.read();
    if (done) break;
    if (tekSatir) { tekSatir.push(value); continue; }
    const parca = kalan + value;
    let bas = 0;
    for (let i = parca.indexOf('\n'); i >= 0; i = parca.indexOf('\n', bas)) {
      satir(parca.slice(bas, i));
      bas = i + 1;
    }
    kalan = parca.slice(bas);
    // İlk satır hâlâ bitmediyse ve başlığa benzemiyorsa eski biçimdir: kalan her şey birlikte okunur.
    if (!baslik && kalan.length > 1 << 20 && !kalan.includes(SATIR_BASLIGI + '\n')) { tekSatir = [kalan]; kalan = ''; }
  }
  if (tekSatir || (!baslik && kalan)) {
    const x = JSON.parse(tekSatir ? tekSatir.join('') : kalan) as Record<string, unknown>;
    const { islemler, ...b } = x;
    if (!Array.isArray(islemler)) throw new Error('İşlem dosyası bozuk.');
    basliktan?.(b);
    for (const i of islemler) ver(satirdanIslem(i as Record<string, unknown>));
    baslik = b;
    bitti = true;
  } else if (kalan) satir(kalan);
  if (!baslik || !bitti) throw new Error('İşlem dosyası yarım.');
  if (her && birikim.length) her(birikim);
  return { baslik, islemler: hepsi };
}
