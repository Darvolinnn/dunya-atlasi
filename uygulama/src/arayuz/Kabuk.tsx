// Evren içindeki her ekranın kabuğu (§5.10, K24): solda sabit gezinti çubuğu. "Yaz" seçiliyken eserlerin ağacı
// (eser › bölüm › sahne) çubukta görünür. Çubukta yalnız seçili kipin sayfaları (§5.11, K43) ve sabitlenenler durur;
// grafikler ve az kullanılan sayfalar Araçlar sayfasındadır.
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { gitVeYap, YENI_SAHNE_OLAYI } from './yonlendirme';
import { AracTanitimi } from './AracTanitimi';
import type { Istemci } from '../veri/istemci';
import type { EserYapisi, EvrenBilgisi, KisaKayit, YapiSahnesi } from '../veri/api';
import { git } from './Uygulama';
import { DurumOzeti } from './Esitleme';
import { KurguBaglami } from './kurgu';
import { useBagGorunumuUygula } from './BagGorunumu';
import { SAHNE_CALISMA } from '../alan/sablon';
import { hareketAzMi, hareketDegerleri } from './tema';
import { GezintiSimgesi, simgesiVar } from './simgeler';
import { KIPLER, kipKapsar, kipYaz, MENU_KIPI, useKip, useSabitler } from './kip';

/** İnceleme görünümleri (§7): aynı verinin farklı çizimleri. */
export const GORUNUMLER = [['cizelge', 'Zaman çizelgesi'], ['ag', 'Ağ'], ['soy', 'Soy ağacı'], ['neden', 'Neden–sonuç'], ['durumlar', 'Durum geçmişi'],
  ['yogunluk', 'Yoğunluk ve boşluk'], ['gokyuzu', 'Gökyüzü'], ['sozluk', 'Sözlük denetimi'], ['metin-denetimi', 'Metin denetimi'], ['sozlesme', 'Anlatı sözleşmesi'],
  ['kosullar', 'Sonuçtan koşullara'], ['kesif', 'Keşif soruları'], ['hatlar', 'Kurgu hatları'], ['orgu', 'Olay örgüsü'], ['matris', 'Bölüm × kayıt'],
  ['gun', 'Sıradan bir gün'], ['karsilastir', 'Karşılaştırmalı okuma'], ['gezinti', 'Gezintiler'], ['pano', 'Görsel panolar'], ['okur-yayini', 'Okur yayını']] as const;
/** Grafik araçlarının amaca göre grupları (taslak 2A, 6 Kasım): menüde ara başlık olarak görünür; başlıklar tıklanmaz. */
export const GORUNUM_GRUPLARI: readonly (readonly [string, readonly string[]])[] = [
  ['Zaman', ['cizelge', 'durumlar', 'yogunluk', 'gun', 'gokyuzu']],
  ['İlişkiler', ['ag', 'soy', 'neden']],
  ['Kurgu', ['hatlar', 'orgu', 'matris', 'sozlesme', 'karsilastir', 'kosullar', 'kesif']],
  ['Dil ve derleme', ['sozluk', 'metin-denetimi', 'gezinti', 'pano']],
  ['Yayın', ['okur-yayini']],
];
export const gorunumMu = (s: string) => GORUNUMLER.some(([g]) => g === s);

/** Gezinti çubuğunun ana sayfaları (kipe göre süzülür) ve yalnız Araçlar sayfasından açılanlar; komut paleti de bu listeleri kullanır. */
export const ANA_SAYFALAR = [['yaz', 'Yaz'], ['masa', 'Genel bakış'], ['kayitlar', 'Kayıtlar'], ['terimler', 'Sözlük'], ['haritalar', 'Haritalar'], ['takvim', 'Takvim'], ['tuval', 'Pano'], ['inceleme', 'Uyarılar'], ['araclar', 'Araçlar']] as const;
export const DIGER_SAYFALAR = [['masalar', 'Konu dosyaları'], ['meseleler', 'Karar bekleyenler'], ['sablonlar', 'Şablonlar'], ['gorunum', 'Görünüm'], ['bahsedilen', 'Henüz yazılmayanlar'],
  ['cop', 'Çöp kutusu'], ['gecmis', 'Değişiklik geçmişi'], ['surumler', 'Kayıtlı anlar'], ['yedek', 'Yedek']] as const;

