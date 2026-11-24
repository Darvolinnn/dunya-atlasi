// Okur yayını (§11.2, §11.3; K38): eser ve sınır seçilir, kayıtların hangi bölümlerinin pakete gireceği belirlenir,
// paket taranır, okurun göreceği önizlenir ve zip olarak indirilir. Yükleme ayrı adımdır (TK7).
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { KisaKayit, OkurKayitDurumu, OkurYayini, OkurYayiniAyari, OkurYayiniKaydi, OkurYayiniTaramasi, SizintiBulgusu } from '../veri/api';
import { turBul } from '../alan/turler';
import { Gorsel } from './gorsel';
import { indir } from './Cikti';

const hataYaz = (e: unknown) => (e as Error).message;
const DURUM: Record<OkurKayitDurumu, { ad: string; sinif: string }> = {
  acik: { ad: 'açık', sinif: 'gercek' }, inanc: { ad: 'okur yanlış biliyor', sinif: 'inanc' }, gecmiyor: { ad: 'eserde geçmiyor', sinif: '' },
  sonra: { ad: 'sınırdan sonra açılıyor', sinif: 'gizli' }, gizli: { ad: 'okurdan gizli', sinif: 'gizli' },
};
/** "2. bölüm" → "2. bölümde"; "eserin başı" → "eserin başında". */
const yerde = (b: string | null) => (!b || b === 'eserin başı' ? 'eserin başında' : `${b}de`);
const tarihYaz = (z: number) => new Date(z).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

export function OkurYayiniSekmesi({ istemci, evren, surum }: { istemci: Istemci; evren: string; surum: number }) {
  const [eserler, setEserler] = useState<KisaKayit[] | null>(null);
  const [eser, setEser] = useState<string | null>(null);
  useEffect(() => { istemci.iste('eserler', { evren }).then((l) => { setEserler(l); setEser((e) => e && l.some((x) => x.kod === e) ? e : l[0]?.kod ?? null); }, () => setEserler([])); }, [evren, surum]);
  if (!eserler) return null;
  return (
    <section class="okur-yayini" aria-label="Okur yayını">
      <p class="soluk kucuk">Okurun göreceği evren rehberini ayrı bir paket olarak hazırlar. Paket yalnız seçtiğiniz kapsamdaki bilgilerden kurulur; programdaki öbür bilgiler pakete hiç yazılmaz.</p>
      {!eserler.length ? <p class="bos">Okur yayını bir esere göre hazırlanır. Önce bir eser ekleyin.</p>
        : eser && <Yayin key={eser} istemci={istemci} evren={evren} eser={eser} eserler={eserler} setEser={setEser} surum={surum} />}
    </section>
  );
}

