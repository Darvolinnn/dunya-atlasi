import { useEffect, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { KisaKayit, Sozluk, SozlukDenetimi, SozlukTanimi } from '../veri/api';
import { TURLER } from '../alan/turler';

const bos = (): SozlukTanimi => ({ ad: '', tur: 'yasak', kapsam: { tur: 'evren' }, girdiler: [{ ifade: '', aciklama: '', teknoloji: null }] });
const TUR = { yasak: 'Yasak ifadeler', hitap: 'İzinli hitaplar', teknoloji: 'Teknoloji adları' };

export function SozlukSekmesi({ istemci, evren, surum }: { istemci: Istemci; evren: string; surum: number }) {
  const [liste, setListe] = useState<Sozluk[]>([]), [cop, setCop] = useState<Sozluk[]>([]);
  const [kayitlar, setKayitlar] = useState<KisaKayit[]>([]);
  const [kod, setKod] = useState<string | null>(null), [t, setT] = useState<SozlukTanimi>(bos);
  const [sonuc, setSonuc] = useState<{ veri: SozlukDenetimi; surum: number } | null>(null);
  const [hata, setHata] = useState(''), [mesgul, setMesgul] = useState(false);
  const nesil = useRef(0);
  const gecerliSurum = useRef(surum);
  gecerliSurum.current = surum;
  useEffect(() => {
    let etkin = true;
    Promise.all([istemci.iste('sozlukler', { evren }), istemci.iste('sozlukler', { evren, cop: true }), istemci.iste('kayitlar', { evren })])
      .then(([s, c, k]) => { if (etkin) { setListe(s); setCop(c); setKayitlar(k); } }, (e) => { if (etkin) setHata(e.message); });
    return () => { etkin = false; };
  }, [evren, surum]);
  useEffect(() => { setKod(null); setT(bos()); setSonuc(null); return () => { nesil.current++; }; }, [evren]);
  const is = async (f: () => Promise<unknown>) => {
    setMesgul(true); setHata('');
    try { await f(); } catch (e) { setHata((e as Error).message); } finally { setMesgul(false); }
  };
  const denetle = async () => {
    const n = ++nesil.current;
    const baslangicSurumu = gecerliSurum.current;
    const veri = await istemci.iste('sozlukDenetle', { evren });
    if (nesil.current === n) setSonuc({ veri, surum: baslangicSurumu });
  };
  const secici = (deger: string, tur: string, degistir: (s: string) => void, etiket: string) => <label>{etiket}
    <select class="girdi" aria-label={etiket} value={deger} onChange={(e) => degistir(e.currentTarget.value)}>
      <option value="">Seçin</option>{kayitlar.filter((k) => k.tur === tur).map((k) => <option key={k.kod} value={k.kod}>{k.ad}</option>)}
    </select>
  </label>;
  const guncel = sonuc?.surum === surum;
  return <section aria-label="Sözlük denetimi">
    <h2>Sözlük denetimi</h2>
    <p class="soluk">Yalnızca yazdığınız sözcükler ve sözcük öbekleri aranır. Eşleşmeler bir yazarlık hükmü taşımaz.</p>
    {hata && <p role="alert" class="hata">{hata}</p>}
    <ul>{liste.map((s) => <li key={s.kod}>{s.ad} · {TUR[s.tur]}{s.catismali && ' · İki cihazdaki değerler seçilmeyi bekliyor'}{' '}
      <button class="dugme" disabled={mesgul} onClick={() => { setKod(s.kod); setT({ ad: s.ad, tur: s.tur, kapsam: s.kapsam, girdiler: s.girdiler }); }}>Düzenle</button>{' '}
      <button class="dugme" disabled={mesgul} onClick={() => is(async () => { await istemci.iste('sozlukSil', { evren, kod: s.kod }); if (kod === s.kod) { setKod(null); setT(bos()); } })}>Sil</button>
    </li>)}</ul>
    {cop.length > 0 && <details><summary>Kaldırılan sözlükler</summary><ul>{cop.map((s) => <li key={s.kod}>{s.ad}{' '}
      <button class="dugme" disabled={mesgul} onClick={() => is(() => istemci.iste('sozlukGeriYukle', { evren, kod: s.kod }))}>Geri getir</button>
    </li>)}</ul></details>}
    <form onSubmit={(e) => { e.preventDefault(); is(async () => { await istemci.iste('sozlukYaz', { evren, kod, tanim: t }); setKod(null); setT(bos()); }); }}>
      <fieldset disabled={mesgul}>
        <legend>{kod ? 'Sözlüğü düzenle' : 'Sözlük oluştur'}</legend>
        <label>Sözlüğün adı <input class="girdi" required maxLength={120} value={t.ad} onInput={(e) => setT({ ...t, ad: e.currentTarget.value })} /></label>{' '}
        <label>Sözlük türü <select class="girdi" value={t.tur} onChange={(e) => { const tur = e.currentTarget.value as SozlukTanimi['tur']; setT({ ...t, tur, girdiler: t.girdiler.map((g) => ({ ...g, teknoloji: tur === 'teknoloji' ? g.teknoloji : null })) }); }}>
          {Object.entries(TUR).map(([k, ad]) => <option value={k}>{ad}</option>)}
        </select></label>
        <p><label>Kapsam <select class="girdi" value={t.kapsam.tur} onChange={(e) => {
          const tur = e.currentTarget.value as SozlukTanimi['kapsam']['tur'];
          setT({ ...t, kapsam: tur === 'evren' ? { tur } : tur === 'turler' ? { tur, turler: [] } : { tur, kayit: '' } });
        }}><option value="evren">Bütün evren</option><option value="eser">Seçilen eser</option><option value="turler">Seçilen kayıt türleri</option><option value="donem">Seçilen dönem</option></select></label></p>
        {(t.kapsam.tur === 'eser' || t.kapsam.tur === 'donem') && secici(t.kapsam.kayit, t.kapsam.tur, (kayit) => setT({ ...t, kapsam: { tur: t.kapsam.tur as 'eser' | 'donem', kayit } }), t.kapsam.tur === 'eser' ? 'Eser' : 'Dönem')}
        {t.kapsam.tur === 'donem' && <p class="soluk">Dönem kaydının tarih aralığına bütünüyle giren kayıtlar taranır. Tarihi yazılmamış kayıtlar ayrıca bildirilir.</p>}
        {t.kapsam.tur === 'turler' && <div>{TURLER.map((k) => <label style="display:inline-block;margin:6px" key={k.kod}>
          <input type="checkbox" checked={t.kapsam.tur === 'turler' && t.kapsam.turler.includes(k.kod)} onChange={(e) => {
            if (t.kapsam.tur === 'turler') setT({ ...t, kapsam: { tur: 'turler', turler: e.currentTarget.checked ? [...t.kapsam.turler, k.kod] : t.kapsam.turler.filter((x) => x !== k.kod) } });
          }} />{k.ad}</label>)}</div>}
        {t.tur === 'hitap' && <p class="soluk">Yazdığınız izinli hitapların geçtiği yerler gösterilir; başka ifadeler hakkında yorum yapılmaz.</p>}
        {t.tur === 'teknoloji' && <p class="soluk">Teknolojiye bağlanan sözcükler, sahnenin tarihi o bölgeye kayıtlı yayılma tarihinden önceyse gösterilir. İcat, gündelik kullanım ve kişinin tanıması ayrı bilgilerdir.</p>}
        {t.girdiler.map((g, i) => {
          const degistir = (yeni: Partial<typeof g>) => setT({ ...t, girdiler: t.girdiler.map((x, j) => j === i ? { ...x, ...yeni } : x) });
          return <fieldset key={i}><legend>{i + 1}. girdi</legend>
            <label>Sözcük veya sözcük öbeği <input class="girdi" required maxLength={200} value={g.ifade} onInput={(e) => degistir({ ifade: e.currentTarget.value })} /></label>{' '}
            <label>Açıklama (isteğe bağlı) <input class="girdi" maxLength={1000} value={g.aciklama} onInput={(e) => degistir({ aciklama: e.currentTarget.value })} /></label>{' '}
            {t.tur === 'teknoloji' && secici(g.teknoloji ?? '', 'teknoloji', (s) => degistir({ teknoloji: s || null }), 'Teknoloji (isteğe bağlı)')}
            <button class="dugme" type="button" disabled={t.girdiler.length === 1} onClick={() => setT({ ...t, girdiler: t.girdiler.filter((_, j) => i !== j) })}>Girdiyi kaldır</button>
          </fieldset>;
        })}
        <button class="dugme" type="button" disabled={t.girdiler.length >= 500} onClick={() => setT({ ...t, girdiler: [...t.girdiler, { ifade: '', aciklama: '', teknoloji: null }] })}>Girdi ekle</button>{' '}
        <button class="dugme ana" type="submit">Kaydet</button>{' '}
        {kod && <button class="dugme" type="button" onClick={() => { setKod(null); setT(bos()); }}>Vazgeç</button>}
      </fieldset>
    </form>
    <p><button class="dugme ana" disabled={mesgul} onClick={() => is(denetle)}>{mesgul ? 'Bekleniyor…' : 'Denetimi çalıştır'}</button></p>
    {sonuc && <div aria-live="polite">
      <p>{guncel ? 'Güncel sonuç' : 'Önceki sonuç; kayıtlar değişti. Denetimi yeniden çalıştırın.'} · {sonuc.veri.denetlenen} kayıt tarandı.</p>
      <p class="soluk">{sonuc.veri.kapsam} {sonuc.veri.not}</p>
      {sonuc.veri.eksikler.length > 0 && <details open><summary>Denetlenemeyenler</summary><ul>{sonuc.veri.eksikler.map((s) => <li>{s}</li>)}</ul></details>}
      {!sonuc.veri.sonuclar.length && <p>Bu kapsamda gösterilecek eşleşme bulunmadı.</p>}
      {[false, true].map((fikir) => <div>{sonuc.veri.sonuclar.some((s) => s.fikir === fikir) && <>
        <h3>{fikir ? 'Fikir durumundaki kayıtlar' : 'Kesinleşmiş kayıtlar'}</h3>
        <ul>{sonuc.veri.sonuclar.filter((s) => s.fikir === fikir).map((s) => <li key={s.anahtar}>
          <p>{s.ileti}</p><p>{s.kayit.ad} · {s.paragraf}. paragraf</p><blockquote>{s.alinti}</blockquote>
          {s.aciklama && <p>{s.aciklama}</p>}<p class="soluk">{s.dayanak}</p>
          <a href={`#/e/${evren}/k/${s.kayit.kod}`}>Oraya git</a>{' '}
          <button class="dugme" disabled={mesgul || !guncel} onClick={() => is(async () => { await istemci.iste('sozlukIsareti', { evren, sozluk: s.sozluk, anahtar: s.anahtar, bilerek: true }); await denetle(); })}>Bilerek bırakıldı</button>
        </li>)}</ul>
      </>}</div>)}
      {sonuc.veri.dahaFazlasi && <p>İlk 500 eşleşme gösteriliyor; daha fazlası var.</p>}
    </div>}
  </section>;
}
