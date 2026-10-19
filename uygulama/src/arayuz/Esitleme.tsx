// Drive eşitlemesinin arayüzü (§10.8): bağlanma, "eşitlemek için dokun" şeridi, durum satırı ve
// "Eşitleme ve cihazlar" sayfası. Eşitleme açılışta (izin varsa), pencereye dönülünce, açıkken birkaç dakikada
// bir ve bu cihazda değişiklik yapıldıktan kısa süre sonra çalışır. Anlık eşitleme vaadi verilmez.
import { createContext } from 'preact';
import { useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { EsitlemeDurumu } from '../veri/api';
import { zamanYaz, saatYaz } from '../alan/islem-metni';
import { epostaKaydet, googleHazirla, izinAl, izniGeriAl, kayitliEposta } from './google';
import { SayfaYardimi } from './Rehber';
import { git } from './Uygulama';

const YOKLAMA = 3 * 60_000;
const DEGISIKLIKTEN_SONRA = 20_000;

export interface EsitlemeDenetimi {
  durum: EsitlemeDurumu | null;
  eposta: string | null;
  /** Google penceresi açılıyor ya da izin bekleniyor. */
  baglaniyor: boolean;
  hata: string | null;
  baglan(): Promise<void>;
  esitle(): Promise<void>;
  kes(): Promise<void>;
  yenile(): void;
}

const Baglam = createContext<EsitlemeDenetimi | null>(null);
export const useEsitleme = () => useContext(Baglam)!;

export function EsitlemeSaglayici({ istemci, children }: { istemci: Istemci; children: preact.ComponentChildren }) {
  const [durum, setDurum] = useState<EsitlemeDurumu | null>(null);
  const [eposta, setEposta] = useState<string | null>(kayitliEposta());
  const [baglaniyor, setBaglaniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const bagliRef = useRef(false);

  const yenile = () => { void istemci.iste('esitlemeDurumu').then((d) => { bagliRef.current = d.bagli; setDurum(d); }); };
  const esitle = async () => {
    if (!bagliRef.current) { yenile(); return; }
    setDurum((d) => d && { ...d, calisiyor: true });
    try {
      const d = await istemci.iste('esitle');
      bagliRef.current = d.bagli;
      setDurum(d);
    } catch (e) { setHata((e as Error).message); yenile(); }
  };

  const baglan = async () => {
    setHata(null); setBaglaniyor(true);
    try {
      const izin = await izinAl();
      const hesap = await istemci.iste('jetonVer', izin);
      epostaKaydet(hesap.eposta); setEposta(hesap.eposta);
      bagliRef.current = true;
      await esitle();
    } catch (e) { setHata((e as Error).message); yenile(); }
    finally { setBaglaniyor(false); }
  };

  const kes = async () => {
    const { jeton } = await istemci.iste('baglantiyiKes');
    await izniGeriAl(jeton);
    setEposta(null); bagliRef.current = false; yenile();
  };

  useEffect(() => {
    googleHazirla();
    yenile();
    const zamanlayici = setInterval(() => { if (document.visibilityState === 'visible') void esitle(); }, YOKLAMA);
    const gorununce = () => { if (document.visibilityState === 'visible') void esitle(); };
    document.addEventListener('visibilitychange', gorununce);
    let bekleyen: ReturnType<typeof setTimeout> | null = null;
    const birak = istemci.dinle((d) => {
      if (d.uzaktan) { yenile(); return; }
      // Bu cihazda değişiklik oldu: "yalnızca bu cihazda" sayısı güncellenir, kısa süre sonra gönderilir.
      if (bekleyen) clearTimeout(bekleyen);
      bekleyen = setTimeout(() => { bekleyen = null; void esitle(); }, DEGISIKLIKTEN_SONRA);
      yenile();
    });
    return () => { clearInterval(zamanlayici); document.removeEventListener('visibilitychange', gorununce); birak(); if (bekleyen) clearTimeout(bekleyen); };
  }, []);

  const deger = useMemo(() => ({ durum, eposta, baglaniyor, hata, baglan, esitle, kes, yenile }), [durum, eposta, baglaniyor, hata]);
  return <Baglam.Provider value={deger}>{children}</Baglam.Provider>;
}

/** Üst şerit: daha önce bağlanılmış ama şu an izin yok. Yazma sürer; dokununca izin yenilenir (§10.8). */
export function EsitlemeSeridi() {
  const e = useEsitleme();
  if (!e.durum) return null;
  const guncelleme = e.durum.evrenler.some((x) => x.guncellemeGerekli);
  if (e.eposta && !e.durum.bagli) {
    return (
      <div class="esitleme-seridi" role="status">
        <span>Değişiklikler bu cihaza kaydediliyor. Drive ile eşitlemek için dokunun.</span>
        <button class="dugme ana" onClick={() => void e.baglan()} disabled={e.baglaniyor}>{e.baglaniyor ? 'Bekleniyor…' : 'Eşitle'}</button>
        {e.hata && <span class="hata">{e.hata}</span>}
      </div>
    );
  }
  if (guncelleme) {
    return <div class="esitleme-seridi" role="status"><span>Başka bir cihaz programın daha yeni bir sürümünü kullanıyor. Verileriniz korunuyor. Güncellemek için sayfayı yenileyin.</span></div>;
  }
  return null;
}

/** Alt satırdaki eşitleme durumu (doğrulanabilir durumlar, §10.8). */
export function EsitlemeOzeti() {
  const e = useEsitleme();
  const d = e.durum;
  if (!d) return null;
  const yalniz = d.evrenler.filter((x) => x.esitlenir).reduce((n, x) => n + x.yalnizBuCihazda + x.denemeler.reduce((m, y) => m + y.yalnizBuCihazda, 0), 0);
  const son = Math.max(0, ...d.evrenler.map((x) => x.sonEsitleme ?? 0));
  let metin: string;
  if (!d.bagli && !e.eposta) metin = 'Drive\'a bağlı değil';
  else if (!d.bagli) metin = yalniz ? `${yalniz} değişiklik yalnızca bu cihazda` : 'Drive izni yenilenmeli';
  else if (d.calisiyor) metin = 'Eşitleniyor…';
  else if (d.hata) metin = `Eşitlenemedi: ${d.hata.mesaj}`;
  else if (yalniz) metin = `${yalniz} değişiklik yalnızca bu cihazda`;
  else metin = son ? `Drive'a gönderildi · ${saatYaz(son)}` : 'Drive\'a bağlı';
  return <a href="#/esitleme" class="alt-baglanti">Eşitleme: {metin}</a>;
}

export function EsitlemeEkrani({ istemci }: { istemci: Istemci }) {
  const e = useEsitleme();
  const d = e.durum;
  const [uzak, setUzak] = useState<{ kod: string; ad: string; sonGorulme: number }[] | null>(null);
  const [indiriliyor, setIndiriliyor] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [kurulumAdi, setKurulumAdi] = useState('');
  useEffect(() => { if (d?.bagli) istemci.iste('uzakEvrenler').then(setUzak, (x) => setHata(x.message)); }, [d?.bagli, d?.evrenler.length]);
  useEffect(() => { if (d) setKurulumAdi(d.kurulum.ad); }, [d?.kurulum.ad]);
  if (!d) return <main class="sayfa"><p class="soluk">Açılıyor…</p></main>;
  const calistir = async (f: () => Promise<unknown>) => { setHata(null); try { await f(); } catch (x) { setHata((x as Error).message); } e.yenile(); };

  return (
    <>
      <header class="ust"><a href="#/" class="dugme sade">← Evrenler</a><span class="ad">Eşitleme ve cihazlar</span></header>
      <main class="sayfa">
        <div class="baslik-satiri"><h1>Eşitleme ve cihazlar</h1><SayfaYardimi sayfa="esitleme" /></div>
        <div class="kart" style="margin-top:12px">
          <h3>Google Drive</h3>
          {!e.eposta && !d.bagli && (
            <>
              <p>Evrenler Drive'ınızda programa ayrılmış bir klasöre eşitlenir. Bu klasörü Drive'da göremezsiniz; program da Drive'daki öbür dosyalarınızı göremez. Yedekler ise görebildiğiniz ayrı bir klasöre alınır.</p>
              <p class="soluk kucuk">Google'ın açtığı pencerede hesabınızı seçip izin verin. İzin yaklaşık bir saat geçerlidir. Süresi dolunca üstte “eşitlemek için dokunun” uyarısı çıkar ve izin tek dokunuşla yenilenir. Bu arada yazmaya devam edebilirsiniz.</p>
              <button class="dugme ana" onClick={() => void e.baglan()} disabled={e.baglaniyor}>{e.baglaniyor ? 'Google penceresi bekleniyor…' : 'Google Drive\'a bağlan'}</button>
            </>
          )}
          {(e.eposta || d.bagli) && (
            <>
              <p>Hesap: <strong>{e.eposta ?? '…'}</strong> · {d.bagli ? 'bağlı' : 'izin yenilenmeli'}</p>
              <div class="satir">
                {d.bagli
                  ? <button class="dugme ana" onClick={() => void e.esitle()} disabled={d.calisiyor}>{d.calisiyor ? 'Eşitleniyor…' : 'Şimdi eşitle'}</button>
                  : <button class="dugme ana" onClick={() => void e.baglan()} disabled={e.baglaniyor}>Eşitle</button>}
                <button class="dugme" onClick={() => { if (confirm('Drive bağlantısı kesilsin mi? Drive\'daki dosyalar silinmez; bu cihazdaki evrenler yerinde kalır.')) void e.kes(); }}>Bağlantıyı kes</button>
              </div>
            </>
          )}
          {(e.hata || d.hata) && <p class="hata" role="alert">{e.hata ?? d.hata?.mesaj}</p>}
        </div>

        <div class="kart" style="margin-top:12px">
          <h3>Bu cihaz</h3>
          <form class="satir" onSubmit={(ev) => { ev.preventDefault(); void calistir(() => istemci.iste('kurulumAdiDegistir', { ad: kurulumAdi })); }}>
            <label for="kurulum-adi" class="soluk">Adı</label>
            <input id="kurulum-adi" class="girdi" style="flex:1;min-width:200px" value={kurulumAdi} onInput={(x) => setKurulumAdi((x.target as HTMLInputElement).value)} />
            <button class="dugme" type="submit" disabled={!kurulumAdi.trim() || kurulumAdi === d.kurulum.ad}>Kaydet</button>
          </form>
          <p class="soluk kucuk">Öbür cihazlarda bu adla görünür (ör. “Ofis bilgisayarı, Edge”). Aynı bilgisayardaki iki tarayıcı ayrı cihaz sayılır.</p>
        </div>

        <h2 style="margin-top:20px">Evrenler</h2>
        {d.evrenler.map((v) => (
          <div class="kart" style="margin-top:10px" key={v.kod}>
            <div class="satir">
              <h3 style="flex:1"><a href={`#/e/${v.kod}`}>{v.ad}</a></h3>
              <label class="satir kucuk"><input type="checkbox" checked={v.esitlenir}
                onChange={(x) => void calistir(() => istemci.iste('evrenEsitlemeAyari', { evren: v.kod, esitlenir: (x.target as HTMLInputElement).checked }))} /> Drive ile eşitle</label>
            </div>
            {v.esitlenir ? (
              <ul class="durum-listesi kucuk">
                <li>Bu cihaza kaydedildi.</li>
                <li>{v.yalnizBuCihazda ? <strong>{v.yalnizBuCihazda} değişiklik yalnızca bu cihazda (henüz Drive'a gönderilmedi).</strong> : v.sonEsitleme ? 'Bütün değişiklikler Drive\'a gönderildi.' : 'Henüz eşitlenmedi.'}</li>
                {v.sonEsitleme && <li>Son eşitleme: {zamanYaz(v.sonEsitleme)}</li>}
                {v.bekleyen > 0 && <li>Başka bir cihazdan gelen {v.bekleyen} değişiklik, eksik parçaları da gelince uygulanacak.</li>}
                {v.denemeler.map((y) => (
                  <li key={y.kod}>Deneme kopyası “{y.ad}”: {y.yalnizBuCihazda ? <strong>{y.yalnizBuCihazda} değişiklik yalnızca bu cihazda.</strong> : 'bütün değişiklikler Drive\'a gönderildi.'}
                    {y.bekleyen > 0 && ` Başka bir cihazdan gelen ${y.bekleyen} değişiklik, eksik parçaları da gelince uygulanacak.`}</li>
                ))}
                {v.cihazlar.filter((c) => !c.buCihaz).map((c) => (
                  <li key={c.kod} class={c.kullanimDisi ? 'soluk' : ''}>
                    {c.ad}: {c.kullanimDisi ? 'kullanılmıyor olarak işaretli' : c.bekleyen ? `bu cihazın ${c.bekleyen} değişikliğini henüz almadı` : 'bu cihazın gönderdiği her şeyi aldı'}
                    {' '}<span class="soluk">(son görülme: {zamanYaz(c.sonGorulme)})</span>
                    {' '}<button class="dugme sade kucuk" onClick={() => void calistir(() => istemci.iste('kurulumKullanimDisi', { kod: c.kod, disi: !c.kullanimDisi }))}>
                      {c.kullanimDisi ? 'Yeniden kullanılıyor' : 'Artık kullanılmıyor'}</button>
                  </li>
                ))}
              </ul>
            ) : <p class="soluk kucuk">Bu evren yalnızca bu cihazda. Drive'a hiçbir şey gönderilmez.</p>}
          </div>
        ))}

        {d.bagli && uzak && uzak.length > 0 && (
          <>
            <h2 style="margin-top:20px">Drive'da olup bu cihazda olmayan evrenler</h2>
            {uzak.map((u) => (
              <div class="kart satir" style="margin-top:10px" key={u.kod}>
                <span style="flex:1"><strong>{u.ad}</strong> <span class="soluk kucuk">son değişiklik: {zamanYaz(u.sonGorulme)}</span></span>
                <button class="dugme ana" disabled={!!indiriliyor} onClick={() => void calistir(async () => {
                  setIndiriliyor(u.kod);
                  try { await istemci.iste('evreniIndir', { kod: u.kod }); git(`/e/${u.kod}`); } finally { setIndiriliyor(null); }
                })}>{indiriliyor === u.kod ? 'İndiriliyor…' : 'Bu cihaza indir'}</button>
              </div>
            ))}
          </>
        )}
        {hata && <p class="hata" role="alert">{hata}</p>}
      </main>
    </>
  );
}
