// Veritabanı çalışanı: SQLite WASM, tarayıcının özel dosya alanında, SAH havuzu (TK1).
// Aynı anda tek sekme açabilir; tek sekme kuralı arayüzde Web Locks ile sağlanır (§10.5).
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { IstekAdi } from '../veri/api';
import { Hizmet } from './hizmet';
import { automergeHazirla } from '../alan/automerge';
import automergeWasm from '@automerge/automerge/automerge.wasm?url';

let hizmet: Hizmet | null = null;
let havuz: { getFileCount(): number; getCapacity(): number; addCapacity(n: number): Promise<number> } | null = null;
let hazirlik: Promise<Hizmet> | null = null;

// Arayüzün çağırabildiği istekler; başka hiçbir yöntem dışarıdan çağrılamaz.
const IZINLI: ReadonlySet<IstekAdi> = new Set<IstekAdi>(['baslat', 'evrenler', 'evrenOlustur', 'evrenAdlandir', 'evrenBilgisi', 'islemGunlugu',
  'kayitlar', 'kayit', 'kayitOlustur', 'kayitDegistir', 'kayitListe', 'kayitSil', 'kayitGeriYukle', 'kayitGecmisi',
  'metinAc', 'metinKaydet', 'metinSurumu']);

function kurulumAdi(): string {
  const ua = navigator.userAgent;
  const tarayici = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'Tarayıcı';
  const cihaz = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iPhone' : /Mac/.test(ua) ? 'Mac' : 'Cihaz';
  return `${cihaz} · ${tarayici}`;
}

async function hazirla(): Promise<Hizmet> {
  const [sqlite3] = await Promise.all([sqlite3InitModule(), automergeHazirla(automergeWasm)]);
  const h = await sqlite3.installOpfsSAHPoolVfs({ name: 'dunya-atlasi', directory: '/dunya-atlasi', initialCapacity: 16 });
  havuz = h as never;
  const ac = (ad: string) => new h.OpfsSAHPoolDb(ad);
  return new Hizmet(ac, kurulumAdi(), sqlite3.version.libVersion, (evren, turler, kayitlar) => postMessage({ degisti: { evren, turler, kayitlar } }));
}

onmessage = async (e: MessageEvent<{ no: number; ad: IstekAdi; arg: unknown }>) => {
  const { no, ad, arg } = e.data;
  try {
    hazirlik ??= hazirla();
    hizmet ??= await hazirlik;
    // Her veritabanı dosyası ve günlüğü havuzda bir yer tutar; yeni evren için yer kalsın.
    if (havuz && havuz.getFileCount() + 6 > havuz.getCapacity()) await havuz.addCapacity(16);
    if (!IZINLI.has(ad)) throw new Error('Bilinmeyen istek: ' + ad);
    const fn = (hizmet as unknown as Record<string, (a: unknown) => unknown>)[ad];
    postMessage({ no, sonuc: fn.call(hizmet, arg) });
  } catch (err) {
    postMessage({ no, hata: err instanceof Error ? err.message : String(err) });
  }
};
