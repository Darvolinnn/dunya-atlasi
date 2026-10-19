import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { EvrenDali, KisaKayit, UyarlamaAdaylari, UyarlamaEslemesi, UyarlamaTanimi, UyarlamaTarafGorunumu } from '../veri/api';
import { UYARLAMA_TURLERI } from '../alan/uyarlama';
import { onayla } from './onay';

const bos = (eser: string): UyarlamaTanimi => ({ a: { eser, dal: null, kayitlar: [] }, b: { eser: '', dal: null, kayitlar: [] }, tur: 'karsilik', not: '' });
const adayBos: UyarlamaAdaylari = { eserler: [], kayitlar: [], sorun: null };
function SiraliSecim({ ad, adaylar, secili, degis }: { ad: string; adaylar: KisaKayit[]; secili: string[]; degis: (x: string[]) => void }) {
  const kaydir = (i: number, yon: number) => { const l = [...secili], j = i + yon; [l[i], l[j]] = [l[j], l[i]]; degis(l); };
  return <div><label>{ad}<select class="girdi" multiple size={6} onChange={(e) => {
    const s = [...e.currentTarget.selectedOptions].map((o) => o.value);
    degis([...secili.filter((k) => s.includes(k)), ...s.filter((k) => !secili.includes(k))]);
  }}>{adaylar.map((k) => <option key={k.kod} value={k.kod} selected={secili.includes(k.kod)}>{k.ad}</option>)}</select></label>
    <ol>{secili.map((k, i) => <li key={k}>{adaylar.find((a) => a.kod === k)?.ad ?? 'Bulunamayan ya da kaldırılmış kayıt'}{' '}
      <button type="button" class="dugme sade kucuk" disabled={i === 0} onClick={() => kaydir(i, -1)}>Yukarı</button>{' '}
      <button type="button" class="dugme sade kucuk" disabled={i === secili.length - 1} onClick={() => kaydir(i, 1)}>Aşağı</button>{' '}
      <button type="button" class="dugme sade kucuk" onClick={() => degis(secili.filter((x) => x !== k))}>Seçimden çıkar</button>
    </li>)}</ol>
  </div>;
}
function Taraf({ s, evren }: { s: UyarlamaTarafGorunumu; evren: string }) {
  const acilabilir = !s.dal || s.dal.durum === 'etkin';
  return <div><strong>{s.eser.ad}</strong>{s.dal && <span> · {s.dal.ad}{s.dal.durum === 'silindi' ? ' · kaldırılmış' : s.dal.durum === 'yok' ? ' · bulunamadı' : ''}</span>}
    <ol>{s.kayitlar.map((k, i) => <li key={`${k.sakliKod}:${i}`}>{acilabilir && !k.bulunamadi && !k.silindi ? <a href={`#/e/${s.dal?.kod ?? evren}/k/${k.kod}`}>{k.ad}</a> : <span>{k.ad}{k.silindi ? ' · kaldırılmış' : ' · bulunamıyor'}</span>}</li>)}</ol>
    {!s.kayitlar.length && <p>Karşılığı yok.</p>}
  </div>;
}
/** Eser sayfasına ana ajan tarafından eklenebilir; bu bileşen başka tarafa değişiklik taşımaz. */
export function UyarlamaBolumu({ istemci, evren, eser, surum = 0 }: { istemci: Istemci; evren: string; eser: string; surum?: number }) {
  const [liste, setListe] = useState<UyarlamaEslemesi[]>([]), [a, setA] = useState(adayBos), [b, setB] = useState(adayBos);
  const [dallar, setDallar] = useState<EvrenDali[]>([]);
  const [t, setT] = useState<UyarlamaTanimi>(() => bos(eser)), [kod, setKod] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null), [bekliyor, setBekliyor] = useState(false), [yenile, setYenile] = useState(0);
  const [acik, setAcik] = useState(false);
  useEffect(() => istemci.dinle((d) => { if (d.evren === evren || d.evren === t.b.dal || liste.some((r) => r.tanim.b.dal === d.evren)) setYenile((n) => n + 1); }), [istemci, evren, t.b.dal, liste]);
  useEffect(() => {
    let etkin = true;
    Promise.all([istemci.iste('uyarlamaListesi', { evren, eser }), istemci.iste('uyarlamaAdaylari', { evren }), istemci.iste('dallar', { evren })]).then(([l, aa, dd]) => {
      if (etkin) { setListe(l); setA(aa); setDallar(dd); }
    }, (e) => { if (etkin) setHata((e as Error).message); });
    return () => { etkin = false; };
  }, [istemci, evren, eser, surum, yenile]);
  useEffect(() => {
    let etkin = true;
    istemci.iste('uyarlamaAdaylari', { evren, dal: t.b.dal }).then((x) => { if (etkin) setB(x); }, (e) => { if (etkin) setHata((e as Error).message); });
    return () => { etkin = false; };
  }, [istemci, evren, t.b.dal, surum, yenile]);
  const yap = async (is: () => Promise<unknown>, temizle = false) => {
    setBekliyor(true); setHata(null);
    try { await is(); if (temizle) { setKod(null); setT(bos(eser)); } setYenile((n) => n + 1); }
    catch (e) { setHata((e as Error).message); }
    finally { setBekliyor(false); }
  };
  const etkilenmis = liste.filter((r) => r.etkilenmis);
  if (!liste.length && !acik && kod === null) return <div class="satir kucuk">
    <button type="button" class="dugme sade kucuk" onClick={() => setAcik(true)}>Uyarlama eşlemesi ekle…</button>
    {hata && <p class="hata" role="alert">{hata}</p>}
  </div>;
  return <section aria-label="Uyarlama eşlemeleri">
    <h2>Uyarlama eşlemeleri</h2>
    <p>İki eserin ya da bir eser ile deneme kopyasının kayıtlarını kendiniz eşleyin. Program yalnızca değişiklikleri listeler; hiçbir taraf diğerini kendiliğinden güncellemez. Eşleme bir yayın izni değildir, okurun bildiği bir bilgi de sayılmaz.</p>
    {hata && <p class="hata" role="alert">{hata}</p>}
    <details open={kod !== null || acik}><summary>{kod ? 'Eşlemeyi düzenle' : 'Eşleme ekle'}</summary>
      <form onSubmit={(e) => { e.preventDefault(); void yap(() => istemci.iste('uyarlamaYaz', { evren, kod, tanim: t }), true); }}>
        <fieldset disabled={bekliyor}><legend>{kod ? 'Eşlemeyi düzenle' : 'Yeni eşleme'}</legend>
          <label>Eşleme türü <select class="girdi" value={t.tur} onChange={(e) => setT({ ...t, tur: e.currentTarget.value as UyarlamaTanimi['tur'], b: { ...t.b, kayitlar: e.currentTarget.value === 'cikarildi' ? [] : t.b.kayitlar } })}>{UYARLAMA_TURLERI.map((x) => <option key={x.kod} value={x.kod}>{x.ad}</option>)}</select></label>
          <div class="gun-yan-yana"><div>
            <label>İlk eser <select class="girdi" value={t.a.eser} onChange={(e) => setT({ ...t, a: { ...t.a, eser: e.currentTarget.value } })}>{a.eserler.map((k) => <option key={k.kod} value={k.kod}>{k.ad}</option>)}</select></label>
            <SiraliSecim ad="İlk tarafın kayıtları" adaylar={a.kayitlar} secili={t.a.kayitlar} degis={(kayitlar) => setT({ ...t, a: { ...t.a, kayitlar } })} />
          </div><div>
            <label>İkinci tarafın yeri <select class="girdi" value={t.b.dal ?? ''} onChange={(e) => { setB(adayBos); setT({ ...t, b: { eser: '', dal: e.currentTarget.value || null, kayitlar: [] } }); }}><option value="">Ana evrendeki başka eser</option>{dallar.map((d) => <option key={d.kod} value={d.kod}>{d.ad}</option>)}</select></label>
            <label>İkinci eser <select class="girdi" value={t.b.eser} onChange={(e) => setT({ ...t, b: { ...t.b, eser: e.currentTarget.value } })}><option value="">Eseri seçin</option>{b.eserler.map((k) => <option key={k.kod} value={k.kod}>{k.ad}</option>)}</select></label>
            {b.sorun && <p>{b.sorun}</p>}
            {t.tur !== 'cikarildi' && <SiraliSecim ad="İkinci tarafın kayıtları" adaylar={b.kayitlar} secili={t.b.kayitlar} degis={(kayitlar) => setT({ ...t, b: { ...t.b, kayitlar } })} />}
          </div></div>
          <p>Listelerdeki sırayı yukarı ve aşağı düğmeleriyle belirleyin. Bir kaydı burada seçmek onu esere eklemez.</p>
          <label>Eşleme notu <textarea class="girdi" maxLength={2000} value={t.not} onInput={(e) => setT({ ...t, not: e.currentTarget.value })} /></label>
          <button class="dugme ana" type="submit">Eşlemeyi kaydet</button>{' '}
          <button class="dugme" type="button" onClick={() => { setKod(null); setT(bos(eser)); }}>Yeni eşlemeye dön</button>
        </fieldset>
      </form>
    </details>
    <h3>Etkilenmiş olabilir ({etkilenmis.length})</h3>
    {etkilenmis.length ? <ul>{etkilenmis.map((r) => <li key={r.kod}>{r.a.eser.ad} → {r.b.eser.ad}{r.tanim.not ? ` · ${r.tanim.not}` : ''}<ul>{r.degisiklikler.map((d) => <li key={`${d.taraf}:${d.islem}`}>{d.taraf === 'a' ? 'İlk taraf' : 'İkinci taraf'}: {d.aciklama}</li>)}</ul></li>)}</ul> : <p>Son eşlemeden ya da gözden geçirmeden bu yana bir değişiklik bulunmadı. Başka cihazlarda yapılıp henüz buraya gelmemiş değişiklikler olabilir.</p>}
    <h3>Eşlemeler ({liste.length})</h3>
    {liste.map((r) => <article key={r.kod}>
      <h4>{UYARLAMA_TURLERI.find((x) => x.kod === r.tanim.tur)?.ad}</h4>
      <div class="gun-yan-yana"><Taraf s={r.a} evren={evren} /><Taraf s={r.b} evren={evren} /></div>
      {r.tanim.not && <p>{r.tanim.not}</p>}
      {r.catismali && <p>İki cihazdaki seçimler çelişiyor. <a href={`#/e/${evren}/inceleme`}>Uyarılar sayfasında seçim yapın.</a></p>}
      {r.uyarilar.map((u) => <p>{u}</p>)}
      <button class="dugme" disabled={bekliyor || r.catismali || r.silindi} onClick={() => void yap(() => istemci.iste('uyarlamaGozdenGecir', { evren, kod: r.kod }))}>Gözden geçirdim</button>{' '}
      <button class="dugme" disabled={bekliyor || r.catismali || r.silindi} onClick={() => { setKod(r.kod); setT(r.tanim); }}>Düzenlemek için seç</button>{' '}
      <button class="dugme" disabled={bekliyor || r.catismali || r.silindi} onClick={() => onayla('Bu eşleme silinsin mi?') && void yap(() => istemci.iste('uyarlamaSil', { evren, kod: r.kod }))}>Eşlemeyi sil</button>
    </article>)}
    {!liste.length && <p>Bu eser için kayıtlı uyarlama eşlemesi yok.</p>}
  </section>;
}