/** Her sayfanın ve aracın adı (sabitlenenler gezintide bu adla görünür). */
export const SAYFA_ADI = new Map<string, string>([...ANA_SAYFALAR, ...DIGER_SAYFALAR, ...GORUNUMLER]);
// Her ekran kendi kabuğunu çizer; ekran değişince kabuk yeniden kurulur. Son okunan evren bilgisi ve eser ağacı
// burada tutulur ki gezinti yeni bilgi gelene dek boş kalmasın, yerinden oynamasın (yeni bilgi gelince yenilenir).
const bilgiBellegi = new Map<string, EvrenBilgisi>();
type AgacVerisi = { eserler: KisaKayit[]; yapilar: Record<string, EserYapisi>; disarida: YapiSahnesi[]; seriler: { kod: string; ad: string; eserler: { kod: string }[] }[] };
const agacBellegi = new Map<string, AgacVerisi>();

/** Sayfa değişince içerik yumuşakça belirir (K32, K41: süre, mesafe ve eğri stil.css'teki --hz-* değişkenlerinden);
 * "animasyonları azalt" ayarı açıksa hiç oynamaz. */
export function useSayfaGecisi(anahtar: string) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el?.animate || hareketAzMi()) return;
    const { sure, mesafe, egri } = hareketDegerleri();
    const a = el.animate([{ opacity: 0, transform: `translateY(${mesafe}px)` }, { opacity: 1, transform: 'none' }], { duration: sure, easing: egri });
    return () => a.cancel();
  }, [anahtar]);
  return ref;
}

/** Bir öğenin gezinti çubuğu içindeki konumu (çubuk kaydırılmış olsa da). */
function gezintideKonum(el: HTMLElement, nav: HTMLElement) {
  const r = el.getBoundingClientRect();
  const n = nav.getBoundingClientRect();
  return { ust: r.top - n.top + nav.scrollTop, sol: r.left - n.left, en: r.width, boy: r.height };
}
// Kayan seçim vurgusu (K41): kabuk her ekranda yeniden kurulduğu için seçili satırın son konumu burada tutulur;
// yeni ekranda altın zemin eski satırdan yeni satıra kayar.
let sonVurgu: { evren: string; ust: number; boy: number } | null = null;
// Evrene giriş (K41): Evrenler sayfasından bir evrene girilince kabuk hafif bir derinlik geçişiyle gelir.
let sonKabukEvreni: string | null = null;
let kabukSonGorulme = 0;

