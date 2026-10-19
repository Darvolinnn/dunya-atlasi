// Süreklilik defteri (§5.6): sahnenin başında ve sonunda gözlenen durum, sahnedeki değişimler ve hesap ayrı gösterilir.
// Hesap yalnızca seçilen izleme biçimi izin verirse yapılır; uyuşmazlıkta gözlem ve hesap yan yana kalır.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { IzGecmisi, IzModeli, IzTanimi, SahneIzi, SahneOlayBilgisi, SahneSurekliligi } from '../veri/api';
import { KayitSec } from './KayitBolumleri';
import type { Secim } from './BaglantiSecici';
import { KararRozeti } from './ortak';
import { onayla } from './onay';

const hataYaz = (e: unknown) => (e as Error).message;
const MODEL_ADI: Record<IzModeli, string> = { durum: 'Serbest durum', sayi: 'Sayılabilir', iyilesme: 'İyileşme süresiyle' };
const modelAciklamasi = (iz: IzTanimi) => iz.model === 'sayi' ? `sayılabilir${iz.birim ? `, ${iz.birim}` : ''}` : iz.model === 'iyilesme' ? `iyileşme süresi ${iz.sure} gün` : 'serbest durum';
const miktarYaz = (m: number) => (m > 0 ? `+${m}` : m < 0 ? `−${Math.abs(m)}` : '0');

export function SureklilikDefteri({ istemci, evren, sahne, olaylar, surum }: { istemci: Istemci; evren: string; sahne: string; olaylar: SahneOlayBilgisi[]; surum: number }) {
  const [veri, setVeri] = useState<SahneSurekliligi | null>(null);
  const [ek, setEk] = useState<string[]>([]);
  const [yeniAcik, setYeniAcik] = useState(false);
  useEffect(() => { setEk([]); }, [sahne]);
  useEffect(() => { istemci.iste('sahneSurekliligi', { evren, sahne, ek }).then(setVeri); }, [sahne, surum, ek.join()]);
  if (!veri) return null;
  return (
    <section class="sureklilik" aria-label="Süreklilik defteri">
      <div class="satir">
        <h2>Süreklilik defteri</h2>
        <span class="bosluk" />
        {!yeniAcik && <button class="dugme kucuk" onClick={() => setYeniAcik(true)}>Yeni ayrıntı izle</button>}
      </div>
      <p class="soluk kucuk">İzlemek istediğiniz ayrıntıların (ok sayısı, yaralı el, kimdeki kılıç) sahne başındaki ve sonundaki durumunu yazın. Program metinden tahmin etmez; aradaki eylemi siz kaydedersiniz.</p>
      {yeniAcik && <YeniIzFormu istemci={istemci} evren={evren} kapat={(kod) => { setYeniAcik(false); if (kod) setEk((l) => [...l, kod]); }} />}
      {!veri.tarihli && veri.izler.length > 0 && <p class="soluk kucuk">Sahnenin tarihi yok; önceki sahnelerden gelen durum hesaplanamaz.</p>}
      {veri.izler.map((x) => <IzKarti key={x.iz.kod} istemci={istemci} evren={evren} sahne={sahne} olaylar={olaylar} x={x} />)}
      {veri.eklenebilir.length > 0 && (
        <div class="satir" style="margin-top:8px">
          <select class="girdi" style="flex:1;min-width:200px" aria-label="Bu sahnede izlenecek ayrıntı" value=""
            onChange={(e) => { const v = (e.target as HTMLSelectElement).value; if (v) setEk((l) => [...l, v]); }}>
            <option value="">Başka bir ayrıntıyı bu sahnede izle…</option>
            {veri.eklenebilir.map((i) => <option value={i.kod}>{i.konu.ad} · {i.ad}</option>)}
          </select>
        </div>
      )}
    </section>
  );
}

