// İkinci hesap çalışanı için evrenin salt okunur kopyası (K38, D4; §15 "bekleyen hesap metnin kaydını geciktirmez").
// Ağır ve yalnız okuyan hesaplar evrenin o anki kopyası üzerinde ayrı çalışanda yürür; asıl çalışan bu sırada metin
// kaydına ve öbür isteklere bakar. Kopya yalnız evren değişince (işlem sayısı ya da son işlem) yenilenir.
import type { Database } from '@sqlite.org/sqlite-wasm';
import type sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { Hizmet } from './hizmet';
import type { IstekAdi } from '../veri/api';

type Sqlite3 = Awaited<ReturnType<typeof sqlite3InitModule>>;

/** Ayrı çalışanda yürüyen istekler: yalnız okurlar, sonuçları kopyadan hesaplanabilir. */
export const AGIR_ISTEKLER: ReadonlySet<IstekAdi> = new Set<IstekAdi>([
  'denetimler', 'sozlukDenetle', 'saglikTaramasi', 'olcekliOlcum', 'olcekliKonturlar', 'haberYayilimi', 'enKisaRota',
]);

export interface HesapKopyasi { evren: string; damga: string; evrenVeri: Uint8Array; kurulumVeri: Uint8Array }

/** Evrenin değişip değişmediğini söyleyen damga; ana evren değilse (sürüm, deneme kopyası) null: hesap yerinde yapılır. */
export function kopyaDamgasi(v: { evren: Database } | null): string | null {
  if (!v) return null;
  const r = v.evren.selectObject('SELECT count(*) n, max(no) s FROM islemler');
  return `${Number(r?.n ?? 0)}:${Number(r?.s ?? 0)}`;
}

export function kopyaAl(sqlite3: Sqlite3, evren: string, v: { evren: Database; kurulum: Database }, damga: string): HesapKopyasi {
  return { evren, damga, evrenVeri: sqlite3.capi.sqlite3_js_db_export(v.evren), kurulumVeri: sqlite3.capi.sqlite3_js_db_export(v.kurulum) };
}

function bellekteAc(sqlite3: Sqlite3, veri: Uint8Array): Database {
  const db = new sqlite3.oo1.DB(':memory:');
  const p = sqlite3.wasm.allocFromTypedArray(veri);
  const c = sqlite3.capi;
  db.checkRc(c.sqlite3_deserialize(db.pointer!, 'main', p, veri.byteLength, veri.byteLength, c.SQLITE_DESERIALIZE_FREEONCLOSE | c.SQLITE_DESERIALIZE_RESIZEABLE));
  return db;
}

/** Kopyadan, yalnız o evreni gören bir hizmet kurar. */
export function kopyadanHizmet(sqlite3: Sqlite3, k: HesapKopyasi): { hizmet: Hizmet; kapat: () => void } {
  const evrenDb = bellekteAc(sqlite3, k.evrenVeri);
  const kurulumDb = bellekteAc(sqlite3, k.kurulumVeri);
  const acilan: Database[] = [evrenDb, kurulumDb];
  const ac = (ad: string) => {
    if (ad === '/kurulum.db') return kurulumDb;
    if (ad === `/evren-${k.evren}.db`) return evrenDb;
    const d = new sqlite3.oo1.DB(':memory:'); acilan.push(d); return d;
  };
  const hizmet = new Hizmet(ac, 'Hesap', sqlite3.version.libVersion);
  return { hizmet, kapat: () => { for (const d of acilan) { try { d.close(); } catch { /* zaten kapalı */ } } } };
}