function Yayin({ istemci, evren, eser, eserler, setEser, surum }: { istemci: Istemci; evren: string; eser: string; eserler: KisaKayit[]; setEser: (k: string) => void; surum: number }) {
  const [y, setY] = useState<OkurYayini | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [tarama, setTarama] = useState<OkurYayiniTaramasi | null>(null);
  const [calisiyor, setCalisiyor] = useState(false);
  const [onizle, setOnizle] = useState<string | null>(null);
  useEffect(() => { istemci.iste('okurYayini', { evren, eser }).then(setY, (e) => setHata(hataYaz(e))); }, [eser, surum]);
  if (!y) return hata ? <p class="hata">{hata}</p> : null;
  const yaz = async (ayar: OkurYayiniAyari) => {
    setHata(null);
    try { await istemci.iste('okurYayiniYaz', { evren, eser, ayar }); setY(await istemci.iste('okurYayini', { evren, eser })); if (tarama) await tara(); } catch (e) { setHata(hataYaz(e)); }
  };
  const tara = async () => {
    setCalisiyor(true); setHata(null);
    try { setTarama(await istemci.iste('okurYayiniTara', { evren, eser })); } catch (e) { setHata(hataYaz(e)); } finally { setCalisiyor(false); }
  };
  const sinirAdi = y.ayar.kip === 'tercih' || !y.ayar.sinir ? 'eserin sonuna kadar' : `${y.bolumler.find((b) => b.kod === y.ayar.sinir)?.sira ?? ''}. bölüme kadar`;
  if (tarama) return <Tarama istemci={istemci} evren={evren} y={y} t={tarama} sinirAdi={sinirAdi} yaz={yaz} geri={() => setTarama(null)} hata={hata} setHata={setHata} />;
  return (
    <>
      <div class="okur-izgara">
        <div class="kart">
          <h2>Kapsam</h2>
          <div class="satir">
            <label class="kucuk">Eser <select class="girdi kucuk-secim" value={eser} onChange={(e) => setEser((e.target as HTMLSelectElement).value)}>{eserler.map((x) => <option value={x.kod}>{x.ad}</option>)}</select></label>
            <label class="kucuk">Sınır <select class="girdi kucuk-secim" value={y.ayar.sinir ?? ''} onChange={(e) => yaz({ ...y.ayar, sinir: (e.target as HTMLSelectElement).value || null })}>
              {y.bolumler.map((b) => <option value={b.kod}>{b.sira}. bölüm · “{b.ad}” sonuna kadar</option>)}
              <option value="">Eserin sonuna kadar</option>
            </select></label>
          </div>
          <div role="radiogroup" aria-label="Sınırın anlamı">
            <Kip secili={y.ayar.kip === 'teslim'} sec={() => yaz({ ...y.ayar, kip: 'teslim' })} ad="Teslim sınırı" rozet="önerilen"
              aciklama={`Paket yalnız ${sinirAdi.replace(' kadar', '')} kadar okurun öğrendiklerini taşır. İleri bölümlerin bilgisi pakette hiç yoktur.`} />
            <Kip secili={y.ayar.kip === 'tercih'} sec={() => yaz({ ...y.ayar, kip: 'tercih' })} ad="Okuma tercihi"
              aciklama="Paket bütün eserin bilgisini taşır; okur sayfada okuduğu yeri seçip ilerisini gizler. İleri bilgi teknik olarak pakettedir, gerçek gizlilik sağlamaz." />
          </div>
        </div>
        <div class="kart">
          <h2>Okura görünen kimlikler</h2>
          {!y.kimlikler.length ? <p class="soluk kucuk">Bu kapsamda iki kimliği olan kişi yok.</p> : y.kimlikler.map((k) => (
            <p class="kucuk" key={`${k.kisi.kod}-${k.kimlik.kod}`}><strong>{k.kimlik.ad}</strong> ile <strong>{k.kisi.ad}</strong> aynı kişi; {k.acik ? <>okura {yerde(k.aciklanma?.bolum ?? null)} açıklanıyor, rehberde birbirine bağlanır.</>
              : <>{k.aciklanma ? `okura ${yerde(k.aciklanma.bolum)} açıklanıyor` : 'okura açıklanmıyor'}. Bu pakette iki ayrı sayfa olur; adresleri birbirinden türetilemez.</>}</p>
          ))}
          <p class="soluk kucuk">Eşitlik, okur kimlik kaydındaki bir sorunun gerçek cevabını öğrendiğinde açıklanmış sayılır.</p>
          <h2>Görseller</h2>
          <p class="soluk kucuk">Her birini ayrıca açarsınız; program görselin içini okuyamaz, bir haritaya yazılmış gizli adı göremez.</p>
          {!y.gorseller.length ? <p class="soluk kucuk">Pakete giren kayıtlarda görsel yok.</p> : (
            <div class="okur-gorseller">{y.gorseller.map((g) => (
              <label class="okur-gorsel" key={g.ad}>
                <Gorsel istemci={istemci} evren={evren} ad={g.ad} alt="" />
                <span class="kucuk">{g.kayit.ad}</span>
                <span class="kucuk"><input type="checkbox" checked={g.izin} onChange={() => yaz({ ...y.ayar, gorseller: g.izin ? y.ayar.gorseller.filter((x) => x !== g.ad) : [...y.ayar.gorseller, g.ad] })} /> {g.izin ? 'Yayında' : 'Kapalı'}</span>
              </label>
            ))}</div>
          )}
        </div>
      </div>
      <Kayitlar y={y} evren={evren} yaz={yaz} sinirAdi={sinirAdi} />
      {hata && <p class="hata" role="alert">{hata}</p>}
      {onizle && <Onizleme istemci={istemci} evren={evren} eser={eser} dosya={onizle} setDosya={setOnizle} sayfalar={null} />}
      <div class="satir okur-eylemler">
        <button class="dugme" onClick={() => setOnizle(onizle ? null : 'index.html')}>{onizle ? 'Önizlemeyi kapat' : 'Önizle'}</button>
        <button class="dugme ana" onClick={tara} disabled={calisiyor}>{calisiyor ? 'Taranıyor…' : 'Taramayı başlat'}</button>
      </div>
    </>
  );
}

