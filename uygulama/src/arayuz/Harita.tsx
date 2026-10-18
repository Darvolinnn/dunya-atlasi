// Harita: yükle, işaretle, bağla (§8.1). Haritalarda, kat planlarında ve kayıt görsellerinde aynı bileşen kullanılır.
// İşaretler haritanın uzayında durur; görsel bu uzaya oturtulmuş bir katmandır. Kipler görünür biçimde seçilir (§8.7).
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { HaritaAyrintisi, HaritaIsareti, HaritaOzeti, IsaretGirdisi, Kayit, KayitHaritalari } from '../veri/api';
import { turBul } from '../alan/turler';
import { BaglantiSecici } from './BaglantiSecici';
import { KayitSec } from './KayitBolumleri';
import { Gorsel } from './gorsel';
import { KararRozeti } from './ortak';
import { git } from './Uygulama';

const hataYaz = (e: unknown) => (e as Error).message;
const KESINLIKLER: { kod: IsaretGirdisi['kesinlik']; ad: string }[] = [
  { kod: 'kesin', ad: 'Kesin yer' }, { kod: 'yaklasik', ad: 'Yaklaşık bölge' }, { kod: 'bilinmiyor', ad: 'Yeri bilinmiyor' },
];
const kesinlikAdi = (k: string) => KESINLIKLER.find((x) => x.kod === k)?.ad ?? k;

function useYenile(istemci: Istemci, evren: string) {
  const [n, setN] = useState(0);
  useEffect(() => istemci.dinle((d) => { if (d.evren === evren) setN((x) => x + 1); }), [evren]);
  return n;
}

// ---------- Haritalar sekmesi ----------
export function HaritalarSekmesi({ istemci, evren, kod }: { istemci: Istemci; evren: string; kod: string | null }) {
  if (kod) return <HaritaGorunumu key={kod} istemci={istemci} evren={evren} kod={kod} />;
  return <HaritaListesi istemci={istemci} evren={evren} />;
}

function HaritaListesi({ istemci, evren }: { istemci: Istemci; evren: string }) {
  const n = useYenile(istemci, evren);
  const [liste, setListe] = useState<HaritaOzeti[] | null>(null);
  const [kaldirilan, setKaldirilan] = useState<HaritaOzeti[]>([]);
  useEffect(() => {
    istemci.iste('haritalar', { evren }).then(setListe, () => setListe([]));
    istemci.iste('haritalar', { evren, silinmis: true }).then(setKaldirilan, () => {});
  }, [evren, n]);
  if (!liste) return <p class="soluk">Açılıyor…</p>;
  return (
    <div class="haritalar">
      <p class="soluk kucuk">Harita görselini yükle, üstüne işaret koy ve her işareti bir kayda bağla. Bir yerin yeri bilinmiyorsa bunu da söyleyebilirsin; efsanevi bir şehir için nokta gerekmez.</p>
      <HaritaYukle istemci={istemci} evren={evren} />
      {liste.length === 0 && <p class="soluk">Henüz harita yok.</p>}
      <ul class="harita-izgara">
        {liste.map((h) => (
          <li key={h.kod}>
            <a class="kart harita-karti" href={`#/e/${evren}/haritalar/${h.kod}`}>
              {h.gorsel ? <Gorsel istemci={istemci} evren={evren} ad={h.gorsel} alt="" sinif="harita-onizleme" /> : <span class="gorsel-yer harita-onizleme" />}
              <strong>{h.ad}</strong>
              <span class="soluk kucuk">{h.yer ? `${h.yer.ad} · ` : ''}{h.isaretSayisi} işaret</span>
            </a>
          </li>
        ))}
      </ul>
      {kaldirilan.length > 0 && (
        <details class="kaldirilan-haritalar">
          <summary class="soluk kucuk">Kaldırılan haritalar ({kaldirilan.length})</summary>
          <ul>
            {kaldirilan.map((h) => <li key={h.kod}>{h.ad} <button class="dugme sade kucuk" onClick={() => istemci.iste('haritaSil', { evren, kod: h.kod, geriYukle: true })}>Geri getir</button></li>)}
          </ul>
        </details>
      )}
    </div>
  );
}

