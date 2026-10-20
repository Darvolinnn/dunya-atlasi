// Son çalışmanın özeti (Genel bakış, K28 T7): evreni yeniden açan yazar nerede kaldığını hatırlasın diye son
// çalışma oturumunda neler yapıldığı. Oturum, aralarında iki saatten uzun boşluk olmayan son işlemlerdir.
// Yalnızca işlem günlüğü okunur; metnin içeriğinden anlam çıkarılmaz (K1).
import { gizliAdimMi } from '../alan/islem-metni';
import type { KisaKayit, SonCalisma } from '../veri/api';
import type { EvrenVt } from './evren-vt';

export const OTURUM_ARASI = 2 * 60 * 60 * 1000;
const OKUNACAK = 5000;

const kayitKodu = (tur: string, v: Record<string, unknown>): string | null =>
  typeof v.kayit === 'string' ? v.kayit : typeof v.kod === 'string' && tur.startsWith('kayit_') ? v.kod
    : typeof v.a === 'string' && tur.startsWith('iliski_') ? v.a : null;

export function sonCalisma(e: EvrenVt): SonCalisma | null {
  const satirlar = e.db.selectObjects(`SELECT zaman, tur, veri FROM islemler ORDER BY zaman DESC, no DESC LIMIT ${OKUNACAK}`);
  const oturum: { zaman: number; tur: string; veri: Record<string, unknown> }[] = [];
  for (const s of satirlar) {
    const zaman = Number(s.zaman);
    if (oturum.length && oturum[oturum.length - 1].zaman - zaman > OTURUM_ARASI) break;
    const veri = JSON.parse(s.veri as string) as Record<string, unknown>;
    if (gizliAdimMi(s.tur as string, veri)) continue;
    oturum.push({ zaman, tur: s.tur as string, veri });
  }
  if (!oturum.length) return null;

  const olusan: string[] = [], yazilan: string[] = [], degisen: string[] = [];
  let silinen = 0;
  const ekle = (l: string[], k: string) => { if (!l.includes(k)) l.push(k); };
  for (const i of oturum) {
    const k = kayitKodu(i.tur, i.veri);
    if (i.tur === 'kayit_sil') silinen++;
    if (!k) continue;
    if (i.tur === 'kayit_olustur') ekle(olusan, k);
    else if (i.tur === 'metin') ekle(yazilan, k);
    else if (i.tur !== 'kayit_sil') ekle(degisen, k);
  }
  const kayitlar = new Map<string, KisaKayit & { silindi: boolean }>();
  const kodlar = [...new Set([...olusan, ...yazilan, ...degisen])];
  for (let n = 0; n < kodlar.length; n += 500) {
    const parca = kodlar.slice(n, n + 500);
    for (const r of e.db.selectObjects(`SELECT kod, ad, tur, silindi FROM kayitlar WHERE kod IN (${parca.map(() => '?').join(',')})`, parca)) {
      kayitlar.set(r.kod as string, { kod: r.kod as string, ad: r.ad as string, tur: r.tur as string, silindi: r.silindi != null });
    }
  }
  const yasayan = (l: string[]) => l.map((k) => kayitlar.get(k)).filter((k): k is KisaKayit & { silindi: boolean } => !!k && !k.silindi)
    .map(({ kod, ad, tur }) => ({ kod, ad, tur }));
  return {
    bas: oturum[oturum.length - 1].zaman,
    son: oturum[0].zaman,
    degisiklikSayisi: oturum.length,
    olusturulan: yasayan(olusan.filter((k) => !yazilan.includes(k))),
    yazilan: yasayan(yazilan),
    degistirilen: yasayan(degisen.filter((k) => !olusan.includes(k) && !yazilan.includes(k))),
    silinen,
  };
}