function Kip({ secili, sec, ad, rozet, aciklama }: { secili: boolean; sec: () => void; ad: string; rozet?: string; aciklama: string }) {
  return (
    <label class={`okur-kip${secili ? ' secili' : ''}`}>
      <input type="radio" name="okur-kip" checked={secili} onChange={sec} />
      <span><strong>{ad}</strong>{rozet && <> <span class="rozet gercek">{rozet}</span></>}<br /><span class="soluk kucuk">{aciklama}</span></span>
    </label>
  );
}

function Kayitlar({ y, evren, yaz, sinirAdi }: { y: OkurYayini; evren: string; yaz: (a: OkurYayiniAyari) => void; sinirAdi: string }) {
  const giren = y.kayitlar.filter((k) => k.durum !== 'gizli' && k.durum !== 'sonra');
  const girmeyen = y.kayitlar.filter((k) => k.durum === 'gizli' || k.durum === 'sonra');
  const say = (d: OkurKayitDurumu) => y.kayitlar.filter((k) => k.durum === d).length;
  const degistir = (k: OkurYayiniKaydi, anahtar: string) => {
    const secili = k.bolumler.filter((b) => b.secili).map((b) => b.anahtar);
    yaz({ ...y.ayar, secimler: { ...y.ayar.secimler, [k.kod]: secili.includes(anahtar) ? secili.filter((x) => x !== anahtar) : [...secili, anahtar] } });
  };
  const satir = (k: OkurYayiniKaydi) => (
    <tr key={k.kod}>
      <td><a href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a> <span class="soluk kucuk">{turBul(k.tur).ad.toLocaleLowerCase('tr-TR')}</span></td>
      <td><span class={`rozet ${DURUM[k.durum].sinif}`}>{DURUM[k.durum].ad}</span>{k.ilkBolum && <span class="soluk kucuk"> · {k.ilkBolum}</span>}</td>
      <td>{k.durum === 'gizli' || k.durum === 'sonra'
        ? <span class="soluk kucuk">{k.durum === 'gizli' ? 'Okur bu kaydı bilmiyor' : `Okur bunu ${sinirAdi.replace(' kadar', '')} kadar öğrenmiyor`}; pakete girmez, başka sayfalardaki bağlantısı düz yazıya döner.</span>
        : k.bolumler.length ? <span class="okur-bolumler">{k.bolumler.map((b) => (
          <label key={b.anahtar} class="kucuk"><input type="checkbox" checked={b.secili} onChange={() => degistir(k, b.anahtar)} /> {b.ad}{b.not && <span class="soluk"> ({b.not})</span>}</label>
        ))}</span> : <span class="soluk kucuk">Pakete girecek bilgisi yok.</span>}</td>
    </tr>
  );
  return (
    <div class="kart okur-kayitlar">
      <div class="okur-kayit-basi"><h2>Pakete girecekler</h2><span class="soluk kucuk">{say('acik')} kayıt açık · {say('inanc')} kayıtta okurun inandığı hâl · {say('gecmiyor')} kayıt eserde geçmiyor · {say('gizli') + say('sonra')} kayıt girmez</span></div>
      <table class="tablo">
        <thead><tr><th>Kayıt</th><th>Okur için</th><th>Pakete giren bölümler</th></tr></thead>
        <tbody>{giren.map(satir)}</tbody>
      </table>
      {girmeyen.length > 0 && <details class="okur-girmeyen"><summary class="kucuk">Pakete girmeyenler ({girmeyen.length})</summary><table class="tablo"><tbody>{girmeyen.map(satir)}</tbody></table></details>}
      <p class="soluk kucuk">Gövde metni yazar notu olabileceği için başta kapalıdır. Fikir durumundaki alanlar da kapalı başlar.</p>
    </div>
  );
}

