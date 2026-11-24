// Pano (K37): serbest tuval. Kayıt kartları, not kâğıtları, yazı, konuşma balonu, şekil, etiketli ok, görsel,
// çıkartma ve kalem. Öğeler sürüklenir, döndürülür, boyutlanır; her değişiklik bırakınca evrene yazılır.
// Ok yalnız panodadır, kayıtlar arasında ilişki kurmaz. Tekerlek ve iki parmak yakınlaştırır, boş yer kaydırır.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { DerlemeOzeti, Tuval, TuvalOgesi, TuvalOgeTuru } from '../veri/api';
import { yeniKod } from '../alan/kod';
import { grupSinifi, turBul } from '../alan/turler';
import { git } from './Uygulama';
import { Gorsel } from './gorsel';
import { BaglantiSecici } from './BaglantiSecici';
import { geriAlinabilir } from './onay';
import { SayfaYardimi } from './SayfaYardimi';
import { TurSecici } from './ortak';

type Arac = 'sec' | 'not' | 'yazi' | 'balon' | 'sekil' | 'ok' | 'kalem';
type Nokta = { x: number; y: number };
type Gorunus = { px: number; py: number; o: number };
type Surukle =
  | { tur: 'kaydir'; bas: Nokta; gor: Gorunus }
  | { tur: 'tasi'; id: string; bas: Nokta; oge: TuvalOgesi; oynadi: boolean }
  | { tur: 'boyut'; id: string; kose: string; oge: TuvalOgesi }
  | { tur: 'dondur'; id: string; oge: TuvalOgesi }
  | { tur: 'ciz'; noktalar: Nokta[] }
  | { tur: 'sil'; idler: Set<string> };

export const TUVAL_RENK_ADLARI: [string, string][] = [['yuzey', 'Sade'], ['sari', 'Sarı'], ['pembe', 'Pembe'], ['yesil', 'Yeşil'], ['mavi', 'Mavi'], ['mor', 'Mor'], ['turuncu', 'Turuncu'], ['krem', 'Krem']];
const CIKARTMALAR = ['⭐', '❓', '❗', '❤️', '🔥', '⚔️', '👑', '🗝️', '📜', '🕯️', '🌙', '☠️', '🏰', '🗡️', '🌿', '👁️'];
const ARACLAR: [Arac, string, string][] = [['sec', 'Seç', 'V'], ['not', 'Not', 'N'], ['yazi', 'Yazı', 'T'], ['balon', 'Balon', 'B'], ['sekil', 'Şekil', 'S'], ['ok', 'Ok', 'O'], ['kalem', 'Kalem', 'P']];
const OGE_ADI: Record<TuvalOgeTuru, string> = { kart: 'Kayıt kartı', not: 'Not', yazi: 'Yazı', balon: 'Balon', sekil: 'Şekil', ok: 'Ok', gorsel: 'Görsel', cikartma: 'Çıkartma', kalem: 'Çizim' };
const VARSAYILAN_BOY: Partial<Record<TuvalOgeTuru, [number, number, string]>> = {
  not: [180, 130, 'sari'], yazi: [240, 44, 'yuzey'], balon: [220, 74, 'krem'], sekil: [220, 140, 'yesil'], kart: [230, 112, 'yuzey'], cikartma: [56, 56, 'yuzey'],
};
const anahtar = (evren: string) => `dunya-atlasi:son-pano:${evren}`;
const oku = (a: string) => { try { return localStorage.getItem(a); } catch { return null; } };
const yazYerel = (a: string, v: string) => { try { localStorage.setItem(a, v); } catch { /* yok */ } };

