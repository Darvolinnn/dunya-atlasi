// Eserin ya da bölümün sahnelerinde düz metin bulma ve önizlemeli değiştirme (K39). Anlam çıkarılmaz (K1):
// yalnız yazılan harf dizisi aranır. Değiştirme tek işlem grubudur ve geri alınabilir.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { MetinEslesmesi } from '../veri/api';
import { useYumusakKapanis } from './kapanis';
import { geriAlinabilir } from './onay';

export function BulDegistir({ istemci, evren, kapsam, kapsamAdi, kapat }: { istemci: Istemci; evren: string; kapsam: string; kapsamAdi: string; kapat: () => void }) {
  const [perdeRef, vazgec] = useYumusakKapanis(kapat);
  const [aranan, setAranan] = useState('');
  const [yeni, setYeni] = useState('');
  const [harfDuyarli, setHarfDuyarli] = useState(false);
  const [sonuc, setSonuc] = useState<MetinEslesmesi[] | null>(null);
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const [hata, setHata] = useState('');
  const [bilgi, setBilgi] = useState('');
  useEffect(() => {
    const tus = (e: KeyboardEvent) => { if (e.key === 'Escape') vazgec(); };
    addEventListener('keydown', tus);
    return () => removeEventListener('keydown', tus);
  }, []);
  const bul = async (e?: Event) => {
    e?.preventDefault();
    try {
      const l = await istemci.iste('metinBul', { evren, kapsam, aranan, harfDuyarli });
      setSonuc(l); setSecili(new Set(l.filter((x) => !x.bagli).map((x) => x.anahtar))); setHata(''); setBilgi('');
    } catch (x) { setHata((x as Error).message); setSonuc(null); }
  };
  const degistir = async () => {
    try {
      const sec = [...secili];
      let onceki: { kayit: string; basliklar: string[] }[] = [];
      const r = await geriAlinabilir(`${kapsamAdi}: “${aranan}” ${sec.length} yerde “${yeni}” oldu.`,
        async () => { const x = await istemci.iste('metinDegistir', { evren, kapsam, aranan, yeni, harfDuyarli, secilenler: sec }); onceki = x.onceki; return x; },
        () => istemci.iste('metinleriGeriYukle', { evren, onceki }));
      setBilgi(`${r.degisen} yer, ${r.sahne} sahnede değişti.`);
      await bul();
    } catch (x) { setHata((x as Error).message); }
  };
  const sahneler = sonuc ? [...new Map(sonuc.map((x) => [x.sahne.kod, x.sahne])).values()] : [];
  return (
    <div class="perde" role="dialog" aria-label="Metinde bul ve değiştir" ref={perdeRef} onClick={(e) => { if (e.target === e.currentTarget) vazgec(); }}>
      <div class="perde-ic bul-degistir">
        <div class="satir"><h2 style="margin:0">Metinde bul ve değiştir</h2><span class="bosluk" /><button class="dugme" onClick={vazgec}>Kapat</button></div>
        <p class="soluk kucuk">“{kapsamAdi}” içindeki bütün sahnelerde aranır. Bağlantı verdiğiniz adlar için kaydın sayfasındaki ad düzeltmesini kullanın; o bağlantıları da korur.</p>
        <form class="satir bul-satiri" onSubmit={bul}>
          <input class="girdi" lang="tr" autoFocus aria-label="Aranan" placeholder="Aranan (ör. Başmuhafız)" value={aranan} onInput={(e) => setAranan((e.target as HTMLInputElement).value)} />
          <input class="girdi" lang="tr" aria-label="Yerine" placeholder="Yerine" value={yeni} onInput={(e) => setYeni((e.target as HTMLInputElement).value)} />
          <label class="kucuk satir"><input type="checkbox" checked={harfDuyarli} onChange={(e) => setHarfDuyarli((e.target as HTMLInputElement).checked)} /> Büyük/küçük harf ayrı</label>
          <button class="dugme" type="submit" disabled={!aranan.trim()}>Bul</button>
        </form>
        {hata && <p class="hata kucuk">{hata}</p>}
        {bilgi && <p class="kucuk" role="status">{bilgi}</p>}
        {sonuc && !sonuc.length && <p class="soluk">Bulunamadı.</p>}
        {sonuc && sonuc.length > 0 && <>
          <div class="satir kucuk">
            <span>{sonuc.length} yer, {sahneler.length} sahne · {secili.size} seçili</span><span class="bosluk" />
            <button class="dugme sade kucuk" onClick={() => setSecili(new Set(sonuc.map((x) => x.anahtar)))}>Hepsini seç</button>
            <button class="dugme sade kucuk" onClick={() => setSecili(new Set())}>Hiçbirini</button>
          </div>
          <div class="bul-sonuclari">
            {sahneler.map((s) => (
              <section key={s.kod}>
                <h3><a href={`#/e/${evren}/yaz/${s.kod}`}>{s.ad}</a></h3>
                {sonuc.filter((x) => x.sahne.kod === s.kod).map((x) => (
                  <label key={x.anahtar} class="bul-eslesme">
                    <input type="checkbox" checked={secili.has(x.anahtar)} onChange={(e) => { const n = new Set(secili); if ((e.target as HTMLInputElement).checked) n.add(x.anahtar); else n.delete(x.anahtar); setSecili(n); }} />
                    <span>…{x.once}{secili.has(x.anahtar) && yeni !== x.eslesen ? <><del>{x.eslesen}</del><ins>{yeni}</ins></> : <mark>{x.eslesen}</mark>}{x.sonra}…{x.bagli && <span class="rozet" title="Bu bir bağlantının yazısı. Değiştirirseniz bağlantı kalır, yalnız görünen yazı değişir.">bağlantı</span>}</span>
                  </label>
                ))}
              </section>
            ))}
          </div>
          <div class="satir"><span class="bosluk" /><button class="dugme ana" disabled={!secili.size} onClick={degistir}>{secili.size} yeri değiştir</button></div>
        </>}
      </div>
    </div>
  );
}
