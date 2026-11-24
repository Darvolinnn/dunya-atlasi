// Ölçekli geometri kipi ve erişim konturları (§8.4, §15-2, §2.2 kural 1 ve 13, §2.3).
// Yalnızca ilgili görünüm açılınca çalışır; hesaplar Web Worker üzerinden arka planda yürür ve arayüzü dondurmaz.
import { sayiGirdisi } from '../alan/nicelik';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import { geriAlinabilir } from './onay';
import type {
  HaritaAyrintisi,
  OlcekliHaritaDurumu,
  OlcekliHizKurali,
  OlcekliKonturSonucu,
  OlcekliOlcumSonucu,
  OlcekliSonucZarfi,
} from '../veri/api';

const hataYaz = (e: unknown) => (e as Error).message;

const HUKUM_YAZISI: Record<OlcekliSonucZarfi['hukum'], string> = {
  cozum_bulundu: 'Tanımlı model içinde çözüm bulundu',
  kayitli_seceneklerde_bulunamadi: 'Kayıtlı seçeneklerle çözüm bulunamadı (bu, evrende imkânsız olduğunu göstermez)',
  denetlenemiyor: 'Bilgi eksik olduğu için hesaplanamıyor',
};

type TiklamaHedefi = 'yok' | 'olcek1' | 'olcek2' | 'olcumBas' | 'olcumBit' | 'konturBas' | 'araziNokta';

const HEDEF_YAZISI: Record<TiklamaHedefi, string> = {
  yok: '',
  olcek1: 'ölçeğin 1. noktası',
  olcek2: 'ölçeğin 2. noktası',
  olcumBas: 'ölçümün başlangıcı',
  olcumBit: 'ölçümün bitişi',
  konturBas: 'ulaşılabilecek yerlerin başlangıç noktası',
  araziNokta: 'arazinin yeni köşesi',
};

/** Ölçekli çizimin haritanın üstünde çizilen katmanı ve ona tıklanarak seçilen noktalar (K38): çekmece kapansa da kalır. */
export interface OlcekliKatman {
  acik: boolean;
  durum: OlcekliHaritaDurumu | null;
  hedef: TiklamaHedefi;
  olcumBas: [number, number]; olcumBit: [number, number]; konturBas: [number, number];
  olcumSonuc: OlcekliOlcumSonucu | null; konturSonuc: OlcekliKonturSonucu | null;
  olcumDurum: 'bos' | 'hesaplaniyor' | 'guncel' | 'onceki_sonuc'; konturDurum: 'bos' | 'hesaplaniyor' | 'guncel' | 'onceki_sonuc';
  araziNoktalar: [number, number][];
  /** Ölçek formunun iki noktası. */
  p1: [number, number]; p2: [number, number];
  goster: { olcek: boolean; arazi: boolean; erisim: boolean; yol: boolean };
  hata: string | null;
}
type Guncelle = Partial<OlcekliKatman> | ((o: OlcekliKatman) => Partial<OlcekliKatman>);
export interface OlcekliKatmanDenetimi { k: OlcekliKatman; set: (g: Guncelle) => void; yukle: () => void }

const BOS_HARITA = { en: 0, boy: 0 };
const baslangic = (h: { en: number; boy: number }): OlcekliKatman => ({
  acik: false, durum: null, hedef: 'yok',
  olcumBas: [0, 0], olcumBit: [Math.round(h.en / 2), Math.round(h.boy / 2)], konturBas: [Math.round(h.en / 2), Math.round(h.boy / 2)],
  olcumSonuc: null, konturSonuc: null, olcumDurum: 'bos', konturDurum: 'bos', araziNoktalar: [], p1: [0, 0], p2: [Math.min(100, h.en), 0],
  goster: { olcek: true, arazi: true, erisim: true, yol: true }, hata: null,
});

/** Haritanın kendisinde tutulur: ölçekli bölüm açıkken veri okunur, değişince yenilenir. */
export function useOlcekliKatman(istemci: Istemci, evren: string, h: HaritaAyrintisi | null): OlcekliKatmanDenetimi {
  const [k, setK] = useState<OlcekliKatman>(() => baslangic(h ?? BOS_HARITA));
  const set = (g: Guncelle) => setK((o) => ({ ...o, ...(typeof g === 'function' ? g(o) : g) }));
  useEffect(() => setK(baslangic(h ?? BOS_HARITA)), [h?.kod]);
  const yukle = () => {
    if (!h) return;
    istemci.iste('olcekliHaritaDurumu', { evren, harita: h.kod }).then(
      (d) => set((o) => ({ durum: d, hata: null, olcumDurum: o.olcumDurum === 'guncel' ? 'onceki_sonuc' : o.olcumDurum, konturDurum: o.konturDurum === 'guncel' ? 'onceki_sonuc' : o.konturDurum })),
      (err) => set({ hata: hataYaz(err) }),
    );
  };
  useEffect(() => {
    if (!k.acik) return;
    yukle();
    return istemci.dinle((d) => { if (d.evren === evren) yukle(); });
  }, [k.acik, evren, h?.kod]);
  return { k, set, yukle };
}

