// Takvimin ay görünümü (K37): evrenin kendi takviminde bir ay; tarihi o aya düşen olay ve sahneler günlerinde görünür.
// Bir olaya dokununca katılanlar o andaki yaşlarıyla gösterilir; bir güne dokununca o tarihe olay eklenir. Hafta
// tanımı olmadığı için günler yedişer sıralanır; günlere ad verilmez.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { CizelgeOgesi, OlayKarti } from '../veri/api';
import { ayAraligi, eksenYeri, eksenYili, GUN_PARCA, gunIfadesi, tarihAciklamasi, tarihCoz, yilYazisi, type ZamanSeti } from '../alan/tarih';
import { grupSinifi, turBul } from '../alan/turler';
import { BaglantiSecici, type Secim } from './BaglantiSecici';
import { KayitSec } from './KayitBolumleri';
import { useTakvim, yasKisa } from './Takvim';

const yerAnahtari = (evren: string) => `dunya-atlasi:takvim-ayi:${evren}`;
const okuYerel = (a: string) => { try { return localStorage.getItem(a); } catch { return null; } };
const yazYerel = (a: string, v: string) => { try { localStorage.setItem(a, v); } catch { /* yok */ } };
const GUNLUK = new Set(['gun', 'bolum']);

/** Bir öğenin bu aydaki ilk ve son günü (1'den); aya düşmüyorsa null. Yalnızca gün düzeyindeki tarihler günlere girer. */
function aydakiGunler(o: CizelgeOgesi, bas: number, son: number): [number, number] | null {
  const e = o.tarih.eksen;
  if (!e || e.enErken === null || e.enGec === null || !GUNLUK.has(o.tarih.hassasiyet ?? '')) return null;
  if (e.enGec < bas || e.enErken > son) return null;
  return [Math.floor((Math.max(e.enErken, bas) - bas) / GUN_PARCA) + 1, Math.floor((Math.min(e.enGec, son) - bas) / GUN_PARCA) + 1];
}