function Tarama({ istemci, evren, y, t, sinirAdi, yaz, geri, hata, setHata }: {
  istemci: Istemci; evren: string; y: OkurYayini; t: OkurYayiniTaramasi; sinirAdi: string; yaz: (a: OkurYayiniAyari) => Promise<void>; geri: () => void; hata: string | null; setHata: (h: string | null) => void;
}) {
  const [dosya, setDosya] = useState<string>(() => t.durduran[0]?.yerler[0]?.dosya.startsWith('k/') ? t.durduran[0].yerler[0].dosya : 'index.html');
  const [iniyor, setIniyor] = useState(false);
  const temiz = !t.durduran.length && !t.bekleyen.length;
  const al = async () => {
    setIniyor(true); setHata(null);
    try { const r = await istemci.iste('okurYayiniIndir', { evren, eser: y.eser.kod }); indir(r.dosyaAdi, r.veri, 'application/zip'); await yaz(y.ayar); } catch (e) { setHata(hataYaz(e)); } finally { setIniyor(false); }
  };
  const cikar = (kayit: string, anahtar: string) => {
    const k = y.kayitlar.find((x) => x.kod === kayit);
    const secili = (k?.bolumler ?? []).filter((b) => b.secili).map((b) => b.anahtar);
    yaz({ ...y.ayar, secimler: { ...y.ayar.secimler, [kayit]: secili.filter((x) => x !== anahtar) } });
  };
  const bulgu = (b: SizintiBulgusu, bekleyen: boolean) => (
    <div class={`okur-bulgu${bekleyen ? ' bekleyen' : ''}`} key={b.anahtar}>
      <strong>“{b.dizge}”</strong> <span class="soluk kucuk">· {b.kaynak && b.neden !== 'iç kod' ? `${b.kaynak.ad}: ` : ''}{b.neden}</span>
      {bekleyen && <p class="kucuk">Açık kayıt “{b.esadli}” adının içinde geçiyor; {new Set(b.yerler.map((x) => x.dosya)).size} dosyada.</p>}
      {(bekleyen ? b.yerler.slice(0, 1) : b.yerler.slice(0, 4)).map((x, i) => (
        <div class="kucuk okur-yer" key={i}>
          <span class="soluk">{x.yazi}{x.bolum ? `, ${x.bolum.ad}` : ''}:</span> “…{x.once}<mark>{x.eslesen}</mark>{x.sonra}…”
          <span class="okur-yer-eylem">
            {x.bolum && !bekleyen && <button class="dugme sade kucuk" onClick={() => cikar(x.bolum!.kayit, x.bolum!.anahtar)}>{x.bolum.ad} bölümünü pakete alma</button>}
            {x.bolum && <a class="kucuk" href={`#/e/${evren}/k/${x.bolum.kayit}`}>Kayıtta aç</a>}
            {(x.dosya.startsWith('k/') || x.dosya === 'index.html') && <button class="dugme sade kucuk" onClick={() => setDosya(x.dosya)}>Sayfayı göster</button>}
          </span>
        </div>
      ))}
      {bekleyen && <div class="satir"><button class="dugme kucuk" onClick={() => yaz({ ...y.ayar, onaylar: [...y.ayar.onaylar, b.anahtar] })}>Eşadlı, sorun değil</button></div>}
    </div>
  );
  return (
    <>
      <div class="satir"><button class="dugme sade" onClick={geri}>← Kapsama dön</button></div>
      <h2>{y.eser.ad}, {sinirAdi}</h2>
      <p class="soluk kucuk">Taranan: {t.taranan.sayfa} sayfa, arama dizini, {t.taranan.veri} veri dosyası, {t.taranan.gorsel} görsel (görsel bilgisi silindi) · {t.taranan.gizliDizge} gizli ad ve kod{t.onaylanan ? ` · ${t.onaylanan} eşadlı eşleşme onaylandı` : ''}</p>
      <div class="okur-izgara">
        <div>
          {t.durduran.length > 0 && <><h3 class="okur-durduran">Yayını durduran ({t.durduran.length})</h3>{t.durduran.map((b) => bulgu(b, false))}</>}
          {t.bekleyen.length > 0 && <><h3 class="okur-bekleyen">Onayınızı bekleyen ({t.bekleyen.length})</h3>{t.bekleyen.map((b) => bulgu(b, true))}</>}
          {temiz && <p class="kucuk" role="status">Gizli bir ad, kod ya da dosya adı bulunmadı.</p>}
          <p class="soluk kucuk">Okurun açık ipuçlarından doğru tahmin yapması sızıntı sayılmaz; tarama yalnız gizli bilginin pakete yazılmasını arar.</p>
          {t.eksikGorsel > 0 && <p class="kucuk">{t.eksikGorsel} görsel bu cihazda olmadığı için pakete konamadı.</p>}
          <div class="kart okur-paket">
            <div><strong>Baskı {y.baskilar.length + 1}</strong><div class="soluk kucuk">{temiz ? 'Zip dosyası olarak iner; nereye yükleyeceğiniz size kalır.' : 'Durduran ve bekleyen eşleşme kalmayınca indirilir.'}</div></div>
            <button class="dugme ana" disabled={!temiz || iniyor} onClick={al}>{iniyor ? 'Hazırlanıyor…' : 'Paketi indir'}</button>
          </div>
          {hata && <p class="hata" role="alert">{hata}</p>}
          {y.baskilar.length > 0 && <>
            <h3>Önceki baskılar</h3>
            <ul class="kucuk">{[...y.baskilar].reverse().map((b) => <li key={b.no}>Baskı {b.no} · {tarihYaz(b.zaman)} · {b.sinir} · {b.kip === 'teslim' ? 'teslim sınırı' : 'okuma tercihi'}</li>)}</ul>
            <p class="soluk kucuk">Kayıt adresleri baskılar arasında aynı kalır; okurun eski bağlantıları kopmaz.</p>
          </>}
        </div>
        <div>
          <h3>Okurun göreceği</h3>
          <Onizleme istemci={istemci} evren={evren} eser={y.eser.kod} dosya={dosya} setDosya={setDosya} sayfalar={t.sayfalar} />
          <p class="soluk kucuk">Önizleme paketin kendisinden açılır; yazar alanındaki veriye bakmaz.</p>
        </div>
      </div>
    </>
  );
}

