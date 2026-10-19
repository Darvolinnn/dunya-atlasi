// Yazarken çalışma alanı: özet kartı (§5.3), yan panel (§5.4), komut paleti (§5.8) ve kaldığın yer (§5.9).
// Yan paneldeki kayıtlar ve imleç "kaldığın yer" olarak saklanır ve eşitlemeyle öbür cihazlara gider; panelin
// açık ya da küçük olması cihaza özeldir.
import { createContext } from 'preact';
import { useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { AramaSonucu, DurumSatiri, IliskiSatiri, Kayit, KayitOzeti, Spans } from '../veri/api';
import type { EvrenTarihi } from '../alan/tarih';
import { gecerlilik } from '../alan/durum';
import { aralikYazi } from './Anlati';
import { degerMetni, useKayitSablonu } from './Sablon';
import { yasHesapla } from '../alan/yas';
import { useTakvim } from './Takvim';
import { TURLER, turBul } from '../alan/turler';
import { katla } from '../alan/turkce';
import { KararRozeti } from './ortak';
import { Gorsel } from './gorsel';
import { MetinGorunumu } from './MetinEditoru';
import { git } from './Uygulama';
import type { YasananSure } from '../veri/api';

export interface PaletBaglami { bagla?: () => void }

export interface CalismaDenetimi {
  evren: string | null;
  /** Ana alanda açık kayıt (yan panel, açık sahnenin tarihine göre gösterir). */
  acikKayit: string | null;
  yanPanel: string[];
  yanPanelAc(kod: string): void;
  yanPanelKapat(kod?: string): void;
  ozetAc(kod: string, yer: DOMRect): void;
  paletAc(baglam?: PaletBaglami): void;
  /** Editör imleci değişti (kaldığın yer). */
  konumBildir(kayit: string, konum: number): void;
  /** Kayıt sayfası açıldı: kaldığın yere dönülüyorsa imlecin konumu bir kez verilir. */
  konumAl(kayit: string): number | null;
  /** Masa'daki "Devam et". */
  devamEt(y: { kayit: string | null; konum: number | null; yanPanel: string[] }): void;
  notYaz(not: string): void;
}

const Baglam = createContext<CalismaDenetimi | null>(null);
export const useCalisma = () => useContext(Baglam);

const YAZMA_ARALIGI = 2500;
const panelAnahtari = 'dunya-atlasi:yan-panel-kucuk';

export function CalismaSaglayici({ istemci, evren, kayit, children }: {
  istemci: Istemci; evren: string | null; kayit: string | null; children: preact.ComponentChildren;
}) {
  const [paneller, setPaneller] = useState<Record<string, string[]>>({});
  const [aktif, setAktif] = useState<string | null>(null);
  const [kart, setKart] = useState<{ kod: string; yer: DOMRect } | null>(null);
  const [palet, setPalet] = useState<PaletBaglami | null>(null);
  const [kucuk, setKucuk] = useState(() => { try { return localStorage.getItem(panelAnahtari) === '1'; } catch { return false; } });
  const kucult = (v: boolean) => { setKucuk(v); try { localStorage.setItem(panelAnahtari, v ? '1' : '0'); } catch { /* yok */ } };
  const yer = useRef<{ evren: string; kayit: string | null; konum: number | null; not: string } | null>(null);
  const bekleyenKonum = useRef<{ kayit: string; konum: number } | null>(null);
  const yazZamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef(paneller);
  panelRef.current = paneller;

  const yanPanel = evren ? paneller[evren] ?? [] : [];

  /** Kaldığın yer, değişiklikten kısa süre sonra yazılır (her imleç hareketinde değil). */
  const yazPlanla = () => {
    if (yazZamanlayici.current) clearTimeout(yazZamanlayici.current);
    yazZamanlayici.current = setTimeout(() => {
      yazZamanlayici.current = null;
      const y = yer.current;
      if (!y) return;
      void istemci.iste('kaldigiYerYaz', { evren: y.evren, yer: { kayit: y.kayit, konum: y.konum, yanPanel: panelRef.current[y.evren] ?? [], not: y.not } }).catch(() => {});
    }, YAZMA_ARALIGI);
  };

  // Evren değişince önceki notu öğren (yeni yazmalar onu korusun).
  useEffect(() => {
    if (!evren) { yer.current = null; return; }
    yer.current = { evren, kayit: null, konum: null, not: '' };
    istemci.iste('kaldigiYer', { evren }).then((b) => {
      if (yer.current?.evren !== evren) return;
      yer.current.not = b?.not ?? '';
      if (!kayit) { yer.current.kayit = b?.kayit ?? null; yer.current.konum = b?.konum ?? null; }
    }, () => {});
  }, [evren]);

  // Açık kayıt sayfası kaldığın yerdir.
  useEffect(() => {
    if (!evren || !kayit || !yer.current || yer.current.evren !== evren) return;
    if (yer.current.kayit !== kayit) { yer.current.kayit = kayit; yer.current.konum = null; yazPlanla(); }
  }, [evren, kayit]);

  useEffect(() => { setKart(null); }, [evren, kayit]);

  const d: CalismaDenetimi = {
    evren, yanPanel, acikKayit: kayit,
    yanPanelAc(kod) {
      if (!evren) return;
      setPaneller((p) => ({ ...p, [evren]: [...(p[evren] ?? []).filter((x) => x !== kod), kod].slice(-8) }));
      setAktif(kod);
      setKart(null);
      kucult(false);
      yazPlanla();
    },
    yanPanelKapat(kod) {
      if (!evren) return;
      setPaneller((p) => ({ ...p, [evren]: kod ? (p[evren] ?? []).filter((x) => x !== kod) : [] }));
      yazPlanla();
    },
    ozetAc(kod, r) { setKart({ kod, yer: r }); },
    paletAc(b) { setKart(null); setPalet(b ?? {}); },
    konumBildir(k, konum) {
      if (!yer.current || !evren) return;
      yer.current.kayit = k; yer.current.konum = konum;
      yazPlanla();
    },
    konumAl(k) {
      const b = bekleyenKonum.current;
      if (!b || b.kayit !== k) return null;
      bekleyenKonum.current = null;
      return b.konum;
    },
    devamEt(y) {
      if (!evren) return;
      setPaneller((p) => ({ ...p, [evren]: y.yanPanel }));
      if (y.yanPanel.length) setAktif(y.yanPanel[y.yanPanel.length - 1]);
      if (y.kayit) {
        if (y.konum !== null) bekleyenKonum.current = { kayit: y.kayit, konum: y.konum };
        git(`/e/${evren}/k/${y.kayit}`);
      }
    },
    notYaz(not) {
      if (!yer.current) return;
      yer.current.not = not;
      yazPlanla();
    },
  };
  const denetim = useMemo(() => d, [evren, kayit, paneller]);
  const dRef = useRef(denetim);
  dRef.current = denetim;

  // Sayfadan çıkarken bekleyen yazma hemen yapılır.
  useEffect(() => {
    const cik = () => {
      if (!yazZamanlayici.current || !yer.current) return;
      clearTimeout(yazZamanlayici.current); yazZamanlayici.current = null;
      const y = yer.current;
      void istemci.iste('kaldigiYerYaz', { evren: y.evren, yer: { kayit: y.kayit, konum: y.konum, yanPanel: panelRef.current[y.evren] ?? [], not: y.not } }).catch(() => {});
    };
    const gizlenince = () => { if (document.visibilityState === 'hidden') cik(); };
    document.addEventListener('visibilitychange', gizlenince);
    addEventListener('pagehide', cik);
    return () => { document.removeEventListener('visibilitychange', gizlenince); removeEventListener('pagehide', cik); };
  }, []);

  // Klavye: Ctrl+K komut paleti; metin dışındayken "/" da açar (§5.8).
  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); dRef.current.paletAc(); return; }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !yaziAlaniMi(e.target)) { e.preventDefault(); dRef.current.paletAc(); }
    };
    addEventListener('keydown', tus);
    return () => removeEventListener('keydown', tus);
  }, []);

  // Bağlantının üzerine gelince özet kartı (§5.3); dokunmatikte basılı tutunca.
  useEffect(() => {
    let zamanlayici: ReturnType<typeof setTimeout> | null = null;
    const bagBul = (t: EventTarget | null) => (t instanceof Element ? t.closest('a.bag[data-kayit]') as HTMLElement | null : null);
    const uzerine = (e: MouseEvent) => {
      const a = bagBul(e.target);
      if (zamanlayici) { clearTimeout(zamanlayici); zamanlayici = null; }
      if (!a || !dRef.current.evren) return;
      zamanlayici = setTimeout(() => dRef.current.ozetAc(a.dataset.kayit!, a.getBoundingClientRect()), 450);
    };
    const basiliTut = (e: MouseEvent) => {
      const a = bagBul(e.target);
      if (!a || !dRef.current.evren) return;
      e.preventDefault();
      dRef.current.ozetAc(a.dataset.kayit!, a.getBoundingClientRect());
    };
    // Yan paneldeki ve salt okunur metinlerdeki bağlantıya tıklamak kaydı yan panelde açar.
    const tikla = (e: MouseEvent) => {
      const a = bagBul(e.target);
      if (!a || !a.closest('.salt-okunur')) return;
      e.preventDefault();
      dRef.current.yanPanelAc(a.dataset.kayit!);
    };
    document.addEventListener('mouseover', uzerine);
    document.addEventListener('contextmenu', basiliTut);
    document.addEventListener('click', tikla);
    return () => { document.removeEventListener('mouseover', uzerine); document.removeEventListener('contextmenu', basiliTut); document.removeEventListener('click', tikla); };
  }, []);

  return (
    <Baglam.Provider value={denetim}>
      <div class={yanPanel.length ? `calisma yan-panel-acik${kucuk ? ' yan-panel-kucuk' : ''}` : 'calisma'}>
        {children}
      </div>
      {evren && yanPanel.length > 0 && (
        <YanPanel istemci={istemci} evren={evren} kodlar={yanPanel} aktif={aktif && yanPanel.includes(aktif) ? aktif : yanPanel[yanPanel.length - 1]}
          sec={setAktif} kapat={(k) => denetim.yanPanelKapat(k)} kucuk={kucuk} kucult={kucult} />
      )}
      {evren && kart && <OzetKarti istemci={istemci} evren={evren} kod={kart.kod} yer={kart.yer} kapat={() => setKart(null)}
        yanPanelde={() => denetim.yanPanelAc(kart.kod)} />}
      {palet && <KomutPaleti istemci={istemci} evren={evren} baglam={palet} kapat={() => setPalet(null)} />}
    </Baglam.Provider>
  );
}

