// Anlatı yapısı (§3.3), sahne alanları ve bağlam paneli (§5.5), durum geçmişi (§3.5).
import { KayitDurumSeritleri } from './Gorunumler';
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { AnlatiEtkisi, AnlatiYeri, DurumAlani, DurumSatiri, EserYapisi, Kayit, KisaKayit, SahneAlani, SahneBaglami, SinirBilgisi, SinirGirdisi, YapiSahnesi } from '../veri/api';
import { DURUM_KIPLERI } from '../alan/durum';
import { farkYazisi, tarihAciklamasi } from '../alan/tarih';
import { turBul } from '../alan/turler';
import { KararRozeti, KararSecici } from './ortak';
import { KayitSec, SatirGirdisi } from './KayitBolumleri';
import type { Secim } from './BaglantiSecici';
import { BakisBilgileri } from './Bilgiler';
import { useTakvim } from './Takvim';
import { git } from './Uygulama';

const hataYaz = (e: unknown) => (e as Error).message;
const bag = (evren: string, k: { kod: string; ad: string }) => <a href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a>;

/** Değişiklik bildirimi gelince yeniden okuyan küçük yardımcı. */
export function useYukle<T>(istemci: Istemci, evren: string, oku: () => Promise<T>, bagimlilik: unknown[]): [T | null, () => void] {
  const [v, setV] = useState<T | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => { let iptal = false; oku().then((x) => { if (!iptal) setV(x); }, () => {}); return () => { iptal = true; }; }, [...bagimlilik, n]);
  useEffect(() => istemci.dinle((d) => { if (d.evren === evren) setN((x) => x + 1); }), [evren]);
  return [v, () => setN((x) => x + 1)];
}

// ---------- Eserdeki yer: sahne ve bölüm sayfasının üstü ----------
export function AnlatiYolu({ istemci, evren, kayit }: { istemci: Istemci; evren: string; kayit: Kayit }) {
  const [yer] = useYukle<AnlatiYeri>(istemci, evren, () => istemci.iste('anlatiYeri', { evren, kod: kayit.kod }), [kayit.kod]);
  const [yerlestir, setYerlestir] = useState(false);
  const [etki, setEtki] = useState<AnlatiEtkisi[] | null>(null);
  if (!yer) return null;
  if (!yer.eser) {
    return (
      <div class="anlati-yolu">
        <span class="soluk kucuk">Bu {kayit.tur === 'bolum' ? 'bölüm' : 'sahne'} henüz bir esere yerleşmedi.</span>
        {!yerlestir && <button class="dugme kucuk" onClick={() => setYerlestir(true)}>Esere yerleştir</button>}
        {yerlestir && <YerSecici istemci={istemci} evren={evren} tur={kayit.tur} kapat={() => setYerlestir(false)}
          sec={async (ust) => { const r = await istemci.iste('anlatiYerlestir', { evren, kod: kayit.kod, ust }); setEtki(r.etki); setYerlestir(false); }} />}
        {etki && <EtkiOzeti evren={evren} etki={etki} kapat={() => setEtki(null)} />}
      </div>
    );
  }
  return (
    <nav class="anlati-yolu" aria-label="Eserdeki yeri">
      {bag(evren, yer.eser)}
      {yer.bolum && <><span class="soluk">›</span>{kayit.tur === 'bolum' ? <span>{yer.bolum.sira}. bölüm</span> : <a href={`#/e/${evren}/k/${yer.bolum.kod}`}>{yer.bolum.sira}. bölüm: {yer.bolum.ad}</a>}</>}
      {yer.sira !== null && <><span class="soluk">›</span><span>{yer.sira}. sahne</span></>}
      <span class="bosluk" />
      {yer.onceki && <a class="dugme sade kucuk" href={`#/e/${evren}/k/${yer.onceki.kod}`} title={yer.onceki.ad}>← Önceki sahne</a>}
      {yer.sonraki && <a class="dugme sade kucuk" href={`#/e/${evren}/k/${yer.sonraki.kod}`} title={yer.sonraki.ad}>Sonraki sahne →</a>}
    </nav>
  );
}

