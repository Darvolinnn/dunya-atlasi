// Sıradan bir gün ve karşılaştırmalı okuma (§7). Anlatı üretilmez; yalnızca yazılmış olanlar yan yana konur.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { GundelikKart, KarsilastirmaliOkuma, KisaKayit, SiradanGun } from '../veri/api';
import { KayitSec } from './KayitBolumleri';
import type { Secim } from './BaglantiSecici';
import { onayla } from './onay';

const hataYaz = (e: unknown) => (e as Error).message;
const bag = (evren: string, k: KisaKayit) => <a href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a>;
const KONULAR: { kod: GundelikKart['konu']; ad: string }[] = [
  { kod: 'barinma', ad: 'Barınma' }, { kod: 'yemek', ad: 'Yemek' }, { kod: 'ulasim', ad: 'Ulaşım' },
  { kod: 'is', ad: 'İş' }, { kod: 'ibadet', ad: 'İbadet' }, { kod: 'eglence', ad: 'Eğlence' },
];
export const GUNDELIK_YERLERI = ['mekan', 'sehir', 'siyasi'];

type Taslak = { kod: string | null; konu: GundelikKart['konu']; donem: Secim | null; statu: Secim | null; metin: string };

/** Bir yerin gündelik hayat kartları: konu, isteğe bağlı dönem ve statü, kısa metin. */
export function GundelikBolumu({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [kartlar, setKartlar] = useState<GundelikKart[] | null>(null);
  const [yeni, setYeni] = useState<Taslak>({ kod: null, konu: 'yemek', donem: null, statu: null, metin: '' });
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { istemci.iste('gundelikKartlari', { evren, yer: kod }).then(setKartlar, () => {}); }, [kod, surum]);
  if (!kartlar) return null;
  const disari = (k: GundelikKart | Taslak) => ({ kod: k.kod, konu: k.konu, donem: k.donem?.kod ?? null, statu: k.statu?.kod ?? null, metin: k.metin });
  const yaz = (l: ReturnType<typeof disari>[]) => istemci.iste('gundelikYaz', { evren, yer: kod, kartlar: l }).then(() => setHata(null), (e) => { setHata(hataYaz(e)); throw e; });
  return (
    <section class="surecler" aria-label="Gündelik hayat">
      <details open={kartlar.length > 0}>
        <summary><h2 style="display:inline">Gündelik hayat</h2></summary>
        <p class="soluk kucuk">Barınma, yemek, ulaşım, iş, ibadet ve eğlence için kısa kartlar. Dönemi ya da statüsü seçilmeyen kart herkes ve her zaman için geçerli sayılır. “Sıradan bir gün” görünümü bu kartları toplar.</p>
        {KONULAR.filter((x) => kartlar.some((k) => k.konu === x.kod)).map((x) => (
          <div key={x.kod}>
            <h3>{x.ad}</h3>
            <ul class="toplanan-listesi">
              {kartlar.filter((k) => k.konu === x.kod).map((k) => (
                <li key={k.kod}>{k.metin}
                  {(k.donem || k.statu) && <span class="soluk kucuk"> · {[k.donem?.ad, k.statu?.ad].filter(Boolean).join(', ')}</span>}
                  {' '}<button class="dugme sade kucuk" aria-label={`${k.metin} kartını sil`} onClick={() => onayla(`“${k.metin}” kartı silinsin mi?`) && yaz(kartlar.filter((y) => y.kod !== k.kod).map(disari)).catch(() => {})}>Sil</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <form class="satir" onSubmit={(e) => { e.preventDefault(); yaz([...kartlar.map(disari), disari(yeni)]).then(() => setYeni({ ...yeni, metin: '' }), () => {}); }}>
          <select class="girdi kucuk-secim" aria-label="Konu" value={yeni.konu} onChange={(e) => setYeni({ ...yeni, konu: (e.target as HTMLSelectElement).value as GundelikKart['konu'] })}>
            {KONULAR.map((x) => <option value={x.kod}>{x.ad}</option>)}
          </select>
          <input class="girdi" style="flex:1;min-width:200px" lang="tr" aria-label="Kartın metni" placeholder="Ne yenir, nerede uyunur…" value={yeni.metin} onInput={(e) => setYeni({ ...yeni, metin: (e.target as HTMLInputElement).value })} />
          <KayitSec istemci={istemci} evren={evren} secili={yeni.donem} sec={(s) => setYeni({ ...yeni, donem: s })} etiket="Dönem (isteğe bağlı)" />
          <KayitSec istemci={istemci} evren={evren} secili={yeni.statu} sec={(s) => setYeni({ ...yeni, statu: s })} etiket="Statü (isteğe bağlı)" />
          {(yeni.donem || yeni.statu) && <button type="button" class="dugme sade kucuk" onClick={() => setYeni({ ...yeni, donem: null, statu: null })}>Dönem ve statüyü kaldır</button>}
          <button class="dugme kucuk" type="submit" disabled={!yeni.metin.trim()}>Kart ekle</button>
        </form>
        {hata && <p class="hata kucuk">{hata}</p>}
      </details>
    </section>
  );
}

type Secimler = { yer: Secim | null; donem: Secim | null; statu: Secim | null };
function GunSutunu({ istemci, evren, s, setS, surum }: { istemci: Istemci; evren: string; s: Secimler; setS: (x: Secimler) => void; surum: number }) {
  const [g, setG] = useState<SiradanGun | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => {
    if (!s.yer) { setG(null); return; }
    istemci.iste('siradanGun', { evren, yer: s.yer.kod, donem: s.donem?.kod ?? null, statu: s.statu?.kod ?? null }).then((x) => { setG(x); setHata(null); }, (e) => { setG(null); setHata(hataYaz(e)); });
  }, [s.yer?.kod, s.donem?.kod, s.statu?.kod, surum]);
  return (
    <div class="gun-sutunu">
      <div class="satir">
        <KayitSec istemci={istemci} evren={evren} secili={s.yer} sec={(x) => setS({ ...s, yer: x })} etiket="Yer seç" />
        <KayitSec istemci={istemci} evren={evren} secili={s.donem} sec={(x) => setS({ ...s, donem: x })} etiket="Dönem" />
        <KayitSec istemci={istemci} evren={evren} secili={s.statu} sec={(x) => setS({ ...s, statu: x })} etiket="Statü" />
        {(s.donem || s.statu) && <button class="dugme sade kucuk" onClick={() => setS({ ...s, donem: null, statu: null })}>Temizle</button>}
      </div>
      {hata && <p class="hata kucuk">{hata}</p>}
      {g && (
        <>
          {g.yerler.length > 1 && <p class="soluk kucuk">Kapsayan yerler: {g.yerler.slice(1).map((y, i) => <>{i > 0 && ', '}{bag(evren, y)}</>)}</p>}
          {g.konular.map((k) => (
            <div key={k.konu}>
              <h3>{k.ad}</h3>
              {!k.kartlar.length ? <p class="soluk kucuk">Yazılmamış.</p> : (
                <ul class="toplanan-listesi">{k.kartlar.map((c) => (
                  <li key={c.kod}>{c.metin} <span class="soluk kucuk">· {c.yer.ad}{c.genel ? ' · genel' : ''}{c.donem ? ` · ${c.donem.ad}` : ''}{c.statu ? ` · ${c.statu.ad}` : ''}</span></li>
                ))}</ul>
              )}
            </div>
          ))}
          <p class="soluk kucuk">{g.not}</p>
        </>
      )}
    </div>
  );
}

/** İki kişinin günü yan yana: her sütun bir yer, dönem ve statü. */
export function SiradanGunSekmesi({ istemci, evren, surum }: { istemci: Istemci; evren: string; surum: number }) {
  const bos: Secimler = { yer: null, donem: null, statu: null };
  const [a, setA] = useState<Secimler>(bos);
  const [b, setB] = useState<Secimler>(bos);
  return (
    <section aria-label="Sıradan bir gün">
      <p class="soluk kucuk">Bir yer seçin; isterseniz dönem ve statü de. Yerin ve onu kapsayan yerlerin gündelik hayat kartları toplanır. Kartlar yer sayfalarındaki “Gündelik hayat” bölümünden yazılır.</p>
      <div class="gun-yan-yana">
        <GunSutunu istemci={istemci} evren={evren} s={a} setS={setA} surum={surum} />
        <GunSutunu istemci={istemci} evren={evren} s={b} setS={setB} surum={surum} />
      </div>
    </section>
  );
}

/** Kayıtları ya da bir kaydın farklı tarihlerini alan alan yan yana koyar. */
export function KarsilastirmaSekmesi({ istemci, evren, surum }: { istemci: Istemci; evren: string; surum: number }) {
  const [sutunlar, setSutunlar] = useState<{ kayit: Secim | null; tarih: string }[]>([{ kayit: null, tarih: '' }, { kayit: null, tarih: '' }]);
  const [o, setO] = useState<KarsilastirmaliOkuma | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const dolu = sutunlar.filter((c) => c.kayit);
  const goster = () => istemci.iste('karsilastirmaliOkuma', { evren, sutunlar: dolu.map((c) => ({ kayit: c.kayit!.kod, tarih: c.tarih.trim() || null })) })
    .then((x) => { setO(x); setHata(null); }, (e) => { setO(null); setHata(hataYaz(e)); });
  useEffect(() => { if (o) void goster(); }, [surum]);
  const degis = (i: number, x: Partial<{ kayit: Secim | null; tarih: string }>) => setSutunlar(sutunlar.map((c, j) => (j === i ? { ...c, ...x } : c)));
  const GRUP = { alan: 'Şablon alanları', soru: 'Cevaplanmış sorular', durum: 'Zamanla değişenler' } as const;
  return (
    <section aria-label="Karşılaştırmalı okuma">
      <p class="soluk kucuk">Üç şehrin yönetimi, iki kültürün ölüm anlayışı ya da bir karakterin farklı dönemleri: en çok altı sütun. Aynı kaydı iki kez seçip farklı tarihler yazabilirsiniz.</p>
      <form class="satir" onSubmit={(e) => { e.preventDefault(); void goster(); }}>
        {sutunlar.map((c, i) => (
          <span class="satir karsilastirma-secimi" key={i}>
            <KayitSec istemci={istemci} evren={evren} secili={c.kayit} sec={(s) => degis(i, { kayit: s })} etiket={`${i + 1}. kayıt`} />
            <input class="girdi" style="width:110px" lang="tr" aria-label={`${i + 1}. sütunun tarihi`} placeholder="tarih (isteğe bağlı)" value={c.tarih} onInput={(e) => degis(i, { tarih: (e.target as HTMLInputElement).value })} />
            {sutunlar.length > 1 && <button type="button" class="dugme sade kucuk" aria-label={`${i + 1}. sütunu kaldır`} onClick={() => setSutunlar(sutunlar.filter((_, j) => j !== i))}>×</button>}
          </span>
        ))}
        {sutunlar.length < 6 && <button type="button" class="dugme kucuk" onClick={() => setSutunlar([...sutunlar, { kayit: null, tarih: '' }])}>Sütun ekle</button>}
        <button class="dugme ana kucuk" type="submit" disabled={!dolu.length}>Yan yana koy</button>
      </form>
      {hata && <p class="hata kucuk">{hata}</p>}
      {o && (
        <div class="tablo-kap">
          <table class="karsilastirma">
            <thead>
              <tr><th />{o.sutunlar.map((c) => <th>{bag(evren, c.kayit)}{c.tarih && <div class="soluk kucuk">{c.tarih.ifade}</div>}</th>)}</tr>
            </thead>
            <tbody>
              {o.sutunlar.some((c) => c.ozet) && <tr><th>Özet</th>{o.sutunlar.map((c) => <td>{c.ozet || <span class="soluk">—</span>}</td>)}</tr>}
              {(['alan', 'soru', 'durum'] as const).flatMap((g) => {
                const s = o.satirlar.filter((x) => x.grup === g);
                return s.length ? [<tr class="grup-satiri"><th colSpan={o.sutunlar.length + 1}>{GRUP[g]}</th></tr>,
                  ...s.map((x) => <tr><th>{x.baslik}</th>{x.degerler.map((d) => <td>{d ?? <span class="soluk">—</span>}</td>)}</tr>)] : [];
              })}
            </tbody>
          </table>
          <p class="soluk kucuk">{o.not}</p>
        </div>
      )}
    </section>
  );
}
