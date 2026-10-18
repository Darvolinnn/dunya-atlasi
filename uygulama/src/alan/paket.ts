// İşlemlerin dosyaya yazılması (eşitleme parçası, anlık görüntü, yedek): ikili yükler base64 olur,
// eşitleme dosyaları gzip ile sıkıştırılır. Tarayıcının kendi sıkıştırma akışı kullanılır.
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