export function AyGorunumu({ istemci, evren }: { istemci: Istemci; evren: string }) {
  const z = useTakvim(istemci, evren);
  const t = z.ana;
  const [ogeler, setOgeler] = useState<CizelgeOgesi[] | null>(null);
  const [n, setN] = useState(0);
  const [yer, setYerDurumu] = useState<{ yil: number; ay: number } | null>(() => {
    try { const v = JSON.parse(okuYerel(yerAnahtari(evren)) ?? 'null'); return typeof v?.yil === 'number' && typeof v?.ay === 'number' ? v : null; } catch { return null; }
  });
  const setYer = (v: { yil: number; ay: number }) => { setYerDurumu(v); yazYerel(yerAnahtari(evren), JSON.stringify(v)); };
  const [secim, setSecim] = useState<{ gun: number } | { olay: string } | null>(null);
  useEffect(() => istemci.dinle((d) => { if (d.evren === evren) setN((x) => x + 1); }), [evren]);
  useEffect(() => { istemci.iste('zamanCizelgesi', { evren }).then(setOgeler, () => setOgeler([])); }, [evren, n]);

  if (!ogeler) return <p class="soluk">Açılıyor…</p>;
  if (!t.aylar?.length) return <p class="soluk">Ay görünümü için takvimin ayları gerekir. “Takvim ayarları” sekmesinden ana takvime ay ekleyebilirsiniz.</p>;

  // Açılışta: son bakılan ay; yoksa gün düzeyinde tarihi olan en son kaydın ayı; o da yoksa ilk yılın ilk ayı.
  let simdi = yer && yer.ay < t.aylar.length ? yer : null;
  if (!simdi) {
    const son = [...ogeler].reverse().find((o) => GUNLUK.has(o.tarih.hassasiyet ?? '') && o.tarih.eksen?.enErken !== null && o.tarih.eksen);
    if (son) { const y = eksenYeri(son.tarih.eksen!.enErken!, t); simdi = { yil: y.yil, ay: y.ay }; } else simdi = { yil: 1, ay: 0 };
  }
  const { yil, ay } = simdi;
  const ayTanimi = t.aylar[ay];
  const [bas, son] = ayAraligi(t, yil, ay);
  const gunlere: { o: CizelgeOgesi; ilk: number; son: number }[] = [];
  for (const o of ogeler) { const g = aydakiGunler(o, bas, son); if (g) gunlere.push({ o, ilk: g[0], son: g[1] }); }
  const ayDuzeyi = ogeler.filter((o) => o.tarih.hassasiyet === 'ay' && o.tarih.eksen?.enErken !== null && o.tarih.eksen?.enErken !== undefined
    && o.tarih.eksen.enErken >= bas && o.tarih.eksen.enErken <= son);
  const git = (d: number) => {
    let a = ay + d, y = yil;
    if (a < 0) { a = t.aylar!.length - 1; y--; } else if (a >= t.aylar!.length) { a = 0; y++; }
    setYer({ yil: y, ay: a }); setSecim(null);
  };
  const hucreler = Math.ceil(ayTanimi.gun / 7) * 7;
  const seciliGun = secim && 'gun' in secim ? secim.gun : null;

  return (
    <div class={`takvim-ay${secim ? ' cekmeceli' : ''}`}>
      <div class="takvim-ay-ana">
        <div class="satir takvim-ay-ust">
          <button class="dugme kucuk" aria-label="Önceki ay" onClick={() => git(-1)}>‹</button>
          <button class="dugme kucuk" aria-label="Sonraki ay" onClick={() => git(1)}>›</button>
          <h2 class="takvim-ay-adi" aria-live="polite">{ayTanimi.ad} {yilYazisi(yil, t)}</h2>
          <YilaGit z={z} sec={(y) => { setYer({ yil: y, ay }); setSecim(null); }} />
          <span class="bosluk" />
          <span class="soluk kucuk">Bir güne dokunarak o tarihe olay ekleyebilirsiniz.</span>
        </div>
        {ayDuzeyi.length > 0 && (
          <p class="kucuk takvim-ay-genel"><span class="soluk">Bu ay, günü yazılmamış: </span>
            {ayDuzeyi.map((o, i) => <>{i > 0 && ', '}<button key={o.kod} class="baglanti-dugme" onClick={() => setSecim({ olay: o.kod })}>{o.ad}</button></>)}
          </p>
        )}
        <div class="takvim-izgara" role="grid" aria-label={`${ayTanimi.ad} ${yilYazisi(yil, t)}`}>
          {Array.from({ length: hucreler }, (_, i) => {
            const gun = i + 1;
            if (gun > ayTanimi.gun) return <div key={i} class="takvim-gun dis" aria-hidden="true" />;
            const buGun = gunlere.filter((x) => gun >= x.ilk && gun <= x.son);
            return (
              <div key={i} role="gridcell" class={`takvim-gun${seciliGun === gun ? ' secili' : ''}`} tabIndex={0}
                aria-label={`${gun} ${ayTanimi.ad}${buGun.length ? `, ${buGun.length} kayıt` : ''}`}
                onClick={() => setSecim({ gun })} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSecim({ gun }); } }}>
                <span class="takvim-gun-no">{gun}</span>
                {buGun.slice(0, 3).map((x) => (
                  <button key={x.o.kod} type="button" class={`takvim-olay ${grupSinifi(x.o.tur)}${x.ilk !== x.son ? ' uzun' : ''}${gun > x.ilk ? ' devam' : ''}${gun < x.son ? ' surer' : ''}${i % 7 === 0 ? ' hafta-basi' : ''}`}
                    title={`${x.o.ad} · ${turBul(x.o.tur).ad}`} onClick={(e) => { e.stopPropagation(); setSecim({ olay: x.o.kod }); }}>
                    {gun === x.ilk || (i % 7 === 0) ? x.o.ad : ' '}
                  </button>
                ))}
                {buGun.length > 3 && <span class="soluk kucuk">+{buGun.length - 3}</span>}
              </div>
            );
          })}
        </div>
      </div>
      {secim && (
        <aside class="takvim-cekmece" aria-label={'gun' in secim ? 'Gün' : 'Olay'}>
          <button class="dugme sade kucuk takvim-cekmece-kapat" aria-label="Kapat" onClick={() => setSecim(null)}>✕</button>
          {'olay' in secim
            ? <OlayKartiGoster istemci={istemci} evren={evren} z={z} kod={secim.olay} n={n} />
            : <GunPaneli key={`${yil}-${ay}-${secim.gun}`} istemci={istemci} evren={evren} z={z} yil={yil} ay={ay} gun={secim.gun}
                kayitlar={gunlere.filter((x) => secim.gun >= x.ilk && secim.gun <= x.son).map((x) => x.o)}
                ac={(kod) => setSecim({ olay: kod })} />}
        </aside>
      )}
    </div>
  );
}

