// Dil tarihi, ses değişim kuralları, ad üretici (§15-4) ve dil yeterliliği. Türetilen ve üretilen adlar yalnızca
// gösterilir; yazar seçmeden hiçbir kaydın adı değişmez.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { AdBicimi, DilBilgisi, DilSozcugu, DilTanimi, DilYeterliligi, KisaKayit, KisiDili, SesIzi, TuretilenBicim, UretilenAd, YeterlilikDuzeyi } from '../veri/api';
import { geriAlinabilir } from './onay';

const hataYaz = (e: unknown) => (e as Error).message;
const bag = (evren: string, k: KisaKayit) => <a href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a>;
const SOZ_TURLERI: { kod: DilSozcugu['tur']; ad: string }[] = [{ kod: 'kok', ad: 'kök' }, { kod: 'onek', ad: 'ön ek' }, { kod: 'sonek', ad: 'son ek' }];
const DUZEY_ADLARI: Record<YeterlilikDuzeyi, string> = { yok: 'hiç', az: 'az', orta: 'orta', iyi: 'iyi', ana: 'ana dili' };
const BECERILER: { kod: 'konusma' | 'anlama' | 'okuma' | 'yazma'; ad: string }[] = [{ kod: 'konusma', ad: 'Konuşma' }, { kod: 'anlama', ad: 'Anlama' }, { kod: 'okuma', ad: 'Okuma' }, { kod: 'yazma', ad: 'Yazma' }];
const liste = (evren: string, l: KisaKayit[]) => l.map((k, i) => <>{i > 0 && ', '}{bag(evren, k)}</>);

function Iz({ iz }: { iz: SesIzi[] }) {
  if (!iz.length) return <span class="soluk kucuk">hiçbir kural değiştirmedi</span>;
  return <span class="soluk kucuk">{iz.map((x) => `${x.once} → ${x.sonra} (${x.sira + 1}. kural: ${x.kural})`).join(' · ')}</span>;
}