export function TuvalSayfasi({ istemci, evren, secili }: { istemci: Istemci; evren: string; secili: string | null }) {
  const [liste, setListe] = useState<DerlemeOzeti[] | null>(null);
  const [n, setN] = useState(0);
  const [yeni, setYeni] = useState<string | null>(null);
  const [adDegis, setAdDegis] = useState<string | null>(null);
  const [hata, setHata] = useState('');
  useEffect(() => istemci.dinle((d) => { if (d.evren === evren) setN((x) => x + 1); }), [evren]);
  useEffect(() => { istemci.iste('derlemeler', { evren, tur: 'tuval' }).then(setListe, () => setListe([])); }, [evren, n]);
  const kod = secili && liste?.some((d) => d.kod === secili) ? secili : liste?.find((d) => d.kod === oku(anahtar(evren)))?.kod ?? liste?.[0]?.kod ?? null;
  useEffect(() => { if (kod) yazYerel(anahtar(evren), kod); }, [kod]);
  if (!liste) return <p class="soluk">Açılıyor…</p>;
  const acik = liste.find((d) => d.kod === kod);
  const olustur = (ad: string) => istemci.iste('derlemeOlustur', { evren, tur: 'tuval', ad }).then((x) => { setYeni(null); setHata(''); git(`/e/${evren}/tuval/${x.kod}`); }, (e: Error) => setHata(e.message));
  return (
    <div class="tuval-sayfasi">
      <div class="tuval-ust">
        {liste.length > 0 && (
          <select class="girdi tuval-secici" aria-label="Pano" value={kod ?? ''} onChange={(e) => git(`/e/${evren}/tuval/${(e.target as HTMLSelectElement).value}`)}>
            {liste.map((d) => <option value={d.kod}>{d.ad}</option>)}
          </select>
        )}
        {yeni !== null || adDegis !== null ? (
          <form class="satir" onSubmit={(e) => {
            e.preventDefault();
            if (yeni !== null) void olustur(yeni);
            else if (acik && adDegis !== null) istemci.iste('derlemeAdYaz', { evren, kod: acik.kod, ad: adDegis }).then(() => { setAdDegis(null); setHata(''); }, (x: Error) => setHata(x.message));
          }}>
            <input class="girdi" lang="tr" autoFocus aria-label={yeni !== null ? 'Yeni panonun adı' : 'Panonun adı'} placeholder="Ör. Kayıp kardeş" value={yeni ?? adDegis ?? ''}
              onInput={(e) => { const v = (e.target as HTMLInputElement).value; if (yeni !== null) setYeni(v); else setAdDegis(v); }} />
            <button class="dugme ana kucuk" disabled={!(yeni ?? adDegis ?? '').trim()}>{yeni !== null ? 'Oluştur' : 'Kaydet'}</button>
            <button type="button" class="dugme kucuk" onClick={() => { setYeni(null); setAdDegis(null); }}>Vazgeç</button>
          </form>
        ) : (
          <>
            <button class="dugme kucuk" onClick={() => setYeni('')}>+ Yeni pano</button>
            {acik && <button class="dugme sade kucuk" onClick={() => setAdDegis(acik.ad)}>Adını değiştir</button>}
            {acik && <button class="dugme sade kucuk" onClick={() => void geriAlinabilir(`“${acik.ad}” panosu kaldırıldı.`,
              () => istemci.iste('derlemeSil', { evren, kod: acik.kod }), () => istemci.iste('derlemeSil', { evren, kod: acik.kod, geriYukle: true }))}>Panoyu kaldır</button>}
          </>
        )}
        {hata && <span class="hata kucuk">{hata}</span>}
        <span class="bosluk" />
        <SayfaYardimi sayfa="tuval" />
      </div>
      {kod ? <TuvalAlani key={kod} istemci={istemci} evren={evren} kod={kod} surum={n} />
        : (
          <div class="bos bos-sayfa tuval-bos">
            <h2>İlk panonuzu açın</h2>
            <p class="soluk">Pano serbest bir tuvaldir: kayıt kartlarını, notları, okları, görselleri ve çizimleri istediğiniz yere koyarsınız. Bir sahneyi, bir sırrı ya da bir kuşatmayı düşünmek için kullanın.</p>
            <button class="dugme ana" onClick={() => setYeni('')}>+ Yeni pano</button>
          </div>
        )}
    </div>
  );
}

const sinir = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const dondur = (p: Nokta, aci: number): Nokta => { const r = (aci * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r); return { x: p.x * c - p.y * s, y: p.x * s + p.y * c }; };
const merkez = (o: TuvalOgesi): Nokta => ({ x: o.x + o.g / 2, y: o.y + o.h / 2 });
const oranKorur = (o: TuvalOgesi) => o.tur === 'gorsel' || o.tur === 'cikartma';

