// Örnek evren (§5.10, K28): uydurma "Hatıra İmparatorluğu" ayrı bir evren olarak kurulur; ekranlar dolu görünsün.
import { describe, it, expect, beforeAll } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { Hizmet } from '../src/calisan/hizmet';
import { BellekDeposu, type GorselIsleyici } from '../src/calisan/medya';
import { ORNEK_EVREN_ADI } from '../src/calisan/ornek-evren';

let sqlite3: Awaited<ReturnType<typeof sqlite3InitModule>>;
beforeAll(async () => { sqlite3 = await sqlite3InitModule(); });
const isleyici: GorselIsleyici = async (veri, tur) => ({ veri, tur, en: 800, boy: 500, onizleme: new Uint8Array([7]) });

describe('örnek evren (K28)', () => {
  it('ayrı evren; seri, kitaplar, sahneler, bağlantılar, takvim, harita, sorular ve notlar', async () => {
    const dosyalar = new Map<string, Database>();
    const h = new Hizmet((d) => { let x = dosyalar.get(d); if (!x) { x = new sqlite3.oo1.DB(':memory:'); dosyalar.set(d, x); } return x; }, 'Deneme', 'x', () => {}, new BellekDeposu(), isleyici);
    const { kod: kendi } = h.evrenOlustur({ ad: 'Benim evrenim' });
    const { kod: evren } = await h.ornekEvrenKur();
    expect(evren).not.toBe(kendi);
    expect(h.kayitlar({ evren: kendi })).toEqual([]);
    const bilgi = h.evrenBilgisi({ evren });
    expect(bilgi).toMatchObject({ ad: ORNEK_EVREN_ADI, kurguTuru: 'fantastik' });
    const kayitlar = h.kayitlar({ evren });
    const kod = (ad: string) => kayitlar.find((k) => k.ad === ad)!.kod;

    const seri = h.seriPlani({ evren, seri: kod('Hatıra İmparatorluğu') });
    expect(seri.kitaplar.map((k) => k.ad)).toEqual(['Unutulanlar', 'Hatırlayanlar', 'İlk Vergi']);
    expect(seri.finaller).toHaveLength(2);
    expect(seri.okumaYollari.map((y) => y.ad)).toEqual(['Yayın sırası', 'Kronoloji']);

    const o = h.olayOrgusu({ evren, kapsam: kod('Unutulanlar') });
    expect(o.sutunlar.map((s) => s.ad)).toEqual(['Arşiv', 'Başkâtip', 'Kaçakçılar', 'Mühür']);
    expect(o.sutunlar.every((s) => s.metinVar)).toBe(true);
    expect(o.hatlar.map((x) => x.hat.ad).sort()).toEqual(["Deniz'in izi", "Divan'ın sırrı"]);
    expect(o.sorular.length).toBeGreaterThan(0);

    // Sahne metnindeki [[bağlantılar]] kayıtlara gider: Lale'yi ananlar arasında Arşiv sahnesi var.
    const lale = kod('Lale');
    expect(h.baglananlar({ evren, kod: lale }).map((x) => x.ad)).toContain('Arşiv');
    // Takvim ve tarihler.
    expect(h.takvim({ evren }).ad).toBe('D.Y.');
    expect(h.kayit({ evren, kod: kod('İsyan') }).tarih?.eksen).not.toBeNull();
    // Harita, işaretler ve rotalar.
    const [harita] = h.haritalar({ evren });
    expect(harita).toMatchObject({ ad: 'Başkent planı', isaretSayisi: 3 });
    // Notlar ve karar bekleyen.
    expect(h.notPanosu({ evren }).map((n) => n.notDurumu).sort()).toEqual(['fikir', 'gelisiyor', 'kontrol']);
    expect(h.meseleler({ evren }).meseleler.map((m) => m.ad)).toContain('İsyan neden silindi?');
    // Pusula: üç cevaplı soru.
    expect(h.evrenSorulari({ evren }).find((s) => s.kod === 'pusula')!.sorular.filter((q) => q.cevap?.durum === 'cevaplandi')).toHaveLength(3);
  });
});