/** Haritanın görseline tıklanan nokta, ölçekli bölüm bir nokta bekliyorsa ona gider. Gittiyse true. */
export function olcekliTikla(d: OlcekliKatmanDenetimi, nokta: [number, number]): boolean {
  const hedef = d.k.hedef;
  if (!d.k.acik || hedef === 'yok') return false;
  const n: [number, number] = [Math.round(nokta[0] * 10) / 10, Math.round(nokta[1] * 10) / 10];
  if (hedef === 'olcek1') d.set({ hedef: 'olcek2', p1: n });
  else if (hedef === 'olcek2') d.set({ hedef: 'yok', p2: n });
  else if (hedef === 'olcumBas') d.set({ olcumBas: n, hedef: 'olcumBit' });
  else if (hedef === 'olcumBit') d.set({ olcumBit: n, hedef: 'yok' });
  else if (hedef === 'konturBas') d.set({ konturBas: n, hedef: 'yok' });
  else if (hedef === 'araziNokta') d.set((o) => ({ araziNoktalar: [...o.araziNoktalar, n] }));
  return true;
}

/** Ölçek çizgisi için yuvarlak bir uzunluk: haritanın genişliğinin yaklaşık altıda biri. */
function olcekCubugu(h: HaritaAyrintisi, d: OlcekliHaritaDurumu): { piksel: number; deger: number } | null {
  const o = d.olcek;
  if (!o) return null;
  const px = Math.hypot(o.p2[0] - o.p1[0], o.p2[1] - o.p1[1]);
  if (!(px > 0) || !(o.mesafe > 0)) return null;
  const birimBasi = o.mesafe / px, hedef = (h.en / 6) * birimBasi;
  const us = 10 ** Math.floor(Math.log10(hedef));
  const deger = [1, 2, 5, 10].map((x) => x * us).filter((x) => x <= hedef).pop() ?? us;
  return { piksel: deger / birimBasi, deger };
}

/** Haritanın kendi görselinin üstünde yarı saydam ölçekli çizim: araziler, erişim sınırları, en kısa yol, ölçek. */
export function OlcekliKatmanCizimi({ h, d }: { h: HaritaAyrintisi; d: OlcekliKatmanDenetimi }) {
  const { k } = d;
  if (!k.acik || !k.durum) return null;
  const g = k.goster, r = Math.max(h.en, h.boy) * 0.008;
  const cubuk = g.olcek ? olcekCubugu(h, k.durum) : null;
  // Sağ altta, açık çekmecenin altında kalmayacak kadar içeride.
  const [cx, cy] = [h.en * 0.66, h.boy * 0.93];
  const yuzde = (v: number, top: number) => `${(v / top) * 100}%`;
  return (
    <>
      <svg class="olcekli-katman" viewBox={`0 0 ${h.en} ${h.boy}`} preserveAspectRatio="none" aria-hidden="true">
        {g.arazi && k.durum.araziler.map((a) => <polygon key={a.kod} class="olcekli-arazi-cokgen" points={a.noktalar.map((p) => p.join(',')).join(' ')} vector-effect="non-scaling-stroke" />)}
        {g.arazi && k.araziNoktalar.length > 0 && <polyline class="olcekli-arazi-taslak" points={k.araziNoktalar.map((p) => p.join(',')).join(' ')} vector-effect="non-scaling-stroke" />}
        {/* Erişim alanı satır satır dikdörtgenlerden oluşur; çizgi yerine dış kenarı bir süzgeçle çizilir. */}
        <defs>
          <filter id={`olcekli-kenar-${h.kod}`} x="-2%" y="-2%" width="104%" height="104%" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse">
            <feMorphology in="SourceGraphic" operator="dilate" radius={Math.max(h.en, h.boy) * 0.0022} />
            <feComposite in2="SourceGraphic" operator="out" />
          </filter>
        </defs>
        {g.erisim && k.konturSonuc?.durum === 'tamam' && [...k.konturSonuc.konturlar].sort((a, b) => b.gun - a.gun)
          .map((x) => x.svgYolu ? <g key={x.gun}>
            <path d={x.svgYolu} class={`olcekli-kontur gun-${x.gun}`} />
            <path d={x.svgYolu} class={`olcekli-kontur-kenar gun-${x.gun}`} filter={`url(#olcekli-kenar-${h.kod})`} />
          </g> : null)}
        {g.yol && k.olcumSonuc?.yolNoktalari && k.olcumSonuc.yolNoktalari.length >= 2 && (
          <polyline class="olcekli-yol" points={k.olcumSonuc.yolNoktalari.map((p) => p.join(',')).join(' ')} vector-effect="non-scaling-stroke" />
        )}
        {g.olcek && k.durum.olcek && <line class="olcekli-olcek-cizgi" x1={k.durum.olcek.p1[0]} y1={k.durum.olcek.p1[1]} x2={k.durum.olcek.p2[0]} y2={k.durum.olcek.p2[1]} vector-effect="non-scaling-stroke" />}
        {cubuk && <path class="olcek-cubugu" d={`M${cx - cubuk.piksel},${cy - r} V${cy} H${cx} V${cy - r}`} vector-effect="non-scaling-stroke" />}
        {g.yol && <>
          <circle class="olcekli-nokta bas" cx={k.olcumBas[0]} cy={k.olcumBas[1]} r={r} />
          <circle class="olcekli-nokta bit" cx={k.olcumBit[0]} cy={k.olcumBit[1]} r={r} />
        </>}
        {g.erisim && <circle class="olcekli-nokta kontur-merkez" cx={k.konturBas[0]} cy={k.konturBas[1]} r={r} />}
      </svg>
      {g.erisim && k.konturSonuc?.durum === 'tamam' && k.konturSonuc.konturlar.map((x) => {
        const m = /M\s*([\d.]+)[ ,]([\d.]+)/.exec(x.svgYolu ?? '');
        return m ? <span key={x.gun} class="olcekli-etiket gun" style={{ left: yuzde(Number(m[1]), h.en), top: yuzde(Number(m[2]), h.boy) }}>{x.gun}. gün</span> : null;
      })}
      {g.yol && k.olcumSonuc?.enKisaGun != null && k.olcumSonuc.yolNoktalari && k.olcumSonuc.yolNoktalari.length >= 2 && (() => {
        const p = k.olcumSonuc.yolNoktalari[Math.floor(k.olcumSonuc.yolNoktalari.length / 2)];
        return <span class="olcekli-etiket yol" style={{ left: yuzde(p[0], h.en), top: yuzde(p[1], h.boy) }}>en kısa: {gunYazisi(k.olcumSonuc.enKisaGun)}</span>;
      })()}
      {g.arazi && k.durum.araziler.map((a) => {
        const [x, y] = a.noktalar.reduce((t, p) => [t[0] + p[0] / a.noktalar.length, t[1] + p[1] / a.noktalar.length], [0, 0]);
        return <span key={a.kod} class="olcekli-etiket arazi" style={{ left: yuzde(x, h.en), top: yuzde(y, h.boy) }}>{a.ad}</span>;
      })}
      {cubuk && <span class="olcekli-etiket cubuk" style={{ left: yuzde(cx - cubuk.piksel / 2, h.en), top: yuzde(cy - r * 2.2, h.boy) }}>{sayiGirdisi(cubuk.deger)} {k.durum.olcek!.birim}</span>}
    </>
  );
}

