// En kısa rota aracı (§15-2), haberleşme yöntemi bağlantıları ve haber yayılımı (§15-3). Hepsi yalnızca kayıtlı ağ
// içinde hesaplar; "bulunamadı" evrende imkânsız demek değildir, "ulaşabilir" biri onu biliyor demek değildir.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { HaberYayilimi, KanalTanimi, KisaKayit, PaketOzeti, RotaAdimi, RotaSonucu, SartDurumu } from '../veri/api';
import { KayitSec } from './KayitBolumleri';
import { onayla } from './onay';

const hataYaz = (e: unknown) => (e as Error).message;
export const ROTA_ARACI_TURLERI = ['mekan', 'sehir', 'siyasi'];
const gun = (n: number) => `${n.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} gün`;
const bag = (evren: string, k: KisaKayit) => <a href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a>;
type Secim = { kod: string; ad: string };

export function PaketSecimi({ istemci, evren, paket, sec, id }: { istemci: Istemci; evren: string; paket: string | null; sec: (p: string | null) => void; id: string }) {
  const [paketler, setPaketler] = useState<PaketOzeti[]>([]);
  useEffect(() => { istemci.iste('paketler', { evren }).then(setPaketler, () => {}); }, [evren]);
  if (!paketler.length) return null;
  return (
    <>
      <label class="soluk kucuk" for={id}>Varsayım paketi</label>
      <select id={id} class="girdi kucuk-secim" value={paket ?? ''} onChange={(e) => sec((e.target as HTMLSelectElement).value || null)}>
        <option value="">Yok</option>
        {paketler.map((p) => <option value={p.kod}>{p.ad}</option>)}
      </select>
    </>
  );
}

const SART_DURUMLARI: Record<SartDurumu['durum'], string> = {
  gecerli: 'izni var, varışta geçerli', yok: 'izni kayıtlı değil', bitmis: 'izni varışta bitmiş', baslamamis: 'izni varışta henüz başlamamış',
  belirsiz: 'iznin varışta geçerli olup olmadığı belirsiz', tarih_yok: 'izni var; geçerli olup olmadığını görmek için çıkış tarihi gerekir', kisi_yok: 'kimin geçeceği seçilmedi', ucret: 'ödenip ödenemeyeceğine siz karar verirsiniz',
};
function Sartlar({ evren, l }: { evren: string; l: SartDurumu[] }) {
  return (
    <ul class="kucuk soluk">
      {l.map((s, i) => (
        <li key={i} class={s.durum === 'yok' || s.durum === 'bitmis' || s.durum === 'baslamamis' ? 'hata' : ''}>
          {s.tur === 'izin' ? <>İzin: {s.kayit ? bag(evren, s.kayit) : 'silinmiş kayıt'}</> : <>Ücret: {s.aciklama}</>}{s.tur === 'izin' && s.aciklama ? ` (${s.aciklama})` : ''} · {SART_DURUMLARI[s.durum]}
        </li>
      ))}
    </ul>
  );
}

function Adimlar({ evren, adimlar }: { evren: string; adimlar: RotaAdimi[] }) {
  return (
    <ol class="toplanan-listesi">
      {adimlar.map((a) => (
        <li key={a.rota.kod + a.nereden.kod}>{bag(evren, a.nereden)} → {bag(evren, a.nereye)} <span class="soluk kucuk">· {bag(evren, a.rota)} · {a.gun === null ? 'süresi kayıtlı değil' : `${gun(a.gun)}${a.kosul ? ` (${a.kosul})` : ''}`}</span>
          {a.sartlar && <Sartlar evren={evren} l={a.sartlar} />}</li>
      ))}
    </ol>
  );
}

function Cozum({ evren, r }: { evren: string; r: Pick<RotaSonucu, 'hukum' | 'kip' | 'toplam' | 'adimlar' | 'eksik'> }) {
  if (r.hukum === 'bulunamadi') return <p class="kucuk">Kayıtlı rotalar arasında bir bağlantı bulunamadı. Bu, evrende hiç yol olmadığını göstermez.</p>;
  return (
    <>
      <p class="kucuk">{r.kip === 'sure' ? `En kısa: ${gun(r.toplam!)}` : 'Bağlantı var, ama bazı rotaların süresi kayıtlı olmadığı için toplam süre hesaplanamıyor.'}</p>
      <Adimlar evren={evren} adimlar={r.adimlar} />
      {r.eksik.length > 0 && <p class="soluk kucuk">Süresi yazılmamış rotalar: {r.eksik.map((x, i) => <>{i > 0 && ', '}{bag(evren, x)}</>)}</p>}
    </>
  );
}