const yaziAlaniMi = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

// ---------- Özet kartı ----------
function OzetKarti({ istemci, evren, kod, yer, kapat, yanPanelde }: {
  istemci: Istemci; evren: string; kod: string; yer: DOMRect; kapat: () => void; yanPanelde: () => void;
}) {
  const [k, setK] = useState<Kayit | null>(null);
  const [yok, setYok] = useState(false);
  const kutu = useRef<HTMLDivElement>(null);
  useEffect(() => { istemci.iste('kayit', { evren, kod }).then(setK, () => setYok(true)); }, [kod]);
  useEffect(() => {
    const tus = (e: KeyboardEvent) => { if (e.key === 'Escape') kapat(); };
    // Kartın ve bağlantının dışına çıkınca kapanır.
    const disari = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (kutu.current?.contains(t)) return;
      if (t?.closest?.(`a.bag[data-kayit="${CSS.escape(kod)}"]`)) return;
      kapat();
    };
    const zaman = setTimeout(() => document.addEventListener('mouseover', disari), 200);
    addEventListener('keydown', tus);
    document.addEventListener('pointerdown', disari);
    return () => { clearTimeout(zaman); removeEventListener('keydown', tus); document.removeEventListener('mouseover', disari); document.removeEventListener('pointerdown', disari); };
  }, [kod]);
  const genislik = Math.min(340, innerWidth - 16);
  const left = Math.max(8, Math.min(yer.left, innerWidth - genislik - 8));
  const asagi = yer.bottom + 220 < innerHeight;
  const stil = { left: `${left}px`, width: `${genislik}px`, ...(asagi ? { top: `${yer.bottom + 6}px` } : { bottom: `${innerHeight - yer.top + 6}px` }) };
  const tur = k ? turBul(k.tur) : null;
  return (
    <div ref={kutu} class="ozet-karti kart" style={stil} role="dialog" aria-label="Kaydın özeti">
      {yok ? <p class="soluk kucuk">Bu kayıt bulunamadı.</p> : !k ? <p class="soluk kucuk">Açılıyor…</p> : (
        <>
          <div class="satir" style="flex-wrap:nowrap;align-items:flex-start">
            {k.gorsel ? <Gorsel istemci={istemci} evren={evren} ad={k.gorsel} sinif="ozet-gorseli" /> : <span class="tur-rozeti" aria-hidden="true">{tur!.kisa}</span>}
            <div style="min-width:0">
              <strong>{k.ad}</strong> <KararRozeti karar={k.karar} />
              <div class="soluk kucuk">{ayirtEtme(k)}</div>
            </div>
          </div>
          {k.ozet && <p class="kucuk" style="margin:8px 0 0">{k.ozet}</p>}
          {(k.tarih ?? k.sahneTarihi) && <p class="soluk kucuk" style="margin:4px 0 0">Evren tarihi: {(k.tarih ?? k.sahneTarihi)!.ifade}</p>}
          {k.lakaplar.length > 0 && <p class="soluk kucuk" style="margin:4px 0 0">Başka adları: {k.lakaplar.join(', ')}</p>}
          {k.silindi && <p class="uyari kucuk" style="margin-top:6px">Bu kayıt çöp kutusunda.</p>}
          <div class="satir" style="margin-top:10px">
            <button class="dugme kucuk" onClick={() => { kapat(); git(`/e/${evren}/k/${k.kod}`); }}>Aç</button>
            <button class="dugme kucuk" onClick={yanPanelde}>Yan panelde aç</button>
          </div>
        </>
      )}
    </div>
  );
}