function useGezintiHareketleri(evren: string, etkin: string) {
  const navRef = useRef<HTMLElement>(null);
  const kabukRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    // Kabuk bir an kalkıp aynı evrende yeniden kurulursa (ekran değişimi) giriş geçişi oynamaz; yalnız evrene girerken.
    const girdi = sonKabukEvreni !== evren || performance.now() - kabukSonGorulme > 1500;
    sonKabukEvreni = evren;
    const el = kabukRef.current;
    if (girdi) sonVurgu = null;
    if (!girdi || !el?.animate || hareketAzMi()) return;
    const { sure, olcek, egri } = hareketDegerleri();
    const a = el.animate([{ opacity: 0, transform: `scale(${olcek})` }, { opacity: 1, transform: 'none' }], { duration: Math.round(sure * 1.15), easing: egri });
    return () => a.cancel();
  }, [evren]);
  useEffect(() => () => { kabukSonGorulme = performance.now(); }, []);
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const sec = nav.querySelector<HTMLElement>(':scope > .gezinti-listesi > li > .gezinti-ogesi.secili');
    if (!sec) { sonVurgu = null; return; }
    const yeni = gezintideKonum(sec, nav);
    const eski = sonVurgu;
    sonVurgu = { evren, ust: yeni.ust, boy: yeni.boy };
    if (!eski || eski.evren !== evren || Math.abs(eski.ust - yeni.ust) < 1 || !sec.animate || hareketAzMi()) return;
    const v = document.createElement('div');
    v.className = 'gezinti-vurgu';
    v.setAttribute('aria-hidden', 'true');
    Object.assign(v.style, { top: `${yeni.ust}px`, left: `${yeni.sol}px`, width: `${yeni.en}px`, height: `${yeni.boy}px` });
    nav.appendChild(v);
    nav.classList.add('vurgu-kayiyor');
    const { sure, egri } = hareketDegerleri();
    const a = v.animate([{ transform: `translateY(${eski.ust - yeni.ust}px) scaleY(${eski.boy / yeni.boy})` }, { transform: 'none' }], { duration: sure, easing: egri });
    const bitir = () => { v.remove(); nav.classList.remove('vurgu-kayiyor'); };
    a.onfinish = bitir; a.oncancel = bitir;
    return () => a.cancel();
  }, [evren, etkin]);
  return { navRef, kabukRef };
}

/** Katlanan liste (K41): açılırken yüksekliği uzar, kapanırken kısalır; kapanış bitene dek içerik yerinde kalır.
 * İlk çizimde oynamaz. "Animasyonları azalt" açıksa anlık. */
