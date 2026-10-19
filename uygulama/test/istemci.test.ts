import { describe, it, expect } from 'vitest';
import { CALISAN_HATASI, ILETI_HATASI, Istemci, type CalisanBenzeri } from '../src/veri/istemci';

const sahte = () => {
  const c: CalisanBenzeri & { giden: { no: number }[] } = {
    giden: [], onmessage: null, onerror: null, onmessageerror: null,
    postMessage(m) { c.giden.push(m as { no: number }); },
  };
  return c;
};

describe('veritabanı istemcisi: çalışan hatası', () => {
  it('normal yanıt isteği sonuçlandırır', async () => {
    const c = sahte();
    const i = new Istemci(c);
    const p = i.iste('baslat');
    c.onmessage!({ data: { no: c.giden[0].no, sonuc: 'tamam' } } as MessageEvent);
    expect(await p).toBe('tamam');
  });

  it('çalışan yüklenemezse bekleyen istek hatayla biter, sonrakiler beklemeden reddedilir', async () => {
    const c = sahte();
    const i = new Istemci(c);
    const p = i.iste('baslat');
    c.onerror!({} as ErrorEvent);
    await expect(p).rejects.toThrow(CALISAN_HATASI);
    await expect(i.iste('baslat')).rejects.toThrow(CALISAN_HATASI);
    expect(c.giden.length).toBe(1);
  });

  it('okunamayan yanıt bekleyenleri hatayla bitirir; çalışan kullanılmaya devam eder', async () => {
    const c = sahte();
    const i = new Istemci(c);
    const p = i.iste('baslat');
    c.onmessageerror!({} as MessageEvent);
    await expect(p).rejects.toThrow(ILETI_HATASI);
    const q = i.iste('baslat');
    c.onmessage!({ data: { no: c.giden[1].no, sonuc: 1 } } as MessageEvent);
    expect(await q).toBe(1);
  });
});