/** Ayırt etme satırı (F19): aynı adlı kayıtları türü ve özetiyle ayırır. */
export const ayirtEtme = (k: Pick<KayitOzeti, 'tur' | 'ozet'>) => [turBul(k.tur).ad, k.ozet].filter(Boolean).join(' · ');

// ---------- Yan panel ----------
function YanPanel({ istemci, evren, kodlar, aktif, sec, kapat, kucuk, kucult }: {
  istemci: Istemci; evren: string; kodlar: string[]; aktif: string; sec: (k: string) => void; kapat: (k?: string) => void;
  kucuk: boolean; kucult: (v: boolean) => void;
}) {
  const [adlar, setAdlar] = useState<Record<string, string>>({});
  const [surum, setSurum] = useState(0);
  useEffect(() => {
    for (const k of kodlar) if (!adlar[k]) istemci.iste('kayit', { evren, kod: k }).then((x) => setAdlar((a) => ({ ...a, [k]: x.ad })), () => setAdlar((a) => ({ ...a, [k]: 'Bulunamadı' })));
  }, [kodlar.join()]);
  useEffect(() => istemci.dinle((d) => { if (d.evren === evren && (!d.kayitlar.length || d.kayitlar.some((k) => kodlar.includes(k)))) { setSurum((s) => s + 1); setAdlar({}); } }), [evren, kodlar.join()]);
  return (
    <aside class={kucuk ? 'yan-panel kucuk' : 'yan-panel'} aria-label="Yan panel">
      <div class="yan-panel-basi">
        <div class="yan-sekmeler" role="tablist">
          {kodlar.map((k) => (
            <span class="yan-sekme" key={k} role="tab" aria-selected={k === aktif}>
              <button class="yan-sekme-ad" onClick={() => { sec(k); kucult(false); }}>{adlar[k] ?? '…'}</button>
              <button class="yan-sekme-kapat" aria-label={`${adlar[k] ?? 'Kayıt'} sekmesini kapat`} onClick={() => kapat(k)}>×</button>
            </span>
          ))}
        </div>
        <button class="dugme sade kucuk" onClick={() => kucult(!kucuk)}>{kucuk ? 'Büyüt' : 'Küçült'}</button>
        <button class="dugme sade kucuk" onClick={() => kapat()}>Kapat</button>
      </div>
      {!kucuk && <YanPanelKaydi key={`${aktif}-${surum}`} istemci={istemci} evren={evren} kod={aktif} />}
    </aside>
  );
}

