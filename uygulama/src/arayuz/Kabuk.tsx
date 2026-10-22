// Evren içindeki her ekranın kabuğu (§5.10, K24): solda sabit gezinti çubuğu. "Yaz" seçiliyken eserlerin ağacı
// (eser › bölüm › sahne) çubukta görünür; görünümlerden biri açıkken görünümlerin listesi açılır. Az kullanılan
// sayfalar "Diğer" altında katlanır.
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { gitVeYap, YENI_SAHNE_OLAYI } from './yonlendirme';
import { SiradakiAdim } from './IlkAdimlar';
import type { Istemci } from '../veri/istemci';
import type { EserYapisi, EvrenBilgisi, KisaKayit, YapiSahnesi } from '../veri/api';
import { git } from './Uygulama';
import { DurumOzeti } from './Esitleme';
import { uzakGorunumMu } from '../alan/turler';
import { KurguBaglami } from './kurgu';

/** İnceleme görünümleri (§7): aynı verinin farklı çizimleri. */
export const GORUNUMLER = [['cizelge', 'Zaman çizelgesi'], ['ag', 'Ağ'], ['soy', 'Soy ağacı'], ['neden', 'Neden–sonuç'], ['durumlar', 'Durum geçmişi'],
  ['yogunluk', 'Yoğunluk ve boşluk'], ['gokyuzu', 'Gökyüzü'], ['sozluk', 'Sözlük denetimi'], ['sozlesme', 'Anlatı sözleşmesi'],
  ['kosullar', 'Sonuçtan koşullara'], ['kesif', 'Keşif soruları'], ['hatlar', 'Kurgu hatları'], ['orgu', 'Olay örgüsü'], ['matris', 'Bölüm × kayıt'],
  ['gun', 'Sıradan bir gün'], ['karsilastir', 'Karşılaştırmalı okuma'], ['gezinti', 'Gezintiler'], ['pano', 'Görsel panolar']] as const;
export const gorunumMu = (s: string) => GORUNUMLER.some(([g]) => g === s);

/** Ana sayfalar ve "Diğer" altındakiler; komut paleti de bu listeyi kullanır. */
export const ANA_SAYFALAR = [['yaz', 'Yaz'], ['masa', 'Genel bakış'], ['kayitlar', 'Kayıtlar'], ['haritalar', 'Haritalar'], ['takvim', 'Takvim'], ['gorunumler', 'Grafikler'], ['inceleme', 'Uyarılar']] as const;
export const DIGER_SAYFALAR = [['masalar', 'Konu dosyaları'], ['meseleler', 'Karar bekleyenler'], ['sablonlar', 'Şablonlar'], ['bahsedilen', 'Henüz yazılmayanlar'],
  ['cop', 'Çöp kutusu'], ['gecmis', 'Değişiklik geçmişi'], ['surumler', 'Kayıtlı anlar'], ['yedek', 'Yedek']] as const;

let sonGorunum = 'cizelge';
const digerAnahtari = 'dunya-atlasi:diger-acik';
const oku = (a: string) => { try { return localStorage.getItem(a); } catch { return null; } };
const yaz = (a: string, v: string) => { try { localStorage.setItem(a, v); } catch { /* yok */ } };

/** Sayfa değişince içerik kısa ve yumuşak belirir; "animasyonları azalt" ayarı açıksa hiç oynamaz. */
export function useSayfaGecisi(anahtar: string) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el?.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const a = el.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' });
    return () => a.cancel();
  }, [anahtar]);
  return ref;
}

