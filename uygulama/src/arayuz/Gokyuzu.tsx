import { useEffect, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { AyEvresi, GokyuzuTanimi, GokyuzuSonucu, GokyuzuCakismalari, GokyuzuZarfi } from '../veri/api';
import { yeniKod } from '../alan/kod';
import { EVRELER, SINIRLAR } from '../calisan/gokyuzu';
import { KayitSec } from './KayitBolumleri';
import type { Secim } from './BaglantiSecici';

const bos = (): GokyuzuTanimi => ({ aylar: [], mevsimler: [], gelgitler: [] });
const ad = (e: AyEvresi) => EVRELER.find((a) => a.kod === e)!.ad;
function EvreSec({ deger, sec, etiket }: { deger: string; sec: (e: AyEvresi) => void; etiket: string }) {
  return <select class="girdi" aria-label={etiket} value={deger} onChange={(e) => sec(e.currentTarget.value as AyEvresi)}>{EVRELER.map((x) => <option key={x.kod} value={x.kod}>{x.ad}</option>)}</select>;
}
function Dayanak({ zarf }: { zarf: GokyuzuZarfi }) {
  return <details><summary>Bunu nereden biliyoruz?</summary><p>{zarf.tur} · {zarf.hukum} · {zarf.guncellik}</p><p>Kapsam: {zarf.kapsam}</p><ul>{zarf.dayanak.map((d) => <li>{d}</li>)}</ul><ul>{zarf.varsayimlar.map((v) => <li>{v}</li>)}</ul></details>;
}
export function GokyuzuSekmesi({ istemci, evren, surum }: { istemci: Istemci; evren: string; surum: number }) {
  const [t, setT] = useState<GokyuzuTanimi>(bos);
  const [yuklendi, setYuklendi] = useState(false);
  const [kirli, setKirli] = useState(false);
  const kirliRef = useRef(false), sira = useRef(0);
  const [hata, setHata] = useState<string | null>(null);
  const [durum, setDurum] = useState('Henüz çalıştırılmadı.');
  const [bekliyor, setBekliyor] = useState(false);
  const [tarih, setTarih] = useState('');
  const [bas, setBas] = useState(''), [son, setSon] = useState('');
  const [kosullar, setKosullar] = useState<Record<string, AyEvresi | ''>>({});
  const [mevsim, setMevsim] = useState('');
  const [o, setO] = useState<GokyuzuSonucu | null>(null);
  const [c, setC] = useState<GokyuzuCakismalari | null>(null);
  const [kiyi, setKiyi] = useState<Secim | null>(null), [not, setNot] = useState(''), [saat, setSaat] = useState('12');
  const [kiyilar, setKiyilar] = useState<Record<string, string>>({});
  const temizle = () => { sira.current++; setO(null); setC(null); setBekliyor(false); setDurum('Henüz çalıştırılmadı.'); setHata(null); };
  useEffect(() => {
    let etkin = true;
    temizle();
    istemci.iste('gokyuzuTanimi', { evren }).then((x) => {
      if (!etkin) return;
      if (!kirliRef.current) setT(x ?? bos());
      setYuklendi(true);
    }, (e) => { if (etkin) setHata((e as Error).message); });
    istemci.iste('kayitlar', { evren }).then((l) => { if (etkin) setKiyilar(Object.fromEntries(l.map((k) => [k.kod, k.ad]))); }, (e) => { if (etkin) setHata((e as Error).message); });
    return () => { etkin = false; sira.current++; };
  }, [evren, surum]);
  const degis = (x: GokyuzuTanimi) => { temizle(); kirliRef.current = true; setKirli(true); setT(x); };
  const calistir = async (arama: boolean) => {
    temizle();
    const n = sira.current;
    setBekliyor(true); setDurum('Hesaplanıyor…');
    try {
      if (arama) {
        const x = await istemci.iste('gokyuzuCakismaAra', { evren, baslangic: bas, bitis: son, kosullar: Object.entries(kosullar).filter(([, e]) => e).map(([ay, evre]) => ({ ay, evre: evre as AyEvresi })), mevsim: mevsim || null });
        if (n === sira.current) { setC(x); setDurum(`Güncel · ${x.zarf.hukum}`); }
      } else {
        const x = await istemci.iste('gokyuzuHesapla', { evren, tarih });
        if (n === sira.current) { setO(x); setDurum('Güncel · çözüm bulundu'); }
      }
    } catch (e) { if (n === sira.current) { setHata((e as Error).message); setDurum('Denetlenemiyor.'); } }
    finally { if (n === sira.current) setBekliyor(false); }
  };
  const kaydet = async () => {
    setBekliyor(true); setHata(null);
    try { await istemci.iste('gokyuzuYaz', { evren, tanim: t }); kirliRef.current = false; setKirli(false); temizle(); setDurum('Gökyüzü tanımı kaydedildi.'); }
    catch (e) { setHata((e as Error).message); }
    finally { setBekliyor(false); }
  };
  return <section aria-label="Gökyüzü">
    <h2>Gökyüzü</h2><p class="soluk">{SINIRLAR}</p>
    <p>Hesap ana zaman akışında, kaydedilmiş tanımla yapılır. Tarihleri Takvim bölümündeki adlarla yazın. Ay başlangıcı için günü bilinen bir tarih gerekir; örneğin “12 Hasat 412”.</p>
    {!yuklendi ? <p>Açılıyor…</p> : <>
      <fieldset disabled={bekliyor}><legend>Gökyüzü tanımı</legend>
        {t.aylar.map((a, i) => {
          const ayDegis = (x: Partial<typeof a>) => degis({ ...t, aylar: t.aylar.map((b, j) => j === i ? { ...b, ...x } : b) });
          return <fieldset key={a.kod}><legend>{i + 1}. ay</legend><div class="satir">
            <label>Ayın adı <input class="girdi" value={a.ad} onInput={(e) => ayDegis({ ad: e.currentTarget.value })} /></label>
            <label>Dönem (gün) <input class="girdi" type="number" min="1" step="any" value={a.donem} onInput={(e) => ayDegis({ donem: e.currentTarget.valueAsNumber })} /></label>
            <label>Başlangıç tarihi <input class="girdi" value={a.baslangic} onInput={(e) => ayDegis({ baslangic: e.currentTarget.value })} /></label>
            <EvreSec etiket={`${i + 1}. ayın başlangıç evresi`} deger={a.evre} sec={(evre) => ayDegis({ evre })} />
            <button class="dugme" onClick={() => { degis({ ...t, aylar: t.aylar.filter((b) => b.kod !== a.kod) }); setKosullar({}); }}>Ayı kaldır</button>
          </div></fieldset>;
        })}
        <button class="dugme" onClick={() => degis({ ...t, aylar: [...t.aylar, { kod: yeniKod(), ad: '', donem: 28, baslangic: '', evre: 'yeni' }] })}>Ay ekle</button>
        <h3>Mevsimler (isteğe bağlı)</h3><p>Başlangıç günü ana takvimin yılındaki sıradır; ilk gün 1'dir. İlk başlangıçtan önce geçen yılın son mevsimi sürer.</p>
        {t.mevsimler.map((m, i) => <div class="satir" key={i}>
          <label>Mevsimin adı <input class="girdi" value={m.ad} onInput={(e) => degis({ ...t, mevsimler: t.mevsimler.map((x, j) => j === i ? { ...x, ad: e.currentTarget.value } : x) })} /></label>
          <label>Yıl içindeki başlangıç günü <input class="girdi" type="number" min="1" step="1" value={m.baslangicGunu} onInput={(e) => degis({ ...t, mevsimler: t.mevsimler.map((x, j) => j === i ? { ...x, baslangicGunu: e.currentTarget.valueAsNumber } : x) })} /></label>
          <button class="dugme" onClick={() => { degis({ ...t, mevsimler: t.mevsimler.filter((_, j) => j !== i) }); setMevsim(''); }}>Mevsimi kaldır</button>
        </div>)}
        <button class="dugme" onClick={() => degis({ ...t, mevsimler: [...t.mevsimler, { ad: '', baslangicGunu: 1 }] })}>Mevsim ekle</button>
        <h3>Gelgit notları (isteğe bağlı)</h3>
        <ul>{t.gelgitler.map((g, i) => <li key={i}><a href={`#/e/${evren}/k/${g.kiyi}`}>{kiyilar[g.kiyi] ?? 'Kıyı kaydı'}</a>: {g.not} · her {g.saat} saatte <button class="dugme" onClick={() => degis({ ...t, gelgitler: t.gelgitler.filter((_, j) => j !== i) })}>Notu kaldır</button></li>)}</ul>
        <div class="satir"><KayitSec istemci={istemci} evren={evren} secili={kiyi} sec={setKiyi} etiket="Kıyı kaydını seç" />
          <label>Kıyı notu <textarea class="girdi" value={not} onInput={(e) => setNot(e.currentTarget.value)} /></label>
          <label>Her kaç saatte <input class="girdi" type="number" min="0" step="any" value={saat} onInput={(e) => setSaat(e.currentTarget.value)} /></label>
          <button class="dugme" disabled={!kiyi || !not.trim()} onClick={() => { if (kiyi) { degis({ ...t, gelgitler: [...t.gelgitler, { kiyi: kiyi.kod, not, saat: Number(saat) }] }); setNot(''); } }}>Kıyı notu ekle</button>
        </div>
        <p><button class="dugme ana" onClick={() => void kaydet()} disabled={!kirli}>Tanımı kaydet</button></p>
      </fieldset>
      {kirli && <p>Kaydedilmemiş değişiklikler var. Hesaplamadan önce tanımı kaydedin.</p>}
      <fieldset disabled={kirli || bekliyor}><legend>Tarihteki gökyüzü</legend>
        <form class="satir" onSubmit={(e) => { e.preventDefault(); void calistir(false); }}><label>Evren tarihi <input class="girdi" value={tarih} onInput={(e) => { temizle(); setTarih(e.currentTarget.value); }} /></label><button class="dugme" type="submit">Gökyüzünü göster</button></form>
      </fieldset>
      <fieldset disabled={kirli || bekliyor}><legend>Çakışma ara</legend>
        <p>Seçilen koşulların tamamı aynı gün sağlanmalıdır. Aralıkta başlangıcın en erken, bitişin en geç günü kullanılır.</p>
        <form onSubmit={(e) => { e.preventDefault(); void calistir(true); }}>
          <div class="satir"><label>Arama başlangıcı <input class="girdi" value={bas} onInput={(e) => { temizle(); setBas(e.currentTarget.value); }} /></label><label>Arama bitişi <input class="girdi" value={son} onInput={(e) => { temizle(); setSon(e.currentTarget.value); }} /></label></div>
          {t.aylar.map((a) => <label key={a.kod}>{a.ad} <select class="girdi" aria-label={`${a.ad} için aranacak evre`} value={kosullar[a.kod] ?? ''} onChange={(e) => { temizle(); setKosullar({ ...kosullar, [a.kod]: e.currentTarget.value as AyEvresi | '' }); }}><option value="">Koşul yok</option>{EVRELER.map((x) => <option value={x.kod}>{x.ad}</option>)}</select></label>)}
          <label>Aranacak mevsim <select class="girdi" value={mevsim} onChange={(e) => { temizle(); setMevsim(e.currentTarget.value); }}><option value="">Koşul yok</option>{t.mevsimler.map((m) => <option value={m.ad}>{m.ad}</option>)}</select></label>
          <button class="dugme" type="submit">Çakışma ara</button>
        </form>
      </fieldset>
    </>}
    <p role="status">{durum}</p>{hata && <p class="hata" role="alert">{hata}</p>}
    {o && <div><h3>{o.tarih.ifade}</h3><p>{o.aralik ? 'Bu aralıkta şu evreler görülür; belirli bir gün seçilmedi.' : 'Bu günün evreleri:'}</p><ul>{o.aylar.map((a) => <li key={a.kod}>{a.ad}: {a.evreler.map(ad).join(', ')}</li>)}</ul><p>Mevsim: {o.mevsimler.join(', ') || 'Tanımlanmamış'}</p><Dayanak zarf={o.zarf} /></div>}
    {c && <div><h3>Çakışan günler</h3><ul>{c.gunler.map((g) => <li key={g.eksen!.enErken!}>{g.ifade}</li>)}</ul>{!c.gunler.length && <p>Kayıtlı koşullarda bu aralıkta bulunamadı.</p>}{c.dahaFazla && <p>Daha fazlası var. İlk 50 gün gösteriliyor.</p>}<Dayanak zarf={c.zarf} /></div>}
  </section>;
}