export function DilBolumu({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [b, setB] = useState<DilBilgisi | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [hece, setHece] = useState('');
  const [kural, setKural] = useState('');
  const [kuralNotu, setKuralNotu] = useState('');
  const [ornek, setOrnek] = useState({ kaynak: '', beklenen: '' });
  const [soz, setSoz] = useState<DilSozcugu>({ bicim: '', anlam: '', tur: 'kok' });
  const [sinif, setSinif] = useState({ ad: '', harfler: '' });
  const [dene, setDene] = useState('');
  const [deneme, setDeneme] = useState<{ sonuc: string; iz: SesIzi[] } | null>(null);
  useEffect(() => { istemci.iste('dil', { evren, kod }).then(setB, (x) => setHata(hataYaz(x))); }, [kod, surum]);
  if (!b) return hata ? <p class="hata kucuk">{hata}</p> : null;
  const t = b.tanim;
  const yaz = (yeni: Partial<DilTanimi>) => istemci.iste('dilYaz', { evren, kod, tanim: { ...t, ...yeni } }).then(() => { setHata(null); return true; }, (x) => { setHata(hataYaz(x)); return false; });
  const tasi = (i: number, d: number) => { const l = [...t.kurallar]; const [x] = l.splice(i, 1); l.splice(i + d, 0, x); void yaz({ kurallar: l }); };
  const hataOf = (i: number) => b.kuralHatalari.find((x) => x.sira === i)?.hata;
  return (
    <section class="surecler dil-bolumu" aria-label="Dil tarihi">
      <h2>Ses ve dil tarihi</h2>
      {(b.kaynaklar.length > 0 || b.turevler.length > 0) && (
        <p class="kucuk">{b.kaynaklar.length > 0 && <>Türediği ya da aldığı dil: {liste(evren, b.kaynaklar)}. </>}{b.turevler.length > 0 && <>Ondan türeyen: {liste(evren, b.turevler)}.</>}</p>
      )}
      {!b.kaynaklar.length && <p class="soluk kucuk">Bu dilin daha eski bir dönemi ya da kaynağı varsa İlişkiler bölümünden “Türediği ya da aldığı dil” ilişkisini ekleyin. Aşağıdaki kurallar o dilden gelen sözcüklere uygulanır.</p>}
      {hata && <p class="hata kucuk">{hata}</p>}

      <h3>Ses paleti</h3>
      <p class="kucuk">{t.heceler.length ? t.heceler.map((h) => (
        <span class="rozet" key={h}>{h} <button class="dugme sade kucuk" aria-label={`${h} hecesini kaldır`} onClick={() => yaz({ heceler: t.heceler.filter((x) => x !== h) })}>×</button> </span>
      )) : <span class="soluk">Hece yok.</span>}</p>
      <form class="satir" onSubmit={(e) => { e.preventDefault(); const l = hece.split(/[\s,]+/).filter(Boolean); if (l.length) void yaz({ heceler: [...t.heceler, ...l] }).then((ok) => ok && setHece('')); }}>
        <input class="girdi" lang="tr" aria-label="Heceler" placeholder="ka, ven, dor…" value={hece} onInput={(e) => setHece((e.target as HTMLInputElement).value)} />
        <button class="dugme kucuk" type="submit">Hece ekle</button>
      </form>

      <h3>Ses sınıfları</h3>
      <p class="soluk kucuk">Hazır sınıflar: V ünlüleri, C ünsüzleri gösterir. Kurallarda büyük harf bir sınıfı, [ptk] adsız bir sınıfı, # sözcük sınırını, ∅ boşluğu gösterir.</p>
      {t.siniflar.length > 0 && <ul class="toplanan-listesi">{t.siniflar.map((s, i) => (
        <li key={s.ad}>{s.ad} = {s.harfler} <button class="dugme sade kucuk" onClick={() => void geriAlinabilir('Ses sınıfı kaldırıldı.', () => yaz({ siniflar: t.siniflar.filter((_, j) => j !== i) }), () => yaz({ siniflar: t.siniflar }))}>Kaldır</button></li>
      ))}</ul>}
      <form class="satir" onSubmit={(e) => { e.preventDefault(); void yaz({ siniflar: [...t.siniflar.filter((s) => s.ad !== sinif.ad.trim()), { ad: sinif.ad.trim(), harfler: sinif.harfler }] }).then((ok) => ok && setSinif({ ad: '', harfler: '' })); }}>
        <input class="girdi" style="width:50px" aria-label="Sınıfın harfi" placeholder="L" value={sinif.ad} onInput={(e) => setSinif({ ...sinif, ad: (e.target as HTMLInputElement).value })} />
        <input class="girdi" lang="tr" aria-label="Sınıftaki sesler" placeholder="l r n" value={sinif.harfler} onInput={(e) => setSinif({ ...sinif, harfler: (e.target as HTMLInputElement).value })} />
        <button class="dugme kucuk" type="submit" disabled={!sinif.ad.trim() || !sinif.harfler.trim()}>Sınıf ekle</button>
      </form>

      <h3>Ses değişim kuralları</h3>
      <p class="soluk kucuk">Kurallar sırayla uygulanır{b.kaynaklar.length ? ` ve şu dillerden gelen sözcükleri değiştirir: ${b.kaynaklar.map((k) => k.ad).join(', ')}` : ''}. Yazılışı: a → b / sol_sağ.</p>
      {t.kurallar.length > 0 && <ol class="toplanan-listesi">{t.kurallar.map((k, i) => (
        <li key={i}><code>{k.kural}</code>{k.not && <span class="soluk kucuk"> · {k.not}</span>}
          {hataOf(i) && <span class="hata kucuk"> · {hataOf(i)}</span>}{' '}
          <button class="dugme sade kucuk" disabled={i === 0} aria-label={`${i + 1}. kuralı yukarı al`} onClick={() => tasi(i, -1)}>↑</button>
          <button class="dugme sade kucuk" disabled={i === t.kurallar.length - 1} aria-label={`${i + 1}. kuralı aşağı al`} onClick={() => tasi(i, 1)}>↓</button>
          <button class="dugme sade kucuk" onClick={() => void geriAlinabilir('Kural kaldırıldı.', () => yaz({ kurallar: t.kurallar.filter((_, j) => j !== i) }), () => yaz({ kurallar: t.kurallar }))}>Kaldır</button></li>
      ))}</ol>}
      <form class="satir" onSubmit={(e) => { e.preventDefault(); void yaz({ kurallar: [...t.kurallar, { kural, not: kuralNotu }] }).then((ok) => { if (ok) { setKural(''); setKuralNotu(''); } }); }}>
        <input class="girdi" style="width:180px" lang="tr" aria-label="Kural" placeholder="k → h / #_" value={kural} onInput={(e) => setKural((e.target as HTMLInputElement).value)} />
        <input class="girdi" style="flex:1;min-width:120px" lang="tr" aria-label="Kuralın notu" placeholder="Not (isteğe bağlı)" value={kuralNotu} onInput={(e) => setKuralNotu((e.target as HTMLInputElement).value)} />
        <button class="dugme kucuk" type="submit" disabled={!kural.trim()}>Kural ekle</button>
      </form>
      <form class="satir" onSubmit={(e) => { e.preventDefault(); istemci.iste('sesDene', { evren, dil: kod, bicim: dene }).then(setDeneme, (x) => setHata(hataYaz(x))); }}>
        <input class="girdi" lang="tr" aria-label="Denenecek sözcük" placeholder="Bir sözcük deneyin" value={dene} onInput={(e) => setDene((e.target as HTMLInputElement).value)} />
        <button class="dugme kucuk" type="submit" disabled={!dene.trim()}>Kuralları uygula</button>
        {deneme && <span class="kucuk"><strong>{deneme.sonuc}</strong> <Iz iz={deneme.iz} /></span>}
      </form>

      <h3>Örnekler</h3>
      <p class="soluk kucuk">Örnekler, kuralların beklendiği gibi işleyip işlemediğini gösterir. Tutmayan örnek işaretlenir; kuralı siz düzeltirsiniz.</p>
      {b.ornekler.length > 0 && <ul class="toplanan-listesi">{b.ornekler.map((o, i) => (
        <li key={i}>{o.kaynak} → <strong>{o.sonuc}</strong>{o.tutuyor === false && <span class="hata kucuk"> · “{o.beklenen}” bekleniyordu, tutmuyor</span>}{o.tutuyor === true && <span class="kucuk"> · tutuyor</span>}
          <div><Iz iz={o.iz} /></div>
          <button class="dugme sade kucuk" onClick={() => void geriAlinabilir('Örnek kaldırıldı.', () => yaz({ ornekler: t.ornekler.filter((_, j) => j !== i) }), () => yaz({ ornekler: t.ornekler }))}>Kaldır</button></li>
      ))}</ul>}
      <form class="satir" onSubmit={(e) => { e.preventDefault(); void yaz({ ornekler: [...t.ornekler, ornek] }).then((ok) => ok && setOrnek({ kaynak: '', beklenen: '' })); }}>
        <input class="girdi" lang="tr" aria-label="Örneğin kaynak biçimi" placeholder="kaynak biçim" value={ornek.kaynak} onInput={(e) => setOrnek({ ...ornek, kaynak: (e.target as HTMLInputElement).value })} />
        <input class="girdi" lang="tr" aria-label="Beklenen biçim" placeholder="beklenen biçim" value={ornek.beklenen} onInput={(e) => setOrnek({ ...ornek, beklenen: (e.target as HTMLInputElement).value })} />
        <button class="dugme kucuk" type="submit" disabled={!ornek.kaynak.trim()}>Örnek ekle</button>
      </form>

      <h3>Sözlük</h3>
      {t.sozluk.length > 0 && <ul class="toplanan-listesi">{t.sozluk.map((s, i) => (
        <li key={i}><strong>{s.bicim}</strong> <span class="soluk kucuk">({SOZ_TURLERI.find((x) => x.kod === s.tur)!.ad})</span> {s.anlam} <button class="dugme sade kucuk" onClick={() => yaz({ sozluk: t.sozluk.filter((_, j) => j !== i) })}>Kaldır</button></li>
      ))}</ul>}
      <form class="satir" onSubmit={(e) => { e.preventDefault(); void yaz({ sozluk: [...t.sozluk, soz] }).then((ok) => ok && setSoz({ bicim: '', anlam: '', tur: soz.tur })); }}>
        <input class="girdi" style="width:120px" lang="tr" aria-label="Sözcük" placeholder="kar" value={soz.bicim} onInput={(e) => setSoz({ ...soz, bicim: (e.target as HTMLInputElement).value })} />
        <select class="girdi kucuk-secim" aria-label="Sözcüğün türü" value={soz.tur} onChange={(e) => setSoz({ ...soz, tur: (e.target as HTMLSelectElement).value as DilSozcugu['tur'] })}>
          {SOZ_TURLERI.map((x) => <option value={x.kod}>{x.ad}</option>)}
        </select>
        <input class="girdi" style="flex:1;min-width:120px" lang="tr" aria-label="Anlamı" placeholder="anlamı" value={soz.anlam} onInput={(e) => setSoz({ ...soz, anlam: (e.target as HTMLInputElement).value })} />
        <button class="dugme kucuk" type="submit" disabled={!soz.bicim.trim()}>Sözcük ekle</button>
      </form>

      <AdUretici istemci={istemci} evren={evren} dil={kod} />

      {b.bilenler.length > 0 && (
        <>
          <h3>Bu dili bilenler</h3>
          <ul class="toplanan-listesi">{b.bilenler.map((x) => <li key={x.iliski}>{bag(evren, x.kisi)} <span class="soluk kucuk">· {yeterlilikYazisi(x.yeterlilik)}</span></li>)}</ul>
        </>
      )}
    </section>
  );
}

const yeterlilikYazisi = (y: DilYeterliligi | null) => !y ? 'yeterliliği yazılmamış'
  : BECERILER.map((b) => `${b.ad.toLocaleLowerCase('tr-TR')}: ${y[b.kod] ? DUZEY_ADLARI[y[b.kod]!] : 'bilinmiyor'}`).join(', ') + (y.not ? ` · ${y.not}` : '');

function AdUretici({ istemci, evren, dil }: { istemci: Istemci; evren: string; dil: string }) {
  const [kip, setKip] = useState<'hece' | 'bicim'>('hece');
  const [enAz, setEnAz] = useState(2);
  const [enCok, setEnCok] = useState(3);
  const [l, setL] = useState<UretilenAd[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  return (
    <>
      <h3>Ad üretici</h3>
      <form class="satir" onSubmit={(e) => { e.preventDefault(); istemci.iste('adUret', { evren, dil, kip, enAz, enCok, adet: 12 }).then((x) => { setL(x); setHata(null); }, (x) => { setL(null); setHata(hataYaz(x)); }); }}>
        <select class="girdi kucuk-secim" aria-label="Neyden üretilsin" value={kip} onChange={(e) => setKip((e.target as HTMLSelectElement).value as 'hece' | 'bicim')}>
          <option value="hece">Ses paletinden</option>
          <option value="bicim">Sözlükteki kök ve eklerden</option>
        </select>
        {kip === 'hece' && (
          <>
            <label class="soluk kucuk" for={`en-az-${dil}`}>Hece</label>
            <input id={`en-az-${dil}`} class="girdi" style="width:55px" type="number" min={1} max={6} value={enAz} onInput={(e) => setEnAz(Number((e.target as HTMLInputElement).value))} />
            <span class="soluk kucuk">–</span>
            <input class="girdi" style="width:55px" type="number" min={1} max={6} aria-label="En çok hece" value={enCok} onInput={(e) => setEnCok(Number((e.target as HTMLInputElement).value))} />
          </>
        )}
        <button class="dugme kucuk" type="submit">Ad üret</button>
      </form>
      {hata && <p class="hata kucuk">{hata}</p>}
      {l && <ul class="uretilen-adlar">{l.map((x) => (
        <li key={x.ad}><strong>{x.ad}</strong>{x.parcalar.some((p) => p.anlam) && <span class="soluk kucuk"> · {x.parcalar.map((p) => `${p.bicim} (${p.anlam || '?'})`).join(' + ')}</span>}
          {x.varOlan && <span class="soluk kucuk"> · bu adla bir kayıt var</span>}</li>
      ))}</ul>}
    </>
  );
}

// ---------- Kaydın dillerdeki biçimleri ----------

export function AdBicimleriBolumu({ istemci, evren, kod, ad, surum }: { istemci: Istemci; evren: string; kod: string; ad: string; surum: number }) {
  const [diller, setDiller] = useState<KisaKayit[]>([]);
  const [bicimler, setBicimler] = useState<AdBicimi[]>([]);
  const [kaynak, setKaynak] = useState('');
  const [bicim, setBicim] = useState(ad);
  const [turetilen, setTuretilen] = useState<TuretilenBicim[] | null>(null);
  const [elle, setElle] = useState({ dil: '', bicim: '' });
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => {
    istemci.iste('kayitlar', { evren }).then((l) => setDiller(l.filter((k) => k.tur === 'dil').map((k) => ({ kod: k.kod, ad: k.ad, tur: k.tur }))), () => {});
    istemci.iste('adBicimleri', { evren, kod }).then(setBicimler, () => {});
  }, [kod, surum]);
  useEffect(() => { setBicim(ad); }, [ad]);
  if (!diller.length) return null;
  const turet = () => istemci.iste('adTuret', { evren, dil: kaynak, bicim, kayit: kod }).then((x) => { setTuretilen(x); setHata(null); }, (x) => setHata(hataYaz(x)));
  const bagla = (dil: string, b: string, kd: string | null, kb: string | null) =>
    istemci.iste('adBicimiYaz', { evren, kod, dil, bicim: b, kaynakDil: kd, kaynakBicim: kb }).then(() => { setHata(null); if (turetilen) void turet(); }, (x) => setHata(hataYaz(x)));
  return (
    <section class="surecler" aria-label="Adın dillerdeki biçimleri">
      <details open={bicimler.length > 0}>
        <summary><h2 style="display:inline">Adın dillerdeki biçimleri</h2></summary>
        {bicimler.length > 0 && <ul class="toplanan-listesi">{bicimler.map((x) => (
          <li key={x.dil.kod}>{bag(evren, x.dil)}: <strong>{x.bicim}</strong>{x.turetildi && <span class="soluk kucuk"> · {x.turetildi.kaynakDil.ad} “{x.turetildi.kaynakBicim}” biçiminden türetildi</span>}{' '}
            <button class="dugme sade kucuk" onClick={() => void geriAlinabilir('Ad biçimi kaldırıldı.', () => istemci.iste('adBicimiYaz', { evren, kod, dil: x.dil.kod, bicim: null }), () => istemci.iste('adBicimiYaz', { evren, kod, dil: x.dil.kod, bicim: x.bicim, kaynakDil: x.turetildi?.kaynakDil.kod ?? null, kaynakBicim: x.turetildi?.kaynakBicim ?? null })).catch((e) => setHata(hataYaz(e)))}>Kaldır</button>
            <button class="dugme sade kucuk" onClick={() => istemci.iste('kayitListe', { evren, kod, liste: 'lakap', ekle: x.bicim }).then(() => setHata(null), (e) => setHata(hataYaz(e)))}>Lakaplara ekle</button></li>
        ))}</ul>}
        <form class="satir" onSubmit={(e) => { e.preventDefault(); void turet(); }}>
          <select class="girdi kucuk-secim" aria-label="Kaynak dil" value={kaynak} onChange={(e) => setKaynak((e.target as HTMLSelectElement).value)}>
            <option value="">Kaynak dili seçin</option>
            {diller.map((d) => <option value={d.kod}>{d.ad}</option>)}
          </select>
          <input class="girdi" lang="tr" aria-label="Kaynak biçim" value={bicim} onInput={(e) => setBicim((e.target as HTMLInputElement).value)} />
          <button class="dugme kucuk" type="submit" disabled={!kaynak || !bicim.trim()}>Türet</button>
        </form>
        {turetilen && (!turetilen.length ? <p class="soluk kucuk">Bu dilden türeyen bir dil kaydı yok.</p> : (
          <ul class="toplanan-listesi">{turetilen.map((x) => (
            <li key={x.dil.kod}>{bag(evren, x.dil)}: <strong>{x.bicim}</strong> <span class="soluk kucuk">· {x.yol.map((y) => y.ad).join(' → ')}</span>
              {x.hata && <span class="hata kucuk"> · {x.hata}</span>}
              <div><Iz iz={x.iz} /></div>
              {x.kayitli === x.bicim ? <span class="kucuk">Bu kaydın biçimi olarak bağlı.</span>
                : <button class="dugme sade kucuk" onClick={() => bagla(x.dil.kod, x.bicim, x.yol[x.yol.length - 2].kod, x.kaynakBicim)}>{x.kayitli ? `Bağlı biçimi (“${x.kayitli}”) bununla değiştir` : 'Bu kaydın biçimi olarak bağla'}</button>}
            </li>
          ))}</ul>
        ))}
        <form class="satir" onSubmit={(e) => { e.preventDefault(); void bagla(elle.dil, elle.bicim, null, null).then(() => setElle({ dil: '', bicim: '' })); }}>
          <select class="girdi kucuk-secim" aria-label="Elle biçim için dil" value={elle.dil} onChange={(e) => setElle({ ...elle, dil: (e.target as HTMLSelectElement).value })}>
            <option value="">Dil seçin</option>
            {diller.map((d) => <option value={d.kod}>{d.ad}</option>)}
          </select>
          <input class="girdi" lang="tr" aria-label="Elle biçim" placeholder="O dildeki biçimi" value={elle.bicim} onInput={(e) => setElle({ ...elle, bicim: (e.target as HTMLInputElement).value })} />
          <button class="dugme kucuk" type="submit" disabled={!elle.dil || !elle.bicim.trim()}>Elle ekle</button>
        </form>
        {hata && <p class="hata kucuk">{hata}</p>}
      </details>
    </section>
  );
}

// ---------- Dil yeterliliği ----------

export function KisiDilleriBolumu({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [l, setL] = useState<KisiDili[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { istemci.iste('kisiDilleri', { evren, kod }).then(setL, () => {}); }, [kod, surum]);
  if (!l.length) return null;
  const yaz = (x: KisiDili, alan: keyof DilYeterliligi, v: string) => {
    const y: DilYeterliligi = { konusma: null, anlama: null, okuma: null, yazma: null, not: '', ...x.yeterlilik };
    const yeni = { ...y, [alan]: alan === 'not' ? v : (v || null) } as DilYeterliligi;
    istemci.iste('dilYeterliligiYaz', { evren, iliski: x.iliski, deger: yeni }).then(() => setHata(null), (e) => setHata(hataYaz(e)));
  };
  return (
    <section class="surecler" aria-label="Bildiği diller">
      <h2>Bildiği diller</h2>
      <p class="soluk kucuk">Dil bilgisi tek bir ölçüyle verilmez. Konuşma, anlama, okuma ve yazma ayrı ayrı tutulur. Boş bırakılan beceri bilinmiyor sayılır.</p>
      <ul class="toplanan-listesi">{l.map((x) => (
        <li key={x.iliski}>{bag(evren, x.dil)}
          <div class="satir">
            {BECERILER.map((b) => (
              <label class="kucuk" key={b.kod}>{b.ad}{' '}
                <select class="girdi kucuk-secim" aria-label={`${x.dil.ad} ${b.ad.toLocaleLowerCase('tr-TR')}`} value={x.yeterlilik?.[b.kod] ?? ''} onChange={(e) => yaz(x, b.kod, (e.target as HTMLSelectElement).value)}>
                  <option value="">bilinmiyor</option>
                  {(Object.keys(DUZEY_ADLARI) as YeterlilikDuzeyi[]).map((d) => <option value={d}>{DUZEY_ADLARI[d]}</option>)}
                </select>
              </label>
            ))}
            <input class="girdi" style="flex:1;min-width:120px" lang="tr" aria-label={`${x.dil.ad} notu`} placeholder="Aksan, öğrendiği yer…" value={x.yeterlilik?.not ?? ''} onChange={(e) => yaz(x, 'not', (e.target as HTMLInputElement).value)} />
          </div>
        </li>
      ))}</ul>
      {hata && <p class="hata kucuk">{hata}</p>}
    </section>
  );
}
