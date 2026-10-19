import { describe, it, expect } from 'vitest';
import { acilistaTaslak, kurtarmaAnahtari, taslakAnahtari, taslakOku, taslakYaz, type TaslakDeposu } from '../src/arayuz/taslak';
import type { Spans } from '../src/veri/api';

const depo = (): TaslakDeposu & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return { m, oku: async (k) => m.get(k) ?? null, yaz: async (k, v) => { m.set(k, v); }, sil: async (k) => { m.delete(k); } };
};
const metin = (s: string) => [{ type: 'block', value: { type: 'paragraph', parents: [], attrs: {} } }, { type: 'text', value: s }] as unknown as Spans;

describe('metin kurtarma taslağı (§10.7)', () => {
  const a = taslakAnahtari('E1', 'K1', 'govde');

  it('kayıt yetişmişse taslak sessizce silinir', async () => {
    const d = depo();
    await taslakYaz(d, a, { spans: metin('Kuzeyde'), temel: ['x'], zaman: 1 });
    expect(await acilistaTaslak(d, a, metin('Kuzeyde'))).toBeNull();
    expect(d.m.size).toBe(0);
  });

  it('kaydedilmemiş yazı kurtarma alanına taşınır; yeni yazı onu ezmez; karar verilene kadar her açılışta döner', async () => {
    const d = depo();
    await taslakYaz(d, a, { spans: metin('Kuzeyde doğdu, sonra'), temel: ['x'], zaman: 1 });
    expect((await acilistaTaslak(d, a, metin('Kuzeyde')))?.spans).toEqual(metin('Kuzeyde doğdu, sonra'));
    expect(await taslakOku(d, a)).toBeNull();
    // Bu oturumda yazılan ve kaydı yetişen yazı kurtarma alanına dokunmaz.
    await taslakYaz(d, a, { spans: metin('Kuzeyde!'), temel: ['y'], zaman: 2 });
    expect((await acilistaTaslak(d, a, metin('Kuzeyde!')))?.spans).toEqual(metin('Kuzeyde doğdu, sonra'));
    expect(await taslakOku(d, kurtarmaAnahtari(a))).not.toBeNull();
  });

  it('bozuk taslak yok sayılır; yazılamayan depo hata atmaz', async () => {
    const d = depo();
    await d.yaz(a, '{bozuk');
    expect(await acilistaTaslak(d, a, metin(''))).toBeNull();
    const dolu: TaslakDeposu = { oku: async () => null, yaz: async () => { throw new Error('dolu'); }, sil: async () => {} };
    expect(await taslakYaz(dolu, a, { spans: metin('x'), temel: [], zaman: 1 })).toBe(false);
  });
});
