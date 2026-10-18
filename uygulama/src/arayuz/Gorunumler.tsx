// Evreni inceleme görünümleri (§7): soy ağacı, filtreli ağ ve durum geçmişi. Hepsi aynı ilişki ve durum
// kayıtlarını gösterir; burada değiştirilen bir şey yoktur, düzenleme kaydın sayfasında yapılır.
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { AgKenari, AgSonucu, DurumGecmisi, DurumSatiri, SoyAgaci } from '../veri/api';
import { ILISKI_TURLERI, iliskiTuruBul } from '../alan/iliski-turleri';
import { TURLER, turBul } from '../alan/turler';
import { eksenYili, tarihAciklamasi, type EvrenTarihi, type Takvim } from '../alan/tarih';
import { KararRozeti } from './ortak';
import { KayitSec } from './KayitBolumleri';
import { useTakvim } from './Takvim';
import { aralikYazi } from './Anlati';
import { git } from './Uygulama';
import { kuvvetYerlesimi, soyYerlesimi, SOY_BOY, SOY_EN, type Nokta } from './yerlesim';

const hataYaz = (e: unknown) => (e as Error).message;
const GRUPLAR = [...new Set(TURLER.map((t) => t.grup))];
const grupSinifi = (tur: string) => `tg-${Math.max(0, GRUPLAR.indexOf(turBul(tur).grup))}`;
const kisalt = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

function useYenile(istemci: Istemci, evren: string) {
  const [n, setN] = useState(0);
  useEffect(() => istemci.dinle((d) => { if (d.evren === evren) setN((x) => x + 1); }), [evren]);
  return n;
}

function useKayitAdi(istemci: Istemci, evren: string, kod: string | null) {
  const [ad, setAd] = useState<string | null>(null);
  useEffect(() => {
    setAd(null);
    if (kod) istemci.iste('kayit', { evren, kod }).then((k) => setAd(k.ad), () => setAd(null));
  }, [evren, kod]);
  return ad;
}

/** "Şu tarihteki hâli" girdisi: yazınca değil, Enter ya da odaktan çıkınca uygulanır. */
function AnGirdisi({ an, setAn, ipucu = 'Bütün zamanlar' }: { an: string; setAn: (v: string) => void; ipucu?: string }) {
  const [yerel, setYerel] = useState(an);
  useEffect(() => setYerel(an), [an]);
  return (
    <label class="satir kucuk"><span class="soluk">Tarih</span>
      <input class="girdi kucuk-girdi" style="width:10em" lang="tr" aria-label="Bu tarihteki hâli" placeholder={ipucu} value={yerel}
        onInput={(e) => setYerel((e.target as HTMLInputElement).value)} onBlur={() => setAn(yerel.trim())}
        onKeyDown={(e) => { if (e.key === 'Enter') setAn(yerel.trim()); }} />
    </label>
  );
}

function Yakinlastir({ olcek, setOlcek }: { olcek: number; setOlcek: (n: number) => void }) {
  return (
    <span class="satir">
      <button class="dugme sade kucuk" aria-label="Uzaklaştır" onClick={() => setOlcek(Math.max(0.3, olcek / 1.25))}>−</button>
      <span class="soluk kucuk">{Math.round(olcek * 100)}%</span>
      <button class="dugme sade kucuk" aria-label="Yakınlaştır" onClick={() => setOlcek(Math.min(3, olcek * 1.25))}>+</button>
    </span>
  );
}

// ---------- Soy ağacı ----------
const soyCizgiSinifi = (k: AgKenari) => `soy-cizgi ${k.rol ? 'rol-' + k.rol : ''} ${k.gecerlilik === 'belirsiz' ? 'belirsiz' : ''} karar-${k.karar}`;