function YeniIzFormu({ istemci, evren, konu: sabitKonu, kapat }: { istemci: Istemci; evren: string; konu?: string; kapat: (kod: string | null) => void }) {
  const [konu, setKonu] = useState<Secim | null>(null);
  const [ad, setAd] = useState('');
  const [model, setModel] = useState<IzModeli>('durum');
  const [birim, setBirim] = useState('');
  const [sure, setSure] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const k = sabitKonu ?? konu?.kod;
  return (
    <form class="kart iz-formu" onSubmit={async (e) => {
      e.preventDefault();
      if (!k) return;
      try {
        const { kod } = await istemci.iste('izOlustur', { evren, konu: k, ad, model, birim, sure: sure ? Number(sure.replace(',', '.')) : null });
        kapat(kod);
      } catch (err) { setHata(hataYaz(err)); }
    }}>
      {!sabitKonu && <div class="satir"><KayitSec istemci={istemci} evren={evren} secili={konu} sec={setKonu} etiket="Kimin ya da neyin?" /></div>}
      <div class="satir">
        <input class="girdi" style="flex:2;min-width:160px" placeholder="Ayrıntı (ör. ok sayısı, sağ el)" aria-label="Ayrıntının adı" value={ad} lang="tr" onInput={(e) => setAd((e.target as HTMLInputElement).value)} />
        <select class="girdi" style="flex:1;min-width:150px" aria-label="İzleme biçimi" value={model} onChange={(e) => setModel((e.target as HTMLSelectElement).value as IzModeli)}>
          {(Object.keys(MODEL_ADI) as IzModeli[]).map((m) => <option value={m}>{MODEL_ADI[m]}</option>)}
        </select>
        {model === 'sayi' && <input class="girdi" style="width:110px" placeholder="Birim (ok)" aria-label="Birim" value={birim} lang="tr" onInput={(e) => setBirim((e.target as HTMLInputElement).value)} />}
        {model === 'iyilesme' && <input class="girdi" style="width:130px" inputMode="numeric" placeholder="Süre (gün)" aria-label="İyileşme süresi (gün)" value={sure} onInput={(e) => setSure((e.target as HTMLInputElement).value)} />}
      </div>
      <p class="soluk kucuk">
        {model === 'durum' ? 'Serbest durum hesaplanmaz; yalnızca son gözlem hatırlatılır.'
          : model === 'sayi' ? 'Başlangıç ve değişim miktarları biliniyorsa sondaki durum hesaplanır.'
            : 'Yaralanma gibi bir değişimden sonra geçen süre, yazdığınız iyileşme süresiyle karşılaştırılır.'}
      </p>
      <div class="satir">
        <button class="dugme ana" type="submit" disabled={!k || !ad.trim()}>Ekle</button>
        <button class="dugme" type="button" onClick={() => kapat(null)}>Vazgeç</button>
        {hata && <span class="hata kucuk">{hata}</span>}
      </div>
    </form>
  );
}

function GozlemAlani({ istemci, evren, iz, sahne, an, deger }: { istemci: Istemci; evren: string; iz: IzTanimi; sahne: string; an: 'bas' | 'son'; deger: string | null }) {
  const [v, setV] = useState(deger ?? '');
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { setV(deger ?? ''); }, [deger]);
  const kaydet = async () => {
    if (v.trim() === (deger ?? '')) return;
    try { await istemci.iste('izGozlem', { evren, iz: iz.kod, sahne, an, deger: v }); setHata(null); } catch (err) { setHata(hataYaz(err)); }
  };
  return (
    <>
      <input class="girdi" aria-label={`${iz.ad}: sahnenin ${an === 'bas' ? 'başında' : 'sonunda'} gözlenen`} placeholder="Gözlenen" value={v} lang="tr"
        inputMode={iz.model === 'sayi' ? 'decimal' : undefined}
        onInput={(e) => setV((e.target as HTMLInputElement).value)} onBlur={kaydet} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); kaydet(); } }} />
      {hata && <span class="hata kucuk">{hata}</span>}
    </>
  );
}

