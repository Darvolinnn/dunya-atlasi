// İkinci hesap çalışanı (K38, D4): veritabanı çalışanından evrenin kopyasını alır, ağır ve yalnız okuyan istekleri
// onun üzerinde hesaplar. Hiçbir şey yazmaz, dosyaya dokunmaz.
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import automergeWasm from '@automerge/automerge/automerge.wasm?url';
import { automergeHazirla } from '../alan/automerge';
import { AGIR_ISTEKLER, kopyadanHizmet, type HesapKopyasi } from './hesap-kopyasi';
import type { Hizmet } from './hizmet';
import { kullaniciIletisi } from './ileti';

const hazir = Promise.all([sqlite3InitModule(), automergeHazirla(automergeWasm)]).then(([s]) => s);
const kopyalar = new Map<string, { damga: string; hizmet: Hizmet; kapat: () => void }>();

type Gelen = { tur: 'kopya'; kopya: HesapKopyasi } | { tur: 'istek'; no: number; ad: string; arg: { evren: string } };

onmessage = async (e: MessageEvent<Gelen>) => {
  const m = e.data;
  const sqlite3 = await hazir;
  if (m.tur === 'kopya') {
    kopyalar.get(m.kopya.evren)?.kapat();
    kopyalar.delete(m.kopya.evren);
    try { kopyalar.set(m.kopya.evren, { damga: m.kopya.damga, ...kopyadanHizmet(sqlite3, m.kopya) }); } catch { /* istek gelince hata döner */ }
    return;
  }
  try {
    if (!AGIR_ISTEKLER.has(m.ad as never)) throw new Error('Bilinmeyen istek: ' + m.ad);
    const k = kopyalar.get(m.arg?.evren);
    if (!k) throw new Error('Evrenin kopyası hazır değil.');
    const sonuc = await (k.hizmet as unknown as Record<string, (a: unknown) => unknown>)[m.ad].call(k.hizmet, m.arg);
    postMessage({ no: m.no, sonuc });
  } catch (err) {
    postMessage({ no: m.no, hata: kullaniciIletisi(err) });
  }
};
