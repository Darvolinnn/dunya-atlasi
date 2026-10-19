// Alt grup farkı yalnızca yazarın seçtiği iki grup için ve gözlem anında gösterilir.
import { useState } from 'preact/hooks';
import { altGrupFarki, KALABALIK_OLAY_ADLARI, KALABALIK_TURLERI, miktarYaz } from '../alan/kalabalik';
import { yeniKod } from '../alan/kod';
import type { KalabalikGozlemi, KalabalikMiktari, KalabalikOlayi, KalabalikSatiri, KalabalikSonucu, SinirGirdisi } from '../veri/api';
import type { Istemci } from '../veri/istemci';
import { useYukle } from './Anlati';
import { KayitSec } from './KayitBolumleri';
import { CatismaListesi } from './Catismalar';

type Bicim = 'gozlem' | 'olay';
type Secim = { kod: string; ad: string };
const sifir = (): KalabalikMiktari => ({ enAz: 0, enCok: 0, yaklasik: false });
const yeni = (kayit: string): KalabalikGozlemi => ({ kayit, tarih: { ifade: '' }, miktar: sifir(), altGruplar: [], ortusmeler: [], not: '' });

export function KalabalikBolumu({ istemci, evren, kod, tur, surum, saltOkunur }: { istemci: Istemci; evren: string; kod: string; tur: string; surum: number; saltOkunur?: boolean }) {
  const [tarih, setTarih] = useState('');
  const [form, setForm] = useState<{ bicim: Bicim; kod: string | null; tanim: KalabalikGozlemi | KalabalikOlayi } | null>(null);
  const [hata, setHata] = useState('');
  const uygun = KALABALIK_TURLERI.includes(tur);
  const [dosya] = useYukle<KalabalikSonucu | null>(istemci, evren, () => uygun ? istemci.iste('kalabalikOku', { evren, kayit: kod, tarih: tarih.trim() || null }) : Promise.resolve(null), [kod, tur, tarih]);
  if (!uygun || !dosya) return null;
  const kaldir = (bicim: Bicim, k: string, geriYukle: boolean) => istemci.iste('kalabalikKaldir', { evren, kod: k, bicim, geriYukle }).then(() => setHata(''), (e: Error) => setHata(e.message));
  const tarihYaz = (s: KalabalikSatiri<KalabalikGozlemi | KalabalikOlayi>) => <>{s.tarih?.olay && <a href={`#/e/${evren}/k/${s.tarih.olay.kod}`}>{s.tarih.olay.ad}: </a>}{s.tarih?.tarih?.ifade ?? s.tanim.tarih.ifade ?? 'Tarihi bilinmiyor'}</>;
  const islemler = (s: KalabalikSatiri<KalabalikGozlemi | KalabalikOlayi>, bicim: Bicim) => <>
    {s.catismali && (saltOkunur ? <p>İki cihazda farklı yazılmış; bu sayım için inceleme bekleniyor.</p> : <CatismaListesi istemci={istemci} evren={evren} kod={s.kod} surum={surum} />)}
    {!saltOkunur && !s.catismali && <div class="satir">
      {!s.silindi && <button type="button" class="dugme kucuk" onClick={() => setForm({ bicim, kod: s.kod, tanim: s.tanim })}>Düzenle</button>}
      <button type="button" class="dugme sade kucuk" onClick={() => kaldir(bicim, s.kod, s.silindi)}>{s.silindi ? 'Geri getir' : 'Kaldır'}</button>
    </div>}
  </>;
  return <section class="surecler kalabalik-bolumu" aria-label="Kalabalık ve toplu sayım">
    <h2>Kalabalık ve toplu sayım</h2>
    <p class="soluk">Gözlemler toplam için dayanak olur. Toplamı katılma, ayrılma ve ölüm olayları değiştirir.</p>
    <label>Tahmin tarihi <input value={tarih} placeholder="Örn. 450" onInput={(e) => setTarih(e.currentTarget.value)} /></label>
    {dosya.uyarilar.map((u) => <p class="soluk" key={u}>{u}</p>)}
    {dosya.tahminler.map((t) => <div class="kart" key={t.gozlem}>
      <strong>{miktarYaz(t.miktar)}</strong>{t.belirsiz && ' · Tarih sırası belirsiz'}{t.uyusmaz && ' · Diğer dayanakla uyuşmuyor'}
      <p>Dayanak: {t.sonGozlem ? 'son gözlem' : 'önceki gözlem'} ({tarihYaz(dosya.gozlemler.find((g) => g.kod === t.gozlem)!)}) + {t.olaylar.length} olay.</p>
      <ul>{t.olaylar.map((k) => { const o = dosya.olaylar.find((x) => x.kod === k)!; return <li key={k}>{KALABALIK_OLAY_ADLARI[o.tanim.tur]} · {miktarYaz(o.tanim.miktar)} · {tarihYaz(o)}</li>; })}</ul>
    </div>)}
    <h3>Adı bilinen üyeler: {dosya.uyeler.length}</h3>
    <p class="soluk">Kesin üyelik bağı olan kişi kayıtları; üyelik geçmişinin tamamı gösterilir. Bu liste toplama eklenmez.</p>
    <ul>{dosya.uyeler.map((u) => <li key={u.kod}><a href={`#/e/${evren}/k/${u.kod}`}>{u.ad}</a></li>)}</ul>
    <div class="satir"><h3>Tarihli gözlemler</h3>{!saltOkunur && <button type="button" class="dugme" onClick={() => setForm({ bicim: 'gozlem', kod: null, tanim: yeni(kod) })}>Gözlem ekle</button>}</div>
    {dosya.gozlemler.map((g) => <article class="kart" key={g.kod}>
      <p><strong>{g.catismali ? 'Gözlem inceleme bekliyor' : miktarYaz(g.tanim.miktar)}</strong> {!g.catismali && <>· {tarihYaz(g)}</>} {g.silindi && '· Kaldırıldı'}</p>
      {!g.catismali && <p>{g.tanim.not}</p>}
      {!g.catismali && <AltGruplar key={JSON.stringify(g.tanim)} gozlem={g.tanim} />}
      {islemler(g, 'gozlem')}
    </article>)}
    <div class="satir"><h3>Toplamı değiştiren olaylar</h3>{!saltOkunur && <button type="button" class="dugme" onClick={() => setForm({ bicim: 'olay', kod: null, tanim: { kayit: kod, tarih: { ifade: '' }, miktar: sifir(), tur: 'katilma', not: '' } })}>Sayım olayı ekle</button>}</div>
    {dosya.olaylar.map((o) => <article class="kart" key={o.kod}>
      <p><strong>{o.catismali ? 'Sayım olayı inceleme bekliyor' : `${KALABALIK_OLAY_ADLARI[o.tanim.tur]}: ${miktarYaz(o.tanim.miktar)}`}</strong> {!o.catismali && <>· {tarihYaz(o)}</>} {o.silindi && '· Kaldırıldı'}</p>{!o.catismali && <p>{o.tanim.not}</p>}{islemler(o, 'olay')}
    </article>)}
    {hata && <p role="alert" class="hata">{hata}</p>}
    {form && !saltOkunur && <SayimFormu key={`${form.bicim}:${form.kod}`} istemci={istemci} evren={evren} {...form} kapat={() => setForm(null)} />}
  </section>;
}