function YanPanelKaydi({ istemci, evren, kod }: { istemci: Istemci; evren: string; kod: string }) {
  const d = useCalisma();
  const [k, setK] = useState<Kayit | null>(null);
  const [metin, setMetin] = useState<Spans | null>(null);
  const [iliskiler, setIliskiler] = useState<IliskiSatiri[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => {
    istemci.iste('kayit', { evren, kod }).then(setK, (e) => setHata((e as Error).message));
    istemci.iste('metinAc', { evren, kayit: kod, alan: 'govde' }).then((m) => setMetin(m.spans), () => {});
    istemci.iste('iliskiler', { evren, kod }).then(setIliskiler, () => {});
  }, [kod]);
  // Ana alanda bir sahne ya da olay açıksa kayıt o anın evren tarihindeki hâliyle gösterilir (§3.5).
  const ana = d?.acikKayit && d.acikKayit !== kod ? d.acikKayit : null;
  const [an, setAn] = useState<{ ad: string; tarih: EvrenTarihi | null } | null>(null);
  const [durumlar, setDurumlar] = useState<DurumSatiri[]>([]);
  useEffect(() => {
    let iptal = false;
    (async () => {
      const a = ana ? await istemci.iste('kayit', { evren, kod: ana }).catch(() => null) : null;
      const anli = a && (a.tur === 'sahne' || a.tur === 'olay') ? a : null;
      const r = await istemci.iste('durumlar', { evren, kod, an: anli?.kod ?? null });
      if (iptal) return;
      setAn(anli ? { ad: anli.ad, tarih: r.an } : null);
      setDurumlar(anli ? r.durumlar.filter((x) => x.gecerli !== 'hayir') : r.durumlar);
    })().catch(() => {});
    return () => { iptal = true; };
  }, [kod, ana]);
  const ks = useKayitSablonu(istemci, evren, kod);
  const takvim = useTakvim(istemci, evren);
  const [yasanan, setYasanan] = useState<YasananSure | null>(null);
  useEffect(() => {
    let etkin = true;
    setYasanan(null);
    if (ana) istemci.iste('yasananSure', { evren, kisi: kod, olay: ana }).then((s) => { if (etkin) setYasanan(s); }, () => {});
    return () => { etkin = false; };
  }, [evren, kod, ana]);
  if (hata) return <p class="hata kucuk" style="padding:12px">{hata}</p>;
  if (!k) return <p class="soluk kucuk" style="padding:12px">Açılıyor…</p>;
  const tarih = k.tarih ?? k.sahneTarihi;
  const yas = an?.tarih && ks ? yasHesapla((ks.degerler.dogum as EvrenTarihi) ?? null, an.tarih, (ks.degerler.olum as EvrenTarihi) ?? null, takvim)?.metin ?? null : null;
  return (
    <div class="yan-panel-ic">
      <div class="satir" style="flex-wrap:nowrap;align-items:flex-start">
        {k.gorsel ? <Gorsel istemci={istemci} evren={evren} ad={k.gorsel} sinif="ozet-gorseli" /> : <span class="tur-rozeti" aria-hidden="true">{turBul(k.tur).kisa}</span>}
        <div style="min-width:0">
          <h2 style="font-size:1.1rem">{k.ad} <KararRozeti karar={k.karar} /></h2>
          <div class="soluk kucuk">{ayirtEtme(k)}</div>
        </div>
      </div>
      {tarih && <p class="soluk kucuk">Evren tarihi: {tarih.ifade}</p>}
      {k.lakaplar.length > 0 && <p class="soluk kucuk">Başka adları: {k.lakaplar.join(', ')}</p>}
      {ks && ks.sablon.alanlar.some((a) => ks.degerler[a.kod] != null) && (
        <ul class="yan-iliskiler">
          {ks.sablon.alanlar.filter((a) => ks.degerler[a.kod] != null).map((a) => <li key={a.kod}><span class="soluk">{a.ad}:</span> {degerMetni(a, ks.degerler[a.kod])}</li>)}
        </ul>
      )}
      {yas && !yasanan?.takvimBelirsiz && <p class="kucuk">{yas} <span class="soluk">({an!.tarih!.ifade} itibarıyla)</span></p>}
      {yasanan?.goster && <p class="kucuk">{yasanan.metin} <span class="soluk">({yasanan.tarih ?? 'tarih yazılmamış'} itibarıyla)</span></p>}
      {an && <p class="kucuk yan-an">{an.tarih ? <>“{an.ad}” tarihinde (<strong>{an.tarih.ifade}</strong>) gösteriliyor.</> : <>“{an.ad}” için evren tarihi girilmemiş; o anki hâl bilinemiyor, bütün değerler gösteriliyor.</>}</p>}
      {durumlar.length > 0 && (
        <ul class="yan-iliskiler">
          {durumlar.map((x) => (
            <li key={x.kod}>
              <span class="soluk">{x.ozellik}:</span> {x.hedef ? x.hedef.ad : x.deger}
              {x.gecerli === 'belirsiz' && an?.tarih ? <span class="rozet">belki</span> : null}
              {!an?.tarih && <span class="soluk kucuk"> ({aralikYazi(x)})</span>}
            </li>
          ))}
        </ul>
      )}
      {iliskiler.length > 0 && (
        <ul class="yan-iliskiler">
          {iliskiler.filter((i) => !an?.tarih || gecerlilik('aralik', i.baslangic ?? 'acik', i.bitis ?? 'acik', an.tarih) !== 'hayir').map((i) => (
            <li key={i.kod}>
              <span class="soluk">{i.etiket}:</span>{' '}
              <a href={`#/e/${evren}/k/${i.karsi.kod}`} onClick={(e) => { e.preventDefault(); d?.yanPanelAc(i.karsi.kod); }}>{i.karsi.ad}</a>
              {(i.baslangic || i.bitis) && <span class="soluk kucuk"> ({i.baslangic?.ifade ?? '…'} – {i.bitis?.ifade ?? '…'})</span>}
            </li>
          ))}
        </ul>
      )}
      {metin && <MetinGorunumu spans={metin} />}
      <p><a href={`#/e/${evren}/k/${k.kod}`}>Sayfasını aç</a></p>
    </div>
  );
}