function IzKarti({ istemci, evren, sahne, olaylar, x }: { istemci: Istemci; evren: string; sahne: string; olaylar: SahneOlayBilgisi[]; x: SahneIzi }) {
  const { iz } = x;
  const [metin, setMetin] = useState('');
  const [miktar, setMiktar] = useState('');
  const [olay, setOlay] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const baskaOlay = olaylar.filter((o) => !o.sahneOlayi);
  const degisimEkle = async (e: Event) => {
    e.preventDefault();
    if (!metin.trim()) return;
    try {
      await istemci.iste('degisimEkle', { evren, sahne, olay: olay || null, metin, iz: iz.kod, miktar: iz.model === 'sayi' && miktar.trim() ? Number(miktar.replace(',', '.').replace('−', '-')) : null });
      setMetin(''); setMiktar(''); setHata(null);
    } catch (err) { setHata(hataYaz(err)); }
  };
  return (
    <div class="iz-karti">
      <div class="satir">
        <a href={`#/e/${evren}/k/${iz.konu.kod}`}>{iz.konu.ad}</a>
        <strong>· {iz.ad}</strong>
        <span class="soluk kucuk">({modelAciklamasi(iz)})</span>
      </div>
      <div class="iz-sutunlar">
        <div>
          <div class="iz-baslik">Sahnenin başında</div>
          <GozlemAlani istemci={istemci} evren={evren} iz={iz} sahne={sahne} an="bas" deger={x.bas.gozlenen} />
          {x.bas.beklenen && <div class="kucuk iz-hesap">{iz.model === 'durum' ? 'Son gözlenen' : 'Hesaplanan'}: <strong>{x.bas.beklenen}</strong></div>}
          {x.bas.dayanak && <div class="soluk kucuk">{x.bas.dayanak}</div>}
        </div>
        <div>
          <div class="iz-baslik">Bu sahnede olanlar</div>
          {x.degisimler.length > 0 && (
            <ul class="degisim-listesi">
              {x.degisimler.map((d) => (
                <li key={d.kod} class="satir">
                  {d.miktar !== null && <strong>{miktarYaz(d.miktar)}</strong>}
                  <span>{d.metin}</span>
                  <KararRozeti karar={d.karar} />
                  <span class="bosluk" />
                  <button class="dugme sade kucuk" aria-label="Değişimi kaldır" onClick={() => onayla('Bu değişim kaldırılsın mı?') && istemci.iste('degisimSil', { evren, kod: d.kod })}>×</button>
                </li>
              ))}
            </ul>
          )}
          <form class="satir" onSubmit={degisimEkle}>
            {iz.model === 'sayi' && <input class="girdi" style="width:70px" inputMode="decimal" placeholder="−2" aria-label={`${iz.ad}: değişim miktarı`} value={miktar} onInput={(e) => setMiktar((e.target as HTMLInputElement).value)} />}
            <input class="girdi" style="flex:1;min-width:120px" placeholder={iz.model === 'iyilesme' ? 'Ne oldu? (yaralandı)' : 'Ne oldu?'} aria-label={`${iz.ad}: ne oldu`} value={metin} lang="tr" onInput={(e) => setMetin((e.target as HTMLInputElement).value)} />
            {baskaOlay.length > 0 && (
              <select class="girdi" style="min-width:120px" aria-label="Hangi olaya" value={olay} onChange={(e) => setOlay((e.target as HTMLSelectElement).value)}>
                <option value="">Sahne olayına</option>
                {baskaOlay.map((o) => <option value={o.kod}>{o.ad}</option>)}
              </select>
            )}
            <button class="dugme kucuk" type="submit" disabled={!metin.trim()}>Kaydet</button>
          </form>
          {hata && <span class="hata kucuk">{hata}</span>}
        </div>
        <div>
          <div class="iz-baslik">Sahnenin sonunda</div>
          <GozlemAlani istemci={istemci} evren={evren} iz={iz} sahne={sahne} an="son" deger={x.son.gozlenen} />
          {x.son.hesaplanan && <div class="kucuk iz-hesap">Hesaplanan: <strong>{x.son.hesaplanan}</strong></div>}
        </div>
      </div>
      {x.notlar.length > 0 && <ul class="iz-notlar">{x.notlar.map((n) => <li class="kucuk">{n}</li>)}</ul>}
    </div>
  );
}