function MiktarAlani({ ad, deger, yaz }: { ad: string; deger: KalabalikMiktari; yaz: (m: KalabalikMiktari) => void }) {
  return <fieldset class="kalabalik-miktar"><legend>{ad}</legend>
    <label>En az <input type="number" min="0" step="1" value={deger.enAz} onInput={(e) => yaz({ ...deger, enAz: e.currentTarget.value === '' ? NaN : Number(e.currentTarget.value) })} /></label>
    <label>En çok <input type="number" min="0" step="1" value={deger.enCok} onInput={(e) => yaz({ ...deger, enCok: e.currentTarget.value === '' ? NaN : Number(e.currentTarget.value) })} /></label>
    <label><input type="checkbox" checked={deger.yaklasik} onChange={(e) => yaz({ ...deger, yaklasik: e.currentTarget.checked })} /> Yaklaşık miktar</label>
    <small class="soluk">Tek sayı için iki sınırı aynı yazın.</small>
  </fieldset>;
}
function AltGruplar({ gozlem: g }: { gozlem: KalabalikGozlemi }) {
  const [a, setA] = useState(''), [b, setB] = useState('');
  const x = g.altGruplar.find((s) => s.kod === a), y = g.altGruplar.find((s) => s.kod === b);
  const o = g.ortusmeler.find((s) => s.a === a && s.b === b || s.a === b && s.b === a);
  let sonuc = '';
  if (x && y && x !== y) { try { sonuc = miktarYaz(altGrupFarki(x.miktar, y.miktar, g.miktar, o?.miktar ?? null)); } catch (e) { sonuc = (e as Error).message; } }
  return <div>
    <ul>{g.altGruplar.map((s) => <li key={s.kod}>{s.ad}: {miktarYaz(s.miktar)}</li>)}</ul>
    <ul>{g.ortusmeler.map((s) => <li key={s.a + s.b}>{g.altGruplar.find((x) => x.kod === s.a)?.ad} ve {g.altGruplar.find((x) => x.kod === s.b)?.ad} örtüşmesi: {miktarYaz(s.miktar)}</li>)}</ul>
    {g.altGruplar.length > 1 && <details><summary>Alt grup farkını hesapla</summary>
      <p class="soluk">Bu hesap yalnızca gözlem anına aittir. Sonraki olaylar alt gruplara dağıtılmaz.</p>
      <label>İçinden çıkarılacak grup <select value={a} onChange={(e) => setA(e.currentTarget.value)}><option value="">Seçin</option>{g.altGruplar.map((s) => <option value={s.kod} key={s.kod}>{s.ad}</option>)}</select></label>
      <label>Çıkarılacak grup <select value={b} onChange={(e) => setB(e.currentTarget.value)}><option value="">Seçin</option>{g.altGruplar.filter((s) => s.kod !== a).map((s) => <option value={s.kod} key={s.kod}>{s.ad}</option>)}</select></label>
      {sonuc && <p><strong>{x?.ad} içinde {y?.ad} dışında kalanlar: {sonuc}</strong> · {o ? 'Girilen örtüşme kullanıldı.' : 'Örtüşme bilinmiyor.'}</p>}
    </details>}
  </div>;
}
function SayimFormu({ istemci, evren, bicim, kod, tanim, kapat }: { istemci: Istemci; evren: string; bicim: Bicim; kod: string | null; tanim: KalabalikGozlemi | KalabalikOlayi; kapat: () => void }) {
  const [t, setT] = useState(tanim);
  const [dayanak, setDayanak] = useState<Secim | null>(tanim.tarih.olay ? { kod: tanim.tarih.olay, ad: 'Bağlı olay' } : null);
  const [hata, setHata] = useState(''), [bekle, setBekle] = useState(false);
  const g = 'altGruplar' in t ? t : null;
  const tarihYaz = (tarih: SinirGirdisi) => setT({ ...t, tarih });
  const kaydet = async () => {
    setBekle(true); setHata('');
    try {
      if (bicim === 'gozlem') await istemci.iste('kalabalikGozlemYaz', { evren, kod, tanim: t as KalabalikGozlemi });
      else await istemci.iste('kalabalikOlayYaz', { evren, kod, tanim: t as KalabalikOlayi });
      kapat();
    } catch (e) { setHata((e as Error).message); } finally { setBekle(false); }
  };
  return <div class="kart kalabalik-formu" role="region" aria-label={bicim === 'gozlem' ? 'Gözlem düzenle' : 'Sayım olayı düzenle'}><fieldset disabled={bekle}>
    <legend>{bicim === 'gozlem' ? 'Gözlem' : 'Sayım olayı'}</legend>
    <label>Tarih dayanağı <select value={'olay' in t.tarih ? 'olay' : 'tarih'} onChange={(e) => { setDayanak(null); tarihYaz(e.currentTarget.value === 'olay' ? { olay: '' } : { ifade: '' }); }}>
      <option value="tarih">Tarih ifadesi</option><option value="olay">Olay kaydı</option>
    </select></label>
    {'olay' in t.tarih ? <>
      <KayitSec istemci={istemci} evren={evren} secili={dayanak} etiket="Tarihi alınacak olayı seç" sec={(s) => { setDayanak(s); tarihYaz({ olay: s?.kod ?? '', fark: t.tarih.fark }); }} />
      <label>Olaya göre fark <input value={t.tarih.fark ?? ''} placeholder="Örn. 2 gün sonra; boşsa olayın tarihi" onInput={(e) => tarihYaz({ ...t.tarih, fark: e.currentTarget.value })} /></label>
    </> : <label>Sayım tarihi <input value={t.tarih.ifade ?? ''} placeholder="Örn. 450" onInput={(e) => tarihYaz({ ifade: e.currentTarget.value })} /></label>}
    {'tur' in t && <label>Olayın türü <select value={t.tur} onChange={(e) => setT({ ...t, tur: e.currentTarget.value as KalabalikOlayi['tur'] })}>{Object.entries(KALABALIK_OLAY_ADLARI).map(([k, ad]) => <option value={k} key={k}>{ad}</option>)}</select></label>}
    <MiktarAlani ad={g ? 'Toplam' : 'Olaydaki miktar'} deger={t.miktar} yaz={(miktar) => setT({ ...t, miktar })} />
    {g && <>
      <h4>Alt gruplar</h4>
      {g.altGruplar.map((a) => <div class="kart" key={a.kod}>
        <label>Alt grup adı <input value={a.ad} onInput={(e) => setT({ ...g, altGruplar: g.altGruplar.map((s) => s.kod === a.kod ? { ...s, ad: e.currentTarget.value } : s) })} /></label>
        <MiktarAlani ad={`${a.ad || 'Alt grup'} miktarı`} deger={a.miktar} yaz={(miktar) => setT({ ...g, altGruplar: g.altGruplar.map((s) => s.kod === a.kod ? { ...s, miktar } : s) })} />
        <button type="button" class="dugme sade" onClick={() => setT({ ...g, altGruplar: g.altGruplar.filter((s) => s.kod !== a.kod), ortusmeler: g.ortusmeler.filter((o) => o.a !== a.kod && o.b !== a.kod) })}>Alt grubu çıkar</button>
      </div>)}
      <button type="button" class="dugme" onClick={() => setT({ ...g, altGruplar: [...g.altGruplar, { kod: yeniKod(), ad: '', miktar: sifir() }] })}>Alt grup ekle</button>
      <h4>Örtüşmeler</h4><p class="soluk">Girilmemiş örtüşme bilinmiyor demektir. Hiç ortak üye yoksa sıfır girin.</p>
      {g.ortusmeler.map((o, i) => <div class="kart" key={i}>
        <label>Birinci alt grup <select value={o.a} onChange={(e) => setT({ ...g, ortusmeler: g.ortusmeler.map((s, n) => n === i ? { ...s, a: e.currentTarget.value } : s) })}><option value="">Seçin</option>{g.altGruplar.map((s) => <option value={s.kod} key={s.kod}>{s.ad}</option>)}</select></label>
        <label>İkinci alt grup <select value={o.b} onChange={(e) => setT({ ...g, ortusmeler: g.ortusmeler.map((s, n) => n === i ? { ...s, b: e.currentTarget.value } : s) })}><option value="">Seçin</option>{g.altGruplar.filter((s) => s.kod !== o.a).map((s) => <option value={s.kod} key={s.kod}>{s.ad}</option>)}</select></label>
        <MiktarAlani ad="Ortak üye miktarı" deger={o.miktar} yaz={(miktar) => setT({ ...g, ortusmeler: g.ortusmeler.map((s, n) => n === i ? { ...s, miktar } : s) })} />
        <button type="button" class="dugme sade" onClick={() => setT({ ...g, ortusmeler: g.ortusmeler.filter((_, n) => n !== i) })}>Örtüşmeyi çıkar</button>
      </div>)}
      {g.altGruplar.length > 1 && <button type="button" class="dugme" onClick={() => setT({ ...g, ortusmeler: [...g.ortusmeler, { a: '', b: '', miktar: sifir() }] })}>Örtüşme ekle</button>}
    </>}
    <label>Sayım notu <textarea value={t.not} maxLength={1000} onInput={(e) => setT({ ...t, not: e.currentTarget.value })} /></label>
    {hata && <p role="alert" class="hata">{hata}</p>}
    <div class="satir"><button type="button" class="dugme birincil" onClick={kaydet}>Sayımı kaydet</button><button type="button" class="dugme sade" onClick={kapat}>Vazgeç</button></div>
  </fieldset></div>;
}