export function SoyAgaciGorunumu({ istemci, evren, odak }: { istemci: Istemci; evren: string; odak: string | null }) {
  const n = useYenile(istemci, evren);
  const [an, setAn] = useState('');
  const [t, setT] = useState<SoyAgaci | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [kapali, setKapali] = useState<Set<string>>(new Set());
  const [secili, setSecili] = useState<string | null>(null);
  const [olcek, setOlcek] = useState(1);
  useEffect(() => { setKapali(new Set()); setSecili(null); }, [odak]);
  useEffect(() => {
    if (!odak) { setT(null); return; }
    istemci.iste('soyAgaci', { evren, odak, an: an || null }).then((x) => { setT(x); setHata(null); }, (e) => setHata(hataYaz(e)));
  }, [evren, odak, an, n]);
  const y = useMemo(() => (t ? soyYerlesimi(t, kapali) : null), [t, kapali]);

  const secim = (
    <div class="satir">
      <span>Kimin ailesi?</span>
      <KayitSec istemci={istemci} evren={evren} secili={t && odak ? { kod: odak, ad: t.dugumler.find((d) => d.kod === odak)?.ad ?? '' } : null}
        sec={(s) => s && git(`/e/${evren}/soy/${s.kod}`)} etiket="Bir kayıt seç" />
      {odak && <AnGirdisi an={an} setAn={setAn} />}
      {y && <Yakinlastir olcek={olcek} setOlcek={setOlcek} />}
    </div>
  );
  if (!odak) return <div class="gorunum">{secim}<p class="soluk">Ebeveyn, eş ve kardeş ilişkilerinden çizilir. Bir kayıt seç.</p></div>;
  if (hata) return <div class="gorunum">{secim}<p class="hata">{hata}</p></div>;
  if (!t || !y) return <div class="gorunum">{secim}<p class="soluk">Açılıyor…</p></div>;

  const ad = new Map(t.dugumler.map((d) => [d.kod, d]));
  const soyIci = new Map(t.soyIci.map((s) => [s.kenar, s]));
  const k = (x: string) => y.konum.get(x)!;
  // Çocuklar ebeveyn çiftine göre toplanır; iki ebeveyn aynı nitelikle bağlıysa çizgi aralarından iner.
  const ebeveynKenarlari = new Map<string, AgKenari[]>();
  for (const e of y.kenarlar) if (e.tur === 'ebeveyn') ebeveynKenarlari.set(e.b, [...(ebeveynKenarlari.get(e.b) ?? []), e]);
  const cizgiler: preact.JSX.Element[] = [];
  // Aynı kuşaktaki her ebeveyn grubunun yatay çizgisi ayrı yükseklikte geçer; böylece gruplar birbirine karışmaz.
  const seritler = new Map<string, number>();
  const serit = (anahtar: string, kusakNo: number) => {
    const k2 = kusakNo + ':' + anahtar;
    if (!seritler.has(k2)) seritler.set(k2, [...seritler.keys()].filter((x) => x.startsWith(kusakNo + ':')).length);
    return seritler.get(k2)! % 7;
  };
  const asagi = (ox: number, oy: number, c: Nokta, e: AgKenari, anahtar: string, grup: string) => {
    const orta = c.y - SOY_BOY / 2 - 14 - serit(grup, y.kusak.get(e.a)!) * 9;
    cizgiler.push(<path key={anahtar} class={soyCizgiSinifi(e)} d={`M${ox},${oy} V${orta} H${c.x} V${c.y - SOY_BOY / 2}`}>
      <title>{`${ad.get(e.a)?.ad} → ${ad.get(e.b)?.ad}: ${e.aIcin.toLocaleLowerCase('tr-TR')}${e.rolAdi ? ` (${e.rolAdi.toLocaleLowerCase('tr-TR')})` : ''}`}</title></path>);
  };
  for (const [cocuk, es] of ebeveynKenarlari) {
    const c = k(cocuk);
    const ustte = es.filter((e) => y.kusak.get(e.a)! < y.kusak.get(cocuk)!);
    if (ustte.length === 2 && ustte[0].rol === ustte[1].rol && y.kusak.get(ustte[0].a) === y.kusak.get(ustte[1].a)) {
      const p1 = k(ustte[0].a), p2 = k(ustte[1].a);
      asagi((p1.x + p2.x) / 2, p1.y, c, ustte[0], cocuk + 'ç', [ustte[0].a, ustte[1].a].sort().join() + ustte[0].rol);
      continue;
    }
    for (const e of es) {
      const p = k(e.a);
      if (y.kusak.get(e.a)! < y.kusak.get(cocuk)!) asagi(p.x, p.y + SOY_BOY / 2, c, e, e.kod, e.a + e.rol);
      else cizgiler.push(<line key={e.kod} class={soyCizgiSinifi(e) + ' ters'} x1={p.x} y1={p.y} x2={c.x} y2={c.y}><title>Kuşağı çakışan ebeveynlik</title></line>);
    }
  }
  for (const e of y.kenarlar) {
    if (e.tur === 'ebeveyn') continue;
    const a = k(e.a), b = k(e.b);
    const [sol, sag] = a.x <= b.x ? [a, b] : [b, a];
    const yanyana = a.y === b.y && sag.x - sol.x <= SOY_EN + 40;
    const si = soyIci.get(e.kod);
    const sinif = `${soyCizgiSinifi(e)} ${e.tur === 'es' ? 'es' : 'kardes'} ${si ? 'soy-ici' : ''}`;
    const baslik = `${ad.get(e.a)?.ad} – ${ad.get(e.b)?.ad}: ${e.aIcin.toLocaleLowerCase('tr-TR')}${e.rolAdi ? ` (${e.rolAdi.toLocaleLowerCase('tr-TR')})` : ''}${si ? `. Soy içi evlilik; ortak ata: ${si.ortakAtalar.map((x) => x.ad).join(', ')}` : ''}${e.gecerlilik === 'belirsiz' ? '. Bu tarihte sürüp sürmediği belirsiz' : ''}`;
    if (e.tur === 'es' && yanyana) cizgiler.push(<line key={e.kod} class={sinif} x1={sol.x + SOY_EN / 2} y1={sol.y} x2={sag.x - SOY_EN / 2} y2={sag.y}><title>{baslik}</title></line>);
    else {
      const ust = Math.min(a.y, b.y) - SOY_BOY / 2;
      cizgiler.push(<path key={e.kod} class={sinif} d={`M${sol.x},${sol.y - SOY_BOY / 2} Q${(sol.x + sag.x) / 2},${ust - 40} ${sag.x},${sag.y - SOY_BOY / 2}`}><title>{baslik}</title></path>);
    }
  }
  const s = secili ? ad.get(secili) : null;
  return (
    <div class="gorunum">
      {secim}
      <p class="soluk kucuk">Odaktaki kayıt vurgulu. Bir kayda dokununca seçilir; seçili kaydı odağa alabilir ya da dalını kapatabilirsin. Çizgiler kesişebilir.</p>
      {t.kesildi && <p class="uyari kucuk">Aile çok büyük; yalnızca odağa en yakın {t.dugumler.length} kayıt çizildi.</p>}
      <div class="cizim-alani" role="region" aria-label="Soy ağacı çizimi">
        <svg class="soy-agaci" width={y.genislik * olcek} height={y.yukseklik * olcek} viewBox={`${y.solUst.x} ${y.solUst.y} ${y.genislik} ${y.yukseklik}`}>
          {cizgiler}
          {[...y.konum].map(([kod, p]) => {
            const d = ad.get(kod)!;
            const g = y.gizli.get(kod);
            return (
              <g key={kod} class={`soy-kutu ${grupSinifi(d.tur)} ${kod === odak ? 'odak' : ''} ${kod === secili ? 'secili' : ''} karar-${d.karar}`}
                transform={`translate(${p.x - SOY_EN / 2},${p.y - SOY_BOY / 2})`} role="button" tabIndex={0} aria-label={d.ad}
                onClick={() => setSecili(kod)} onKeyDown={(e) => { if (e.key === 'Enter') setSecili(kod); }}>
                <rect width={SOY_EN} height={SOY_BOY} rx={8} />
                <text x={SOY_EN / 2} y={18} text-anchor="middle" class="ad">{kisalt(d.ad, 20)}</text>
                <text x={SOY_EN / 2} y={34} text-anchor="middle" class="tur">{turBul(d.tur).ad}{d.karar === 'fikir' ? ' · fikir' : ''}</text>
                {g ? <text x={SOY_EN - 6} y={12} text-anchor="end" class="gizli">+{g}</text> : null}
              </g>
            );
          })}
        </svg>
      </div>
      {s && (
        <div class="kart satir secili-kayit" role="status">
          <strong>{s.ad}</strong> <span class="soluk kucuk">{turBul(s.tur).ad}</span> <KararRozeti karar={s.karar} />
          <span class="bosluk" />
          <a class="dugme kucuk" href={`#/e/${evren}/k/${s.kod}`}>Kaydı aç</a>
          {s.kod !== odak && <button class="dugme kucuk" onClick={() => git(`/e/${evren}/soy/${s.kod}`)}>Odağa al</button>}
          {s.kod !== odak && (kapali.has(s.kod)
            ? <button class="dugme kucuk" onClick={() => { const x = new Set(kapali); x.delete(s.kod); setKapali(x); }}>Dalı aç</button>
            : <button class="dugme kucuk" onClick={() => setKapali(new Set(kapali).add(s.kod))}>Dalı kapat</button>)}
        </div>
      )}
      <SoyAciklamasi />
      <details>
        <summary>Bağlar liste olarak ({y.kenarlar.length})</summary>
        <ul class="kucuk">
          {y.kenarlar.map((e) => (
            <li key={e.kod}>{ad.get(e.a)?.ad}: {e.aIcin.toLocaleLowerCase('tr-TR')} {ad.get(e.b)?.ad}
              {e.rolAdi ? ` (${e.rolAdi.toLocaleLowerCase('tr-TR')})` : ''}{soyIci.has(e.kod) ? ' · soy içi evlilik' : ''}{e.gecerlilik === 'belirsiz' ? ' · bu tarihte belirsiz' : ''}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function SoyAciklamasi() {
  return (
    <ul class="soy-aciklama kucuk soluk" aria-label="Çizgilerin anlamı">
      <li><svg width="36" height="10"><line class="soy-cizgi" x1="0" y1="5" x2="36" y2="5" /></svg> Ebeveyn (kan bağı ya da belirtilmemiş)</li>
      <li><svg width="36" height="10"><line class="soy-cizgi rol-evlatlik" x1="0" y1="5" x2="36" y2="5" /></svg> Evlatlık</li>
      <li><svg width="36" height="10"><line class="soy-cizgi rol-evlilik_disi" x1="0" y1="5" x2="36" y2="5" /></svg> Evlilik dışı</li>
      <li><svg width="36" height="10"><line class="soy-cizgi es" x1="0" y1="5" x2="36" y2="5" /></svg> Eş</li>
      <li><svg width="36" height="10"><line class="soy-cizgi es rol-siyasi" x1="0" y1="5" x2="36" y2="5" /></svg> Siyasi evlilik</li>
      <li><svg width="36" height="10"><line class="soy-cizgi es soy-ici" x1="0" y1="5" x2="36" y2="5" /></svg> Soy içi evlilik</li>
      <li><svg width="36" height="10"><line class="soy-cizgi kardes" x1="0" y1="5" x2="36" y2="5" /></svg> Kardeş (ayrıca yazılmış)</li>
    </ul>
  );
}

// ---------- Ağ ----------
const ILISKI_GRUPLARI = [...new Set(ILISKI_TURLERI.map((t) => t.grup))];

export function AgGorunumu({ istemci, evren, merkez }: { istemci: Istemci; evren: string; merkez: string | null }) {
  const n = useYenile(istemci, evren);
  const [tumu, setTumu] = useState(false);
  const [derinlik, setDerinlik] = useState(1);
  const [iTur, setITur] = useState<string[]>([]);
  const [kTur, setKTur] = useState<string[]>([]);
  const [an, setAn] = useState('');
  const [baglantilar, setBaglantilar] = useState(false);
  const [vazgecilmis, setVazgecilmis] = useState(false);
  const [r, setR] = useState<AgSonucu | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [secili, setSecili] = useState<string | null>(null);
  const [olcek, setOlcek] = useState(1);
  const merkezAdi = useKayitAdi(istemci, evren, merkez);
  const etkin = merkez && !tumu ? merkez : null;
  useEffect(() => { setSecili(null); }, [merkez, tumu]);
  useEffect(() => {
    if (!etkin && !tumu) { setR(null); return; }
    istemci.iste('ag', { evren, merkez: etkin, derinlik, iliskiTurleri: iTur, kayitTurleri: kTur, an: an || null, baglantilar, vazgecilmis })
      .then((x) => { setR(x); setHata(null); }, (e) => setHata(hataYaz(e)));
  }, [evren, etkin, tumu, derinlik, iTur.join(), kTur.join(), an, baglantilar, vazgecilmis, n]);
  const konum = useMemo(() => (r ? kuvvetYerlesimi(r.dugumler.map((d) => d.kod), r.kenarlar, r.merkez) : null), [r]);

  const secimler = (
    <div class="ag-suzgec">
      <div class="satir">
        <span>Merkez</span>
        <KayitSec istemci={istemci} evren={evren} secili={merkez && merkezAdi ? { kod: merkez, ad: merkezAdi } : null}
          sec={(s) => { if (s) { setTumu(false); git(`/e/${evren}/ag/${s.kod}`); } }} etiket="Bir kayıt seç" />
        <button class={`dugme kucuk ${tumu ? 'ana' : ''}`} aria-pressed={tumu} onClick={() => setTumu(!tumu)}>Bütün evren</button>
        {!tumu && (
          <label class="satir kucuk"><span class="soluk">Uzaklık</span>
            <select class="girdi kucuk-girdi" value={derinlik} onChange={(e) => setDerinlik(Number((e.target as HTMLSelectElement).value))}>
              <option value={1}>Doğrudan bağlılar</option><option value={2}>İki adım</option><option value={3}>Üç adım</option>
            </select></label>
        )}
        <AnGirdisi an={an} setAn={setAn} />
      </div>
      <div class="satir">
        <CokluSecim etiket="İlişki türleri" secili={iTur} setSecili={setITur}
          gruplar={ILISKI_GRUPLARI.map((g) => ({ ad: g, secenekler: ILISKI_TURLERI.filter((t) => t.grup === g).map((t) => ({ kod: t.kod, ad: t.karsilikli ? t.aIcin : `${t.bIcin} / ${t.aIcin}` })) }))} />
        <CokluSecim etiket="Kayıt türleri" secili={kTur} setSecili={setKTur}
          gruplar={GRUPLAR.map((g) => ({ ad: g, secenekler: TURLER.filter((t) => t.grup === g).map((t) => ({ kod: t.kod, ad: t.ad })) }))} />
        <label class="satir kucuk"><input type="checkbox" checked={baglantilar} onChange={(e) => setBaglantilar((e.target as HTMLInputElement).checked)} /> Metindeki bahsedişler</label>
        <label class="satir kucuk"><input type="checkbox" checked={vazgecilmis} onChange={(e) => setVazgecilmis((e.target as HTMLInputElement).checked)} /> Vazgeçilmişler</label>
        {r && <Yakinlastir olcek={olcek} setOlcek={setOlcek} />}
      </div>
    </div>
  );
  if (!etkin && !tumu) return <div class="gorunum">{secimler}<p class="soluk">Bir kaydın yakın ilişkilerini görmek için merkez seç ya da bütün evreni aç.</p></div>;
  if (hata) return <div class="gorunum">{secimler}<p class="hata">{hata}</p></div>;
  if (!r || !konum) return <div class="gorunum">{secimler}<p class="soluk">Açılıyor…</p></div>;
  if (!r.dugumler.length) {
    return <div class="gorunum">{secimler}<p class="soluk">Bu süzgeçlerle gösterilecek kayıt yok.{!r.merkez && r.baglantisiz > 0 && ` Hiçbir bağı olmayan ${r.baglantisiz} kayıt ağda yer almıyor.`}</p></div>;
  }

  const xs = [...konum.values()];
  const pay = 70;
  const minX = Math.min(...xs.map((p) => p.x)) - pay, maxX = Math.max(...xs.map((p) => p.x)) + pay;
  const minY = Math.min(...xs.map((p) => p.y)) - pay, maxY = Math.max(...xs.map((p) => p.y)) + pay;
  const gen = Math.max(320, maxX - minX), yuk = Math.max(240, maxY - minY);
  const ad = new Map(r.dugumler.map((d) => [d.kod, d]));
  const s = secili ? ad.get(secili) : null;
  const seciliKenarlar = s ? r.kenarlar.filter((e) => e.a === s.kod || e.b === s.kod) : [];
  const etiketGoster = r.kenarlar.length <= 40;
  return (
    <div class="gorunum">
      {secimler}
      <p class="soluk kucuk">
        {r.dugumler.length} kayıt, {r.kenarlar.length} bağ.
        {r.an && ` ${tarihAciklamasi(r.an)} için: o tarihte sürmediği bilinen ilişkiler gizli, sürüp sürmediği belirsiz olanlar soluk.`}
        {!r.merkez && r.baglantisiz > 0 && ` Hiçbir bağı olmayan ${r.baglantisiz} kayıt ağda yer almıyor.`}
      </p>
      {r.kesildi && <p class="uyari kucuk">Çizim sınırı aşıldı; en çok bağı olan {r.dugumler.length} kayıt gösteriliyor. Süzgeçlerle daraltabilirsin.</p>}
      {!r.kenarlar.length && <p class="soluk">Bu süzgeçlerle gösterilecek bağ yok.</p>}
      <div class="cizim-alani" role="region" aria-label="Ağ çizimi">
        <svg class="ag" width={gen * olcek} height={yuk * olcek} viewBox={`${minX} ${minY} ${gen} ${yuk}`}>
          <defs>
            <marker id="ag-ok" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ag-ok" /></marker>
          </defs>
          {r.kenarlar.map((e) => {
            const a = konum.get(e.a)!, b = konum.get(e.b)!;
            const vurgu = s && (e.a === s.kod || e.b === s.kod);
            return (
              <g key={e.kod} class={`ag-kenar ${e.baglanti ? 'baglanti' : ''} ${e.gecerlilik === 'belirsiz' ? 'belirsiz' : ''} karar-${e.karar} ${vurgu ? 'vurgu' : ''}`}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} marker-end={e.karsilikli ? undefined : 'url(#ag-ok)'}>
                  <title>{kenarYazisi(e, ad)}</title>
                </line>
                {(etiketGoster || vurgu) && !e.baglanti && <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 3} text-anchor="middle" class="ag-etiket">{kisalt(e.aIcin, 20)}</text>}
              </g>
            );
          })}
          {r.dugumler.map((d) => {
            const p = konum.get(d.kod)!;
            return (
              <g key={d.kod} class={`ag-dugum ${grupSinifi(d.tur)} ${d.kod === r.merkez ? 'odak' : ''} ${d.kod === secili ? 'secili' : ''} karar-${d.karar}`}
                transform={`translate(${p.x},${p.y})`} role="button" tabIndex={0} aria-label={d.ad}
                onClick={() => setSecili(d.kod)} onKeyDown={(e) => { if (e.key === 'Enter') setSecili(d.kod); }}>
                <circle r={d.kod === r.merkez ? 13 : 9} />
                <text y={d.kod === r.merkez ? 28 : 23} text-anchor="middle">{kisalt(d.ad, 22)}</text>
              </g>
            );
          })}
        </svg>
      </div>
      {s && (
        <div class="kart secili-kayit" role="status">
          <div class="satir">
            <strong>{s.ad}</strong> <span class="soluk kucuk">{turBul(s.tur).ad}</span> <KararRozeti karar={s.karar} />
            <span class="bosluk" />
            <a class="dugme kucuk" href={`#/e/${evren}/k/${s.kod}`}>Kaydı aç</a>
            {s.kod !== r.merkez && <button class="dugme kucuk" onClick={() => { setTumu(false); git(`/e/${evren}/ag/${s.kod}`); }}>Merkeze al</button>}
          </div>
          <ul class="kucuk">{seciliKenarlar.map((e) => <li key={e.kod}>{kenarYazisi(e, ad)}</li>)}</ul>
        </div>
      )}
      <details>
        <summary>Bağlar liste olarak ({r.kenarlar.length})</summary>
        <ul class="kucuk">{r.kenarlar.map((e) => <li key={e.kod}>{kenarYazisi(e, ad)}</li>)}</ul>
      </details>
    </div>
  );
}

function kenarYazisi(e: AgKenari, ad: Map<string, { ad: string }>) {
  const a = ad.get(e.a)?.ad ?? '', b = ad.get(e.b)?.ad ?? '';
  const sure = e.baslangic || e.bitis ? ` (${e.baslangic?.ifade ?? '…'} – ${e.bitis?.ifade ?? '…'})` : '';
  const not = `${e.rolAdi ? ` · ${e.rolAdi.toLocaleLowerCase('tr-TR')}` : ''}${e.gecerlilik === 'belirsiz' ? ' · bu tarihte belirsiz' : ''}${e.karar === 'fikir' ? ' · fikir' : ''}`;
  if (e.baglanti) return `${a} → ${b}: ${e.etiket.toLocaleLowerCase('tr-TR')}`;
  return `${a}: ${iliskiTuruBul(e.tur).aIcin.toLocaleLowerCase('tr-TR')} ${b}${sure}${not}`;
}

function CokluSecim({ etiket, secili, setSecili, gruplar }: {
  etiket: string; secili: string[]; setSecili: (x: string[]) => void; gruplar: { ad: string; secenekler: { kod: string; ad: string }[] }[];
}) {
  const degis = (kod: string, acik: boolean) => setSecili(acik ? [...secili, kod] : secili.filter((x) => x !== kod));
  return (
    <details class="coklu-secim">
      <summary class="dugme kucuk">{etiket}: {secili.length ? `${secili.length} seçili` : 'hepsi'}</summary>
      <div class="coklu-secim-icerik kart">
        {secili.length > 0 && <button class="dugme sade kucuk" onClick={() => setSecili([])}>Hepsini göster</button>}
        {gruplar.map((g) => (
          <fieldset key={g.ad}>
            <legend class="kucuk soluk">{g.ad}</legend>
            {g.secenekler.map((o) => (
              <label key={o.kod} class="satir kucuk"><input type="checkbox" checked={secili.includes(o.kod)} onChange={(e) => degis(o.kod, (e.target as HTMLInputElement).checked)} /> {o.ad}</label>
            ))}
          </fieldset>
        ))}
      </div>
    </details>
  );
}

// ---------- Durum geçmişi ----------
export function DurumGecmisiSekmesi({ istemci, evren, ozellik }: { istemci: Istemci; evren: string; ozellik: string | null }) {
  const n = useYenile(istemci, evren);
  const takvim = useTakvim(istemci, evren);
  const [adlar, setAdlar] = useState<string[] | null>(null);
  const [an, setAn] = useState('');
  const [g, setG] = useState<DurumGecmisi | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const secili = ozellik ? decodeURIComponent(ozellik) : null;
  useEffect(() => { istemci.iste('ozellikAdlari', { evren }).then(setAdlar, () => setAdlar([])); }, [evren, n]);
  useEffect(() => {
    if (!secili) { setG(null); return; }
    istemci.iste('durumGecmisi', { evren, ozellik: secili, an: an || null }).then((x) => { setG(x); setHata(null); }, (e) => setHata(hataYaz(e)));
  }, [evren, secili, an, n]);
  if (!adlar) return <p class="soluk">Açılıyor…</p>;
  if (!adlar.length) return <p class="soluk">Henüz zamanla değişen bir durum yazılmamış. Bir kaydın sayfasındaki “Zamanla değişenler” bölümünden ekleyebilirsin.</p>;
  return (
    <div class="gorunum">
      <div class="satir">
        <label class="satir"><span>Özellik</span>
          <select class="girdi kucuk-girdi" value={secili ?? ''} onChange={(e) => { const v = (e.target as HTMLSelectElement).value; if (v) git(`/e/${evren}/durumlar/${encodeURIComponent(v)}`); }}>
            <option value="">Seç…</option>
            {adlar.map((a) => <option value={a}>{a}</option>)}
          </select></label>
        {secili && <AnGirdisi an={an} setAn={setAn} ipucu="Bir an seç" />}
      </div>
      {!secili && <p class="soluk kucuk">Bir özelliğin (unvan, ikamet, sahibi…) evrendeki bütün kayıtlarda zaman içinde aldığı değerler.</p>}
      {hata && <p class="hata">{hata}</p>}
      {g && (
        <>
          <DurumSeritleri evren={evren} takvim={takvim} an={g.an}
            satirlar={g.kayitlar.map((k) => ({ anahtar: k.kod, etiket: k.ad, href: `#/e/${evren}/k/${k.kod}`, durumlar: k.durumlar }))} />
          {g.an && (
            <section aria-label="Bu tarihte">
              <h3>{tarihAciklamasi(g.an, takvim)}</h3>
              <ul>
                {g.kayitlar.map((k) => {
                  const evet = k.durumlar.filter((d) => d.gecerli === 'evet'), belki = k.durumlar.filter((d) => d.gecerli === 'belirsiz');
                  return (
                    <li key={k.kod}><a href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a>: {evet.length ? evet.map(degerYazi).join(', ') : <span class="soluk">kayıtlı değer yok</span>}
                      {belki.length > 0 && <span class="soluk"> · belirsiz: {belki.map(degerYazi).join(', ')}</span>}</li>
                  );
                })}
              </ul>
              <p class="soluk kucuk">“Kayıtlı değer yok” bu özelliğin o tarihte olmadığı anlamına gelmez; yalnızca yazılmamıştır.</p>
            </section>
          )}
        </>
      )}
    </div>
  );
}

const degerYazi = (d: DurumSatiri) => d.hedef ? d.hedef.ad : d.deger;

/** Kayıt sayfasında: her özellik bir şerit. */
export function KayitDurumSeritleri({ istemci, evren, kod }: { istemci: Istemci; evren: string; kod: string }) {
  const n = useYenile(istemci, evren);
  const takvim = useTakvim(istemci, evren);
  const [g, setG] = useState<DurumGecmisi[] | null>(null);
  useEffect(() => { istemci.iste('kayitDurumGecmisi', { evren, kod }).then(setG, () => setG([])); }, [evren, kod, n]);
  if (!g) return null;
  if (!g.length) return <p class="soluk kucuk">Çizilecek durum yok.</p>;
  return <DurumSeritleri evren={evren} takvim={takvim} an={null}
    satirlar={g.map((x) => ({ anahtar: x.ozellik, etiket: x.ozellik, href: `#/e/${evren}/durumlar/${encodeURIComponent(x.ozellik)}`, durumlar: x.kayitlar[0].durumlar }))} />;
}

interface Serit { anahtar: string; etiket: string; href: string; durumlar: DurumSatiri[] }
interface Parca { d: DurumSatiri; s0: number | null; s1: number | null; e0: number | null; e1: number | null; acikBas: boolean; acikSon: boolean; belirsizSinir: boolean }

function parcalar(d: DurumSatiri): Parca {
  const eks = (t: EvrenTarihi | null | undefined) => t?.eksen ?? null;
  const bas = d.baslangic, bit = d.kip === 'sonraki' ? d.sonraki : d.kip === 'aralik' ? d.bitis : d.baslangic;
  const b = eks(bas?.tarih), e = eks(bit?.tarih);
  return {
    d, s0: b?.enErken ?? null, s1: b?.enGec ?? null, e0: e?.enErken ?? null, e1: e?.enGec ?? null,
    acikBas: !bas, acikSon: !bit, belirsizSinir: (!!bas && !b) || (!!bit && !e),
  };
}

/**
 * Durumların zaman şeridi. Sınırın belirsiz kısmı soluk, kesin kısmı dolu çizilir; açık uçlar şeridin
 * kenarına uzanır. Tarihi bilinmeyen sınır (bağlı olayın tarihi yok) çizimde uydurulmaz, listede söylenir.
 */
export function DurumSeritleri({ satirlar, takvim, an }: { evren: string; satirlar: Serit[]; takvim: Takvim; an: EvrenTarihi | null }) {
  const tum = satirlar.flatMap((s) => s.durumlar.map(parcalar));
  const uclar = tum.flatMap((p) => [p.s0, p.s1, p.e0, p.e1]).filter((x): x is number => x !== null && Number.isFinite(x));
  if (an?.eksen) for (const x of [an.eksen.enErken, an.eksen.enGec]) if (x !== null) uclar.push(x);
  if (!uclar.length) {
    return <ul>{satirlar.map((s) => <li key={s.anahtar}><a href={s.href}>{s.etiket}</a>: {s.durumlar.map((d) => `${degerYazi(d)} (${aralikYazi(d)})`).join('; ')}</li>)}</ul>;
  }
  const alt = Math.min(...uclar), ust = Math.max(...uclar);
  // Açık uçlu durumlar için şeridin kenarında yer bırakılır; yoksa son değer görünmeyecek kadar kısa kalır.
  const genis = Math.max(1, ust - alt);
  const solPay = genis * (tum.some((p) => p.acikBas && p.d.kip !== 'anlik') ? 0.2 : 0.06);
  const sagPay = genis * (tum.some((p) => p.acikSon && p.d.kip !== 'anlik') ? 0.3 : 0.06);
  const bas = alt - solPay, uzunluk = ust + sagPay - bas;
  const yuzde = (x: number) => Math.max(0, Math.min(100, ((x - bas) / uzunluk) * 100));
  const yil0 = eksenYili(bas, takvim), yil1 = eksenYili(bas + uzunluk, takvim);
  return (
    <ol class="cizelge-listesi durum-seritleri" aria-label="Durum şeritleri">
      <li class="cizelge-olcek" aria-hidden="true"><span /><span class="cizelge-iz"><span style="left:0">{takvim.ad} {yil0}</span><span style="right:0">{takvim.ad} {yil1}</span></span></li>
      {satirlar.map((s) => (
        <li key={s.anahtar} class="cizelge-satiri">
          <span class="cizelge-etiket"><a class="satir-ad" href={s.href}>{s.etiket}</a></span>
          <span class="cizelge-iz serit">
            {s.durumlar.map(parcalar).map((p) => {
              const baslik = `${degerYazi(p.d)}: ${aralikYazi(p.d)}${p.d.karar === 'fikir' ? ' · fikir' : ''}`;
              if (p.d.kip === 'anlik') {
                if (p.s0 === null) return null;
                return <span key={p.d.kod} class="serit-an" style={{ left: `${yuzde((p.s0 + p.s1!) / 2)}%` }} title={baslik} />;
              }
              const s0 = p.acikBas || p.s0 === null ? 0 : yuzde(p.s0), s1 = p.acikBas || p.s1 === null ? 0 : yuzde(p.s1);
              const e0 = p.acikSon || p.e0 === null ? 100 : yuzde(p.e0), e1 = p.acikSon || p.e1 === null ? 100 : yuzde(p.e1);
              return (
                <span key={p.d.kod} class={`serit-parca karar-${p.d.karar} ${p.belirsizSinir ? 'sinir-bilinmiyor' : ''}`} title={baslik}>
                  {s1 > s0 && <span class="serit-bulanik" style={{ left: `${s0}%`, width: `${s1 - s0}%` }} />}
                  <span class="serit-dolu" style={{ left: `${s1}%`, width: `${Math.max(0.5, e0 - s1)}%` }}>{degerYazi(p.d)}</span>
                  {e1 > e0 && <span class="serit-bulanik" style={{ left: `${e0}%`, width: `${e1 - e0}%` }} />}
                </span>
              );
            })}
            {an?.eksen && <span class="serit-an-cizgisi" style={{ left: `${yuzde(an.eksen.enErken!)}%`, width: `${Math.max(0.3, yuzde(an.eksen.enGec!) - yuzde(an.eksen.enErken!))}%` }} />}
          </span>
        </li>
      ))}
    </ol>
  );
}