/** Kayıt sayfasında: bu kaydın izlenen ayrıntıları, evren zamanına göre adımlarıyla. */
export function KayitIzleri({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [liste, setListe] = useState<IzGecmisi[] | null>(null);
  const [yeniAcik, setYeniAcik] = useState(false);
  useEffect(() => { istemci.iste('kayitIzleri', { evren, kod }).then(setListe); }, [kod, surum]);
  if (!liste) return null;
  if (!liste.length && !yeniAcik) {
    return <div class="satir"><button class="dugme sade kucuk" onClick={() => setYeniAcik(true)}>Süreklilik için bir ayrıntı izle</button></div>;
  }
  return (
    <section class="sureklilik" aria-label="İzlenen ayrıntılar">
      <div class="satir">
        <h2>İzlenen ayrıntılar</h2>
        <span class="bosluk" />
        {!yeniAcik && <button class="dugme kucuk" onClick={() => setYeniAcik(true)}>Ayrıntı ekle</button>}
      </div>
      {yeniAcik && <YeniIzFormu istemci={istemci} evren={evren} konu={kod} kapat={() => setYeniAcik(false)} />}
      {liste.map((g) => <IzGecmisiKarti key={g.iz.kod} istemci={istemci} evren={evren} g={g} />)}
    </section>
  );
}

function IzGecmisiKarti({ istemci, evren, g }: { istemci: Istemci; evren: string; g: IzGecmisi }) {
  const { iz } = g;
  const [duzenle, setDuzenle] = useState(false);
  const [ad, setAd] = useState(iz.ad);
  const [birim, setBirim] = useState(iz.birim);
  const [sure, setSure] = useState(iz.sure ? String(iz.sure) : '');
  const [hata, setHata] = useState<string | null>(null);
  const adim = (a: IzGecmisi['adimlar'][number], i: number) => (
    <li key={i} class="satir">
      <span class="soluk kucuk iz-tarih">{a.tarih?.ifade ?? 'tarihsiz'}</span>
      {a.tur === 'gozlem'
        ? <span>{a.sahne && <a href={`#/e/${evren}/k/${a.sahne.kod}`}>{a.sahne.ad}</a>} {a.an === 'bas' ? 'başında' : 'sonunda'}: <strong>{a.deger}{iz.birim && iz.model === 'sayi' ? ` ${iz.birim}` : ''}</strong>
          {a.uyusmaz && a.hesap !== null && <span class="rozet uyari-rozet" title="Gözlem ile hesap farklı; ikisi de korunuyor">hesap {a.hesap}</span>}</span>
        : <span>{a.miktar !== null && <strong>{miktarYaz(a.miktar)} </strong>}{a.deger} <span class="soluk kucuk">· <a href={`#/e/${evren}/k/${a.olay!.kod}`}>{a.olay!.ad}</a></span></span>}
    </li>
  );
  return (
    <div class="iz-karti">
      <div class="satir">
        <strong>{iz.ad}</strong>
        <span class="soluk kucuk">({modelAciklamasi(iz)})</span>
        <span class="bosluk" />
        {!duzenle && <button class="dugme sade kucuk" onClick={() => setDuzenle(true)}>Düzenle</button>}
        <button class="dugme sade kucuk" aria-label={`“${iz.ad}” izlemesini kaldır`} onClick={() => onayla(`“${iz.ad}” izlemesi kaldırılsın mı?`) && istemci.iste('izSil', { evren, kod: iz.kod })}>Kaldır</button>
      </div>
      {duzenle && (
        <form class="satir" onSubmit={async (e) => {
          e.preventDefault();
          try { await istemci.iste('izDegistir', { evren, kod: iz.kod, ad, birim, sure: sure ? Number(sure) : null }); setDuzenle(false); setHata(null); } catch (err) { setHata(hataYaz(err)); }
        }}>
          <input class="girdi" style="flex:2;min-width:140px" aria-label="Ayrıntının adı" value={ad} lang="tr" onInput={(e) => setAd((e.target as HTMLInputElement).value)} />
          {iz.model === 'sayi' && <input class="girdi" style="width:110px" aria-label="Birim" value={birim} lang="tr" onInput={(e) => setBirim((e.target as HTMLInputElement).value)} />}
          {iz.model === 'iyilesme' && <input class="girdi" style="width:110px" aria-label="İyileşme süresi (gün)" value={sure} onInput={(e) => setSure((e.target as HTMLInputElement).value)} />}
          <button class="dugme ana kucuk" type="submit">Kaydet</button>
          <button class="dugme kucuk" type="button" onClick={() => setDuzenle(false)}>Vazgeç</button>
          {hata && <span class="hata kucuk">{hata}</span>}
        </form>
      )}
      {g.adimlar.length === 0 && g.tarihsiz.length === 0 && <p class="soluk kucuk">Henüz bir sahnede gözlenmedi. Sahnenin süreklilik defterinden durumunu yazabilirsiniz.</p>}
      <ul class="iz-adimlari">{g.adimlar.map(adim)}</ul>
      {g.tarihsiz.length > 0 && <>
        <div class="soluk kucuk">Tarihi olmadığı için sıraya konamayanlar:</div>
        <ul class="iz-adimlari">{g.tarihsiz.map(adim)}</ul>
      </>}
    </div>
  );
}