// ---------- Komut paleti ----------
interface Oge { anahtar: string; baslik: string; aciklama?: string; yap: (yanPanel: boolean) => void | Promise<void>; kayit?: boolean }

function KomutPaleti({ istemci, evren, baglam, kapat }: { istemci: Istemci; evren: string | null; baglam: PaletBaglami; kapat: () => void }) {
  const d = useCalisma()!;
  const [sorgu, setSorgu] = useState('');
  const [secili, setSecili] = useState(0);
  const [bulunan, setBulunan] = useState<AramaSonucu[]>([]);
  const [son, setSon] = useState<KayitOzeti[]>([]);
  const [turSec, setTurSec] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const girdi = useRef<HTMLInputElement>(null);
  useEffect(() => { girdi.current?.focus(); }, [turSec]);
  useEffect(() => { if (evren) istemci.iste('kayitlar', { evren }).then((l) => setSon(l.slice(0, 6)), () => {}); }, [evren]);
  useEffect(() => {
    let iptal = false;
    if (!evren || !sorgu.trim() || turSec !== null) { setBulunan([]); return; }
    istemci.iste('ara', { evren, metin: sorgu, sinir: 8 }).then((r) => { if (!iptal) setBulunan(r); }, () => {});
    return () => { iptal = true; };
  }, [sorgu, evren, turSec]);
  useEffect(() => setSecili(0), [sorgu, turSec, bulunan.length]);

  const kayitAc = (kod: string, yan: boolean) => { if (yan) d.yanPanelAc(kod); else git(`/e/${evren}/k/${kod}`); };
  const s = katla(sorgu.trim());
  const uyar = (metin: string) => !s || katla(metin).includes(s);

  let ogeler: Oge[];
  if (turSec !== null) {
    // Yeni kayıt: tür seçimi.
    ogeler = TURLER.filter((t) => uyar(t.ad)).map((t) => ({
      anahtar: 't-' + t.kod, baslik: t.ad, aciklama: t.grup,
      yap: async (yan) => {
        const { kod } = await istemci.iste('kayitOlustur', { evren: evren!, ad: turSec, tur: t.kod });
        kayitAc(kod, yan);
      },
    }));
  } else {
    const komutlar: Oge[] = [];
    if (baglam.bagla) komutlar.push({ anahtar: 'bagla', baslik: 'Bağla', aciklama: 'Seçili metni ya da imleçteki yeri bir kayda bağla', yap: () => baglam.bagla!() });
    komutlar.push({ anahtar: 'not', baslik: 'Hızlı not', aciklama: 'Aklına geleni yaz', yap: () => { document.dispatchEvent(new Event('hizli-not-ac')); } });
    if (evren) {
      if (sorgu.trim()) komutlar.push({ anahtar: 'yeni', baslik: `Yeni kayıt: “${sorgu.trim()}”`, aciklama: 'Türünü seçersin', yap: () => { setTurSec(sorgu.trim().replace(/\s+/g, ' ')); setSorgu(''); } });
      komutlar.push({ anahtar: 'masa', baslik: 'Masa', aciklama: 'Kaldığın yer, son düzenlenenler', yap: () => git(`/e/${evren}/masa`) });
      komutlar.push({ anahtar: 'kayitlar', baslik: 'Bütün kayıtlar', yap: () => git(`/e/${evren}/kayitlar`) });
      if (d.yanPanel.length) komutlar.push({ anahtar: 'panel-kapat', baslik: 'Yan paneli kapat', yap: () => d.yanPanelKapat() });
    }
    komutlar.push({ anahtar: 'evrenler', baslik: 'Evrenler', yap: () => git('/') });
    komutlar.push({ anahtar: 'esitleme', baslik: 'Eşitleme ve cihazlar', yap: () => git('/esitleme') });
    const kayitlar: Oge[] = (sorgu.trim() ? bulunan : son).map((k) => ({
      anahtar: 'k-' + k.kod, baslik: k.ad, aciklama: ayirtEtme(k), kayit: true, yap: (yan) => kayitAc(k.kod, yan),
    }));
    const uyan = komutlar.filter((k) => k.anahtar === 'yeni' || uyar(k.baslik));
    // Arama varken kayıtlar önce; yeni kayıt komutu kayıtlardan sonra.
    ogeler = sorgu.trim() ? [...kayitlar, ...uyan] : [...uyan.filter((k) => k.anahtar === 'bagla'), ...kayitlar, ...uyan.filter((k) => k.anahtar !== 'bagla')];
  }

  const calistir = async (o: Oge, yan: boolean) => {
    setHata(null);
    try {
      if (o.anahtar === 'yeni') { await o.yap(yan); return; } // tür seçimine geçer, palet açık kalır
      kapat();
      await o.yap(yan);
    } catch (e) { setHata((e as Error).message); }
  };

  return (
    <div class="perde palet-perdesi" onClick={(e) => { if (e.target === e.currentTarget) kapat(); }}>
      <div class="palet kart" role="dialog" aria-label="Komut paleti">
        <input ref={girdi} class="girdi" lang="tr" value={sorgu} aria-label={turSec !== null ? 'Tür ara' : 'Kayıt ya da komut ara'}
          placeholder={turSec !== null ? `“${turSec}” hangi türden?` : evren ? 'Kayıt aç ya da komut yaz…' : 'Komut yaz…'}
          onInput={(e) => setSorgu((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); if (turSec !== null) { setTurSec(null); setSorgu(''); } else kapat(); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); setSecili((i) => Math.min(ogeler.length - 1, i + 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSecili((i) => Math.max(0, i - 1)); }
            else if (e.key === 'Enter' && ogeler[secili]) { e.preventDefault(); void calistir(ogeler[secili], e.shiftKey); }
          }} />
        <ul class="palet-listesi" role="listbox">
          {ogeler.map((o, i) => (
            <li key={o.anahtar} role="option" aria-selected={i === secili} class={i === secili ? 'secili' : ''}
              onMouseMove={() => setSecili(i)} onClick={() => calistir(o, false)}>
              <span class="palet-baslik">{o.baslik}</span>
              {o.aciklama && <span class="soluk kucuk"> {o.aciklama}</span>}
              {o.kayit && <button class="dugme sade kucuk palet-yan" onClick={(e) => { e.stopPropagation(); void calistir(o, true); }}>Yan panel</button>}
            </li>
          ))}
          {!ogeler.length && <li class="soluk kucuk">Uyan bir şey yok.</li>}
        </ul>
        <p class="soluk kucuk" style="margin:6px 0 0">Enter: aç · Shift+Enter: yan panelde aç · Esc: kapat</p>
        {hata && <p class="hata kucuk">{hata}</p>}
      </div>
    </div>
  );
}