function YilaGit({ z, sec }: { z: ZamanSeti; sec: (yil: number) => void }) {
  const [acik, setAcik] = useState(false);
  const [v, setV] = useState('');
  const [hata, setHata] = useState('');
  if (!acik) return <button class="dugme kucuk" onClick={() => setAcik(true)}>Yıla git…</button>;
  const tamam = () => {
    const c = tarihCoz(v, z.ana);
    if (!c?.eksen || c.eksen.enErken === null) { setHata('Yıl okunamadı.'); return; }
    sec(eksenYili(c.eksen.enErken, z.ana)); setAcik(false); setV(''); setHata('');
  };
  return (
    <form class="satir" onSubmit={(e) => { e.preventDefault(); tamam(); }}>
      <input class="girdi kucuk-girdi" aria-label="Yıl" placeholder="ör. 412" value={v} autoFocus onInput={(e) => setV((e.target as HTMLInputElement).value)}
        onKeyDown={(e) => { if (e.key === 'Escape') setAcik(false); }} />
      <button class="dugme kucuk">Git</button>
      {hata && <span class="hata kucuk">{hata}</span>}
    </form>
  );
}

function OlayKartiGoster({ istemci, evren, z, kod, n }: { istemci: Istemci; evren: string; z: ZamanSeti; kod: string; n: number }) {
  const [k, setK] = useState<OlayKarti | null>(null);
  const [hata, setHata] = useState('');
  useEffect(() => { setHata(''); istemci.iste('olayKarti', { evren, kod }).then(setK, (e) => setHata((e as Error).message)); }, [evren, kod, n]);
  if (hata) return <p class="hata">{hata}</p>;
  if (!k || k.kod !== kod) return <p class="soluk">Açılıyor…</p>;
  return (
    <div class="olay-karti">
      {k.tarih && <p class="soluk kucuk" title={tarihAciklamasi(k.tarih, z)}>{k.tarih.ifade}</p>}
      <h3>{k.ad}</h3>
      <p class="soluk kucuk">{turBul(k.tur).ad}{k.mekan ? ` · ${k.mekan.ad}` : ''}</p>
      {k.ozet && <p class="kucuk">{k.ozet}</p>}
      <h4 class="olay-karti-baslik">Katılanlar ve o günkü yaşları</h4>
      {!k.katilanlar.length && <p class="soluk kucuk">Katılan yazılmamış. Kaydın sayfasında “Olaydakiler” ilişkisiyle ekleyebilirsiniz.</p>}
      <ul class="olay-katilanlar">
        {k.katilanlar.map((x) => (
          <li key={x.kod}>
            <span class={`olay-rozet ${grupSinifi(x.tur)}`} aria-hidden="true">{x.ad.slice(0, 1)}</span>
            <a href={`#/e/${evren}/k/${x.kod}`}>{x.ad}</a>
            {x.rol && <span class="soluk kucuk">{x.rol}</span>}
            <span class="bosluk" />
            <span class={`kucuk ${x.yas ? '' : 'soluk'}`}>{x.tur === 'karakter' ? (yasKisa(x.yas) ?? 'doğumu yazılmamış') : ''}</span>
          </li>
        ))}
      </ul>
      {k.mekan && (<><h4 class="olay-karti-baslik">Mekân</h4><p><a href={`#/e/${evren}/k/${k.mekan.kod}`}>{k.mekan.ad}</a></p></>)}
      <div class="satir">
        <a class="dugme kucuk" href={`#/e/${evren}/cizelge`}>Zaman çizelgesinde göster</a>
        <a class="dugme kucuk" href={`#/e/${evren}/k/${k.kod}`}>Kaydı aç</a>
      </div>
    </div>
  );
}