export function RotaAraci({ istemci, evren, kod, ad }: { istemci: Istemci; evren: string; kod: string; ad: string }) {
  const [nereye, setNereye] = useState<Secim | null>(null);
  const [kisi, setKisi] = useState<Secim | null>(null);
  const [kosul, setKosul] = useState('');
  const [paket, setPaket] = useState<string | null>(null);
  const [cikis, setCikis] = useState('');
  const [r, setR] = useState<RotaSonucu | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const hesapla = () => {
    if (!nereye) return;
    istemci.iste('enKisaRota', { evren, nereden: kod, nereye: nereye.kod, kosul: kosul.trim() || null, kisi: kisi?.kod ?? null, paket, cikis: cikis.trim() || null })
      .then((x) => { setR(x); setHata(null); }, (x) => { setR(null); setHata(hataYaz(x)); });
  };
  return (
    <section class="surecler" aria-label="En kısa yol">
      <details>
        <summary><h2 style="display:inline">Buradan en kısa yol</h2></summary>
        <form class="satir" onSubmit={(e) => { e.preventDefault(); hesapla(); }}>
          <span class="soluk kucuk">{ad} →</span>
          <KayitSec istemci={istemci} evren={evren} secili={nereye} etiket="Varış seç" sec={setNereye} />
          <input class="girdi" style="width:120px" lang="tr" aria-label="Koşul" placeholder="koşul (kış…)" value={kosul} onInput={(e) => setKosul((e.target as HTMLInputElement).value)} />
          <KayitSec istemci={istemci} evren={evren} secili={kisi} etiket="Kimin bildiği yollarla?" sec={setKisi} />
          {kisi && <button type="button" class="dugme sade kucuk" onClick={() => setKisi(null)}>Kişiyi kaldır</button>}
          <input class="girdi" style="width:130px" lang="tr" aria-label="Çıkış tarihi" placeholder="çıkış tarihi (izin için)" value={cikis} onInput={(e) => setCikis((e.target as HTMLInputElement).value)} />
          <PaketSecimi istemci={istemci} evren={evren} paket={paket} sec={setPaket} id={`rota-paketi-${kod}`} />
          <button class="dugme ana kucuk" type="submit" disabled={!nereye}>Hesapla</button>
        </form>
        {hata && <p class="hata kucuk">{hata}</p>}
        {r && (
          <div class="rota-sonucu">
            <Cozum evren={evren} r={r} />
            {r.bilinen && (
              <div>
                <h3 class="kucuk">{r.bilinen.kisi.ad} yalnızca bildiği {r.bilinen.bildigiRota} rotayla</h3>
                <Cozum evren={evren} r={r.bilinen} />
              </div>
            )}
            <p class="soluk kucuk">{r.kapsam}{r.paket ? ` “${r.paket.ad}” varsayım paketiyle hesaplandı; evrende hiçbir şey değişmedi.` : ''}</p>
          </div>
        )}
      </details>
    </section>
  );
}

// ---------- Haberleşme yöntemi ----------

export function KanalBolumu({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [t, setT] = useState<KanalTanimi | null>(null);
  const [adlar, setAdlar] = useState<Record<string, string>>({});
  const [a, setA] = useState<Secim | null>(null);
  const [b, setB] = useState<Secim | null>(null);
  const [sure, setSure] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => {
    istemci.iste('kanal', { evren, kod }).then(async (x) => {
      setT(x);
      const kodlar = [...new Set(x.baglantilar.flatMap((y) => [y.a, y.b]))];
      const l = await Promise.all(kodlar.map((k) => istemci.iste('kayit', { evren, kod: k }).then((r) => [k, r.ad] as const, () => [k, 'Silinmiş kayıt'] as const)));
      setAdlar(Object.fromEntries(l));
    }, () => {});
  }, [kod, surum]);
  if (!t) return null;
  const yaz = (yeni: KanalTanimi) => istemci.iste('kanalYaz', { evren, kod, tanim: yeni }).then(() => setHata(null), (x) => setHata(hataYaz(x)));
  return (
    <section class="surecler" aria-label="Haberleşme bağlantıları">
      <h2>Haberleşme bağlantıları</h2>
      <p class="soluk kucuk">Haber yayılımı bu bağlantılarla hesaplanır. Süreleri siz yazarsınız; program tahmin yürütmez.</p>
      <div class="satir">
        <label class="kucuk"><input type="checkbox" checked={t.rotalar} onChange={(e) => yaz({ ...t, rotalar: (e.target as HTMLInputElement).checked })} /> Kayıtlı rotaları kullanır</label>
        {t.rotalar && (
          <>
            <label class="soluk kucuk" for={`carpan-${kod}`}>Rota süresinin katı</label>
            <input id={`carpan-${kod}`} class="girdi" style="width:70px" inputMode="decimal" value={String(t.carpan)}
              onChange={(e) => yaz({ ...t, carpan: Number((e.target as HTMLInputElement).value.replace(',', '.')) })} />
            <input class="girdi" style="width:140px" lang="tr" aria-label="Rota koşulu" placeholder="koşul (boşsa en kısa)" value={t.kosul ?? ''}
              onChange={(e) => yaz({ ...t, kosul: (e.target as HTMLInputElement).value.trim() || null })} />
          </>
        )}
      </div>
      {t.baglantilar.length > 0 && (
        <ul class="toplanan-listesi">
          {t.baglantilar.map((x, i) => (
            <li key={i}>{adlar[x.a] ?? '…'} – {adlar[x.b] ?? '…'} <span class="soluk kucuk">· {gun(x.gun)}</span>{' '}
              <button class="dugme sade kucuk" onClick={() => onayla('Bu bağlantı kaldırılsın mı?') && yaz({ ...t, baglantilar: t.baglantilar.filter((_, j) => j !== i) })}>Kaldır</button></li>
          ))}
        </ul>
      )}
      <form class="satir" onSubmit={(e) => {
        e.preventDefault();
        if (!a || !b) return;
        yaz({ ...t, baglantilar: [...t.baglantilar, { a: a.kod, b: b.kod, gun: Number(sure.replace(',', '.')) }] }).then(() => { setA(null); setB(null); setSure(''); });
      }}>
        <KayitSec istemci={istemci} evren={evren} secili={a} etiket="Bir uç" sec={setA} />
        <KayitSec istemci={istemci} evren={evren} secili={b} etiket="Öteki uç" sec={setB} />
        <input class="girdi" style="width:80px" inputMode="decimal" aria-label="Kaç gün" placeholder="gün" value={sure} onInput={(e) => setSure((e.target as HTMLInputElement).value)} />
        <button class="dugme kucuk" type="submit" disabled={!a || !b || sure.trim() === ''}>Bağlantı ekle</button>
      </form>
      {hata && <p class="hata kucuk">{hata}</p>}
    </section>
  );
}