function HaritaYukle({ istemci, evren, yer = null }: { istemci: Istemci; evren: string; yer?: { kod: string; ad: string } | null }) {
  const [acik, setAcik] = useState(false);
  const [ad, setAd] = useState('');
  const [secYer, setSecYer] = useState<{ kod: string; ad: string } | null>(yer);
  const [dosya, setDosya] = useState<File | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  if (!acik) return <button class="dugme" onClick={() => setAcik(true)}>Harita yükle</button>;
  const yukle = async (e: Event) => {
    e.preventDefault();
    if (!dosya) { setHata('Bir görsel seç.'); return; }
    setYukleniyor(true);
    try {
      const { kod } = await istemci.iste('haritaYukle', { evren, ad: ad.trim() || dosya.name.replace(/\.[^.]+$/, ''), yer: secYer?.kod ?? null,
        dosyaAdi: dosya.name, tur: dosya.type, veri: new Uint8Array(await dosya.arrayBuffer()) });
      git(`/e/${evren}/haritalar/${kod}`);
    } catch (x) { setHata(hataYaz(x)); } finally { setYukleniyor(false); }
  };
  return (
    <form class="kart harita-yukle" onSubmit={yukle}>
      <div class="satir">
        <label class="alan" style="flex:1;min-width:200px"><span class="alan-adi">Görsel</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" aria-label="Harita görseli"
            onChange={(e) => { const f = (e.target as HTMLInputElement).files?.[0] ?? null; setDosya(f); if (f && !ad) setAd(f.name.replace(/\.[^.]+$/, '')); }} /></label>
        <label class="alan" style="flex:1;min-width:200px"><span class="alan-adi">Haritanın adı</span>
          <input class="girdi" lang="tr" aria-label="Haritanın adı" value={ad} onInput={(e) => setAd((e.target as HTMLInputElement).value)} /></label>
        <div class="alan"><span class="alan-adi">Gösterdiği yer (isteğe bağlı)</span>
          <span class="satir"><KayitSec istemci={istemci} evren={evren} secili={secYer} sec={setSecYer} etiket="Yer seç" />
            {secYer && <button type="button" class="dugme sade kucuk" onClick={() => setSecYer(null)}>Kaldır</button>}</span></div>
      </div>
      <p class="soluk kucuk">Büyük görseller de yüklenebilir. Fotoğraflardaki konum bilgisi silinir.</p>
      {hata && <p class="hata kucuk">{hata}</p>}
      <div class="satir">
        <button class="dugme ana" disabled={yukleniyor}>{yukleniyor ? 'Yükleniyor…' : 'Yükle'}</button>
        <button type="button" class="dugme sade" onClick={() => setAcik(false)}>Vazgeç</button>
      </div>
    </form>
  );
}

// ---------- Harita görünümü ----------
type Kip = { tur: 'gez' } | { tur: 'koy'; kesinlik: 'kesin' | 'yaklasik' } | { tur: 'tasi'; isaret: string; kesinlik: 'kesin' | 'yaklasik' };