export function EvrenKabugu({ istemci, evren, etkin, acik = null, children }: {
  istemci: Istemci; evren: string; etkin: string; acik?: string | null; children: preact.ComponentChildren;
}) {
  const [bilgi, setBilgi] = useState<EvrenBilgisi | null>(null);
  const [surum, setSurum] = useState(0);
  const [digerOynat, setDigerOynat] = useState(false);
  const [digerAcik, setDigerAcik] = useState(() => oku(digerAnahtari) === '1' || DIGER_SAYFALAR.some(([k]) => k === etkin));
  useEffect(() => { istemci.iste('evrenBilgisi', { evren }).then(setBilgi, () => {}); }, [evren, surum]);
  useEffect(() => istemci.dinle((d) => { if (d.evren === evren) setSurum((s) => s + 1); }), [evren]);
  if (gorunumMu(etkin)) sonGorunum = etkin;
  const icRef = useSayfaGecisi(`${etkin}/${acik ?? ''}`);

  const sayi = (k: string) => !bilgi ? '' : k === 'kayitlar' ? bilgi.kayitSayisi : k === 'cop' ? bilgi.copSayisi
    : k === 'inceleme' ? (bilgi.catismaSayisi + bilgi.sorunSayisi || '') : '';
  const bagli = !!bilgi?.bag;
  const kurgu = bilgi?.kurguTuru ?? null;
  const oge = (k: string, ad: string) => {
    const secili = k === 'gorunumler' ? gorunumMu(etkin) : etkin === k;
    const n = sayi(k);
    return (
      <li key={k}>
        <a class={secili ? 'gezinti-ogesi secili' : 'gezinti-ogesi'} aria-current={secili ? 'page' : undefined}
          href={`#/e/${evren}/${k === 'gorunumler' ? sonGorunum : k}`}>
          <span>{ad}</span>{n !== '' && <span class="gezinti-sayi">{n}</span>}
        </a>
        {k === 'yaz' && etkin === 'yaz' && <EserAgaci istemci={istemci} evren={evren} acik={acik} surum={surum} saltOkunur={bagli} />}
        {k === 'gorunumler' && gorunumMu(etkin) && (
          <ul class="gezinti-alt">
            {GORUNUMLER.filter(([g]) => !uzakGorunumMu(kurgu, g) || etkin === g).map(([g, gad]) => (
              <li key={g}><a class={etkin === g ? 'gezinti-ogesi kucuk secili' : 'gezinti-ogesi kucuk'} aria-current={etkin === g ? 'page' : undefined} href={`#/e/${evren}/${g}`}>{gad}</a></li>
            ))}
            {GORUNUMLER.some(([g]) => uzakGorunumMu(kurgu, g) && etkin !== g) && <li><details class="gezinti-uzak">
              <summary class="gezinti-ogesi kucuk">Diğer grafikler</summary>
              <ul class="gezinti-alt">{GORUNUMLER.filter(([g]) => uzakGorunumMu(kurgu, g) && etkin !== g).map(([g, gad]) => (
                <li key={g}><a class="gezinti-ogesi kucuk" href={`#/e/${evren}/${g}`}>{gad}</a></li>))}</ul>
              <p class="soluk kucuk">Gizlenen bölümlerin kayıtları silinmez, yalnızca menüden kalkar.</p>
            </details></li>}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div class="kabuk">
      <nav class="gezinti" aria-label="Evrende gezinti">
        <a class="gezinti-geri" href="#/">← Evrenler</a>
        <div class="gezinti-evren" title={bilgi?.ad}>{bilgi?.ad ?? '…'}</div>
        <ul class="gezinti-listesi">{ANA_SAYFALAR.map(([k, ad]) => oge(k, ad))}</ul>
        <details class={digerOynat ? 'gezinti-diger oynat' : 'gezinti-diger'} open={digerAcik} onToggle={(e) => { const v = (e.target as HTMLDetailsElement).open; setDigerAcik(v); yaz(digerAnahtari, v ? '1' : '0'); }}>
          <summary onClick={() => setDigerOynat(true)}>Diğer</summary>
          <ul class="gezinti-listesi">{DIGER_SAYFALAR.filter(([k]) => !bagli || !['surumler', 'yedek'].includes(k)).map(([k, ad]) => oge(k, ad))}</ul>
        </details>
        <div class="gezinti-alti">
          <DurumOzeti istemci={istemci} evren={evren} yedekVar={!bagli} />
          <span>Komutlar: Ctrl+K</span>
        </div>
      </nav>
      <div class="kabuk-ic" ref={icRef}>{!bagli && !(etkin === 'yaz' && !acik) && <SiradakiAdim istemci={istemci} evren={evren} yazda={etkin === 'yaz'} />}<KurguBaglami.Provider value={kurgu}>{children}</KurguBaglami.Provider></div>
    </div>
  );
}

const hataYaz = (e: unknown) => (e as Error).message;

/** Gezinti çubuğunda eserler, bölümler ve sahneler; yenileri buradan eklenir. */
function EserAgaci({ istemci, evren, acik, surum, saltOkunur }: { istemci: Istemci; evren: string; acik: string | null; surum: number; saltOkunur: boolean }) {
  const [eserler, setEserler] = useState<KisaKayit[] | null>(null);
  const [yapilar, setYapilar] = useState<Record<string, EserYapisi>>({});
  const [disarida, setDisarida] = useState<YapiSahnesi[]>([]);
  const [yeni, setYeni] = useState<{ ust: string | null; tur: 'eser' | 'bolum' | 'sahne' | 'seri' } | null>(null);
  const [seriler, setSeriler] = useState<{ kod: string; ad: string; eserler: { kod: string }[] }[]>([]);
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
    <button class="agac-ok" aria-expanded={acikMi(k)} aria-label={`${ad}: ${acikMi(k) ? 'kapat' : 'aç'}`} onClick={() => cevir(k)}>{acikMi(k) ? '▾' : '▸'}</button>
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
  const sahneler = (l: YapiSahnesi[]) => l.map((s) => <li key={s.kod}>{dal(s, 'agac-sahne')}</li>);

  // Seriler (K27): eserler serinin altında önerilen okuma sırasıyla; serisi olmayanlar en üst düzeyde.
  const seride = new Set(seriler.flatMap((s) => s.eserler.map((x) => x.kod)));
  const eserBul = (kod: string) => eserler.find((x) => x.kod === kod);
  const eserDali = (e: KisaKayit) => {
        const y = yapilar[e.kod];
        return (
          <div key={e.kod} class="agac-eser">
            <div class="agac-satir">{ok(e.kod, e.ad)}{dal(e, 'agac-eser-ad')}</div>
            {y && acikMi(e.kod) && (
              <ul class="agac-liste">
                {sahneler(y.dogrudan)}
                {y.bolumler.map((b) => (
                  <li key={b.kod}>
                    <div class="agac-satir">{ok(b.kod, b.ad)}{dal({ kod: b.kod, ad: `${b.sira}. ${b.ad}` }, 'agac-bolum')}</div>
                    {acikMi(b.kod) && <ul class="agac-liste">
                      {sahneler(b.sahneler)}
                      <li>{yeniSatir(b.kod, 'sahne', '+ Sahne')}</li>
                    </ul>}
                  </li>
                ))}
                {!y.bolumler.length && <li>{yeniSatir(e.kod, 'sahne', '+ Sahne')}</li>}
                <li>{yeniSatir(e.kod, 'bolum', '+ Bölüm')}</li>
              </ul>
            )}
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