export function Katlanir({ acik, children }: { acik: boolean; children: (ref: preact.RefObject<HTMLUListElement>) => preact.ComponentChildren }) {
  const ref = useRef<HTMLUListElement>(null);
  const [cizili, setCizili] = useState(acik);
  const ilk = useRef(true);
  const ilkAcilis = useRef(true);
  const oynayan = useRef<Animation | null>(null);
  useLayoutEffect(() => {
    if (ilk.current) { ilk.current = false; return; }
    if (acik) setCizili(true);
    const el = ref.current;
    if (!acik && (!el?.animate || hareketAzMi())) { setCizili(false); return; }
    if (!acik && el) {
      oynayan.current?.cancel();
      const { sure } = hareketDegerleri();
      const a = el.animate([{ height: `${el.offsetHeight}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: Math.round(sure * 0.8), easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
      el.style.overflow = 'hidden';
      oynayan.current = a;
      a.onfinish = () => { setCizili(false); oynayan.current = null; };
    }
  }, [acik]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (ilkAcilis.current) { ilkAcilis.current = false; return; }
    if (!acik || !cizili || !el) return;
    if (!el.animate || hareketAzMi()) return;
    if (oynayan.current) { oynayan.current.cancel(); oynayan.current = null; }
    el.style.overflow = 'hidden';
    const { sure, egri } = hareketDegerleri();
    const a = el.animate([{ height: '0px', opacity: 0 }, { height: `${el.scrollHeight}px`, opacity: 1 }], { duration: sure, easing: egri });
    const bitir = () => { el.style.overflow = ''; };
    a.onfinish = bitir; a.oncancel = bitir;
  }, [acik, cizili]);
  return <>{(acik || cizili) && children(ref)}</>;
}

export function EvrenKabugu({ istemci, evren, etkin, acik = null, children }: {
  istemci: Istemci; evren: string; etkin: string; acik?: string | null; children: preact.ComponentChildren;
}) {
  const [bilgi, setBilgi] = useState<EvrenBilgisi | null>(() => bilgiBellegi.get(evren) ?? null);
  const [surum, setSurum] = useState(0);
  const kip = useKip(evren);
  const sabitler = useSabitler(evren);
  useEffect(() => { istemci.iste('evrenBilgisi', { evren }).then((b) => { bilgiBellegi.set(evren, b); setBilgi(b); }, () => {}); }, [evren, surum]);
  useEffect(() => istemci.dinle((d) => { if (d.evren === evren) setSurum((s) => s + 1); }), [evren]);
  useBagGorunumuUygula(istemci, evren, bilgi?.bagGorunumu, surum);
  const icRef = useSayfaGecisi(`${etkin}/${acik ?? ''}`);
  const { navRef, kabukRef } = useGezintiHareketleri(evren, etkin);

  const sayi = (k: string) => !bilgi ? '' : k === 'kayitlar' ? bilgi.kayitSayisi : k === 'cop' ? bilgi.copSayisi
    : k === 'inceleme' ? (bilgi.catismaSayisi + bilgi.sorunSayisi || '') : '';
  const bagli = !!bilgi?.bag;
  const kurgu = bilgi?.kurguTuru ?? null;
  // Kipin gösterdiği ana sayfalar; Uyarılar Hikâye kipte yalnız uyarı varken görünür. Sabitlenenler Araçlar'ın önünde durur.
  const kipte = (k: string) => kipKapsar(kip, MENU_KIPI[k] ?? 'tam') && (k !== 'inceleme' || kip === 'tam' || sayi('inceleme') !== '' || etkin === k);
  const gorunenler = ANA_SAYFALAR.filter(([k]) => k !== 'araclar' && kipte(k)).map(([k]) => k as string);
  const sabitGorunen = sabitler.filter((k) => SAYFA_ADI.has(k) && !gorunenler.includes(k) && !(bagli && ['surumler', 'yedek'].includes(k)));
  const menude = [...gorunenler, ...sabitGorunen];
  const oge = (k: string, ad: string, sabit = false) => {
    const secili = k === 'araclar' ? !menude.includes(etkin) : etkin === k;
    const n = sayi(k);
    return (
      <li key={k}>
        <a class={secili ? 'gezinti-ogesi secili' : 'gezinti-ogesi'} aria-current={secili ? 'page' : undefined} href={`#/e/${evren}/${k}`}>
          <span class="gezinti-ad"><GezintiSimgesi kod={sabit && !simgesiVar(k) ? 'araclar' : k} />{ad}</span>{n !== '' ? <span class="gezinti-sayi">{n}</span> : sabit && <span class="sabit-isaret">sabit</span>}
        </a>
        {k === 'yaz' && etkin === 'yaz' && <EserAgaci istemci={istemci} evren={evren} acik={acik} surum={surum} saltOkunur={bagli} />}
      </li>
    );
  };

  return (
    <div class="kabuk" ref={kabukRef}>
      <nav class="gezinti" aria-label="Evrende gezinti" ref={navRef}>
        <a class="gezinti-geri" href="#/">← Evrenler</a>
        <div class="gezinti-evren" title={bilgi?.ad}>{bilgi?.ad ?? '…'}</div>
        <div class="kip-salteri" role="radiogroup" aria-label="Deneyim kipi">
          {KIPLER.map(([k, ad, aciklama]) => (
            <button key={k} type="button" role="radio" aria-checked={kip === k} class={kip === k ? 'secili' : undefined} title={aciklama}
              onClick={() => kipYaz(evren, k)}>{ad}</button>
          ))}
        </div>
        <ul class="gezinti-listesi">
          {gorunenler.map((k) => oge(k, SAYFA_ADI.get(k)!))}
          {sabitGorunen.map((k) => oge(k, SAYFA_ADI.get(k)!, true))}
          {oge('araclar', 'Araçlar')}
        </ul>
        <div class="gezinti-alti">
          <DurumOzeti istemci={istemci} evren={evren} yedekVar={!bagli} />
          {!bagli && !!bilgi?.copSayisi && <a class="cop-bag" href={`#/e/${evren}/cop`}>Çöp kutusu ({bilgi.copSayisi})</a>}
          <span>Komutlar: Ctrl+K</span>
        </div>
      </nav>
      <div class="kabuk-ic" ref={icRef}>{!bagli && etkin !== 'yaz' && <AracTanitimi istemci={istemci} evren={evren} />}<KurguBaglami.Provider value={kurgu}>{children}</KurguBaglami.Provider></div>
    </div>
  );
}

const hataYaz = (e: unknown) => (e as Error).message;

/** Gezinti çubuğunda eserler, bölümler ve sahneler; yenileri buradan eklenir. */
function EserAgaci({ istemci, evren, acik, surum, saltOkunur }: { istemci: Istemci; evren: string; acik: string | null; surum: number; saltOkunur: boolean }) {
  const [onceki] = useState(() => agacBellegi.get(evren));
  const [eserler, setEserler] = useState<KisaKayit[] | null>(onceki?.eserler ?? null);
  const [yapilar, setYapilar] = useState<Record<string, EserYapisi>>(onceki?.yapilar ?? {});
  const [disarida, setDisarida] = useState<YapiSahnesi[]>(onceki?.disarida ?? []);
  const [yeni, setYeni] = useState<{ ust: string | null; tur: 'eser' | 'bolum' | 'sahne' | 'seri' } | null>(null);
  const [seriler, setSeriler] = useState<AgacVerisi['seriler']>(onceki?.seriler ?? []);
  useEffect(() => { if (eserler) agacBellegi.set(evren, { eserler, yapilar, disarida, seriler }); }, [evren, eserler, yapilar, disarida, seriler]);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => {
    istemci.iste('eserler', { evren }).then(async (l) => {
      const y: Record<string, EserYapisi> = {};
      await Promise.all(l.map(async (e) => { y[e.kod] = await istemci.iste('eserYapisi', { evren, eser: e.kod }); }));
      setYapilar(y); setEserler(l);
    }, () => setEserler([]));
    istemci.iste('yerlesmemisler', { evren }).then((l) => setDisarida(l.filter((x) => x.tur === 'sahne')), () => {});
    istemci.iste('seriler', { evren }).then((r) => setSeriler(r.seriler), () => setSeriler([]));
  }, [evren, surum]);
  // "Yeni sahne" isteği (eser oluşturulunca ya da İlk adımlardaki "Yap"): eserin son bölümünün, bölümü yoksa
  // eserin altındaki sahne adı kutusu açılır.
  // İstek, ağaç yeni eseri okumadan gelebilir; eserin yapısı okununca uygulanır.
  const [sahneIstegi, setSahneIstegi] = useState<string | null>(null);
  useEffect(() => {
    const ac = (e: Event) => setSahneIstegi((e as CustomEvent<string>).detail);
    addEventListener(YENI_SAHNE_OLAYI, ac);
    return () => removeEventListener(YENI_SAHNE_OLAYI, ac);
  }, []);
  useEffect(() => {
    const y = sahneIstegi ? yapilar[sahneIstegi] : undefined;
    if (!sahneIstegi || !y) return;
    setSahneIstegi(null);
    if (saltOkunur) return;
    setYeni({ ust: y.bolumler.length ? y.bolumler[y.bolumler.length - 1].kod : sahneIstegi, tur: 'sahne' }); setHata(null);
  }, [sahneIstegi, yapilar, saltOkunur]);
  // Bir parça açıkken yalnız onun eseri ve bölümü açık gelir; öbürleri katlıdır ve tek tıkla açılır (§5.10). Hiçbir
  // parça açık değilken (Yaz sayfası) ağacın tamamı açıktır.
  const [acilan, setAcilan] = useState<Set<string>>(new Set());
  const [kapanan, setKapanan] = useState<Set<string>>(new Set());
  useEffect(() => { setAcilan(new Set()); setKapanan(new Set()); }, [acik]);
  if (!eserler) return null;
  const yolda = new Set<string>();
  for (const [ek, y] of Object.entries(yapilar)) {
    if (ek === acik || y.dogrudan.some((x) => x.kod === acik)) yolda.add(ek);
    for (const b of y.bolumler) if (b.kod === acik || b.sahneler.some((x) => x.kod === acik)) { yolda.add(ek); yolda.add(b.kod); }
  }
  if (yeni?.ust) { yolda.add(yeni.ust); for (const [ek, y] of Object.entries(yapilar)) if (y.bolumler.some((b) => b.kod === yeni.ust)) yolda.add(ek); }
  const acikMi = (k: string) => !kapanan.has(k) && (acik === null || yolda.has(k) || acilan.has(k));
  const cevir = (k: string) => {
    const a = acikMi(k);
    setAcilan((s) => { const n = new Set(s); if (a) n.delete(k); else n.add(k); return n; });
    setKapanan((s) => { const n = new Set(s); if (a) n.add(k); else n.delete(k); return n; });
  };
  const ok = (k: string, ad: string) => (
    <button class="agac-ok" aria-expanded={acikMi(k)} aria-label={`${ad}: ${acikMi(k) ? 'kapat' : 'aç'}`} onClick={() => cevir(k)}><span class="agac-ok-isareti" aria-hidden="true">▸</span></button>
  );

  const ekle = async (ad: string) => {
    if (!yeni) return;
    try {
      if (yeni.tur === 'seri') {
        const { kod } = await istemci.iste('kayitOlustur', { evren, ad, tur: 'seri' });
        setYeni(null); setHata(null);
        git(`/e/${evren}/k/${kod}`);
        return;
      }
      const { kod } = yeni.tur === 'eser'
        ? await istemci.iste('kayitOlustur', { evren, ad, tur: 'eser' })
        : await istemci.iste('anlatiOlustur', { evren, ust: yeni.ust!, ad, tur: yeni.tur });
      if (yeni.tur === 'eser' && yeni.ust) await istemci.iste('anlatiYerlestir', { evren, kod, ust: yeni.ust });
      setYeni(null); setHata(null);
      git(`/e/${evren}/yaz/${kod}`);
      // Yeni eserin ardından ilk sahnenin adı sorulur (K26).
      if (yeni.tur === 'eser') void gitVeYap(null, [{ bekle: `.eser-agaci a[href$="/yaz/${kod}"]`, olay: YENI_SAHNE_OLAYI, detay: kod }]);
    } catch (e) { setHata(hataYaz(e)); }
  };
  const yeniSatir = (ust: string | null, tur: 'eser' | 'bolum' | 'sahne' | 'seri', etiket: string) =>
    saltOkunur ? null : yeni && yeni.ust === ust && yeni.tur === tur
      ? <YeniAd ipucu={tur === 'eser' ? 'Eserin adı' : tur === 'bolum' ? 'Bölümün adı' : tur === 'seri' ? 'Serinin adı' : 'Sahnenin adı'} ekle={ekle} vazgec={() => setYeni(null)} />
      : <button class="agac-ekle" onClick={() => { setYeni({ ust, tur }); setHata(null); }}>{etiket}</button>;
  const dal = (k: { kod: string; ad: string }, sinif: string) => (
    <a class={k.kod === acik ? `${sinif} secili` : sinif} aria-current={k.kod === acik ? 'page' : undefined} href={`#/e/${evren}/yaz/${k.kod}`}>{k.ad}</a>
  );
  // Durum noktası (K39): boş halka metinsiz, yarım nokta yazılıyor, dolu nokta gözden geçirildi.
  const durumNoktasi = (s: YapiSahnesi) => {
    const n = s.kelime ?? 0;
    const sinif = !n ? 'nokta-bos' : s.calisma === 'gozden_gecirildi' ? 'nokta-tam' : 'nokta-yarim';
    const durum = SAHNE_CALISMA.find((x) => x.kod === s.calisma)?.ad;
    return <span class={`agac-nokta ${sinif}`} title={[n ? `${n.toLocaleString('tr-TR')} kelime` : 'Metni yok', durum].filter(Boolean).join(' · ')} aria-hidden="true" />;
  };
  const sahneler = (l: YapiSahnesi[]) => l.map((s) => (
    <li key={s.kod}>
      <a class={s.kod === acik ? 'agac-sahne secili' : 'agac-sahne'} aria-current={s.kod === acik ? 'page' : undefined} href={`#/e/${evren}/yaz/${s.kod}`}>{durumNoktasi(s)}{s.ad}</a>
    </li>
  ));

  // Seriler (K27): eserler serinin altında önerilen okuma sırasıyla; serisi olmayanlar en üst düzeyde.
  const seride = new Set(seriler.flatMap((s) => s.eserler.map((x) => x.kod)));
  const eserBul = (kod: string) => eserler.find((x) => x.kod === kod);
  const eserDali = (e: KisaKayit) => {
        const y = yapilar[e.kod];
        return (
          <div key={e.kod} class="agac-eser">
            <div class="agac-satir">{ok(e.kod, e.ad)}{dal(e, 'agac-eser-ad')}</div>
            {y && <Katlanir acik={acikMi(e.kod)}>{(ref) => (
              <ul class="agac-liste" ref={ref}>
                {sahneler(y.dogrudan)}
                {y.bolumler.map((b) => (
                  <li key={b.kod}>
                    <div class="agac-satir">{ok(b.kod, b.ad)}{dal({ kod: b.kod, ad: `${b.sira}. ${b.ad}` }, 'agac-bolum')}</div>
                    <Katlanir acik={acikMi(b.kod)}>{(ref) => <ul class="agac-liste" ref={ref}>
                      {sahneler(b.sahneler)}
                      <li>{yeniSatir(b.kod, 'sahne', '+ Sahne')}</li>
                    </ul>}</Katlanir>
                  </li>
                ))}
                {!y.bolumler.length && <li>{yeniSatir(e.kod, 'sahne', '+ Sahne')}</li>}
                <li>{yeniSatir(e.kod, 'bolum', '+ Bölüm')}</li>
              </ul>
            )}</Katlanir>}
          </div>
        );
  };

  return (
    <div class="eser-agaci">
      {seriler.map((s) => (
        <div key={s.kod} class="agac-seri">
          <a class={s.kod === acik ? 'agac-seri-ad secili' : 'agac-seri-ad'} href={`#/e/${evren}/k/${s.kod}`}>{s.ad}</a>
          <div class="agac-seri-ici">
            {s.eserler.map((x) => eserBul(x.kod)).filter((x): x is KisaKayit => !!x).map(eserDali)}
            {yeniSatir(s.kod, 'eser', '+ Bu seriye eser')}
          </div>
        </div>
      ))}
      {eserler.filter((e) => !seride.has(e.kod)).map(eserDali)}
      {disarida.length > 0 && (
        <details class="agac-disarida">
          <summary>Esere yerleştirilmemiş ({disarida.length})</summary>
          <ul class="agac-liste">{sahneler(disarida)}</ul>
        </details>
      )}
      {yeniSatir(null, 'eser', '+ Yeni eser')}
      {yeniSatir(null, 'seri', '+ Yeni seri')}
      {hata && <p class="hata kucuk">{hata}</p>}
    </div>
  );
}

function YeniAd({ ipucu, ekle, vazgec }: { ipucu: string; ekle: (ad: string) => Promise<void>; vazgec: () => void }) {
  const [ad, setAd] = useState('');
  const girdi = useRef<HTMLInputElement>(null);
  useEffect(() => { girdi.current?.focus(); }, []);
  return (
    <form class="agac-yeni" onSubmit={(e) => { e.preventDefault(); if (ad.trim()) void ekle(ad.trim()); }}>
      <input ref={girdi} class="girdi" lang="tr" aria-label={ipucu} placeholder={ipucu} value={ad}
        onInput={(e) => setAd((e.target as HTMLInputElement).value)} onKeyDown={(e) => { if (e.key === 'Escape') vazgec(); }} />
    </form>
  );
}
