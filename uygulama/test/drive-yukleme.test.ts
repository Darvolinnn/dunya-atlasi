import { describe, it, expect } from 'vitest';
import { DriveTasiyici, type YuklemeOturumlari, type YuklemeIlerlemesi } from '../src/calisan/drive';

const K = 256 * 1024;

/** Sürdürülebilir yüklemeyi taklit eden sahte Drive; `kes` true dönerse parçanın yarısı ulaşır ve bağlantı kopar. */
function sahteDrive(kes: (parcaNo: number) => boolean = () => false) {
  const d = { oturumlar: 0, parcalar: 0, gonderilenBayt: 0, alinan: new Map<string, Uint8Array>(), toplam: new Map<string, number>(), biten: new Map<string, Uint8Array>() };
  const durum = (adres: string) => {
    const a = d.alinan.get(adres)!;
    if (a.length === d.toplam.get(adres)) { d.biten.set(adres, a); return new Response(JSON.stringify({ id: 'D1', name: 'harita', appProperties: {} }), { status: 200 }); }
    return new Response(null, { status: 308, headers: a.length ? { Range: `bytes=0-${a.length - 1}` } : {} });
  };
  const getir = (async (url: string, ayar: RequestInit = {}) => {
    if (url.includes('uploadType=resumable')) {
      const adres = `https://yukleme/${++d.oturumlar}`;
      d.alinan.set(adres, new Uint8Array(0));
      d.toplam.set(adres, Number((ayar.headers as Record<string, string>)['X-Upload-Content-Length']));
      return new Response(null, { status: 200, headers: { Location: adres } });
    }
    const adres = url;
    if (!d.alinan.has(adres)) return new Response(null, { status: 404 });
    const aralik = (ayar.headers as Record<string, string>)['Content-Range'];
    if (aralik.startsWith('bytes */')) return durum(adres);
    const [, bas] = /bytes (\d+)-(\d+)\//.exec(aralik)!;
    const govde = ayar.body as Uint8Array;
    expect(Number(bas)).toBe(d.alinan.get(adres)!.length); // kaldığı yerden
    const no = ++d.parcalar;
    const ulasan = kes(no) ? govde.subarray(0, govde.length / 2) : govde;
    d.gonderilenBayt += govde.length;
    const a = d.alinan.get(adres)!;
    const yeni = new Uint8Array(a.length + ulasan.length); yeni.set(a); yeni.set(ulasan, a.length);
    d.alinan.set(adres, yeni);
    if (ulasan !== govde) throw new TypeError('bağlantı koptu');
    return durum(adres);
  }) as unknown as typeof fetch;
  return { d, getir };
}

const depo = (): YuklemeOturumlari & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return { m, oku: (k) => m.get(k) ?? null, yaz: (k, v) => { m.set(k, v); }, sil: (k) => { m.delete(k); } };
};
const veri = (n: number, tohum = 1) => { const v = new Uint8Array(n); for (let i = 0; i < n; i++) v[i] = (i * 31 + tohum) % 251; return v; };
const ayni = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);
const tasiyici = (getir: typeof fetch, oturumlar?: YuklemeOturumlari, ilerleme?: (i: YuklemeIlerlemesi | null) => void) =>
  new DriveTasiyici('jeton', Date.now() + 3600_000, 'appDataFolder', { fetch: getir, oturumlar, ilerleme, parca: K, buyuk: K, bekleme: 0 });

describe('Drive: büyük dosyada kaldığı yerden yükleme (TK5)', () => {
  it('parça parça gönderir; bağlantı koparsa ulaşan kısmı yeniden göndermeden sürer', async () => {
    const { d, getir } = sahteDrive((no) => no === 3);
    const v = veri(5 * K);
    const ilerleme: (number | null)[] = [];
    const f = await tasiyici(getir, depo(), (i) => ilerleme.push(i && i.gonderilen)).yukle('harita', {}, v);
    expect(f.id).toBe('D1');
    expect(d.oturumlar).toBe(1);
    expect(ayni([...d.biten.values()][0], v)).toBe(true);
    expect(d.gonderilenBayt).toBe(5 * K + K / 2); // yalnız kopan parçanın ulaşmayan yarısı yeniden gitti
    expect(ilerleme.at(-1)).toBeNull();
    expect(ilerleme).toContain(2.5 * K);
  });

  it('program kapanıp açılınca kaydedilmiş adresten sürer; bitince adres silinir', async () => {
    const { d, getir } = sahteDrive((no) => no >= 2 && no <= 7);
    const o = depo();
    const v = veri(4 * K);
    await expect(tasiyici(getir, o).yukle('harita', {}, v)).rejects.toThrow(/kaldığı yerden/);
    expect(o.m.size).toBe(1);
    const once = d.gonderilenBayt;
    await tasiyici(getir, o).yukle('harita', {}, v);
    expect(d.oturumlar).toBe(1);
    expect(ayni([...d.biten.values()][0], v)).toBe(true);
    expect(d.gonderilenBayt - once).toBeLessThan(3 * K);
    expect(o.m.size).toBe(0);
  });

  it('aynı adla farklı içerik yarım yüklemeyi sürdürmez; geçersiz adres yeni yüklemeyle değişir', async () => {
    const { d, getir } = sahteDrive((no) => no >= 2 && no <= 7);
    const o = depo();
    await expect(tasiyici(getir, o).yukle('harita', {}, veri(4 * K))).rejects.toThrow();
    const yeni = veri(4 * K, 7);
    await tasiyici(getir, o).yukle('harita', {}, yeni);
    expect(d.oturumlar).toBe(2);
    // Drive'ın unuttuğu adres: sorulunca bulunamaz, kayıt silinir ve yeni yükleme başlar.
    const { d: d2, getir: g2 } = sahteDrive();
    const o2 = depo();
    const v = veri(2 * K, 3);
    await expect(tasiyici(getir, o2).yukle('harita', {}, v)).resolves.toBeTruthy();
    const anahtar = [...o2.m.keys()][0] ?? null;
    expect(anahtar).toBeNull();
    for (const [k, x] of o.m) o2.m.set(k, x);
    o2.m.set([...o.m.keys()][0] ?? 'yok', JSON.stringify({ adres: 'https://yukleme/unutulan', zaman: Date.now() }));
    await tasiyici(g2, o2).yukle('harita', {}, veri(4 * K));
    expect(d2.oturumlar).toBe(1);
  });

  it('bağlantı kesilince yükleme durur; adres saklı kalır, sonra kaldığı yerden sürer', async () => {
    let t: DriveTasiyici;
    const { d, getir } = sahteDrive((no) => { if (no === 2) t.iptal(); return no === 2; });
    const o = depo();
    const v = veri(4 * K);
    t = tasiyici(getir, o);
    await expect(t.yukle('harita', {}, v)).rejects.toThrow('Drive bağlantısı kesildi.');
    expect(o.m.size).toBe(1);
    await tasiyici(getir, o).yukle('harita', {}, v);
    expect(d.oturumlar).toBe(1);
    expect(ayni([...d.biten.values()][0], v)).toBe(true);
  });
});