function TuvalAlani({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [veri, setVeri] = useState<Tuval | null>(null);
  const [gecici, setGecici] = useState<Map<string, TuvalOgesi>>(new Map());
  const [secim, setSecim] = useState<string | null>(null);
  const [duzenlenen, setDuzenlenen] = useState<string | null>(null);
  const [arac, setArac] = useState<Arac>('sec');
  const [okBas, setOkBas] = useState<string | null>(null);
  const [gor, setGor] = useState<Gorunus>({ px: 40, py: 40, o: 1 });
  const [cizgi, setCizgi] = useState<Nokta[] | null>(null);
  const [secici, setSecici] = useState<{ left: number; top: number } | null>(null);
  const [cikartmaAcik, setCikartmaAcik] = useState(false);
  const [hata, setHata] = useState('');
  const alan = useRef<HTMLDivElement>(null);
  const dosya = useRef<HTMLInputElement>(null);
  const surukle = useRef<Surukle | null>(null);
  const parmaklar = useRef(new Map<number, Nokta>());
  const kalemGoruldu = useRef(false);
  const sikistir = useRef<{ uzaklik: number; gor: Gorunus; orta: Nokta } | null>(null);
  const geri = useRef<{ yaz: TuvalOgesi[]; sil: string[] }[]>([]);
  const ilkSigdir = useRef(true);

  useEffect(() => {
    istemci.iste('tuval', { evren, kod }).then((t) => { setVeri(t); setHata(''); }, (e: Error) => setHata(e.message));
  }, [kod, surum]);

  const ogeler = useMemo(() => (veri?.ogeler ?? []).map((o) => gecici.get(o.id) ?? o).concat([...gecici.values()].filter((g) => !veri?.ogeler.some((o) => o.id === g.id))), [veri, gecici]);
  const harita = useMemo(() => new Map(ogeler.map((o) => [o.id, o])), [ogeler]);
  const enUst = ogeler.reduce((m, o) => Math.max(m, o.sira), 0);
  const enAlt = ogeler.reduce((m, o) => Math.min(m, o.sira), 0);

  const sigdir = () => {
    const el = alan.current; if (!el) return;
    const kutular = ogeler.filter((o) => o.tur !== 'ok');
    if (!kutular.length) { setGor({ px: 40, py: 40, o: 1 }); return; }
    const x0 = Math.min(...kutular.map((o) => o.x)), y0 = Math.min(...kutular.map((o) => o.y));
    const x1 = Math.max(...kutular.map((o) => o.x + o.g)), y1 = Math.max(...kutular.map((o) => o.y + o.h));
    const w = el.clientWidth, h = el.clientHeight - 70;
    const o = sinir(Math.min((w - 80) / Math.max(1, x1 - x0), (h - 80) / Math.max(1, y1 - y0)), 0.2, 1.5);
    setGor({ o, px: (w - (x1 - x0) * o) / 2 - x0 * o, py: (h - (y1 - y0) * o) / 2 - y0 * o });
  };
  useEffect(() => { if (veri && ilkSigdir.current) { ilkSigdir.current = false; if (veri.ogeler.length) sigdir(); } }, [veri]);

  const dunya = (e: { clientX: number; clientY: number }): Nokta => {
    const r = alan.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left - gor.px) / gor.o, y: (e.clientY - r.top - gor.py) / gor.o };
  };
  const gorunenOrta = (): Nokta => {
    const el = alan.current!; return { x: (el.clientWidth / 2 - gor.px) / gor.o, y: (el.clientHeight / 2 - 30 - gor.py) / gor.o };
  };

  // Yazma: önce ekranda, sonra evrene. Her yazım geri alınabilir.
  const kaydet = async (yeniler: TuvalOgesi[], geriKaydi = true) => {
    if (geriKaydi) geri.current.push({ yaz: yeniler.flatMap((o) => { const e = veri?.ogeler.find((x) => x.id === o.id); return e ? [e] : []; }), sil: yeniler.filter((o) => !veri?.ogeler.some((x) => x.id === o.id)).map((o) => o.id) });
    setGecici((g) => { const m = new Map(g); for (const o of yeniler) m.set(o.id, o); return m; });
    try { await istemci.iste('tuvalOgeYaz', { evren, kod, ogeler: yeniler }); setHata(''); }
    catch (e) { setHata((e as Error).message); }
    const t = await istemci.iste('tuval', { evren, kod }).catch(() => null);
    if (t) { setVeri(t); setGecici((g) => { const m = new Map(g); for (const o of yeniler) m.delete(o.id); return m; }); }
  };
  const kaldir = async (idler: string[], geriKaydi = true) => {
    const s = new Set(idler);
    const gidenler = ogeler.filter((o) => s.has(o.id) || (o.tur === 'ok' && (s.has(o.bas!) || s.has(o.son!))));
    if (geriKaydi) geri.current.push({ yaz: gidenler, sil: [] });
    setSecim(null); setDuzenlenen(null);
    setVeri((v) => v && { ...v, ogeler: v.ogeler.filter((o) => !gidenler.some((x) => x.id === o.id)) });
    try { await istemci.iste('tuvalOgeSil', { evren, kod, idler }); } catch (e) { setHata((e as Error).message); }
  };
  const geriAl = async () => {
    const g = geri.current.pop(); if (!g) return;
    if (g.sil.length) await kaldir(g.sil, false);
    if (g.yaz.length) await kaydet(g.yaz, false);
  };
  const yeniOge = (tur: TuvalOgeTuru, yer: Nokta, ek: Partial<TuvalOgesi> = {}): TuvalOgesi => {
    const [g, h, renk] = VARSAYILAN_BOY[tur] ?? [160, 100, 'yuzey'];
    const gg = ek.g ?? g, hh = ek.h ?? h;
    return { id: yeniKod(), tur, x: Math.round(yer.x - gg / 2), y: Math.round(yer.y - hh / 2), g: gg, h: hh, aci: 0, sira: enUst + 1, renk, metin: '', kayit: null, gorsel: null,
      sekil: tur === 'sekil' ? 'elips' : null, cizgi: null, bas: null, son: null, kalin: tur === 'sekil' || tur === 'ok' || tur === 'kalem' ? 2 : 0, ...ek };
  };
  const ekle = (o: TuvalOgesi, duzenle = false) => { void kaydet([o]); setSecim(o.id); if (duzenle) setDuzenlenen(o.id); setArac('sec'); };

  // ---------- İşaretçi ----------
  const kalemSil = (e: PointerEvent, idler: Set<string>) => {
    for (const el of document.elementsFromPoint(e.clientX, e.clientY)) {
      const k = (el as HTMLElement).closest?.('[data-oge]') as HTMLElement | null;
      const id = k?.dataset.oge;
      if (id && !idler.has(id) && harita.get(id)?.tur === 'kalem') { idler.add(id); k!.style.opacity = '0.25'; }
    }
  };
  const asagi = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('.tuval-yuzen, textarea, input, button, select')) return;
    // Tuvaldeki dokunuş odağı başka yere taşımasın (yeni notun yazı alanı açık kalsın).
    e.preventDefault();
    if (document.activeElement instanceof HTMLElement && document.activeElement.closest('.tuval-alani')) document.activeElement.blur();
    alan.current!.setPointerCapture(e.pointerId);
    if (e.pointerType === 'touch') {
      parmaklar.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (parmaklar.current.size === 2) {
        const [a, b] = [...parmaklar.current.values()];
        surukle.current = null; setCizgi(null);
        sikistir.current = { uzaklik: Math.hypot(a.x - b.x, a.y - b.y), gor, orta: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
        return;
      }
    }
    const p = dunya(e);
    const hedef = (e.target as HTMLElement).closest('[data-oge]') as HTMLElement | null;
    const id = hedef?.dataset.oge ?? null;
    const tutamak = (e.target as HTMLElement).closest('[data-tutamak]') as HTMLElement | null;
    // Kalem ve parmak ayrı (§12.2): bu oturumda kalem kullanıldıysa parmak çizmez, tuvali kaydırır. Kalemi olmayan
    // dokunmatik ekranda parmak çizmeye devam eder.
    if (e.pointerType === 'pen') kalemGoruldu.current = true;
    // Kalemin yan tuşu ya da silgi ucu: kalem aracında sürüklenen yerdeki kalem çizimleri silinir (tek geri alma adımı).
    if (arac === 'kalem' && e.pointerType === 'pen' && (e.buttons & 2 || e.buttons & 32)) { surukle.current = { tur: 'sil', idler: new Set() }; kalemSil(e, surukle.current.idler); return; }
    if (arac === 'kalem' && !(e.pointerType === 'touch' && kalemGoruldu.current)) { surukle.current = { tur: 'ciz', noktalar: [p] }; setCizgi([p]); return; }
    if (arac === 'kalem') { surukle.current = { tur: 'kaydir', bas: { x: e.clientX, y: e.clientY }, gor }; return; }
    if (arac === 'ok') {
      if (!id || harita.get(id)?.tur === 'ok') { setOkBas(null); return; }
      if (!okBas) { setOkBas(id); return; }
      if (okBas !== id) ekle(yeniOge('ok', p, { bas: okBas, son: id, renk: 'turuncu', x: 0, y: 0, g: 10, h: 10 }));
      setOkBas(null); return;
    }
    if (arac !== 'sec') {
      const t = arac;
      ekle(yeniOge(t, p), t === 'not' || t === 'yazi' || t === 'balon');
      return;
    }
    if (tutamak && secim) {
      const o = harita.get(secim)!;
      surukle.current = tutamak.dataset.tutamak === 'don' ? { tur: 'dondur', id: secim, oge: o } : { tur: 'boyut', id: secim, kose: tutamak.dataset.tutamak!, oge: o };
      return;
    }
    if (id) {
      if (duzenlenen === id) return;
      setSecim(id); if (duzenlenen) setDuzenlenen(null);
      const o = harita.get(id)!;
      if (o.tur !== 'ok') surukle.current = { tur: 'tasi', id, bas: p, oge: o, oynadi: false };
      return;
    }
    setSecim(null); setDuzenlenen(null);
    surukle.current = { tur: 'kaydir', bas: { x: e.clientX, y: e.clientY }, gor };
  };

  const oynat = (e: PointerEvent) => {
    if (e.pointerType === 'touch' && parmaklar.current.has(e.pointerId)) {
      parmaklar.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const s = sikistir.current;
      if (s && parmaklar.current.size === 2) {
        const [a, b] = [...parmaklar.current.values()];
        const r = alan.current!.getBoundingClientRect();
        const o = sinir(s.gor.o * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, s.uzaklik), 0.15, 4);
        const orta = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const wx = (s.orta.x - r.left - s.gor.px) / s.gor.o, wy = (s.orta.y - r.top - s.gor.py) / s.gor.o;
        setGor({ o, px: orta.x - r.left - wx * o, py: orta.y - r.top - wy * o });
        return;
      }
    }
    const s = surukle.current; if (!s) return;
    if (s.tur === 'kaydir') { setGor({ ...s.gor, px: s.gor.px + e.clientX - s.bas.x, py: s.gor.py + e.clientY - s.bas.y }); return; }
    const p = dunya(e);
    if (s.tur === 'ciz') { s.noktalar.push(p); setCizgi([...s.noktalar]); return; }
    if (s.tur === 'sil') { kalemSil(e, s.idler); return; }
    let yeni: TuvalOgesi;
    if (s.tur === 'tasi') {
      const dx = p.x - s.bas.x, dy = p.y - s.bas.y;
      if (!s.oynadi && Math.hypot(dx, dy) * gor.o < 3) return;
      s.oynadi = true;
      yeni = { ...s.oge, x: Math.round(s.oge.x + dx), y: Math.round(s.oge.y + dy) };
    } else if (s.tur === 'dondur') {
      const c = merkez(s.oge);
      let a = (Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI + 90;
      if (a > 180) a -= 360;
      const yakin = Math.round(a / 15) * 15;
      if (Math.abs(a - yakin) < 4 || e.shiftKey) a = yakin;
      yeni = { ...s.oge, aci: Math.round(a) };
    } else {
      const o = s.oge;
      const hx = s.kose.includes('e') ? 1 : -1, hy = s.kose.includes('s') ? 1 : -1;
      const c = merkez(o);
      const karsi = dondur({ x: -hx * o.g / 2, y: -hy * o.h / 2 }, o.aci);
      const P = { x: c.x + karsi.x, y: c.y + karsi.y };
      const v = dondur({ x: p.x - P.x, y: p.y - P.y }, -o.aci);
      let g = Math.max(24, v.x * hx), h = Math.max(24, v.y * hy);
      if (oranKorur(o)) { const k = Math.max(g / o.g, h / o.h); g = o.g * k; h = o.h * k; }
      const yarim = dondur({ x: hx * g / 2, y: hy * h / 2 }, o.aci);
      yeni = { ...o, g: Math.round(g), h: Math.round(h), x: Math.round(P.x + yarim.x - g / 2), y: Math.round(P.y + yarim.y - h / 2) };
    }
    setGecici((m) => new Map(m).set(yeni.id, yeni));
  };

  const yukari = (e: PointerEvent) => {
    parmaklar.current.delete(e.pointerId);
    if (parmaklar.current.size < 2) sikistir.current = null;
    const s = surukle.current; surukle.current = null;
    if (!s) return;
    if (s.tur === 'sil') { if (s.idler.size) void kaldir([...s.idler]); return; }
    if (s.tur === 'ciz') {
      setCizgi(null); setArac('kalem');
      if (s.noktalar.length < 2) return;
      const kal = 3;
      const xs = s.noktalar.map((q) => q.x), ys = s.noktalar.map((q) => q.y);
      const x0 = Math.min(...xs) - kal, y0 = Math.min(...ys) - kal;
      const g = Math.max(12, Math.max(...xs) + kal - x0), h = Math.max(12, Math.max(...ys) + kal - y0);
      const adim = Math.max(1, Math.ceil(s.noktalar.length / 1500));
      const cizgiler = s.noktalar.filter((_q, i) => i % adim === 0 || i === s.noktalar.length - 1).flatMap((q) => [Math.round(((q.x - x0) / g) * 1000), Math.round(((q.y - y0) / h) * 1000)]);
      void kaydet([{ ...yeniOge('kalem', { x: 0, y: 0 }, { renk: 'pembe', kalin: kal }), x: Math.round(x0), y: Math.round(y0), g: Math.round(g), h: Math.round(h), cizgi: cizgiler }]);
      return;
    }
    if (s.tur === 'kaydir') return;
    const son = gecici.get(s.id);
    if (son && (s.tur !== 'tasi' || s.oynadi)) void kaydet([son]);
  };

  const tekerlek = (e: WheelEvent) => {
    e.preventDefault();
    const r = alan.current!.getBoundingClientRect();
    const o = sinir(gor.o * Math.exp(-e.deltaY * 0.0015), 0.15, 4);
    const wx = (e.clientX - r.left - gor.px) / gor.o, wy = (e.clientY - r.top - gor.py) / gor.o;
    setGor({ o, px: e.clientX - r.left - wx * o, py: e.clientY - r.top - wy * o });
  };
  useEffect(() => {
    const el = alan.current; if (!el) return;
    el.addEventListener('wheel', tekerlek, { passive: false });
    return () => el.removeEventListener('wheel', tekerlek);
  });
  const yakinlas = (k: number) => {
    const el = alan.current!; const cx = el.clientWidth / 2, cy = el.clientHeight / 2;
    const o = sinir(gor.o * k, 0.15, 4);
    setGor({ o, px: cx - ((cx - gor.px) / gor.o) * o, py: cy - ((cy - gor.py) / gor.o) * o });
  };

  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (!alan.current?.isConnected) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); void geriAl(); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && secim) { e.preventDefault(); void kaldir([secim]); return; }
      if (e.key === 'Escape') { setSecim(null); setDuzenlenen(null); setArac('sec'); setOkBas(null); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const a = ARACLAR.find(([, , k]) => k.toLowerCase() === e.key.toLowerCase());
      if (a) { setArac(a[0]); setOkBas(null); }
    };
    document.addEventListener('keydown', tus);
    return () => document.removeEventListener('keydown', tus);
  });

  const gorselYukle = async (f: File) => {
    try {
      let g = 260, h = 180;
      try { const b = await createImageBitmap(f); const k = Math.min(1, 320 / Math.max(b.width, b.height)); g = Math.round(b.width * k); h = Math.round(b.height * k); b.close(); } catch { /* boyut okunamadı */ }
      const { ad } = await istemci.iste('panoGorseliSakla', { evren, dosyaAdi: f.name, tur: f.type, veri: new Uint8Array(await f.arrayBuffer()) });
      ekle(yeniOge('gorsel', gorunenOrta(), { gorsel: ad, g, h, metin: f.name.replace(/\.[^.]+$/, '').slice(0, 200) }));
    } catch (e) { setHata((e as Error).message); }
  };

  if (!veri) return hata ? <p class="hata kucuk">{hata}</p> : <p class="soluk">Açılıyor…</p>;
  const sirali = [...ogeler].sort((a, b) => a.sira - b.sira);
  const kutular = sirali.filter((o) => o.tur !== 'ok');
  const oklar = sirali.filter((o) => o.tur === 'ok' && harita.has(o.bas!) && harita.has(o.son!));
  const secili = secim ? harita.get(secim) ?? null : null;

  return (
    <div class={`tuval-alani arac-${arac}`} ref={alan} onContextMenu={(e) => { if (arac === 'kalem') e.preventDefault(); }} onPointerDown={asagi} onPointerMove={oynat} onPointerUp={yukari} onPointerCancel={yukari}
      onDblClick={(e) => { const id = ((e.target as HTMLElement).closest('[data-oge]') as HTMLElement | null)?.dataset.oge; const o = id ? harita.get(id) : null; if (o && ['not', 'yazi', 'balon', 'sekil'].includes(o.tur)) setDuzenlenen(o.id); }}
      aria-label="Pano tuvali" role="application">
      <div class="tuval-zemin" style={{ backgroundPosition: `${gor.px}px ${gor.py}px`, backgroundSize: `${22 * gor.o}px ${22 * gor.o}px` }} />
      <div class="tuval-ic" style={{ transform: `translate(${gor.px}px, ${gor.py}px) scale(${gor.o})` }}>
        {kutular.map((o) => (
          <OgeKutusu key={o.id} o={o} veri={veri} istemci={istemci} evren={evren} secili={o.id === secim} okBas={o.id === okBas} duzenleniyor={o.id === duzenlenen}
            metinYaz={(m) => { setDuzenlenen(null); if (m !== o.metin) void kaydet([{ ...o, metin: m }]); }} olcek={gor.o} />
        ))}
        <svg class="tuval-oklar" width="1" height="1">
          <defs>{TUVAL_RENK_ADLARI.map(([r]) => <marker key={r} id={`tv-uc-${r}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class={`tv-cizgi-${r}`} style={{ stroke: 'none', fill: 'currentColor' }} /></marker>)}</defs>
          {oklar.map((o) => <OkCizgisi key={o.id} o={o} a={harita.get(o.bas!)!} b={harita.get(o.son!)!} secili={o.id === secim} />)}
          {cizgi && <polyline points={cizgi.map((q) => `${q.x},${q.y}`).join(' ')} class="tv-cizgi-pembe" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }} />}
        </svg>
      </div>

      {secili && <SeciliPaneli istemci={istemci} kod={kod} o={secili} veri={veri} evren={evren} enUst={enUst} enAlt={enAlt} yaz={(x) => void kaydet([x])} kaldir={() => void kaldir([secili.id])} />}

      <div class="tuval-yuzen tuval-araclar" role="toolbar" aria-label="Pano araçları">
        {ARACLAR.map(([a, ad, k]) => (
          <button key={a} type="button" class={arac === a ? 'ak' : ''} aria-pressed={arac === a} title={`${ad} (${k})`} onClick={() => { setArac(a); setOkBas(null); setCikartmaAcik(false); }}>{ad}</button>
        ))}
        <span class="ayrac" aria-hidden="true" />
        <button type="button" onClick={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setSecici({ left: r.left, top: Math.max(8, r.top - 330) }); }}>Kart</button>
        <button type="button" onClick={() => dosya.current?.click()}>Görsel</button>
        <button type="button" aria-expanded={cikartmaAcik} onClick={() => setCikartmaAcik(!cikartmaAcik)}>Çıkartma</button>
        <span class="ayrac" aria-hidden="true" />
        <button type="button" title="Geri al (Ctrl+Z)" aria-label="Geri al" disabled={!geri.current.length} onClick={() => void geriAl()}>↶</button>
        {cikartmaAcik && (
          <div class="tuval-cikartmalar" role="listbox" aria-label="Çıkartmalar">
            {CIKARTMALAR.map((c) => <button key={c} type="button" role="option" aria-selected={false} onClick={() => { setCikartmaAcik(false); ekle(yeniOge('cikartma', gorunenOrta(), { metin: c })); }}>{c}</button>)}
          </div>
        )}
      </div>
      <input ref={dosya} type="file" accept="image/*" hidden onChange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) void gorselYukle(f); (e.target as HTMLInputElement).value = ''; }} />
      {secici && <BaglantiSecici istemci={istemci} evren={evren} sorgu="" konum={secici} kapat={() => setSecici(null)}
        sec={(s) => { setSecici(null); ekle(yeniOge('kart', gorunenOrta(), { kayit: s.kod })); }} />}

      <div class="tuval-yuzen tuval-yakinlik">
        <button type="button" aria-label="Uzaklaş" onClick={() => yakinlas(1 / 1.2)}>−</button>
        <span>%{Math.round(gor.o * 100)}</span>
        <button type="button" aria-label="Yakınlaş" onClick={() => yakinlas(1.2)}>+</button>
        <button type="button" onClick={sigdir}>Sığdır</button>
      </div>
      {(arac === 'ok' || hata) && (
        <p class={`tuval-yuzen tuval-ipucu${hata ? ' hata' : ''}`} role="status">
          {hata || (okBas ? `“${baslikOf(harita.get(okBas)!, veri)}” seçildi; şimdi okun gideceği öğeye dokunun.` : 'Okun çıkacağı öğeye dokunun.')}
        </p>
      )}
      {!ogeler.length && arac === 'sec' && <p class="tuval-yuzen tuval-ipucu">Pano boş. Aşağıdan “Kart” ile bir kayıt koyun ya da “Not” seçip boş bir yere dokunun.</p>}
    </div>
  );
}

const baslikOf = (o: TuvalOgesi, veri: Tuval) => o.tur === 'kart' ? veri.kartlar[o.kayit!]?.ad ?? 'Kart' : (o.metin.split('\n')[0].slice(0, 30) || OGE_ADI[o.tur]);

function OgeKutusu({ o, veri, istemci, evren, secili, okBas, duzenleniyor, metinYaz, olcek }: {
  o: TuvalOgesi; veri: Tuval; istemci: Istemci; evren: string; secili: boolean; okBas: boolean; duzenleniyor: boolean; metinYaz: (m: string) => void; olcek: number;
}) {
  const stil = { left: `${o.x}px`, top: `${o.y}px`, width: `${o.g}px`, height: `${o.h}px`, transform: o.aci ? `rotate(${o.aci}deg)` : undefined, zIndex: undefined };
  const sinif = `tuval-oge tv-${o.tur} tv-renk-${o.renk}${secili ? ' secili' : ''}${okBas ? ' ok-bas' : ''}`;
  const tut = 9 / olcek;
  const tutamaklar = secili && o.tur !== 'kalem' ? (
    <>
      {['nw', 'ne', 'sw', 'se'].map((k) => <span key={k} class={`tv-tutamak tv-${k}`} data-tutamak={k} style={{ width: `${tut}px`, height: `${tut}px`, margin: `${-tut / 2}px` }} />)}
      <span class="tv-dondur" data-tutamak="don" title="Döndür" style={{ width: `${18 / olcek}px`, height: `${18 / olcek}px`, top: `${-34 / olcek}px`, marginLeft: `${-9 / olcek}px`, fontSize: `${11 / olcek}px` }}>↻</span>
    </>
  ) : secili ? <span class="tv-dondur" data-tutamak="don" title="Döndür" style={{ width: `${18 / olcek}px`, height: `${18 / olcek}px`, top: `${-34 / olcek}px`, marginLeft: `${-9 / olcek}px`, fontSize: `${11 / olcek}px` }}>↻</span> : null;
  const metin = duzenleniyor
    ? <textarea class="tv-metin-girdi" lang="tr" autoFocus ref={(el) => { if (el) requestAnimationFrame(() => { if (document.activeElement !== el) el.focus(); }); }} defaultValue={o.metin} aria-label="Metin" onBlur={(e) => metinYaz((e.target as HTMLTextAreaElement).value)}
      onKeyDown={(e) => { if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur(); }} />
    : <div class="tv-metin">{o.metin || <span class="tv-yer-tutucu">{o.tur === 'yazi' ? 'Yazı' : o.tur === 'sekil' ? '' : 'İki kez dokunup yazın'}</span>}</div>;
  let ic: preact.ComponentChildren = null;
  if (o.tur === 'kart') {
    const k = veri.kartlar[o.kayit!];
    const t = turBul(k?.tur ?? 'diger');
    ic = (
      <div class={`tv-kart-ic${k?.silindi ? ' silinmis' : ''}`}>
        <div class="tv-kart-ust"><span class={`tur-rozeti kucuk-rozet ${grupSinifi(t)}`} aria-hidden="true">{t.kisa}</span><b>{k?.ad ?? 'Kayıt'}</b></div>
        {k?.ozet && <p>{k.ozet}</p>}
        {k?.gorsel && <Gorsel istemci={istemci} evren={evren} ad={k.gorsel} sinif="tv-kart-gorsel" />}
      </div>
    );
  } else if (o.tur === 'not' || o.tur === 'yazi' || o.tur === 'balon') ic = metin;
  else if (o.tur === 'sekil') {
    ic = (
      <>
        <svg class="tv-sekil-svg" viewBox={`0 0 ${o.g} ${o.h}`} preserveAspectRatio="none" aria-hidden="true">
          {o.sekil === 'elips' ? <ellipse cx={o.g / 2} cy={o.h / 2} rx={Math.max(1, o.g / 2 - o.kalin)} ry={Math.max(1, o.h / 2 - o.kalin)} style={{ strokeWidth: o.kalin }} />
            : <rect x={o.kalin / 2} y={o.kalin / 2} width={Math.max(1, o.g - o.kalin)} height={Math.max(1, o.h - o.kalin)} rx="10" style={{ strokeWidth: o.kalin }} />}
        </svg>
        {metin}
      </>
    );
  } else if (o.tur === 'gorsel') ic = <Gorsel istemci={istemci} evren={evren} ad={o.gorsel!} onizleme={false} alt={o.metin} sinif="tv-gorsel-resim" />;
  else if (o.tur === 'cikartma') ic = <span class="tv-cikartma-ic" style={{ fontSize: `${Math.min(o.g, o.h) * 0.8}px` }}>{o.metin}</span>;
  else if (o.tur === 'kalem') {
    const n = o.cizgi ?? [];
    let d = ''; for (let i = 0; i < n.length; i += 2) d += `${i ? 'L' : 'M'}${n[i]} ${n[i + 1]}`;
    ic = (
      <svg class="tv-kalem-svg" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
        <path d={d} class="tv-kalem-tut" style={{ strokeWidth: Math.max(14, o.kalin * 4) }} vector-effect="non-scaling-stroke" />
        <path d={d} class="tv-kalem-cizgi" style={{ strokeWidth: o.kalin }} vector-effect="non-scaling-stroke" />
      </svg>
    );
  }
  return (
    <div class={sinif} style={stil} data-oge={o.id} aria-label={OGE_ADI[o.tur]}>
      {ic}
      {tutamaklar}
    </div>
  );
}

function OkCizgisi({ o, a, b, secili }: { o: TuvalOgesi; a: TuvalOgesi; b: TuvalOgesi; secili: boolean }) {
  const ca = merkez(a), cb = merkez(b);
  const dx = cb.x - ca.x, dy = cb.y - ca.y;
  const kenar = (q: TuvalOgesi) => Math.min(Math.abs(dx) > 0.01 ? q.g / 2 / Math.abs(dx) : Infinity, Math.abs(dy) > 0.01 ? q.h / 2 / Math.abs(dy) : Infinity);
  const uzun = Math.hypot(dx, dy) || 1;
  const sa = kenar(a) + 6 / uzun, sb = kenar(b) + 8 / uzun;
  if (sa + sb >= 1) return null;
  const p1 = { x: ca.x + dx * sa, y: ca.y + dy * sa }, p2 = { x: cb.x - dx * sb, y: cb.y - dy * sb };
  // Hafif bir kavis: orta nokta çizgiye dik biraz kayar.
  const bukum = Math.min(40, uzun * 0.12);
  const orta = { x: (p1.x + p2.x) / 2 - (dy / uzun) * bukum, y: (p1.y + p2.y) / 2 + (dx / uzun) * bukum };
  const d = `M${p1.x} ${p1.y} Q${orta.x} ${orta.y} ${p2.x} ${p2.y}`;
  const etiket = { x: (p1.x + 2 * orta.x + p2.x) / 4, y: (p1.y + 2 * orta.y + p2.y) / 4 };
  const gen = o.metin ? Math.min(240, o.metin.length * 7.4 + 20) : 0;
  return (
    <g data-oge={o.id} class={`tv-ok tv-cizgi-${o.renk}${secili ? ' secili' : ''}`}>
      <path d={d} class="tv-ok-tut" />
      <path d={d} class="tv-ok-cizgi" style={{ strokeWidth: o.kalin }} marker-end={`url(#tv-uc-${o.renk})`} />
      {o.metin && <>
        <rect x={etiket.x - gen / 2} y={etiket.y - 11} width={gen} height="22" rx="11" class="tv-ok-etiket" />
        <text x={etiket.x} y={etiket.y + 4.5} text-anchor="middle" class="tv-ok-yazi">{o.metin.length > 30 ? `${o.metin.slice(0, 30)}…` : o.metin}</text>
      </>}
    </g>
  );
}

function SeciliPaneli({ istemci, kod, o, veri, evren, enUst, enAlt, yaz, kaldir }: {
  istemci: Istemci; kod: string; o: TuvalOgesi; veri: Tuval; evren: string; enUst: number; enAlt: number; yaz: (o: TuvalOgesi) => void; kaldir: () => void;
}) {
  const [okYazi, setOkYazi] = useState(o.metin);
  useEffect(() => setOkYazi(o.metin), [o.id, o.metin]);
  return (
    <div class="tuval-yuzen tuval-paneli" aria-label="Seçili öğe">
      <b class="tv-panel-baslik">{o.tur === 'kart' ? veri.kartlar[o.kayit!]?.ad ?? 'Kart' : OGE_ADI[o.tur]}</b>
      <div class="soluk kucuk">{o.tur === 'kart' ? 'Kayıt kartı · adı ve özeti kayıttan gelir' : o.tur === 'ok' ? 'Ok yalnız panodadır; ilişki oluşturmaz' : OGE_ADI[o.tur]}</div>
      {o.tur !== 'gorsel' && o.tur !== 'cikartma' && (
        <>
          <div class="ust-etiket">Renk</div>
          <div class="tv-renkler" role="radiogroup" aria-label="Renk">
            {TUVAL_RENK_ADLARI.map(([r, ad]) => <button key={r} type="button" role="radio" aria-checked={o.renk === r} aria-label={ad} title={ad} class={`tv-renk-dugme tv-renk-${r}`} onClick={() => yaz({ ...o, renk: r })} />)}
          </div>
        </>
      )}
      {o.tur === 'sekil' && (
        <div class="satir tv-sekil-secimi">
          <button type="button" class={`dugme kucuk${o.sekil === 'elips' ? ' ana' : ''}`} onClick={() => yaz({ ...o, sekil: 'elips' })}>Elips</button>
          <button type="button" class={`dugme kucuk${o.sekil === 'dikdortgen' ? ' ana' : ''}`} onClick={() => yaz({ ...o, sekil: 'dikdortgen' })}>Dikdörtgen</button>
        </div>
      )}
      {o.tur === 'ok' && (
        <label class="alan"><span class="ust-etiket">Okun yazısı</span>
          <input class="girdi" lang="tr" value={okYazi} placeholder="Ör. kardeşi" onInput={(e) => setOkYazi((e.target as HTMLInputElement).value)}
            onBlur={() => { if (okYazi !== o.metin) yaz({ ...o, metin: okYazi }); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
        </label>
      )}
      {(o.tur === 'kalem' || o.tur === 'sekil' || o.tur === 'ok') && (
        <label class="alan"><span class="ust-etiket">Kalınlık</span>
          <input type="range" min="1" max="12" value={o.kalin} onChange={(e) => yaz({ ...o, kalin: Number((e.target as HTMLInputElement).value) })} />
        </label>
      )}
      {o.tur !== 'ok' && (
        <label class="alan"><span class="ust-etiket">Döndür · {o.aci}°</span>
          <input type="range" min="-180" max="180" step="1" value={o.aci} onChange={(e) => yaz({ ...o, aci: Number((e.target as HTMLInputElement).value) })} />
        </label>
      )}
      <div class="satir sarmal tv-panel-dugmeler">
        {o.tur !== 'ok' && <button type="button" class="dugme kucuk" disabled={o.sira >= enUst} onClick={() => yaz({ ...o, sira: enUst + 1 })}>Öne</button>}
        {o.tur !== 'ok' && <button type="button" class="dugme kucuk" disabled={o.sira <= enAlt} onClick={() => yaz({ ...o, sira: enAlt - 1 })}>Arkaya</button>}
        {o.tur === 'kart' && <a class="dugme kucuk" href={`#/e/${evren}/k/${veri.kartlar[o.kayit!]?.kod ?? o.kayit}`}>Kaydı aç</a>}
        <button type="button" class="dugme kucuk" onClick={kaldir}>Panodan kaldır</button>
      </div>
      {(o.tur === 'not' || o.tur === 'yazi' || o.tur === 'balon' || o.tur === 'sekil') && <KaydaDonustur istemci={istemci} evren={evren} kod={kod} o={o} />}
    </div>
  );
}

/** K39: seçili not, yazı, balon ya da şekil yerinde kayıt kartına döner; ilk satır kaydın adı, kalanı metnidir. */
function KaydaDonustur({ istemci, evren, kod, o }: { istemci: Istemci; evren: string; kod: string; o: TuvalOgesi }) {
  const [ac, setAc] = useState(false);
  const [tur, setTur] = useState('karakter');
  const [hata, setHata] = useState('');
  useEffect(() => { setAc(false); setHata(''); }, [o.id]);
  const ad = o.metin.trim().split('\n')[0].trim();
  if (!ac) return <button type="button" class="dugme kucuk tv-kayda-donustur" onClick={() => setAc(true)}>Kayda dönüştür…</button>;
  return (
    <form class="tv-donustur" onSubmit={async (e) => {
      e.preventDefault();
      try { await istemci.iste('tuvalOgesiniKaydet', { evren, kod, id: o.id, tur }); }
      catch (x) { setHata((x as Error).message); }
    }}>
      <div class="soluk kucuk">{ad ? <>Yeni kaydın adı: <b>{ad}</b>. Kalan satırlar kaydın metni olur. Öğe yerinde kayıt kartına döner; okları kalır.</> : 'Önce öğeye bir ad yazın: ilk satır kaydın adı olur.'}</div>
      <TurSecici deger={tur} onDegis={setTur} />
      <div class="satir">
        <button class="dugme ana kucuk" type="submit" disabled={!ad}>Dönüştür</button>
        <button class="dugme kucuk" type="button" onClick={() => setAc(false)}>Vazgeç</button>
      </div>
      {hata && <p class="hata kucuk">{hata}</p>}
    </form>
  );
}