/** 1,3 gün → "1 gün 7 saat". */
function gunYazisi(g: number): string {
  const tam = Math.floor(g), saat = Math.round((g - tam) * 24);
  return saat === 24 ? `${tam + 1} gün` : saat ? `${tam ? `${tam} gün ` : ''}${saat} saat` : `${tam} gün`;
}

export function OlcekliHaritaBolumu({
  istemci,
  evren,
  h,
  d,
}: {
  istemci: Istemci;
  evren: string;
  h: HaritaAyrintisi;
  d: OlcekliKatmanDenetimi;
}) {
  const { k, set, yukle: yukleKatman } = d;
  const { acik, durum, hedef, olcumBas, olcumBit, konturBas, olcumSonuc, konturSonuc, olcumDurum, konturDurum, araziNoktalar } = k;
  const hata = k.hata;
  const setHata = (x: string | null) => set({ hata: x });
  const setAcik = (x: boolean) => set(x ? { acik: true } : { acik: false, hedef: 'yok' });
  const setHedef = (x: TiklamaHedefi) => set({ hedef: x });
  const setAraziNoktalar = (x: [number, number][]) => set({ araziNoktalar: x });
  const setOlcumBas = (x: [number, number]) => set({ olcumBas: x });
  const setOlcumDurum = (x: OlcekliKatman['olcumDurum']) => set({ olcumDurum: x });
  const setKonturDurum = (x: OlcekliKatman['konturDurum']) => set({ konturDurum: x });
  const setOlcumSonuc = (x: OlcekliOlcumSonucu | null) => set({ olcumSonuc: x });
  const setKonturSonuc = (x: OlcekliKonturSonucu | null) => set({ konturSonuc: x });

  // Ölçek formu
  const [olcekAcik, setOlcekAcik] = useState(false);
  const { p1, p2 } = k;
  const setP1 = (x: [number, number]) => set({ p1: x });
  const setP2 = (x: [number, number]) => set({ p2: x });
  const [mesafe, setMesafe] = useState('10');
  const [birim, setBirim] = useState('fersah');
  const [molaVarsayimi, setMolaVarsayimi] = useState('');
  useEffect(() => {
    if (!durum?.olcek) return;
    setP1(durum.olcek.p1); setP2(durum.olcek.p2); setMesafe(String(durum.olcek.mesafe)); setBirim(durum.olcek.birim); setMolaVarsayimi(durum.olcek.molaVarsayimi ?? '');
  }, [durum]);

  // Varsayılan hız formu
  const [varsayilanAcik, setVarsayilanAcik] = useState(false);
  const [varsayilanKural, setVarsayilanKural] = useState<OlcekliHizKurali[]>([]);
  useEffect(() => { if (durum) setVarsayilanKural(durum.varsayilanHizlar); }, [durum]);

  // Arazi ekleme formu
  const [araziAcik, setAraziAcik] = useState(false);
  const [araziAd, setAraziAd] = useState('');
  const [araziCizim, setAraziCizim] = useState<string>('');
  const [araziKurallar, setAraziKurallar] = useState<OlcekliHizKurali[]>([
    { ulasim: 'yaya', mevsim: null, gecilmez: false, gunlukHiz: 6 },
  ]);

  // Ölçüm ve kontur
  const [ulasim, setUlasim] = useState('yaya');
  const [mevsim, setMevsim] = useState('');
  const olcumIstekNo = useRef(0);
  const konturIstekNo = useRef(0);
  const yukle = yukleKatman;

  if (!acik) {
    return (
      <div class="satir">
        <button type="button" class="dugme sade kucuk" onClick={() => setAcik(true)}>
          Ölçekli harita ve ulaşılabilecek yerler
        </button>
      </div>
    );
  }

  const olcekKaydet = (e: Event) => {
    e.preventDefault();
    setHata(null);
    istemci
      .iste('olcekliOlcekYaz', {
        evren,
        harita: h.kod,
        olcek: {
          p1,
          p2,
          mesafe: Number(mesafe),
          birim: birim.trim(),
          ...(molaVarsayimi.trim() ? { molaVarsayimi: molaVarsayimi.trim() } : {}),
        },
      })
      .then(() => {
        setOlcekAcik(false);
        yukle();
      })
      .catch((err) => setHata(hataYaz(err)));
  };

  const olcekKaldir = () => {
    setHata(null);
    istemci
      .iste('olcekliOlcekYaz', { evren, harita: h.kod, olcek: null })
      .then(() => {
        setOlcekAcik(false);
        yukle();
      })
      .catch((err) => setHata(hataYaz(err)));
  };

  const varsayilanKaydet = (e: Event) => {
    e.preventDefault();
    setHata(null);
    istemci
      .iste('olcekliVarsayilanHizYaz', {
        evren,
        harita: h.kod,
        varsayilanHizlar: varsayilanKural,
      })
      .then(() => {
        setVarsayilanAcik(false);
        yukle();
      })
      .catch((err) => setHata(hataYaz(err)));
  };

  const araziKaydet = (e: Event) => {
    e.preventDefault();
    setHata(null);
    istemci
      .iste('olcekliAraziYaz', {
        evren,
        harita: h.kod,
        tanim: {
          ad: araziAd.trim(),
          cizim: araziCizim || null,
          noktalar: araziCizim ? undefined : araziNoktalar,
          kurallar: araziKurallar,
        },
      })
      .then(() => {
        setAraziAcik(false);
        setAraziAd('');
        setAraziCizim('');
        setAraziNoktalar([]);
        yukle();
      })
      .catch((err) => setHata(hataYaz(err)));
  };

  const olcumCalistir = () => {
    setHata(null);
    const no = ++olcumIstekNo.current;
    setOlcumDurum('hesaplaniyor');
    istemci
      .iste('olcekliOlcum', {
        evren,
        harita: h.kod,
        baslangic: olcumBas,
        bitis: olcumBit,
        ulasim: ulasim.trim() || null,
        mevsim: mevsim.trim() || null,
      })
      .then((sonuc) => {
        if (no !== olcumIstekNo.current) return;
        setOlcumSonuc(sonuc);
        setOlcumDurum('guncel');
      })
      .catch((err) => {
        if (no !== olcumIstekNo.current) return;
        setOlcumDurum('bos');
        setHata(hataYaz(err));
      });
  };

  const konturCalistir = () => {
    setHata(null);
    const no = ++konturIstekNo.current;
    setKonturDurum('hesaplaniyor');
    istemci
      .iste('olcekliKonturlar', {
        evren,
        harita: h.kod,
        baslangic: konturBas,
        ulasim: ulasim.trim(),
        mevsim: mevsim.trim() || null,
      })
      .then((sonuc) => {
        if (no !== konturIstekNo.current) return;
        setKonturSonuc(sonuc);
        setKonturDurum('guncel');
      })
      .catch((err) => {
        if (no !== konturIstekNo.current) return;
        setKonturDurum('bos');
        setHata(hataYaz(err));
      });
  };

  const bolgeCizimleri = h.cizimler.filter((c) => c.bicim === 'bolge');
  const kesinIsaretler = h.isaretler.filter(
    (i) => i.konum.kesinlik !== 'bilinmiyor' && i.konum.x !== null && i.konum.y !== null,
  );

  return (
    <section class="olcekli-harita" aria-label="Ölçekli harita ve ulaşılabilecek yerler">
      <div class="satir">
        <h2>Ölçekli harita</h2>
        {durum?.catismali && <span class="rozet uyari">İki cihazda farklı</span>}
        <span class="bosluk" />
        <button type="button" class="dugme sade kucuk" onClick={() => setAcik(false)}>
          Kapat
        </button>
      </div>

      {!durum?.olcek ? (
        <p class="uyari kucuk">
          Bu haritanın ölçeği yok, bu yüzden görselden mesafe ya da süre hesaplanmaz. Ölçekli hesap için iki nokta seçip aralarındaki mesafeyi girin.
        </p>
      ) : (
        <p class="kucuk">
          <strong>Ölçek:</strong> ({durum.olcek.p1[0]}, {durum.olcek.p1[1]}) – ({durum.olcek.p2[0]},{' '}
          {durum.olcek.p2[1]}) arası <strong>{sayiGirdisi(durum.olcek.mesafe)} {durum.olcek.birim}</strong>
          {durum.olcek.molaVarsayimi ? ` · ${durum.olcek.molaVarsayimi}` : ''}
        </p>
      )}

      <fieldset class="olcekli-goster">
        <legend class="alan-adi">Haritanın üstünde göster</legend>
        {([['olcek', 'Ölçek çizgisi'], ['arazi', 'Araziler'], ['erisim', 'Erişim sınırları'], ['yol', 'En kısa yol']] as const).map(([x, ad]) => (
          <label key={x} class="kucuk"><input type="checkbox" checked={k.goster[x]} onChange={(e) => set((o) => ({ goster: { ...o.goster, [x]: (e.target as HTMLInputElement).checked } }))} /> {ad}</label>
        ))}
      </fieldset>
      {hedef !== 'yok' && (
        <p class="soluk kucuk" role="status">
          Haritaya tıklayın ({HEDEF_YAZISI[hedef]}).{' '}
          <button type="button" class="dugme sade kucuk" onClick={() => setHedef('yok')}>
            {hedef === 'araziNokta' ? 'Bitti' : 'Vazgeç'}
          </button>
        </p>
      )}

      {!h.silindi && (
        <div class="satir">
          <button type="button" class="dugme kucuk" onClick={() => setOlcekAcik(!olcekAcik)}>
            {olcekAcik ? 'Ölçek formunu kapat' : durum?.olcek ? 'Ölçeği düzenle' : 'Ölçek tanımla'}
          </button>
          <button type="button" class="dugme kucuk" onClick={() => setVarsayilanAcik(!varsayilanAcik)}>
            {varsayilanAcik ? 'Varsayılan hızı kapat' : 'Varsayılan hız'}
          </button>
          <button type="button" class="dugme kucuk" onClick={() => setAraziAcik(!araziAcik)}>
            {araziAcik ? 'Arazi formunu kapat' : 'Arazi ekle'}
          </button>
        </div>
      )}

      {olcekAcik && !h.silindi && (
        <form class="kart" onSubmit={olcekKaydet}>
          <div class="alan">
            <span class="alan-adi">Haritada 1. ve 2. nokta</span>
            <div class="satir">
              <input
                class="girdi"
                style="width:70px"
                type="number"
                step="any"
                aria-label="Ölçek 1. nokta X"
                value={p1[0]}
                onInput={(e) => setP1([Number((e.target as HTMLInputElement).value), p1[1]])}
              />
              <input
                class="girdi"
                style="width:70px"
                type="number"
                step="any"
                aria-label="Ölçek 1. nokta Y"
                value={p1[1]}
                onInput={(e) => setP1([p1[0], Number((e.target as HTMLInputElement).value)])}
              />
              <span>→</span>
              <input
                class="girdi"
                style="width:70px"
                type="number"
                step="any"
                aria-label="Ölçek 2. nokta X"
                value={p2[0]}
                onInput={(e) => setP2([Number((e.target as HTMLInputElement).value), p2[1]])}
              />
              <input
                class="girdi"
                style="width:70px"
                type="number"
                step="any"
                aria-label="Ölçek 2. nokta Y"
                value={p2[1]}
                onInput={(e) => setP2([p2[0], Number((e.target as HTMLInputElement).value)])}
              />
              <button type="button" class="dugme sade kucuk" onClick={() => setHedef('olcek1')}>
                Haritadan seç
              </button>
            </div>
          </div>
          <div class="satir">
            <div class="alan" style="flex:1">
              <label class="alan-adi" for={`olcek-mesafe-${h.kod}`}>Gerçek mesafe</label>
              <input
                id={`olcek-mesafe-${h.kod}`}
                class="girdi"
                type="number"
                step="any"
                min="0.0001"
                value={mesafe}
                onInput={(e) => setMesafe((e.target as HTMLInputElement).value)}
              />
            </div>
            <div class="alan" style="flex:1">
              <label class="alan-adi" for={`olcek-birim-${h.kod}`}>Birim adı</label>
              <input
                id={`olcek-birim-${h.kod}`}
                class="girdi"
                lang="tr"
                placeholder="fersah, menzil…"
                value={birim}
                onInput={(e) => setBirim((e.target as HTMLInputElement).value)}
              />
            </div>
          </div>
          <div class="alan">
            <label class="alan-adi" for={`olcek-mola-${h.kod}`}>Mola varsayımı</label>
            <input
              id={`olcek-mola-${h.kod}`}
              class="girdi"
              lang="tr"
              placeholder="Ör. Günlük ilerleme gece konaklamasını içerir"
              value={molaVarsayimi}
              onInput={(e) => setMolaVarsayimi((e.target as HTMLInputElement).value)}
            />
          </div>
          <div class="satir">
            <button type="submit" class="dugme ana kucuk">Kaydet</button>
            {durum?.olcek && (
              <button type="button" class="dugme sade kucuk" onClick={olcekKaldir}>
                Ölçeği kaldır
              </button>
            )}
          </div>
        </form>
      )}

      {varsayilanAcik && !h.silindi && (
        <form class="kart" onSubmit={varsayilanKaydet}>
          <p class="soluk kucuk">
            Arazisi çizilmemiş yerler için ulaşım biçimine (isterseniz mevsime de) göre hız girin. Hız girilmeyen yerler hesapta “bilinmiyor” sayılır.
          </p>
          <HizKurallariDuzenleyici kurallar={varsayilanKural} setKurallar={setVarsayilanKural} />
          <div class="satir">
            <button type="submit" class="dugme ana kucuk">Varsayılan hızları kaydet</button>
          </div>
        </form>
      )}

      {araziAcik && !h.silindi && (
        <form class="kart" onSubmit={araziKaydet}>
          <div class="alan">
            <label class="alan-adi" for={`arazi-ad-${h.kod}`}>Arazi adı</label>
            <input
              id={`arazi-ad-${h.kod}`}
              class="girdi"
              lang="tr"
              placeholder="Ör. Kuzey Bataklığı, Sık Orman, Sarp Dağ"
              value={araziAd}
              onInput={(e) => setAraziAd((e.target as HTMLInputElement).value)}
            />
          </div>
          {bolgeCizimleri.length > 0 && (
            <div class="alan">
              <label class="alan-adi" for={`arazi-cizim-${h.kod}`}>Var olan bölge çizimini kullan (isteğe bağlı)</label>
              <select
                id={`arazi-cizim-${h.kod}`}
                class="girdi"
                value={araziCizim}
                onChange={(e) => setAraziCizim((e.target as HTMLSelectElement).value)}
              >
                <option value="">Haritada yeni köşeler belirle</option>
                {bolgeCizimleri.map((c) => (
                  <option key={c.kod} value={c.kod}>
                    {c.kayit.ad} ({c.noktalar.length} köşe)
                  </option>
                ))}
              </select>
            </div>
          )}
          {!araziCizim && (
            <div class="alan">
              <span class="alan-adi">Çokgen köşeleri ({araziNoktalar.length} nokta)</span>
              <div class="satir">
                <button type="button" class="dugme sade kucuk" onClick={() => setHedef('araziNokta')}>
                  Haritadan köşe ekle
                </button>
                {araziNoktalar.length > 0 && (
                  <button type="button" class="dugme sade kucuk" onClick={() => setAraziNoktalar([])}>
                    Köşeleri temizle
                  </button>
                )}
              </div>
            </div>
          )}
          <HizKurallariDuzenleyici kurallar={araziKurallar} setKurallar={setAraziKurallar} />
          <div class="satir">
            <button type="submit" class="dugme ana kucuk">Araziyi kaydet</button>
          </div>
        </form>
      )}

      {durum && durum.araziler.length > 0 && (
        <div class="kucuk">
          <strong>Tanımlı araziler</strong>
          <ul class="isaret-listesi">
            {durum.araziler.map((a) => (
              <li key={a.kod}>
                <strong>{a.ad}</strong>{' '}
                <span class="soluk">
                  ({a.kurallar.map((k) => `${k.ulasim}${k.mevsim ? `/${k.mevsim}` : ''}: ${k.gecilmez ? 'geçilmez' : `${sayiGirdisi(k.gunlukHiz)} ${durum.olcek?.birim ?? 'birim'}/gün`}`).join(', ')})
                </span>
                {a.catismali && <span class="rozet uyari">İki cihazda farklı</span>}
                {!h.silindi && (
                  <button
                    type="button"
                    class="dugme sade kucuk"
                    onClick={() => void geriAlinabilir('Arazi kaldırıldı.', () => istemci.iste('olcekliAraziSil', { evren, kod: a.kod }),
                      () => istemci.iste('olcekliAraziSil', { evren, kod: a.kod, geriYukle: true }).then(yukle))
                        .then(yukle, (err) => setHata(hataYaz(err)))
                    }
                  >
                    Kaldır
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ortak ulaşım ve mevsim seçimi */}
      <div class="kart kucuk">
        <div class="satir">
          <div class="alan" style="flex:1">
            <label class="alan-adi" for={`olcekli-ulasim-${h.kod}`}>Ulaşım biçimi</label>
            <input
              id={`olcekli-ulasim-${h.kod}`}
              class="girdi"
              lang="tr"
              placeholder="yaya, atlı, kervan…"
              value={ulasim}
              onInput={(e) => setUlasim((e.target as HTMLInputElement).value)}
            />
          </div>
          <div class="alan" style="flex:1">
            <label class="alan-adi" for={`olcekli-mevsim-${h.kod}`}>Mevsim (isteğe bağlı)</label>
            <input
              id={`olcekli-mevsim-${h.kod}`}
              class="girdi"
              lang="tr"
              placeholder="yaz, kış…"
              value={mevsim}
              onInput={(e) => setMevsim((e.target as HTMLInputElement).value)}
            />
          </div>
        </div>

        {/* İki nokta ölçümü */}
        <h3>İki nokta arası ölçüm</h3>
        <div class="satir">
          <span>Başlangıç: ({olcumBas[0]}, {olcumBas[1]})</span>
          <span>→ Bitiş: ({olcumBit[0]}, {olcumBit[1]})</span>
          <button type="button" class="dugme sade kucuk" onClick={() => setHedef('olcumBas')}>
            Haritadan seç
          </button>
          {kesinIsaretler.length >= 2 && (
            <select
              class="girdi"
              aria-label="Başlangıç işareti"
              value=""
              onChange={(e) => {
                const isr = kesinIsaretler.find((x) => x.kod === (e.target as HTMLSelectElement).value);
                if (isr && isr.konum.x !== null && isr.konum.y !== null) setOlcumBas([isr.konum.x, isr.konum.y]);
              }}
            >
              <option value="">Başlangıç işareti…</option>
              {kesinIsaretler.map((x) => (
                <option key={x.kod} value={x.kod}>{x.kayit.ad}</option>
              ))}
            </select>
          )}
          <button type="button" class="dugme ana kucuk" onClick={olcumCalistir}>
            Ölç
          </button>
        </div>
        {olcumDurum === 'hesaplaniyor' && <p class="soluk">Hesaplanıyor…</p>}
        {olcumSonuc && (
          <div class="olcekli-sonuc">
            {olcumDurum === 'onceki_sonuc' && (
              <p class="uyari kucuk">Bu önceki sonuçtur. Harita o zamandan beri değişti, güncel sonuç için yeniden ölçün.</p>
            )}
            {olcumSonuc.uyari && <p class="uyari kucuk">{olcumSonuc.uyari}</p>}
            {olcumSonuc.duzMesafe !== null && (
              <p>
                <strong>Düz mesafe:</strong> {sayiGirdisi(olcumSonuc.duzMesafe)} {olcumSonuc.zarf.birim}
                {olcumSonuc.enKisaGun !== null && (
                  <>
                    {' '}· <strong>Araziye göre en kısa süre:</strong> {sayiGirdisi(olcumSonuc.enKisaGun)} gün (yol uzunluğu:{' '}
                    {sayiGirdisi(olcumSonuc.yolMesafesi)} {olcumSonuc.zarf.birim})
                  </>
                )}
              </p>
            )}
            <SonucZarfiGorunumu zarf={olcumSonuc.zarf} guncellik={olcumDurum === 'onceki_sonuc' ? 'onceki_sonuc' : 'guncel'} />
          </div>
        )}

        {/* Erişim konturları */}
        <h3>1., 2. ve 3. günde ulaşılabilecek yerler</h3>
        <div class="satir">
          <span>Başlangıç: ({konturBas[0]}, {konturBas[1]})</span>
          <button type="button" class="dugme sade kucuk" onClick={() => setHedef('konturBas')}>
            Haritadan seç
          </button>
          <button type="button" class="dugme ana kucuk" onClick={konturCalistir}>
            Ulaşılabilecek yerleri hesapla
          </button>
        </div>
        {konturDurum === 'hesaplaniyor' && <p class="soluk">Hesaplanıyor…</p>}
        {konturSonuc && (
          <div class="olcekli-sonuc">
            {konturDurum === 'onceki_sonuc' && (
              <p class="uyari kucuk">Bu önceki sonuçtur. Harita o zamandan beri değişti, güncel sonuç için yeniden hesaplayın.</p>
            )}
            {konturSonuc.uyari && <p class="uyari kucuk">{konturSonuc.uyari}</p>}
            {konturSonuc.konturlar.length > 0 && (
              <ul class="isaret-listesi">
                {konturSonuc.konturlar.map((k) => (
                  <li key={k.gun}>
                    <strong>{k.gun}. gün erişim alanı:</strong> {k.hucreler.length} ızgara hücresi (~{sayiGirdisi(k.alanBirimKare)}{' '}
                    {konturSonuc.zarf.birim}²)
                  </li>
                ))}
              </ul>
            )}
            <SonucZarfiGorunumu zarf={konturSonuc.zarf} guncellik={konturDurum === 'onceki_sonuc' ? 'onceki_sonuc' : 'guncel'} />
          </div>
        )}
      </div>

      {hata && (
        <p class="hata kucuk" role="alert">
          {hata}
        </p>
      )}
    </section>
  );
}

function HizKurallariDuzenleyici({
  kurallar,
  setKurallar,
}: {
  kurallar: OlcekliHizKurali[];
  setKurallar: (yeni: OlcekliHizKurali[]) => void;
}) {
  const guncelle = (i: number, f: (k: OlcekliHizKurali) => OlcekliHizKurali) =>
    setKurallar(kurallar.map((k, j) => (j === i ? f(k) : k)));

  return (
    <div class="alan">
      <span class="alan-adi">Ulaşım biçimine ve mevsime göre günlük hız</span>
      {kurallar.map((k, i) => (
        <div class="satir" key={i}>
          <input
            class="girdi"
            style="width:90px"
            lang="tr"
            aria-label={`${i + 1}. kural ulaşım biçimi`}
            placeholder="Ulaşım (yaya)"
            value={k.ulasim}
            onInput={(e) => guncelle(i, (x) => ({ ...x, ulasim: (e.target as HTMLInputElement).value }))}
          />
          <input
            class="girdi"
            style="width:80px"
            lang="tr"
            aria-label={`${i + 1}. kural mevsim`}
            placeholder="Mevsim (genel)"
            value={k.mevsim ?? ''}
            onInput={(e) =>
              guncelle(i, (x) => ({ ...x, mevsim: (e.target as HTMLInputElement).value.trim() || null }))
            }
          />
          <label class="kucuk">
            <input
              type="checkbox"
              checked={k.gecilmez}
              onChange={(e) =>
                guncelle(i, (x) => ({
                  ...x,
                  gecilmez: (e.target as HTMLInputElement).checked,
                  gunlukHiz: (e.target as HTMLInputElement).checked ? null : x.gunlukHiz ?? 5,
                }))
              }
            />{' '}
            Geçilmez
          </label>
          {!k.gecilmez && (
            <input
              class="girdi"
              style="width:80px"
              type="number"
              step="any"
              min="0.01"
              aria-label={`${i + 1}. kural günlük hız`}
              placeholder="Birim/gün"
              value={k.gunlukHiz ?? ''}
              onInput={(e) =>
                guncelle(i, (x) => ({ ...x, gunlukHiz: Number((e.target as HTMLInputElement).value) }))
              }
            />
          )}
          <button
            type="button"
            class="dugme sade kucuk"
            aria-label={`${i + 1}. kuralı sil`}
            onClick={() => setKurallar(kurallar.filter((_, j) => j !== i))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        class="dugme sade kucuk"
        onClick={() =>
          setKurallar([...kurallar, { ulasim: 'yaya', mevsim: null, gecilmez: false, gunlukHiz: 5 }])
        }
      >
        Hız kuralı ekle
      </button>
    </div>
  );
}

function SonucZarfiGorunumu({
  zarf,
  guncellik,
}: {
  zarf: OlcekliSonucZarfi;
  guncellik: 'guncel' | 'onceki_sonuc';
}) {
  return (
    <details class="soluk kucuk">
      <summary>Sonuç dayanağı ve varsayımlar</summary>
      <ul class="isaret-listesi">
        <li><strong>Çalışma kipi:</strong> Ölçekli harita</li>
        <li><strong>Sonucun türü:</strong> Bu varsayımlara dayanan tahmin</li>
        <li><strong>Sonuç:</strong> {HUKUM_YAZISI[zarf.hukum]}</li>
        <li><strong>Güncellik:</strong> {guncellik === 'guncel' ? 'Güncel' : 'Önceki sonuç'}</li>
        {zarf.olcekOzeti && <li><strong>Ölçek:</strong> {zarf.olcekOzeti}</li>}
        {zarf.ulasim && <li><strong>Ulaşım biçimi:</strong> {zarf.ulasim}</li>}
        <li><strong>Mevsim:</strong> {zarf.mevsim ?? 'Belirtilmedi (genel hız kuralı)'}</li>
        <li><strong>Mola varsayımı:</strong> {zarf.molaVarsayimi}</li>
        {zarf.izgaraAraligiBirim !== null && (
          <li>
            <strong>Izgara aralığı:</strong> {sayiGirdisi(zarf.izgaraAraligiBirim)} {zarf.birim} ({sayiGirdisi(zarf.izgaraAraligiUzay)} harita birimi)
          </li>
        )}
        <li><strong>Kapsam:</strong> {zarf.kapsamNotu}</li>
      </ul>
    </details>
  );
}
