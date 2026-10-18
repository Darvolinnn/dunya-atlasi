// Etki analizi (§9.2): bir olayın tarihi ya da katılımcıları değişince rapor üç grubu ayırır:
// 1) doğrudan hesapla değişenler (olaya bağlı durum sınırları, yaşlar, sahne olayının tarihi),
// 2) tanımlı bir bağımlılık yüzünden incelenmesi gerekenler (neden–sonuç bağları, olayı anlatan sahneler),
// 3) yalnızca o kayıttan bahseden metinler (bilgi olarak; incelemeye açılmaz, §9.3).
// Yalnızca açık bağlara dayanır; metinden anlam çıkarılmaz (K1). Bağımlılık hesabı izdüşümde de kullanıldığı için
// yalnızca veritabanına dayanır.
import type { Database } from '@sqlite.org/sqlite-wasm';
import { iliskiTuruBul } from '../alan/iliski-turleri';

/** Neden–sonuç bağları (§4.5): a → b. */
export const NEDEN_TURLERI = ['neden', 'kolaylastirdi', 'engelledi', 'tepki'];

export interface EtkiSatiri { kod: string; ad: string; tur: string; aciklama: string }
export interface Bagimlilar { hesap: EtkiSatiri[]; bagimli: EtkiSatiri[]; bahseden: EtkiSatiri[] }

const ad = (db: Database, kod: string) => db.selectObject('SELECT kod, ad, tur FROM kayitlar WHERE kod=? AND silindi IS NULL', [kod]) as { kod: string; ad: string; tur: string } | undefined;

export function bagimlilar(db: Database, kod: string): Bagimlilar {
  const hesap: EtkiSatiri[] = [], bagimli: EtkiSatiri[] = [], bahseden: EtkiSatiri[] = [];
  const kendi = ad(db, kod);
  const benAdi = kendi?.ad ?? '';
  // 1. Doğrudan hesap
  for (const r of db.selectObjects(`SELECT d.konu, d.ozellik, d.baslangic, d.bitis FROM durumlar d JOIN kayitlar k ON k.kod=d.konu
      WHERE d.silindi IS NULL AND k.silindi IS NULL AND (d.baslangic LIKE ? OR d.bitis LIKE ?)`, [`%"olay":"${kod}"%`, `%"olay":"${kod}"%`])) {
    const k = ad(db, r.konu as string);
    if (!k) continue;
    const bas = String(r.baslangic ?? '').includes(kod), bit = String(r.bitis ?? '').includes(kod);
    hesap.push({ ...k, aciklama: `“${r.ozellik}” durumunun ${bas && bit ? 'başlangıcı ve bitişi' : bas ? 'başlangıcı' : 'bitişi'} bu olaya bağlı; kendiliğinden kayar.` });
  }
  for (const r of db.selectObjects(`SELECT i.a FROM iliskiler i JOIN alan_degerleri v ON v.kayit=i.a AND v.alan='dogum'
      WHERE i.tur IN ('olayda','sahnede') AND i.b=? AND i.silindi IS NULL`, [kod])) {
    const k = ad(db, r.a as string);
    if (k) hesap.push({ ...k, aciklama: 'Doğum tarihi biliniyor; buradaki yaşı yeniden hesaplanır.' });
  }
  for (const r of db.selectObjects(`SELECT kod FROM kayitlar WHERE silindi IS NULL AND kod!=? AND json_extract(tarih,'$.bicim')='goreli' AND tarih LIKE ?`, [kod, `%"olay":"${kod}"%`])) {
    const k = ad(db, r.kod as string);
    if (k) hesap.push({ ...k, aciklama: 'Tarihi bu kayda göre verilmiş; olası yeri kendiliğinden yeniden hesaplanır.' });
  }
  const so = db.selectValue('SELECT sahne_olayi FROM kayitlar WHERE kod=?', [kod]) as string | null | undefined;
  if (so) { const k = ad(db, so); if (k) hesap.push({ ...k, aciklama: 'Sahne olayının tarihi sahneden gelir.' }); }

  // 2. Tanımlı bağımlılıklar
  for (const r of db.selectObjects(`SELECT tur, a, b FROM iliskiler WHERE silindi IS NULL AND karar!='vazgecildi' AND tur IN (${NEDEN_TURLERI.map(() => '?').join(',')}) AND (a=? OR b=?)`,
    [...NEDEN_TURLERI, kod, kod])) {
    const oteki = r.a === kod ? (r.b as string) : (r.a as string);
    const k = ad(db, oteki);
    if (!k || oteki === kod) continue;
    const t = iliskiTuruBul(r.tur as string);
    const [x, y] = r.a === kod ? [benAdi, k.ad] : [k.ad, benAdi];
    bagimli.push({ ...k, aciklama: `${x} → ${y}: ${t.aIcin.toLocaleLowerCase('tr-TR')}.` });
  }
  for (const r of db.selectObjects(`SELECT a, b FROM iliskiler WHERE silindi IS NULL AND tur='anlatir' AND (a=? OR b=?)`, [kod, kod])) {
    const oteki = r.a === kod ? (r.b as string) : (r.a as string);
    const k = ad(db, oteki);
    if (!k) continue;
    bagimli.push({ ...k, aciklama: r.a === kod ? 'Bu sahnenin anlattığı olay.' : 'Bu olayı anlatan sahne; tarihleri birbirini tutmalı.' });
  }
  const tekil = (l: EtkiSatiri[]) => l.filter((x, i) => l.findIndex((y) => y.kod === x.kod && y.aciklama === x.aciklama) === i);

  // 3. Yalnızca bahsedenler
  for (const r of db.selectObjects(`SELECT DISTINCT b.kaynak FROM baglantilar b JOIN kayitlar k ON k.kod=b.kaynak WHERE b.hedef=? AND b.kaynak!=? AND k.silindi IS NULL`, [kod, kod])) {
    const k = ad(db, r.kaynak as string);
    if (k) bahseden.push({ ...k, aciklama: 'Metninde bu kayda bağlantı var.' });
  }
  return { hesap: tekil(hesap), bagimli: tekil(bagimli), bahseden };
}

/** İzdüşüm: bir değişiklik bağımlı kayıtlar için inceleme açar (yalnızca 2. grup, §9.3). */
export function etkiAc(db: Database, islem: string, zaman: number, kaynak: string, degisim: 'tarih' | 'katilimci', once: string | null, sonra: string | null) {
  for (const b of bagimlilar(db, kaynak).bagimli) {
    db.exec({
      sql: `INSERT OR REPLACE INTO etki_incelemeleri(anahtar, kaynak, hedef, islem, degisim, once, sonra, aciklama, zaman) VALUES(?,?,?,?,?,?,?,?,?)`,
      bind: [`etki:${kaynak}:${b.kod}`, kaynak, b.kod, islem, degisim, once, sonra, b.aciklama, zaman],
    });
  }
}