function Onizleme({ istemci, evren, eser, dosya, setDosya, sayfalar }: { istemci: Istemci; evren: string; eser: string; dosya: string; setDosya: (d: string) => void; sayfalar: { dosya: string; ad: string }[] | null }) {
  const [html, setHtml] = useState<string | null>(null);
  const ref = useRef<HTMLIFrameElement>(null);
  useEffect(() => { setHtml(null); istemci.iste('okurYayiniSayfasi', { evren, eser, dosya }).then((r) => setHtml(r.html), () => setHtml('<p>Sayfa açılamadı.</p>')); }, [dosya]);
  // Önizlemedeki bağlantılar paketin öbür sayfalarını açar.
  const yuklendi = () => {
    const d = ref.current?.contentDocument;
    d?.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest('a[data-dosya]');
      if (a) { e.preventDefault(); setDosya(a.getAttribute('data-dosya')!); }
    });
  };
  return (
    <div class="okur-onizleme">
      {sayfalar && <select class="girdi kucuk-secim" aria-label="Önizlenen sayfa" value={dosya} onChange={(e) => setDosya((e.target as HTMLSelectElement).value)}>
        {sayfalar.map((s) => <option value={s.dosya}>{s.ad}</option>)}
      </select>}
      {html !== null && <iframe ref={ref} title="Okurun göreceği sayfa" srcdoc={html} sandbox="allow-same-origin" onLoad={yuklendi} />}
    </div>
  );
}