/** Bir eser ya da bölüm seçtirir (sahne için ikisi de, bölüm için yalnız eser). */
function YerSecici({ istemci, evren, tur, sec, kapat }: { istemci: Istemci; evren: string; tur: string; sec: (ust: string) => Promise<void>; kapat: () => void }) {
  const [eserler, setEserler] = useState<KisaKayit[] | null>(null);
  const [yapilar, setYapilar] = useState<EserYapisi[]>([]);
  const [secili, setSecili] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => {
    istemci.iste('eserler', { evren }).then(async (l) => {
      setEserler(l);
      if (tur !== 'bolum') setYapilar(await Promise.all(l.map((e) => istemci.iste('eserYapisi', { evren, eser: e.kod }))));
    });
  }, [evren]);
  if (!eserler) return null;
  if (!eserler.length) return <span class="soluk kucuk">Önce “Eser” türünde bir kayıt oluşturun. <button class="dugme sade kucuk" onClick={kapat}>Kapat</button></span>;
  return (
    <span class="satir">
      <select class="girdi" aria-label="Nereye" value={secili} onChange={(e) => setSecili((e.target as HTMLSelectElement).value)}>
        <option value="">Nereye?</option>
        {tur === 'bolum'
          ? eserler.map((e) => <option value={e.kod}>{e.ad}</option>)
          : yapilar.map((y) => (
            <optgroup label={y.eser.ad}>
              <option value={y.eser.kod}>{y.eser.ad} (bölümsüz)</option>
              {y.bolumler.map((b) => <option value={b.kod}>{b.sira}. bölüm: {b.ad}</option>)}
            </optgroup>
          ))}
      </select>
      <button class="dugme ana kucuk" disabled={!secili} onClick={() => sec(secili).catch((e) => setHata(hataYaz(e)))}>Yerleştir</button>
      <button class="dugme sade kucuk" onClick={kapat}>Vazgeç</button>
      {hata && <span class="hata kucuk">{hata}</span>}
    </span>
  );
}