function HaritaGorunumu({ istemci, evren, kod }: { istemci: Istemci; evren: string; kod: string }) {
  const n = useYenile(istemci, evren);
  const [h, setH] = useState<HaritaAyrintisi | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yakinlik, setYakinlik] = useState(1);
  const [kip, setKip] = useState<Kip>({ tur: 'gez' });
  const [secili, setSecili] = useState<string | null>(null);
  const [yeni, setYeni] = useState<{ x: number; y: number; ekran: { left: number; top: number } } | null>(null);
  const [bilinmeyenEkle, setBilinmeyenEkle] = useState<{ left: number; top: number } | null>(null);
  const yuzey = useRef<HTMLDivElement>(null);
  useEffect(() => { istemci.iste('harita', { evren, kod }).then((x) => { setH(x); setHata(null); }, (e) => setHata(hataYaz(e))); }, [kod, n]);
  useEffect(() => {
    const tus = (e: KeyboardEvent) => { if (e.key === 'Escape') { setKip({ tur: 'gez' }); setYeni(null); } };
    addEventListener('keydown', tus);
    return () => removeEventListener('keydown', tus);
  }, []);
  if (hata) return <p class="hata">{hata} <a href={`#/e/${evren}/haritalar`}>Haritalara dön</a></p>;
  if (!h) return <p class="soluk">Açılıyor…</p>;

  const iste = <T,>(p: Promise<T>) => p.then((x) => { setHata(null); return x; }, (e) => { setHata(hataYaz(e)); return null; });
  const uzayNoktasi = (e: MouseEvent) => {
    const r = yuzey.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * h.en, y: ((e.clientY - r.top) / r.height) * h.boy };
  };
  const tikla = async (e: MouseEvent) => {
    if (kip.tur === 'gez') { setSecili(null); return; }
    const p = uzayNoktasi(e);
    if (kip.tur === 'koy') { setYeni({ ...p, ekran: { left: e.clientX, top: e.clientY + 8 } }); return; }
    const eski = h.isaretler.find((x) => x.kod === kip.isaret);
    await iste(istemci.iste('isaretDegistir', { evren, kod: kip.isaret, alan: 'konum', deger: { kesinlik: kip.kesinlik, x: p.x, y: p.y, yaricap: eski?.konum.yaricap ?? null } }));
    setKip({ tur: 'gez' });
  };
  const yeniKoy = async (kayit: string) => {
    if (!yeni || kip.tur !== 'koy') return;
    const r = await iste(istemci.iste('isaretKoy', { evren, harita: kod, kayit, konum: { kesinlik: kip.kesinlik, x: yeni.x, y: yeni.y, yaricap: null } }));
    setYeni(null);
    if (r) setSecili(r.kod);
  };
  const yerlesen = h.isaretler.filter((i) => i.konum.kesinlik !== 'bilinmiyor');
  const bilinmeyen = h.isaretler.filter((i) => i.konum.kesinlik === 'bilinmiyor');
  const sec = h.isaretler.find((i) => i.kod === secili) ?? null;
  const yuzde = (v: number, toplam: number) => `${(v / toplam) * 100}%`;

  return (
    <div class="harita-gorunumu">
      <div class="satir">
        <a href={`#/e/${evren}/haritalar`} class="dugme sade">← Haritalar</a>
        {h.ustHaritalar.map((u) => <a key={u.kod} class="dugme sade kucuk" href={`#/e/${evren}/haritalar/${u.kod}`}>↑ {u.ad}</a>)}
      </div>
      <HaritaBasligi istemci={istemci} evren={evren} h={h} />
      {h.silindi && <p class="uyari">Bu harita kaldırılmış. <button class="dugme kucuk" onClick={() => iste(istemci.iste('haritaSil', { evren, kod, geriYukle: true }))}>Geri getir</button></p>}

      <div class="satir harita-arac" role="toolbar" aria-label="Harita araçları">
        <button class="dugme kucuk" aria-pressed={kip.tur === 'gez'} onClick={() => setKip({ tur: 'gez' })}>Gez ve seç</button>
        <button class="dugme kucuk" aria-pressed={kip.tur === 'koy' && kip.kesinlik === 'kesin'} disabled={h.silindi} onClick={() => setKip({ tur: 'koy', kesinlik: 'kesin' })}>Kesin yer işaretle</button>
        <button class="dugme kucuk" aria-pressed={kip.tur === 'koy' && kip.kesinlik === 'yaklasik'} disabled={h.silindi} onClick={() => setKip({ tur: 'koy', kesinlik: 'yaklasik' })}>Yaklaşık bölge işaretle</button>
        <span class="bosluk" />
        <button class="dugme kucuk" aria-label="Uzaklaştır" disabled={yakinlik <= 1} onClick={() => setYakinlik((z) => Math.max(1, z / 1.5))}>−</button>
        <span class="soluk kucuk">%{Math.round(yakinlik * 100)}</span>
        <button class="dugme kucuk" aria-label="Yakınlaştır" disabled={yakinlik >= 12} onClick={() => setYakinlik((z) => Math.min(12, z * 1.5))}>+</button>
      </div>
      <p class="soluk kucuk" role="status">
        {kip.tur === 'koy' ? `Haritada bir yere dokun, sonra bağlanacak kaydı seç. Bitirmek için “Gez ve seç”e bas ya da Esc.`
          : kip.tur === 'tasi' ? `“${h.isaretler.find((x) => x.kod === kip.isaret)?.kayit.ad}” için yeni yere dokun. Vazgeçmek için Esc.`
            : 'Bir işarete dokunarak seç. İşaret koymak için yukarıdan bir kip seç.'}
      </p>
      {hata && <p class="hata kucuk">{hata}</p>}

      <div class="harita-duzen">
        <div class="harita-tuval">
          <div ref={yuzey} class={`harita-yuzey${kip.tur !== 'gez' ? ' isaretleme' : ''}`} style={{ width: `${yakinlik * 100}%`, aspectRatio: `${h.en} / ${h.boy}` }}
            onClick={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.harita-katman')) void tikla(e); }}>
            {h.katmanlar.map((k, i) => (
              <div key={i} class="harita-katman" style={{ left: yuzde(k.x, h.en), top: yuzde(k.y, h.boy), width: yuzde(k.olcek * k.en, h.en) }}>
                <Gorsel istemci={istemci} evren={evren} ad={k.gorsel} onizleme={false} alt={h.ad} />
              </div>
            ))}
            {yerlesen.map((i) => (
              <IsaretGorseli key={i.kod} i={i} h={h} secili={i.kod === secili} sec={() => { if (kip.tur === 'gez') setSecili(i.kod); }} />
            ))}
            {yeni && <span class="harita-isaret yeni" style={{ left: yuzde(yeni.x, h.en), top: yuzde(yeni.y, h.boy) }} aria-hidden="true" />}
          </div>
        </div>
        <aside class="harita-yan">
          {sec ? <IsaretPaneli istemci={istemci} evren={evren} i={sec} enBuyuk={Math.max(h.en, h.boy)} kapat={() => setSecili(null)}
            tasi={(k) => setKip({ tur: 'tasi', isaret: sec.kod, kesinlik: k })} hata={setHata} />
            : (
              <>
                <h2>İşaretler</h2>
                {h.isaretler.length === 0 && <p class="soluk kucuk">Henüz işaret yok.</p>}
                <ul class="isaret-listesi">
                  {yerlesen.map((i) => (
                    <li key={i.kod}><button class="dugme sade kucuk" onClick={() => setSecili(i.kod)}>{i.kayit.ad}</button>
                      <span class="soluk kucuk">{turBul(i.kayit.tur).ad}{i.konum.kesinlik === 'yaklasik' ? ' · yaklaşık' : ''}</span> <KararRozeti karar={i.karar} /></li>
                  ))}
                </ul>
                <h3>Yeri bilinmeyenler</h3>
                <p class="soluk kucuk">Bu haritada olduğu bilinen ama yeri belli olmayan kayıtlar.</p>
                <ul class="isaret-listesi">
                  {bilinmeyen.map((i) => (
                    <li key={i.kod}><button class="dugme sade kucuk" onClick={() => setSecili(i.kod)}>{i.kayit.ad}</button> <KararRozeti karar={i.karar} /></li>
                  ))}
                </ul>
                {!h.silindi && <button class="dugme kucuk" onClick={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setBilinmeyenEkle({ left: r.left, top: r.bottom + 4 }); }}>Yeri bilinmeyen kayıt ekle</button>}
              </>
            )}
        </aside>
      </div>
      {yeni && <BaglantiSecici istemci={istemci} evren={evren} sorgu="" konum={yeni.ekran} sec={(s) => void yeniKoy(s.kod)} kapat={() => setYeni(null)} />}
      {bilinmeyenEkle && <BaglantiSecici istemci={istemci} evren={evren} sorgu="" konum={bilinmeyenEkle}
        sec={(s) => { setBilinmeyenEkle(null); void iste(istemci.iste('isaretKoy', { evren, harita: kod, kayit: s.kod, konum: { kesinlik: 'bilinmiyor', x: null, y: null, yaricap: null } })); }}
        kapat={() => setBilinmeyenEkle(null)} />}
    </div>
  );
}