function GunPaneli({ istemci, evren, z, yil, ay, gun, kayitlar, ac }: {
  istemci: Istemci; evren: string; z: ZamanSeti; yil: number; ay: number; gun: number; kayitlar: CizelgeOgesi[]; ac: (kod: string) => void;
}) {
  const t = z.ana;
  const tarih = gunIfadesi(t, yil, ay, gun)!;
  const [ad, setAd] = useState('');
  const [bitis, setBitis] = useState('');
  const [katilanlar, setKatilanlar] = useState<Secim[]>([]);
  const [mekan, setMekan] = useState<Secim | null>(null);
  const [not, setNot] = useState('');
  const [secici, setSecici] = useState<{ left: number; top: number } | null>(null);
  const [hata, setHata] = useState('');
  const [mesgul, setMesgul] = useState(false);
  const ileri = gun + 2 <= t.aylar![ay].gun ? gunIfadesi(t, yil, ay, gun + 2) : null;
  const ekle = async () => {
    if (!ad.trim()) { setHata('Olayın adını yazın.'); return; }
    setMesgul(true); setHata('');
    try {
      const { kod } = await istemci.iste('takvimOlayiEkle', { evren, olay: { ad, tarih, bitis, katilanlar: katilanlar.map((k) => k.kod), mekan: mekan?.kod ?? null, ozet: not } });
      ac(kod);
    } catch (e) { setHata((e as Error).message); } finally { setMesgul(false); }
  };
  return (
    <div class="gun-paneli">
      <p class="soluk kucuk">{tarih}</p>
      <h3>{kayitlar.length ? 'Bu tarihte' : 'Bu tarihte kayıt yok'}</h3>
      {kayitlar.length > 0 && (
        <ul class="gun-kayitlari">
          {kayitlar.map((o) => <li key={o.kod}><button class="baglanti-dugme" onClick={() => ac(o.kod)}>{o.ad}</button> <span class="soluk kucuk">{turBul(o.tur).ad}</span></li>)}
        </ul>
      )}
      <form class="yigin" onSubmit={(e) => { e.preventDefault(); void ekle(); }}>
        <label class="alan"><span class="alan-adi">Yeni olay</span>
          <input class="girdi" value={ad} placeholder="Olayın adı" onInput={(e) => setAd((e.target as HTMLInputElement).value)} />
        </label>
        <label class="alan"><span class="alan-adi">Bitiş tarihi (isteğe bağlı)</span>
          <input class="girdi" value={bitis} placeholder={ileri ? `ör. ${ileri}` : 'ör. bir sonraki ayın 3. günü'} onInput={(e) => setBitis((e.target as HTMLInputElement).value)} />
        </label>
        <div class="alan"><span class="alan-adi">Katılanlar</span>
          <div class="satir sarmal">
            {katilanlar.map((k) => <button type="button" key={k.kod} class="cip aktif" aria-label={`${k.ad}: çıkar`} onClick={() => setKatilanlar(katilanlar.filter((x) => x.kod !== k.kod))}>{k.ad} ×</button>)}
            <button type="button" class="cip" onClick={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setSecici({ left: r.left, top: r.bottom + 4 }); }}>+ katılan</button>
          </div>
        </div>
        <div class="alan"><span class="alan-adi">Mekân</span>
          <div><KayitSec istemci={istemci} evren={evren} secili={mekan} sec={setMekan} etiket="Mekân seçin…" /></div>
        </div>
        <label class="alan"><span class="alan-adi">Kısa not</span>
          <textarea class="girdi" rows={2} value={not} placeholder="İsteğe bağlı" onInput={(e) => setNot((e.target as HTMLTextAreaElement).value)} />
        </label>
        {hata && <p class="hata kucuk">{hata}</p>}
        <div class="satir"><button class="dugme ana" disabled={mesgul}>Olay ekle</button></div>
      </form>
      {secici && <BaglantiSecici istemci={istemci} evren={evren} sorgu="" konum={secici}
        sec={(s) => { if (!katilanlar.some((k) => k.kod === s.kod)) setKatilanlar([...katilanlar, { kod: s.kod, ad: s.ad }]); setSecici(null); }} kapat={() => setSecici(null)} />}
    </div>
  );
}
