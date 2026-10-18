// Automerge (TK2) tek yerden yüklenir. "slim" girişi WASM dosyasını ayrı indirir (önbelleğe alınır,
// internetsiz de çalışır); editör bağlayıcısı da aynı girişi kullandığı için tek kopya olur.
export * as A from '@automerge/automerge/slim';
import { initializeWasm, isWasmInitialized } from '@automerge/automerge/slim';

let hazirlik: Promise<void> | null = null;

/** WASM'ı bir kez yükler. Tarayıcıda adres, Node'da dosya baytlarıyla çağrılır. */
export function automergeHazirla(kaynak: string | Uint8Array | (() => Promise<string | Uint8Array>)): Promise<void> {
  if (isWasmInitialized()) return Promise.resolve();
  hazirlik ??= (async () => initializeWasm(typeof kaynak === 'function' ? await kaynak() : kaynak))();
  return hazirlik;
}