function HaritaBasligi({ istemci, evren, h }: { istemci: Istemci; evren: string; h: HaritaAyrintisi }) {
  const [ad, setAd] = useState(h.ad);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => setAd(h.ad), [h.ad]);
  const yaz = (alan: 'ad' | 'yer', deger: unknown) => istemci.iste('haritaDegistir', { evren, kod: h.kod, alan, deger }).then(() => setHata(null), (e) => { setHata(hataYaz(e)); setAd(h.ad); });
  return (
    <div class="satir harita-basligi">
      <input class="girdi buyuk" lang="tr" aria-label="Haritanın adı" value={ad} style="flex:1;min-width:200px"
        onInput={(e) => setAd((e.target as HTMLInputElement).value)} onBlur={() => { if (ad.trim() !== h.ad) void yaz('ad', ad); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
      <span class="soluk kucuk">Gösterdiği yer:</span>
      {h.yer && <a href={`#/e/${evren}/k/${h.yer.kod}`}>{h.yer.ad}</a>}
      <KayitSec istemci={istemci} evren={evren} secili={null} sec={(s) => { if (s) void yaz('yer', s.kod); }} etiket={h.yer ? 'Değiştir' : 'Yer seç'} />
      {h.yer && <button class="dugme sade kucuk" onClick={() => void yaz('yer', null)}>Bağı kaldır</button>}
      {!h.silindi && <button class="dugme sade kucuk tehlikeli" onClick={() => istemci.iste('haritaSil', { evren, kod: h.kod })}>Haritayı kaldır</button>}
      {hata && <span class="hata kucuk">{hata}</span>}
    </div>
  );
}

function IsaretGorseli({ i, h, secili, sec }: { i: HaritaIsareti; h: HaritaAyrintisi; secili: boolean; sec: () => void }) {
  const { x, y, yaricap } = i.konum;
  const sol = `${(x! / h.en) * 100}%`, ust = `${(y! / h.boy) * 100}%`;
  return (
    <>
      {i.konum.kesinlik === 'yaklasik' && yaricap && (
        <span class={`harita-bolge${secili ? ' secili' : ''}`} aria-hidden="true"
          style={{ left: `${((x! - yaricap) / h.en) * 100}%`, top: `${((y! - yaricap) / h.boy) * 100}%`, width: `${((2 * yaricap) / h.en) * 100}%`, height: `${((2 * yaricap) / h.boy) * 100}%` }} />
      )}
      <button class={`harita-isaret ${i.konum.kesinlik}${secili ? ' secili' : ''} karar-${i.karar}`} style={{ left: sol, top: ust }}
        aria-label={`${i.kayit.ad} (${kesinlikAdi(i.konum.kesinlik).toLocaleLowerCase('tr-TR')})`} aria-pressed={secili}
        onClick={(e) => { e.stopPropagation(); sec(); }}>
        <span class="harita-etiket">{i.kayit.ad}</span>
      </button>
    </>
  );
}

function IsaretPaneli({ istemci, evren, i, enBuyuk, kapat, tasi, hata }: {
  istemci: Istemci; evren: string; i: HaritaIsareti; enBuyuk: number; kapat: () => void; tasi: (k: 'kesin' | 'yaklasik') => void; hata: (s: string | null) => void;
}) {
  const iste = (p: Promise<unknown>) => p.then(() => hata(null), (e) => hata(hataYaz(e)));
  const konumYaz = (k: Partial<IsaretGirdisi>) => iste(istemci.iste('isaretDegistir', { evren, kod: i.kod, alan: 'konum', deger: { ...i.konum, ...k } }));
  const [yaricap, setYaricap] = useState(i.konum.yaricap ?? 0);
  useEffect(() => setYaricap(i.konum.yaricap ?? 0), [i.konum.yaricap]);
  return (
    <div class="isaret-paneli" aria-label="Seçili işaret">
      <div class="satir"><h2 style="flex:1"><a href={`#/e/${evren}/k/${i.kayit.kod}`}>{i.kayit.ad}</a></h2>
        <button class="dugme sade kucuk" onClick={kapat} aria-label="Seçimi kapat">✕</button></div>
      <p class="soluk kucuk">{turBul(i.kayit.tur).ad} <KararRozeti karar={i.karar} /></p>
      {i.altHarita && <p><a class="dugme kucuk" href={`#/e/${evren}/haritalar/${i.altHarita}`}>Bu yerin haritasını aç</a></p>}
      <label class="alan"><span class="alan-adi">Kesinlik</span>
        <select class="girdi" value={i.konum.kesinlik} onChange={(e) => {
          const k = (e.target as HTMLSelectElement).value as IsaretGirdisi['kesinlik'];
          if (k === 'bilinmiyor') void konumYaz({ kesinlik: 'bilinmiyor', x: null, y: null, yaricap: null });
          else if (i.konum.kesinlik === 'bilinmiyor') tasi(k);
          else void konumYaz({ kesinlik: k, yaricap: k === 'yaklasik' ? i.konum.yaricap : null });
        }}>
          {KESINLIKLER.map((k) => <option value={k.kod}>{k.ad}</option>)}
        </select></label>
      {i.konum.kesinlik === 'yaklasik' && (
        <label class="alan"><span class="alan-adi">Bölgenin genişliği</span>
          <input type="range" min={1} max={Math.max(2, Math.round(enBuyuk / 2))} value={yaricap} aria-label="Bölgenin genişliği"
            onInput={(e) => setYaricap(Number((e.target as HTMLInputElement).value))} onChange={() => void konumYaz({ yaricap })} /></label>
      )}
      <div class="satir">
        <button class="dugme kucuk" onClick={() => tasi(i.konum.kesinlik === 'yaklasik' ? 'yaklasik' : 'kesin')}>{i.konum.kesinlik === 'bilinmiyor' ? 'Haritada yerini göster' : 'Taşı'}</button>
        <KayitSec istemci={istemci} evren={evren} secili={null} etiket="Başka kayda bağla"
          sec={(s) => { if (s) void iste(istemci.iste('isaretDegistir', { evren, kod: i.kod, alan: 'kayit', deger: s.kod })); }} />
        <button class="dugme sade kucuk tehlikeli" onClick={() => { void iste(istemci.iste('isaretSil', { evren, kod: i.kod })); kapat(); }}>İşareti kaldır</button>
      </div>
    </div>
  );
}

// ---------- Kayıt sayfası ----------
export function KayitHaritaBolumu({ istemci, evren, kayit }: { istemci: Istemci; evren: string; kayit: Kayit }) {
  const n = useYenile(istemci, evren);
  const [v, setV] = useState<KayitHaritalari | null>(null);
  useEffect(() => { istemci.iste('kayitHaritalari', { evren, kod: kayit.kod }).then(setV, () => setV(null)); }, [kayit.kod, n]);
  if (!v || (!v.isaretler.length && !v.haritalar.length)) return null;
  return (
    <section class="kayit-haritalari" aria-label="Haritalar">
      <h2>Haritalar</h2>
      <ul>
        {v.haritalar.map((h) => <li key={h.kod}><a href={`#/e/${evren}/haritalar/${h.kod}`}>{h.ad}</a> <span class="soluk kucuk">bu yerin haritası</span></li>)}
        {v.isaretler.map((i) => <li key={i.kod}><a href={`#/e/${evren}/haritalar/${i.harita}`}>{i.haritaAd}</a> <span class="soluk kucuk">{kesinlikAdi(i.kesinlik).toLocaleLowerCase('tr-TR')}</span></li>)}
      </ul>
    </section>
  );
}

/** Kayıt görselinden işaretleme yüzeyi açar (kat planı, eşya, karakter görseli). */
export async function gorseldeIsaretle(istemci: Istemci, evren: string, kayit: string, gorsel: string) {
  const { kod } = await istemci.iste('gorseldenHarita', { evren, kayit, gorsel });
  git(`/e/${evren}/haritalar/${kod}`);
}