/** Taşımadan sonra adların ilk anıldığı sahne değiştiyse (§3.3). Yalnızca metindeki bağlantılara dayanır. */
export function EtkiOzeti({ evren, etki, kapat }: { evren: string; etki: AnlatiEtkisi[]; kapat: () => void }) {
  if (!etki.length) return null;
  return (
    <div class="kart etki-ozeti" role="status">
      <div class="satir"><strong>Okurun ilk karşılaştığı yer değişti</strong><span class="bosluk" /><button class="dugme sade kucuk" onClick={kapat}>Tamam</button></div>
      <p class="soluk kucuk">Taşımadan sonra bu adlar eserde başka bir sahnede ilk kez anılıyor. Tanıtımı gerekiyorsa yeni ilk sahneye bakın.</p>
      <ul>
        {etki.map((x) => (
          <li key={x.kayit.kod}>
            {bag(evren, x.kayit)}: {x.onceki ? bag(evren, x.onceki) : <span class="soluk">hiç anılmıyordu</span>} → {x.yeni ? bag(evren, x.yeni) : <span class="soluk">artık anılmıyor</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Eserin yapısı: eser ve bölüm sayfası ----------
export function EserYapisiBolumu({ istemci, evren, kayit }: { istemci: Istemci; evren: string; kayit: Kayit }) {
  const [yer] = useYukle<AnlatiYeri | null>(istemci, evren,
    () => (kayit.tur === 'eser' ? Promise.resolve(null) : istemci.iste('anlatiYeri', { evren, kod: kayit.kod })), [kayit.kod, kayit.tur]);
  const eser = kayit.tur === 'eser' ? kayit.kod : yer?.eser?.kod;
  if (!eser) return null;
  return <EserAnahatti istemci={istemci} evren={evren} eser={eser} vurgu={kayit.tur === 'bolum' ? kayit.kod : null} />;
}

function EserAnahatti({ istemci, evren, eser, vurgu }: { istemci: Istemci; evren: string; eser: string; vurgu: string | null }) {
  const [y] = useYukle<EserYapisi>(istemci, evren, () => istemci.iste('eserYapisi', { evren, eser }), [eser]);
  const [disarida] = useYukle<YapiSahnesi[]>(istemci, evren, () => istemci.iste('yerlesmemisler', { evren }), [eser]);
  const [etki, setEtki] = useState<AnlatiEtkisi[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yeniBolum, setYeniBolum] = useState('');
  if (!y) return null;
  const tasi = (kod: string, ust: string | null, sira?: number) =>
    istemci.iste('anlatiYerlestir', { evren, kod, ust, sira: sira ?? null }).then((r) => { setEtki(r.etki); setHata(null); }, (e) => setHata(hataYaz(e)));
  const olustur = (ust: string, ad: string, tur: 'bolum' | 'sahne') => istemci.iste('anlatiOlustur', { evren, ust, ad, tur }).then(() => setHata(null), (e) => setHata(hataYaz(e)));
  const hedefler = [{ kod: y.eser.kod, ad: 'Eserin başı (bölümsüz)' }, ...y.bolumler.map((b) => ({ kod: b.kod, ad: `${b.sira}. bölüm: ${b.ad}` }))];

  const sahneListesi = (ust: string, sahneler: YapiSahnesi[]) => (
    <ol class="yapi-sahneler">
      {sahneler.map((s, i) => (
        <li key={s.kod} class="satir">
          <span class="soluk kucuk yapi-no">{s.sira}.</span>
          {bag(evren, s)} <KararRozeti karar={s.karar} />
          {s.tarih && <span class="soluk kucuk">{s.tarih.ifade}</span>}
          <span class="bosluk" />
          <button class="dugme sade kucuk" disabled={i === 0} aria-label={`${s.ad}: yukarı`} onClick={() => tasi(s.kod, ust, i - 1)}>↑</button>
          <button class="dugme sade kucuk" disabled={i === sahneler.length - 1} aria-label={`${s.ad}: aşağı`} onClick={() => tasi(s.kod, ust, i + 1)}>↓</button>
          <select class="girdi kucuk-secim" aria-label={`${s.ad}: başka yere taşı`} value="" onChange={(e) => { const v = (e.target as HTMLSelectElement).value; if (v) tasi(s.kod, v === '-' ? null : v); }}>
            <option value="">Taşı…</option>
            {hedefler.filter((h) => h.kod !== ust).map((h) => <option value={h.kod}>{h.ad}</option>)}
            <option value="-">Eserden çıkar</option>
          </select>
        </li>
      ))}
    </ol>
  );

  return (
    <section class="eser-yapisi" aria-label="Eserin yapısı">
      <h2>Bölümler ve sahneler</h2>
      <p class="soluk kucuk">Sıra okuma sırasıdır; bölüm numaraları buradan hesaplanır. Bir sahneyi taşımak evren tarihini değiştirmez.</p>
      {hata && <p class="hata kucuk">{hata}</p>}
      {etki && <EtkiOzeti evren={evren} etki={etki} kapat={() => setEtki(null)} />}
      {y.dogrudan.length > 0 && sahneListesi(y.eser.kod, y.dogrudan)}
      {y.bolumler.map((b, i) => (
        <div key={b.kod} class={b.kod === vurgu ? 'yapi-bolum vurgu' : 'yapi-bolum'}>
          <div class="satir">
            <strong>{b.sira}. bölüm:</strong> {bag(evren, b)} <KararRozeti karar={b.karar} />
            <span class="bosluk" />
            <button class="dugme sade kucuk" disabled={i === 0} aria-label={`${b.ad}: yukarı`} onClick={() => tasi(b.kod, y.eser.kod, i - 1)}>↑</button>
            <button class="dugme sade kucuk" disabled={i === y.bolumler.length - 1} aria-label={`${b.ad}: aşağı`} onClick={() => tasi(b.kod, y.eser.kod, i + 1)}>↓</button>
            <button class="dugme sade kucuk" aria-label={`${b.ad}: eserden çıkar`} title="Eserden çıkar (bölüm ve sahneleri silinmez)" onClick={() => tasi(b.kod, null)}>×</button>
          </div>
          {sahneListesi(b.kod, b.sahneler)}
          <YeniSatir ipucu="Yeni sahnenin adı" dugme="Sahne ekle" ekle={(ad) => olustur(b.kod, ad, 'sahne')} />
        </div>
      ))}
      {!y.bolumler.length && <YeniSatir ipucu="Yeni sahnenin adı" dugme="Sahne ekle" ekle={(ad) => olustur(y.eser.kod, ad, 'sahne')} />}
      <form class="satir" style="margin-top:12px" onSubmit={(e) => { e.preventDefault(); if (yeniBolum.trim()) olustur(y.eser.kod, yeniBolum, 'bolum').then(() => setYeniBolum('')); }}>
        <input class="girdi" style="flex:1;min-width:160px" placeholder="Yeni bölümün adı" aria-label="Yeni bölümün adı" lang="tr" value={yeniBolum} onInput={(e) => setYeniBolum((e.target as HTMLInputElement).value)} />
        <button class="dugme" type="submit" disabled={!yeniBolum.trim()}>Bölüm ekle</button>
      </form>
      {disarida && disarida.length > 0 && (
        <details class="yerlesmemis">
          <summary class="kucuk">Hiçbir esere yerleşmemiş {disarida.length} sahne ya da bölüm</summary>
          <ul>
            {disarida.map((s) => (
              <li key={s.kod} class="satir">
                {bag(evren, s)} <span class="soluk kucuk">{turBul(s.tur).ad}</span>
                <span class="bosluk" />
                <select class="girdi kucuk-secim" aria-label={`${s.ad}: yerleştir`} value="" onChange={(e) => { const v = (e.target as HTMLSelectElement).value; if (v) tasi(s.kod, v); }}>
                  <option value="">Yerleştir…</option>
                  {(s.tur === 'bolum' ? hedefler.slice(0, 1).map((h) => ({ ...h, ad: 'Bu esere' })) : hedefler).map((h) => <option value={h.kod}>{h.ad}</option>)}
                </select>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function YeniSatir({ ipucu, dugme, ekle }: { ipucu: string; dugme: string; ekle: (ad: string) => Promise<unknown> }) {
  const [ad, setAd] = useState('');
  return (
    <form class="satir yeni-satir" onSubmit={(e) => { e.preventDefault(); if (ad.trim()) ekle(ad).then(() => setAd('')); }}>
      <input class="girdi" style="flex:1;min-width:140px" placeholder={ipucu} aria-label={ipucu} lang="tr" value={ad} onInput={(e) => setAd((e.target as HTMLInputElement).value)} />
      <button class="dugme kucuk" type="submit" disabled={!ad.trim()}>{dugme}</button>
    </form>
  );
}

// ---------- Sahne alanları ----------
const SAHNE_ALANLARI: { alan: SahneAlani; ad: string; anahtar: 'yer' | 'bakis' | 'anlatici' | 'odak' }[] = [
  { alan: 'sahne_yeri', ad: 'Mekân', anahtar: 'yer' },
  { alan: 'bakis', ad: 'Bakış açısı', anahtar: 'bakis' },
  { alan: 'anlatici', ad: 'Anlatıcı', anahtar: 'anlatici' },
  { alan: 'odak', ad: 'Odak karakter', anahtar: 'odak' },
];

export function SahneAlanlari({ istemci, evren, kayit, baglam }: { istemci: Istemci; evren: string; kayit: Kayit; baglam: SahneBaglami | null }) {
  const [hata, setHata] = useState<string | null>(null);
  const ayarla = (alan: SahneAlani, s: Secim | null) =>
    istemci.iste('sahneAlaniAyarla', { evren, sahne: kayit.kod, alan, kayit: s?.kod ?? null }).then(() => setHata(null), (e) => setHata(hataYaz(e)));
  return (
    <>
      {SAHNE_ALANLARI.map((a) => {
        const v = baglam?.[a.anahtar] ?? null;
        return (
          <div class="alan" key={a.alan}>
            <span class="alan-adi">{a.ad}</span>
            <span class="satir">
              <KayitSec istemci={istemci} evren={evren} secili={v} sec={(s) => ayarla(a.alan, s)} etiket="Seç" />
              {v && <a class="kucuk" href={`#/e/${evren}/k/${v.kod}`}>Aç</a>}
              {v && <button class="dugme sade kucuk" aria-label={`${a.ad}: kaldır`} onClick={() => ayarla(a.alan, null)}>×</button>}
            </span>
          </div>
        );
      })}
      {hata && <p class="hata kucuk genis">{hata}</p>}
    </>
  );
}

// ---------- Sahne bağlam paneli (§5.5) ----------
/** Sahne değilse (sahne null) hiçbir şey okunmaz. */
export function useSahneBaglami(istemci: Istemci, evren: string, sahne: string | null) {
  return useYukle<SahneBaglami | null>(istemci, evren, () => (sahne ? istemci.iste('sahneBaglami', { evren, sahne }) : Promise.resolve(null)), [sahne])[0];
}

export function SahneBaglamPaneli({ evren, baglam }: { evren: string; baglam: SahneBaglami | null }) {
  if (!baglam) return null;
  const { tarih, yer, katilimcilar } = baglam;
  return (
    <section class="baglam-paneli" aria-label="Sahnenin bağlamı">
      <h2>Sahnenin bağlamı</h2>
      {tarih
        ? <p class="soluk kucuk">Her şey sahnenin evren tarihine göre: <strong>{tarih.ifade}</strong>. “Belki” işaretliler bu tarihte geçerli olabilir de olmayabilir de.</p>
        : <p class="uyari kucuk">Bu sahnenin evren tarihi girilmemiş. Aşağıdakiler belirli bir ana göre süzülmedi; tarih girince o andaki hâl gösterilir.</p>}
      {yer && (
        <div class="baglam-kaydi">
          <div class="satir"><span class="soluk">Mekân:</span> {bag(evren, yer)}</div>
          <DurumOzeti durumlar={yer.durumlar} evren={evren} />
        </div>
      )}
      {katilimcilar.length === 0 && !yer && <p class="soluk kucuk">Mekân, bakış açısı ya da sahnedekiler girilince burada o anki hâlleri toplanır.</p>}
      {baglam.bakis && <BakisBilgileri evren={evren} bakis={baglam.bakis} liste={baglam.bakisBilgileri} tarihVar={!!tarih} />}
      {katilimcilar.map((k) => (
        <div class="baglam-kaydi" key={k.kod}>
          <div class="satir">{bag(evren, k)} <span class="soluk kucuk">{k.roller.join(', ')}</span>{k.yas && !k.yasananSure?.takvimBelirsiz && <span class="kucuk">· {k.yas}</span>}</div>
          {k.yasananSure?.goster && <p class="kucuk">{k.yasananSure.metin} <span class="soluk">({k.yasananSure.tarih ?? 'tarih yazılmamış'} itibarıyla)</span></p>}
          <DurumOzeti durumlar={k.durumlar} evren={evren} />
          {k.iliskiler.length > 0 && (
            <ul class="baglam-listesi">
              {k.iliskiler.map((i) => (
                <li key={i.kod}><span class="soluk">{i.etiket}:</span> {bag(evren, i.karsi)} {i.gecerli === 'belirsiz' && <span class="rozet">belki</span>}</li>
              ))}
            </ul>
          )}
          {k.degisimler.length > 0 && (
            <ul class="baglam-listesi">
              {k.degisimler.map((d) => (
                <li key={d.kod}><span class="soluk">Önceden:</span> {d.metin} <span class="soluk kucuk">({d.sahne ? bag(evren, d.sahne) : bag(evren, d.olay)}{d.tarih ? `, ${d.tarih.ifade}` : ''})</span> {d.sira === 'belirsiz' && <span class="rozet">belki sonra</span>}</li>
              ))}
            </ul>
          )}
          {!k.durumlar.length && !k.iliskiler.length && !k.degisimler.length && <p class="soluk kucuk">Bu tarih için kayıtlı bir durum yok.</p>}
        </div>
      ))}
    </section>
  );
}

function DurumOzeti({ durumlar, evren }: { durumlar: DurumSatiri[]; evren: string }) {
  if (!durumlar.length) return null;
  return (
    <ul class="baglam-listesi">
      {durumlar.map((d) => (
        <li key={d.kod}>
          <span class="soluk">{d.ozellik}:</span> {d.hedef ? bag(evren, d.hedef) : d.deger}{d.hedef && d.deger ? ` (${d.deger})` : ''}
          {' '}{d.gecerli === 'belirsiz' && <span class="rozet">belki</span>} <KararRozeti karar={d.karar} />
        </li>
      ))}
    </ul>
  );
}

// ---------- Durum geçmişi (§3.5) ----------
export const sinirYazi = (s: SinirBilgisi | null) => !s ? '…' : s.olay
  ? (s.fark ? (s.tarih?.ifade ?? `${s.olay.ad}, ${farkYazisi(s.fark)} (tarihsiz)`) : `${s.olay.ad} (${s.tarih?.ifade ?? 'tarihsiz'})`)
  : s.tarih?.ifade ?? '…';
export function aralikYazi(d: DurumSatiri) {
  if (d.kip === 'anlik') return `${sinirYazi(d.baslangic)} (tek an)`;
  return `${sinirYazi(d.baslangic)} – ${sinirYazi(d.kip === 'sonraki' ? d.sonraki : d.bitis)}`;
}

export function DurumGecmisi({ istemci, evren, kayit }: { istemci: Istemci; evren: string; kayit: Kayit }) {
  const [veri] = useYukle(istemci, evren, () => istemci.iste('durumlar', { evren, kod: kayit.kod }), [kayit.kod]);
  const [ekle, setEkle] = useState(false);
  const [serit, setSerit] = useState(false);
  if (!veri) return null;
  const gruplar = new Map<string, DurumSatiri[]>();
  for (const d of veri.durumlar) gruplar.set(d.ozellik, [...(gruplar.get(d.ozellik) ?? []), d]);
  return (
    <section class="durum-gecmisi" aria-label="Durum geçmişi">
      <div class="satir">
        <h2>Zamanla değişenler</h2>
        <span class="bosluk" />
        {veri.durumlar.length > 0 && <button class="dugme sade kucuk" aria-pressed={serit} onClick={() => setSerit(!serit)}>{serit ? 'Listeyi göster' : 'Zaman şeridinde göster'}</button>}
        {!ekle && <button class="dugme kucuk" onClick={() => setEkle(true)}>Durum ekle</button>}
      </div>
      {!veri.durumlar.length && !ekle && <p class="soluk kucuk">Unvan, ikamet, sahibi gibi zamanla değişen değerleri evren tarihleriyle yazın. Sahne açıkken yan panel o tarihteki değeri gösterir.</p>}
      {ekle && <DurumFormu istemci={istemci} evren={evren} konu={kayit.kod} kapat={() => setEkle(false)} />}
      {serit && <KayitDurumSeritleri istemci={istemci} evren={evren} kod={kayit.kod} />}
      {!serit && [...gruplar].map(([ozellik, satirlar]) => (
        <div class="durum-grubu" key={ozellik}>
          <strong class="kucuk">{ozellik}</strong>
          <ul class="durum-listesi">{satirlar.map((d) => <DurumSatir key={d.kod} istemci={istemci} evren={evren} d={d} />)}</ul>
        </div>
      ))}
    </section>
  );
}

/** F24: tarihi olan ve kesinleşmiş değer önemlidir; değeri değişirken niyet sorulur. */
const onemliDeger = (d: DurumSatiri) => d.karar === 'kesin' && !!d.baslangic?.tarih;

function DurumSatir({ istemci, evren, d }: { istemci: Istemci; evren: string; d: DurumSatiri }) {
  const [ac, setAc] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bekleyen, setBekleyen] = useState<{ alan: 'deger' | 'hedef'; deger: string | null; yazi: string } | null>(null);
  const [surum, setSurum] = useState(0);
  const degistir = (alan: DurumAlani, deger: unknown) =>
    istemci.iste('durumDegistir', { evren, kod: d.kod, alan, deger }).then(() => setHata(null), (e) => { setHata(hataYaz(e)); throw e; });
  const degerDegistir = async (alan: 'deger' | 'hedef', deger: string | null, yazi: string) => {
    if (!onemliDeger(d)) return degistir(alan, deger);
    setBekleyen({ alan, deger, yazi });
  };
  return (
    <li class={`karar-satir-${d.karar}`}>
      <div class="satir">
        <span>{d.hedef ? bag(evren, d.hedef) : d.deger}{d.hedef && d.deger ? ` (${d.deger})` : ''}</span>
        <span class="soluk kucuk">{aralikYazi(d)}</span>
        <KararRozeti karar={d.karar} />
        <span class="bosluk" />
        <button class="dugme sade kucuk" aria-expanded={ac} onClick={() => setAc(!ac)}>{ac ? 'Kapat' : 'Düzenle'}</button>
      </div>
      {d.uyari && <p class="uyari kucuk">{d.uyari}</p>}
      {ac && (
        <div class="iliski-duzenle">
          <SatirGirdisi etiket="Özellik" deger={d.ozellik} kaydet={(v) => degistir('ozellik', v)} />
          <SatirGirdisi key={surum} etiket="Değer" deger={d.deger} kaydet={(v) => degerDegistir('deger', v, v)} />
          <div class="alan"><span class="alan-adi">Değer olan kayıt</span>
            <span class="satir"><KayitSec istemci={istemci} evren={evren} secili={d.hedef} sec={(s) => { degerDegistir('hedef', s?.kod ?? null, s?.ad ?? 'kayıt yok').catch(() => {}); }} etiket="Seç (isteğe bağlı)" />
              {d.hedef && <button class="dugme sade kucuk" aria-label="Kaydı kaldır" onClick={() => { degerDegistir('hedef', null, 'kayıt yok').catch(() => {}); }}>×</button>}</span></div>
          {bekleyen && <DegisiklikNiyeti istemci={istemci} evren={evren} d={d} bekleyen={bekleyen} bitti={() => { setBekleyen(null); setSurum((x) => x + 1); }} />}
          <label class="alan"><span class="alan-adi">Süre</span>
            <select class="girdi" value={d.kip} onChange={(e) => degistir('kip', (e.target as HTMLSelectElement).value)}>
              {DURUM_KIPLERI.map((k) => <option value={k.kod} title={k.aciklama}>{k.ad}</option>)}
            </select></label>
          <SinirAlani istemci={istemci} evren={evren} etiket={d.kip === 'anlik' ? 'Tarih' : 'Başlangıç'} deger={d.baslangic} kaydet={(v) => degistir('baslangic', v)} />
          {d.kip === 'aralik' && <SinirAlani istemci={istemci} evren={evren} etiket="Bitiş" deger={d.bitis} kaydet={(v) => degistir('bitis', v)} />}
          <label class="alan"><span class="alan-adi">Karar durumu</span>
            <KararSecici etiket="Durum" karar={d.karar} onDegis={(k) => degistir('karar', k)} /></label>
          <button class="dugme tehlikeli kucuk" onClick={() => istemci.iste('durumSil', { evren, kod: d.kod })}>Kaldır</button>
          {hata && <p class="hata kucuk">{hata}</p>}
        </div>
      )}
    </li>
  );
}

/**
 * F24 değişiklik niyeti: önemli bir değer değişirken kısa seçenek. Hiçbiri seçilmeden kayıt değişmez;
 * "Vazgeç" her şeyi olduğu gibi bırakır.
 */
function DegisiklikNiyeti({ istemci, evren, d, bekleyen, bitti }: {
  istemci: Istemci; evren: string; d: DurumSatiri; bekleyen: { alan: 'deger' | 'hedef'; deger: string | null; yazi: string }; bitti: () => void;
}) {
  const [niyet, setNiyet] = useState<'eski_duzelt' | 'bu_tarihten' | 'taslakta' | 'inanc'>('eski_duzelt');
  const [tarih, setTarih] = useState('');
  const [kisi, setKisi] = useState<Secim | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const SECENEKLER = [
    { kod: 'eski_duzelt', ad: 'Eski kaydı düzelt', aciklama: 'Baştan beri böyleymiş; kayıt yerinde düzeltilir.' },
    ...(d.kip !== 'anlik' ? [{ kod: 'bu_tarihten', ad: 'Bu tarihten itibaren değiştir', aciklama: 'Eski değer yazacağın tarihe kadar sürer, yenisi o tarihte başlar.' }] : []),
    { kod: 'taslakta', ad: 'Taslakta dene', aciklama: 'Evren değişmez; değişiklik yeni bir taslakta yapılır ve oraya geçersin.' },
    { kod: 'inanc', ad: 'Yalnızca bir kişinin inancını değiştir', aciklama: 'Gerçek aynı kalır; seçtiğin kişi yeni değere inanır.' },
  ] as const;
  const uygula = async (e: Event) => {
    e.preventDefault();
    try {
      const r = await istemci.iste('durumNiyeti', { evren, kod: d.kod, alan: bekleyen.alan, deger: bekleyen.deger, niyet,
        tarih: tarih.trim() ? { ifade: tarih } : null, bilen: kisi?.kod ?? null });
      bitti();
      if (r.evren !== evren) git(`/e/${r.evren}/k/${d.konu}`);
    } catch (x) { setHata(hataYaz(x)); }
  };
  return (
    <form class="kart niyet-formu" onSubmit={uygula} aria-label="Değişiklik niyeti">
      <p><strong>“{d.ozellik}” {aralikYazi(d)} için kesinleşmiş.</strong> “{bekleyen.yazi}” olarak değiştirmek ne anlama geliyor?</p>
      {SECENEKLER.map((s) => (
        <label class="secenek-satiri" key={s.kod}>
          <input type="radio" name={`niyet-${d.kod}`} checked={niyet === s.kod} onChange={() => setNiyet(s.kod as typeof niyet)} />
          <span>{s.ad} <span class="soluk kucuk">· {s.aciklama}</span></span>
        </label>
      ))}
      {niyet === 'bu_tarihten' && <label class="alan"><span class="alan-adi">Hangi tarihten itibaren?</span>
        <input class="girdi" lang="tr" value={tarih} placeholder="Örn. 430" onInput={(e) => setTarih((e.target as HTMLInputElement).value)} /></label>}
      {niyet === 'inanc' && <>
        <div class="alan"><span class="alan-adi">Kim inanıyor?</span>
          <span class="satir"><KayitSec istemci={istemci} evren={evren} secili={kisi} sec={setKisi} etiket="Kişi seç" /></span></div>
        <label class="alan"><span class="alan-adi">Ne zamandan beri? (isteğe bağlı)</span>
          <input class="girdi" lang="tr" value={tarih} placeholder="Boş: her zaman" onInput={(e) => setTarih((e.target as HTMLInputElement).value)} /></label>
      </>}
      {hata && <p class="hata kucuk">{hata}</p>}
      <div class="satir">
        <button class="dugme ana" type="submit" disabled={(niyet === 'bu_tarihten' && !tarih.trim()) || (niyet === 'inanc' && !kisi)}>Uygula</button>
        <button class="dugme" type="button" onClick={bitti}>Vazgeç</button>
      </div>
    </form>
  );
}

/** Sınır: yazılı tarih ya da bir olaya bağlı (olayın tarihi değişince kayar). */
export function SinirAlani({ istemci, evren, etiket, deger, kaydet }: {
  istemci: Istemci; evren: string; etiket: string; deger: SinirBilgisi | null; kaydet: (v: SinirGirdisi | null) => Promise<unknown>;
}) {
  const z = useTakvim(istemci, evren);
  if (deger?.olay) {
    const olay = deger.olay;
    return (
      <div class="alan"><span class="alan-adi">{etiket}</span>
        <span class="satir"><span>{bag(evren, olay)} <span class="soluk kucuk">({deger.tarih ? (deger.fark ? tarihAciklamasi(deger.tarih, z) : deger.tarih.ifade) : 'tarihsiz'})</span></span>
          <button class="dugme sade kucuk" onClick={() => kaydet(null).catch(() => {})}>Bağı kaldır</button></span>
        <SatirGirdisi etiket="Olaya göre fark" deger={deger.fark ? farkYazisi(deger.fark) : ''} ipucu="Boş: olayın kendisi · 3 gün sonra · 2 yıl önce"
          kaydet={(v) => kaydet({ olay: olay.kod, fark: v.trim() || null })} />
      </div>
    );
  }
  return (
    <div class="alan">
      <SatirGirdisi etiket={etiket} deger={deger?.tarih?.ifade ?? ''} ipucu="Örn. 412 ya da boş" kaydet={(v) => kaydet(v.trim() ? { ifade: v } : null)} />
      <KayitSec istemci={istemci} evren={evren} secili={null} sec={(s) => { if (s) kaydet({ olay: s.kod }).catch(() => {}); }} etiket="ya da bir olaya bağla" />
    </div>
  );
}

function DurumFormu({ istemci, evren, konu, kapat }: { istemci: Istemci; evren: string; konu: string; kapat: () => void }) {
  const [ozellik, setOzellik] = useState('');
  const [deger, setDeger] = useState('');
  const [hedef, setHedef] = useState<Secim | null>(null);
  const [kip, setKip] = useState('sonraki');
  const [bas, setBas] = useState('');
  const [basOlay, setBasOlay] = useState<Secim | null>(null);
  const [bit, setBit] = useState('');
  const [bitOlay, setBitOlay] = useState<Secim | null>(null);
  const [adlar, setAdlar] = useState<string[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { istemci.iste('ozellikAdlari', { evren }).then(setAdlar, () => {}); }, [evren]);
  const sinir = (ifade: string, olay: Secim | null): SinirGirdisi | null => olay ? { olay: olay.kod } : ifade.trim() ? { ifade } : null;
  const kaydet = async (e: Event) => {
    e.preventDefault();
    try {
      await istemci.iste('durumEkle', { evren, kod: konu, durum: { ozellik, deger, hedef: hedef?.kod ?? null, kip, baslangic: sinir(bas, basOlay), bitis: kip === 'aralik' ? sinir(bit, bitOlay) : null } });
      kapat();
    } catch (err) { setHata(hataYaz(err)); }
  };
  return (
    <form class="kart iliski-formu" onSubmit={kaydet}>
      <div class="satir">
        <input class="girdi" style="flex:1;min-width:120px" list="ozellik-adlari" placeholder="Özellik (Unvan, İkamet…)" aria-label="Özellik" lang="tr" value={ozellik} onInput={(e) => setOzellik((e.target as HTMLInputElement).value)} />
        <datalist id="ozellik-adlari">{adlar.map((a) => <option value={a} />)}</datalist>
        <input class="girdi" style="flex:2;min-width:140px" placeholder="Değer" aria-label="Değer" lang="tr" value={deger} onInput={(e) => setDeger((e.target as HTMLInputElement).value)} />
        <KayitSec istemci={istemci} evren={evren} secili={hedef} sec={setHedef} etiket="ya da bir kayıt" />
        {hedef && <button type="button" class="dugme sade kucuk" aria-label="Kaydı kaldır" onClick={() => setHedef(null)}>×</button>}
      </div>
      <div class="satir">
        <select class="girdi" aria-label="Süre" value={kip} onChange={(e) => setKip((e.target as HTMLSelectElement).value)}>
          {DURUM_KIPLERI.map((k) => <option value={k.kod} title={k.aciklama}>{k.ad}</option>)}
        </select>
        <SinirGirdi istemci={istemci} evren={evren} etiket={kip === 'anlik' ? 'Tarih' : 'Başlangıç'} ifade={bas} setIfade={setBas} olay={basOlay} setOlay={setBasOlay} />
        {kip === 'aralik' && <SinirGirdi istemci={istemci} evren={evren} etiket="Bitiş" ifade={bit} setIfade={setBit} olay={bitOlay} setOlay={setBitOlay} />}
      </div>
      <p class="soluk kucuk">{DURUM_KIPLERI.find((k) => k.kod === kip)?.aciklama}. Sınırı bir olaya bağlarsanız olayın tarihi değişince birlikte kayar.</p>
      {hata && <p class="hata kucuk">{hata}</p>}
      <div class="satir">
        <button class="dugme ana" type="submit" disabled={!ozellik.trim() || (!deger.trim() && !hedef)}>Ekle</button>
        <button class="dugme" type="button" onClick={kapat}>Vazgeç</button>
      </div>
    </form>
  );
}

export function SinirGirdi({ istemci, evren, etiket, ifade, setIfade, olay, setOlay }: {
  istemci: Istemci; evren: string; etiket: string; ifade: string; setIfade: (v: string) => void; olay: Secim | null; setOlay: (s: Secim | null) => void;
}) {
  return (
    <span class="satir" style="flex:1;min-width:200px">
      {olay
        ? <><span class="kucuk">{etiket}: {olay.ad}</span><button type="button" class="dugme sade kucuk" aria-label={`${etiket}: olay bağını kaldır`} onClick={() => setOlay(null)}>×</button></>
        : <><input class="girdi" style="flex:1;min-width:90px" placeholder={`${etiket} (ör. 412)`} aria-label={etiket} value={ifade} onInput={(e) => setIfade((e.target as HTMLInputElement).value)} />
          <KayitSec istemci={istemci} evren={evren} secili={null} sec={setOlay} etiket="olaya bağla" /></>}
    </span>
  );
}
