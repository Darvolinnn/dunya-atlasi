import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Istemci } from '../src/veri/istemci';
import type { HaritaKunyesi } from '../src/veri/api';

const veri = vi.hoisted(() => ({ kunye: null as HaritaKunyesi | null }));
// Veri yüklenmiş bileşenlerin görünür metni sınanır; tarayıcı ve çalışan gerekmez.
vi.mock('preact/hooks', () => ({
  useState: (ilk: unknown) => [typeof ilk === 'function' ? ilk() : ilk, vi.fn()],
  useEffect: vi.fn(),
}));
vi.mock('../src/arayuz/Anlati', () => ({ useYukle: () => [veri.kunye, vi.fn()] }));
vi.mock('../src/arayuz/KayitBolumleri', () => ({ KayitSec: () => null }));

import { HaritaKunyeBolumu } from '../src/arayuz/HaritaKunye';
import { UyarlamaBolumu } from '../src/arayuz/Uyarlama';

function gorunenMetin(v: unknown): string {
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return v.map(gorunenMetin).join('');
  if (v && typeof v === 'object' && 'props' in v) return gorunenMetin((v as { props: { children?: unknown } }).props.children);
  return '';
}
const istemci = {} as Istemci;
afterEach(() => { veri.kunye = null; });

describe('incelemede bulunan küçük arayüz hataları', () => {
  it('F17 silinen harita yapıcısının teknik kodunu görünen metne sızdırmaz', () => {
    const kod = '01m5a000000000000000000000';
    veri.kunye = { harita: 'harita', haritaAd: 'Çiy Haritası', yapanAd: null, catismali: false,
      tanim: { tarih: '', yapan: kod, amac: '', bilinenHatalar: [] } };
    const metin = gorunenMetin(HaritaKunyeBolumu({ istemci, evren: 'evren', harita: 'harita' }));
    expect(metin).not.toContain(kod);
    expect(metin).toContain('Silinmiş ya da bulunamayan kayıt');
  });

  it('F35 boş uyarlama bölümü tek düğme gösterir', () => {
    const metin = gorunenMetin(UyarlamaBolumu({ istemci, evren: 'evren', eser: 'eser' }));
    expect(metin).toBe('Uyarlama eşlemesi ekle…');
  });
});