// ---------- Haber ----------

export function HaberYayilimiBolumu({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [y, setY] = useState<HaberYayilimi | null>(null);
  const [kanallar, setKanallar] = useState<KisaKayit[]>([]);
  const [yer, setYer] = useState<Secim | null>(null);
  const [tarih, setTarih] = useState('');
  const [secili, setSecili] = useState<string[]>([]);
  const [paket, setPaket] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => {
    istemci.iste('haberCikisi', { evren, kod }).then((c) => { setYer(c.yer); setTarih(c.tarih?.ifade ?? ''); setSecili(c.kanallar.map((k) => k.kod)); }, () => {});
    istemci.iste('kayitlar', { evren }).then((l) => setKanallar(l.filter((k) => k.tur === 'haberlesme').map((k) => ({ kod: k.kod, ad: k.ad, tur: k.tur }))), () => {});
  }, [kod, surum]);
  useEffect(() => { istemci.iste('haberYayilimi', { evren, kod, paket }).then(setY, () => {}); }, [kod, surum, paket]);
  const kaydet = (e: Event) => {
    e.preventDefault();
    istemci.iste('haberCikisiYaz', { evren, kod, yer: yer?.kod ?? null, tarih, kanallar: secili }).then(() => setHata(null), (x) => setHata(hataYaz(x)));
  };
  return (
    <section class="surecler" aria-label="Haber yayılımı">
      <h2>Haber yayılımı</h2>
      <form class="satir" onSubmit={kaydet}>
        <KayitSec istemci={istemci} evren={evren} secili={yer} etiket="Çıktığı yer" sec={setYer} />
        <input class="girdi" style="width:160px" lang="tr" aria-label="Çıktığı tarih" placeholder="çıktığı tarih (isteğe bağlı)" value={tarih} onInput={(e) => setTarih((e.target as HTMLInputElement).value)} />
        {kanallar.map((k) => (
          <label class="kucuk" key={k.kod}><input type="checkbox" checked={secili.includes(k.kod)}
            onChange={(e) => setSecili((e.target as HTMLInputElement).checked ? [...secili, k.kod] : secili.filter((x) => x !== k.kod))} /> {k.ad}</label>
        ))}
        <button class="dugme ana kucuk" type="submit">Kaydet</button>
      </form>
      {!kanallar.length && <p class="soluk kucuk">Kayıtlı haberleşme yöntemi yok. “Haberleşme yöntemi” türünde bir kayıt açıp bağlantılarını yazabilirsiniz.</p>}
      {kanallar.length > 0 && !secili.length && <p class="soluk kucuk">Hiçbir haberleşme yöntemi seçilmezse hepsi kullanılır.</p>}
      <div class="satir"><PaketSecimi istemci={istemci} evren={evren} paket={paket} sec={setPaket} id={`haber-paketi-${kod}`} /></div>
      {hata && <p class="hata kucuk">{hata}</p>}
      {y && y.durum !== 'hesaplandi' && <p class="soluk kucuk">{y.not}</p>}
      {y && y.durum === 'hesaplandi' && (
        <>
          {!y.ulasilan.length && !y.suresiz.length ? <p class="kucuk">Kayıtlı haberleşme yöntemleriyle başka bir yere bağlantı yok.</p> : (
            <ul class="toplanan-listesi">
              {y.ulasilan.map((u) => (
                <li key={u.yer.kod}>{bag(evren, u.yer)}: {u.yazi}{u.tarih ? ` (en erken ${u.tarih})` : ''} <span class="soluk kucuk">· {u.yol.join(' → ')}</span></li>
              ))}
              {y.suresiz.map((s) => <li key={s.kod}>{bag(evren, s)}: <span class="soluk">bağlantı var, süre kayıtlı değil</span></li>)}
            </ul>
          )}
          <p class="soluk kucuk">{y.not}</p>
        </>
      )}
    </section>
  );
}
