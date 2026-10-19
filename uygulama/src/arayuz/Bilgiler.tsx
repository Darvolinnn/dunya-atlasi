// Sorular, sırlar ve kimin neyi bildiği (§3.6). Bir kaydın sayfasında iki yönden görünür: o kayıt hakkındaki
// sorular (kim neye inanıyor) ve kaydın kendisinin bildikleri (karakter, grup ya da eserin okuru).
// Ayrıca kayıt ve ilişkilerin bilgi katmanı (evrenin gerçeği · gizli gerçek · birinin inancı) ve görünümlerdeki
// bakış açısı seçicisi buradadır.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { AnBilgisi, BilgiAlani, BilgiSatiri, DairInanc, SanilanDurum, EserYapisi, GorunurlukBilgisi, IddiaOzeti, IddiaSatiri, Kayit, KisaKayit, SinirGirdisi } from '../veri/api';
import { BILGI_KAYNAKLARI, INANCLAR, SANILAN_DURUMLAR, type Inanc } from '../alan/bilgi';
import { KararRozeti, KararSecici } from './ortak';
import { KayitSec, SatirGirdisi } from './KayitBolumleri';
import { SinirAlani, SinirGirdi, sinirYazi, useYukle } from './Anlati';
import type { Secim } from './BaglantiSecici';
import { IddiaDosyasiBolumu } from './IddiaDosyasi';

const hataYaz = (e: unknown) => (e as Error).message;
const bag = (evren: string, k: { kod: string; ad: string }) => <a href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a>;
/** Bir şey bilebilecek kayıt türleri; okur için eser. Diğer kayıtlarda bölüm yalnızca bilgisi varsa görünür. */
const BILEN_TURLERI = new Set(['karakter', 'topluluk', 'siyasi', 'kafile', 'makam', 'eser']);

// ---------- Kayıt sayfası bölümü ----------
export function BilinenlerBolumu({ istemci, evren, kayit }: { istemci: Istemci; evren: string; kayit: Kayit }) {
  const [iddialar] = useYukle<IddiaSatiri[]>(istemci, evren, () => istemci.iste('kayitIddialari', { evren, kod: kayit.kod }), [kayit.kod]);
  const [bildikleri] = useYukle<BilgiSatiri[]>(istemci, evren, () => istemci.iste('bilenBilgileri', { evren, kod: kayit.kod }), [kayit.kod]);
  const [soruEkle, setSoruEkle] = useState(false);
  const [bilgiEkle, setBilgiEkle] = useState(false);
  if (!iddialar || !bildikleri) return null;
  const okur = kayit.tur === 'eser';
  const bilenBolumu = bildikleri.length > 0 || BILEN_TURLERI.has(kayit.tur);
  return (
    <>
      <section class="bilinenler" aria-label="Sorular ve sırlar">
        <div class="satir">
          <h2>Sorular ve sırlar</h2>
          <span class="bosluk" />
          {!soruEkle && <button class="dugme kucuk" onClick={() => setSoruEkle(true)}>Soru ekle</button>}
        </div>
        {!iddialar.length && !soruEkle && <p class="soluk kucuk">Bu kayıt hakkında kimin neyi bildiğini izlemek için bir soru yazın (“Kralı kim öldürdü?”), olası cevaplarını ekleyin. Gerçeği belirlemek zorunda değilsiniz.</p>}
        {soruEkle && <IddiaFormu istemci={istemci} evren={evren} konu={kayit.kod} kapat={() => setSoruEkle(false)} />}
        {iddialar.map((i) => <IddiaKarti key={i.kod} istemci={istemci} evren={evren} iddia={i} />)}
      </section>
      {bilenBolumu && (
        <section class="bilinenler" aria-label={okur ? 'Okurun öğrendikleri' : 'Bildikleri'}>
          <div class="satir">
            <h2>{okur ? 'Okurun öğrendikleri' : 'Bildikleri ve inandıkları'}</h2>
            <span class="bosluk" />
            {!bilgiEkle && <button class="dugme kucuk" onClick={() => setBilgiEkle(true)}>{okur ? 'Okura açıklanan ekle' : 'Bilgi ekle'}</button>}
          </div>
          {!bildikleri.length && !bilgiEkle && <p class="soluk kucuk">{okur
            ? 'Okurun hangi sırrı hangi sahnede öğrendiğini buraya yazın; okurun zamanı okuma sırasıdır.'
            : 'Bu kaydın hangi soruya nasıl inandığını, ne zaman ve nereden öğrendiğini yazın. Sorular, konusu olan kaydın sayfasında açılır.'}</p>}
          {bilgiEkle && <BilgiFormu istemci={istemci} evren={evren} bilen={{ kod: kayit.kod, ad: kayit.ad, tur: kayit.tur }} kapat={() => setBilgiEkle(false)} />}
          {bildikleri.length > 0 && (
            <ul class="bilgi-listesi">
              {bildikleri.map((b) => <BilgiOgesi key={b.kod} istemci={istemci} evren={evren} b={b} soruGoster />)}
            </ul>
          )}
        </section>
      )}
    </>
  );
}

function IddiaFormu({ istemci, evren, konu, kapat }: { istemci: Istemci; evren: string; konu: string; kapat: () => void }) {
  const [soru, setSoru] = useState('');
  const [cevaplar, setCevaplar] = useState(['', '']);
  const [gercek, setGercek] = useState<number | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const dolu = cevaplar.map((c, i) => ({ c: c.trim(), i })).filter((x) => x.c);
  const kaydet = async (e: Event) => {
    e.preventDefault();
    try {
      const g = gercek === null ? null : dolu.findIndex((x) => x.i === gercek);
      await istemci.iste('iddiaEkle', { evren, konu, soru, secenekler: dolu.map((x) => x.c), gercek: g === -1 ? null : g });
      kapat();
    } catch (err) { setHata(hataYaz(err)); }
  };
  return (
    <form class="kart iliski-formu" onSubmit={kaydet}>
      <input class="girdi" aria-label="Soru" placeholder="Soru (ör. Kralı kim öldürdü?)" lang="tr" value={soru} onInput={(e) => setSoru((e.target as HTMLInputElement).value)} />
      <p class="soluk kucuk">“Ölüm nedeni”, “fail” ve “kasıt” ayrı sorulardır. Olası cevaplar (en az bir); gerçek olanı işaretleyebilir ya da açık bırakabilirsiniz.</p>
      {cevaplar.map((c, i) => (
        <div class="satir" key={i}>
          <input class="girdi" style="flex:1;min-width:160px" aria-label={`Cevap ${i + 1}`} placeholder={`Cevap ${i + 1}`} lang="tr" value={c}
            onInput={(e) => setCevaplar(cevaplar.map((x, j) => (j === i ? (e.target as HTMLInputElement).value : x)))} />
          <label class="satir kucuk"><input type="radio" name="gercek" checked={gercek === i} onChange={() => setGercek(i)} /> Gerçek bu</label>
        </div>
      ))}
      <div class="satir">
        <button type="button" class="dugme sade kucuk" onClick={() => setCevaplar([...cevaplar, ''])}>Cevap ekle</button>
        <label class="satir kucuk"><input type="radio" name="gercek" checked={gercek === null} onChange={() => setGercek(null)} /> Gerçek belirlenmedi</label>
      </div>
      {hata && <p class="hata kucuk">{hata}</p>}
      <div class="satir">
        <button class="dugme ana" type="submit" disabled={!soru.trim() || !dolu.length}>Ekle</button>
        <button class="dugme" type="button" onClick={kapat}>Vazgeç</button>
      </div>
    </form>
  );
}

function IddiaKarti({ istemci, evren, iddia }: { istemci: Istemci; evren: string; iddia: IddiaSatiri }) {
  const [duzenle, setDuzenle] = useState(false);
  const [ekle, setEkle] = useState<'kisi' | 'okur' | null>(null);
  const [dosya, setDosya] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const degistir = (alan: 'soru' | 'secenekler' | 'gercek' | 'karar', deger: unknown) =>
    istemci.iste('iddiaDegistir', { evren, kod: iddia.kod, alan, deger }).then(() => setHata(null), (e) => { setHata(hataYaz(e)); throw e; });
  const kisiler = iddia.bilgiler.filter((b) => !b.okur), okurlar = iddia.bilgiler.filter((b) => b.okur);
  return (
    <div class={`kart iddia karar-satir-${iddia.karar}`}>
      <div class="satir">
        <strong>{iddia.soru}</strong> <KararRozeti karar={iddia.karar} />
        <span class="bosluk" />
        <button class="dugme sade kucuk" aria-expanded={dosya} onClick={() => setDosya(!dosya)}>{dosya ? 'Dosyayı kapat' : 'İddia dosyası'}</button>
        <button class="dugme sade kucuk" aria-expanded={duzenle} onClick={() => setDuzenle(!duzenle)}>{duzenle ? 'Kapat' : 'Düzenle'}</button>
      </div>
      <div class="satir kucuk">
        <span class="soluk">Cevaplar:</span>
        {iddia.secenekler.map((s) => <span key={s.kod} class={`rozet ${s.kod === iddia.gercek ? 'gercek' : ''}`}>{s.metin}{s.kod === iddia.gercek ? ' · gerçek' : ''}</span>)}
        {!iddia.gercek && <span class="soluk">Gerçek belirlenmedi; kimse “yanlış biliyor” sayılmaz.</span>}
      </div>
      {duzenle && (
        <div class="iliski-duzenle">
          <SatirGirdisi etiket="Soru" deger={iddia.soru} kaydet={(v) => degistir('soru', v)} />
          <SecenekDuzenleyici iddia={iddia} kaydet={(l) => degistir('secenekler', l)} />
          <label class="alan"><span class="alan-adi">Gerçek</span>
            <select class="girdi" value={iddia.gercek ?? ''} onChange={(e) => degistir('gercek', (e.target as HTMLSelectElement).value || null).catch(() => {})}>
              <option value="">Belirlenmedi</option>
              {iddia.secenekler.map((s) => <option value={s.kod}>{s.metin}</option>)}
            </select></label>
          <label class="alan"><span class="alan-adi">Karar durumu</span>
            <KararSecici etiket="Soru" karar={iddia.karar} onDegis={(k) => degistir('karar', k).catch(() => {})} /></label>
          <button class="dugme tehlikeli kucuk" onClick={() => istemci.iste('iddiaSil', { evren, kod: iddia.kod })}>Soruyu kaldır</button>
          {hata && <p class="hata kucuk">{hata}</p>}
        </div>
      )}
      {dosya && <IddiaDosyasiBolumu istemci={istemci} evren={evren} iddia={iddia.kod} />}
      {kisiler.length > 0 && <ul class="bilgi-listesi">{kisiler.map((b) => <BilgiOgesi key={b.kod} istemci={istemci} evren={evren} b={b} />)}</ul>}
      {okurlar.length > 0 && (
        <>
          <span class="soluk kucuk">Okura açıklanma</span>
          <ul class="bilgi-listesi">{okurlar.map((b) => <BilgiOgesi key={b.kod} istemci={istemci} evren={evren} b={b} />)}</ul>
        </>
      )}
      <DairInanclar istemci={istemci} evren={evren} iddia={iddia.kod} />
      {ekle && <BilgiFormu istemci={istemci} evren={evren} iddia={iddia} okur={ekle === 'okur'} kapat={() => setEkle(null)} />}
      {!ekle && (
        <div class="satir">
          <button class="dugme sade kucuk" onClick={() => setEkle('kisi')}>Kim ne biliyor? Ekle</button>
          <button class="dugme sade kucuk" onClick={() => setEkle('okur')}>Okura açıklanmasını ekle</button>
        </div>
      )}
    </div>
  );
}

/** Başkasının bilgisine dair inanç (F05): yalnızca yazar açınca görünür. */
function DairInanclar({ istemci, evren, iddia }: { istemci: Istemci; evren: string; iddia: string }) {
  const [l] = useYukle<DairInanc[]>(istemci, evren, () => istemci.iste('dairInanclar', { evren, iddia }), [iddia]);
  const [acik, setAcik] = useState(false);
  const [sanan, setSanan] = useState<Secim | null>(null);
  const [hakkinda, setHakkinda] = useState<Secim | null>(null);
  const [sanilan, setSanilan] = useState<SanilanDurum>('bilmiyor');
  const [tarih, setTarih] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  if (!l) return null;
  const ekle = () => {
    if (!sanan || !hakkinda) { setHata('İki kişiyi de seçin.'); return; }
    istemci.iste('dairInancYaz', { evren, iddia, tanim: { sanan: sanan.kod, hakkinda: hakkinda.kod, sanilan, tarih, aciklama } })
      .then(() => { setTarih(''); setAciklama(''); setHata(null); setAcik(false); }, (x) => setHata(hataYaz(x)));
  };
  const ad = (k: SanilanDurum) => SANILAN_DURUMLAR.find((x) => x.kod === k)!.ad;
  return (
    <div class="dair-inanclar">
      {l.length > 0 && <span class="soluk kucuk">Başkasının bildiğine dair inançlar</span>}
      {l.length > 0 && (
        <ul class="bilgi-listesi">
          {l.map((d) => (
            <li key={d.kod} class={d.uyum === 'yanlis' ? 'dair-yanilgi' : ''}>
              <strong>{d.sanan.ad}</strong>, {d.hakkinda.ad} için “{ad(d.tanim.sanilan)}” sanıyor{d.tanim.tarih ? ` (${d.tanim.tarih})` : ''}.
              <div class="kucuk">{d.uyum === 'dogru' ? `Doğru sanıyor: ${d.gercekDurum?.toLocaleLowerCase('tr-TR')}.` : d.uyum === 'yanlis' ? `Yanılıyor: kayıtlara göre ${d.gercekDurum?.toLocaleLowerCase('tr-TR')}.` : d.neden}</div>
              {d.tanim.aciklama && <div class="kucuk soluk">{d.tanim.aciklama}</div>}
              <button class="dugme sade kucuk" onClick={() => istemci.iste('dairInancSil', { evren, kod: d.kod }).catch((x) => setHata(hataYaz(x)))}>Kaldır</button>
            </li>
          ))}
        </ul>
      )}
      {acik ? (
        <div class="iliski-duzenle">
          <div class="satir kucuk">
            <KayitSec istemci={istemci} evren={evren} secili={sanan} etiket="Kim sanıyor?" sec={setSanan} />
            <KayitSec istemci={istemci} evren={evren} secili={hakkinda} etiket="Kimin hakkında?" sec={setHakkinda} />
            <select class="girdi kucuk-secim" aria-label="Ne sanıyor" value={sanilan} onChange={(e) => setSanilan((e.target as HTMLSelectElement).value as SanilanDurum)}>
              {SANILAN_DURUMLAR.map((x) => <option value={x.kod}>{x.ad} sanıyor</option>)}
            </select>
            <input class="girdi" style="max-width:140px" aria-label="Tarih" placeholder="Tarih (isteğe bağlı)" value={tarih} onInput={(e) => setTarih((e.target as HTMLInputElement).value)} />
          </div>
          <div class="satir">
            <input class="girdi" style="flex:1;min-width:160px" lang="tr" aria-label="Açıklama" placeholder="Açıklama (isteğe bağlı)" value={aciklama} onInput={(e) => setAciklama((e.target as HTMLInputElement).value)} />
            <button class="dugme kucuk" onClick={ekle}>Ekle</button>
            <button class="dugme sade kucuk" onClick={() => { setAcik(false); setHata(null); }}>Vazgeç</button>
          </div>
        </div>
      ) : <button class="dugme sade kucuk" onClick={() => setAcik(true)}>Birinin, başkasının bunu bildiğine dair inancını ekle</button>}
      {hata && <p class="hata kucuk">{hata}</p>}
    </div>
  );
}

function SecenekDuzenleyici({ iddia, kaydet }: { iddia: IddiaSatiri; kaydet: (l: { kod?: string; metin: string }[]) => Promise<unknown> }) {
  const [liste, setListe] = useState<{ kod?: string; metin: string }[]>(iddia.secenekler);
  useEffect(() => setListe(iddia.secenekler), [JSON.stringify(iddia.secenekler)]);
  const degisti = JSON.stringify(liste) !== JSON.stringify(iddia.secenekler);
  return (
    <div class="alan"><span class="alan-adi">Olası cevaplar</span>
      {liste.map((s, i) => (
        <div class="satir" key={s.kod ?? 'y' + i}>
          <input class="girdi" style="flex:1" lang="tr" aria-label={`Cevap ${i + 1}`} value={s.metin} onInput={(e) => setListe(liste.map((x, j) => (j === i ? { ...x, metin: (e.target as HTMLInputElement).value } : x)))} />
          <button type="button" class="dugme sade kucuk" aria-label="Cevabı çıkar" onClick={() => setListe(liste.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <div class="satir">
        <button type="button" class="dugme sade kucuk" onClick={() => setListe([...liste, { metin: '' }])}>Cevap ekle</button>
        {degisti && <button type="button" class="dugme ana kucuk" onClick={() => kaydet(liste.filter((x) => x.metin.trim())).catch(() => setListe(iddia.secenekler))}>Cevapları kaydet</button>}
      </div>
    </div>
  );
}

function bilgiZamani(b: BilgiSatiri) {
  if (b.okur) return b.sahne ? `${b.okumaSirasi ? `${b.okumaSirasi}. sahne: ` : ''}${b.sahne.ad}` : '';
  const z = b.bitis ? `${sinirYazi(b.baslangic)} – ${sinirYazi(b.bitis)}` : b.baslangic ? `${sinirYazi(b.baslangic)} itibarıyla` : '';
  return [z, b.sahne ? `öğrendiği sahne: ${b.sahne.ad}` : ''].filter(Boolean).join(' · ');
}

const ETIKET_SINIFI: Record<string, string> = { yanlis: 'yanlis', sakliyor: 'sakliyor', biliyor: 'dogru', supheleniyor: 'suphe' };

function BilgiOgesi({ istemci, evren, b, soruGoster }: { istemci: Istemci; evren: string; b: BilgiSatiri; soruGoster?: boolean }) {
  const [ac, setAc] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const degistir = (alan: BilgiAlani, deger: unknown) =>
    istemci.iste('bilgiDegistir', { evren, kod: b.kod, alan, deger }).then(() => setHata(null), (e) => { setHata(hataYaz(e)); throw e; });
  const kaynak = BILGI_KAYNAKLARI.find((x) => x.kod === b.kaynak)?.ad;
  return (
    <li class={`karar-satir-${b.karar}`}>
      <div class="satir">
        {soruGoster ? <span>{bag(evren, b.iddia.konu)} · {b.iddia.soru}</span> : bag(evren, b.bilen)}
        <span class={`rozet bilgi-${ETIKET_SINIFI[b.etiket.kod] ?? 'notr'}`}>{b.etiket.ad}</span>
        {b.secenek && <span>{b.inanc === 'reddediyor' ? 'reddettiği: ' : ''}“{b.secenek.metin}”</span>}
        <KararRozeti karar={b.karar} />
        <span class="bosluk" />
        <button class="dugme sade kucuk" aria-expanded={ac} onClick={() => setAc(!ac)}>{ac ? 'Kapat' : 'Düzenle'}</button>
      </div>
      <div class="soluk kucuk">
        {[bilgiZamani(b), kaynak ? `${kaynak}${b.kaynakKayit ? ` (${b.kaynakKayit.ad})` : ''}` : b.kaynakKayit ? `kaynak: ${b.kaynakKayit.ad}` : '',
          b.saklama ? (b.saklama.length ? `saklıyor: ${b.saklama.map((x) => x.ad).join(', ')}` : 'herkesten saklıyor') : '', b.aciklama].filter(Boolean).join(' · ')}
      </div>
      {b.uyari && <p class="uyari kucuk">{b.uyari}</p>}
      {ac && (
        <div class="iliski-duzenle">
          <label class="alan"><span class="alan-adi">İnanç</span>
            <select class="girdi" value={b.inanc} onChange={(e) => degistir('inanc', (e.target as HTMLSelectElement).value).catch(() => {})}>
              {INANCLAR.map((x) => <option value={x.kod}>{x.ad}</option>)}
            </select></label>
          <label class="alan"><span class="alan-adi">Cevap</span>
            <select class="girdi" value={b.secenek?.kod ?? ''} onChange={(e) => degistir('secenek', (e.target as HTMLSelectElement).value || null).catch(() => {})}>
              <option value="">Yok</option>
              {b.iddia.secenekler.map((s) => <option value={s.kod}>{s.metin}</option>)}
            </select></label>
          {b.okur
            ? <OkurSahnesi istemci={istemci} evren={evren} eser={b.bilen.kod} sahne={b.sahne?.kod ?? null} sec={(s) => degistir('sahne', s).catch(() => {})} />
            : <>
              <SinirAlani istemci={istemci} evren={evren} etiket="Başlangıç" deger={b.baslangic} kaydet={(v) => degistir('baslangic', v)} />
              <SinirAlani istemci={istemci} evren={evren} etiket="Bitiş" deger={b.bitis} kaydet={(v) => degistir('bitis', v)} />
              <div class="alan"><span class="alan-adi">Öğrendiği sahne</span>
                <span class="satir"><KayitSec istemci={istemci} evren={evren} secili={b.sahne} sec={(s) => degistir('sahne', s?.kod ?? null).catch(() => {})} etiket="Sahne seç (isteğe bağlı)" />
                  {b.sahne && <button class="dugme sade kucuk" aria-label="Sahneyi kaldır" onClick={() => degistir('sahne', null).catch(() => {})}>×</button>}</span></div>
              <label class="alan"><span class="alan-adi">Nereden biliyor</span>
                <select class="girdi" value={b.kaynak ?? ''} onChange={(e) => degistir('kaynak', (e.target as HTMLSelectElement).value || null).catch(() => {})}>
                  <option value="">Belirtilmemiş</option>
                  {BILGI_KAYNAKLARI.map((x) => <option value={x.kod}>{x.ad}</option>)}
                </select></label>
              <div class="alan"><span class="alan-adi">Kimden ya da hangi belgeden</span>
                <span class="satir"><KayitSec istemci={istemci} evren={evren} secili={b.kaynakKayit} sec={(s) => degistir('kaynakKayit', s?.kod ?? null).catch(() => {})} etiket="Seç (isteğe bağlı)" />
                  {b.kaynakKayit && <button class="dugme sade kucuk" aria-label="Kaynağı kaldır" onClick={() => degistir('kaynakKayit', null).catch(() => {})}>×</button>}</span></div>
              <SaklamaSecici istemci={istemci} evren={evren} deger={b.saklama} degis={(v) => degistir('saklama', v ? v.map((x) => x.kod) : null).catch(() => {})} />
            </>}
          <SatirGirdisi etiket="Açıklama" deger={b.aciklama} kaydet={(v) => degistir('aciklama', v)} />
          <label class="alan"><span class="alan-adi">Karar durumu</span>
            <KararSecici etiket="Bilgi" karar={b.karar} onDegis={(k) => degistir('karar', k).catch(() => {})} /></label>
          <button class="dugme tehlikeli kucuk" onClick={() => istemci.iste('bilgiSil', { evren, kod: b.kod })}>Kaldır</button>
          {hata && <p class="hata kucuk">{hata}</p>}
        </div>
      )}
    </li>
  );
}

/** Kimden saklıyor: saklamıyor · herkesten · seçilen kişilerden. */
function SaklamaSecici({ istemci, evren, deger, degis }: { istemci: Istemci; evren: string; deger: Secim[] | null; degis: (v: Secim[] | null) => void }) {
  const kip = deger === null ? 'yok' : deger.length ? 'secili' : 'herkes';
  const [secili, setSecili] = useState(kip === 'secili');
  useEffect(() => setSecili(kip === 'secili'), [kip]);
  const kodlar = (deger ?? []).map((x) => x.kod);
  return (
    <div class="alan"><span class="alan-adi">Saklıyor mu?</span>
      <select class="girdi" aria-label="Saklıyor mu?" value={secili ? 'secili' : kip} onChange={(e) => {
        const v = (e.target as HTMLSelectElement).value;
        if (v === 'yok') degis(null); else if (v === 'herkes') degis([]); else setSecili(true);
      }}>
        <option value="yok">Saklamıyor</option>
        <option value="herkes">Herkesten saklıyor</option>
        <option value="secili">Belirli kişilerden saklıyor</option>
      </select>
      {secili && (
        <span class="satir">
          {(deger ?? []).map((x) => <span key={x.kod} class="rozet">{x.ad} <button type="button" class="dugme sade kucuk" aria-label={`${x.ad}: çıkar`} onClick={() => degis((deger ?? []).filter((k) => k.kod !== x.kod))}>×</button></span>)}
          <KayitSec istemci={istemci} evren={evren} secili={null} sec={(s) => { if (s && !kodlar.includes(s.kod)) degis([...(deger ?? []), s]); }} etiket="Kimden?" />
        </span>
      )}
    </div>
  );
}

/** Okurun öğrendiği sahne: eserin okuma sırasından seçilir. */
function OkurSahnesi({ istemci, evren, eser, sahne, sec }: { istemci: Istemci; evren: string; eser: string | null; sahne: string | null; sec: (s: string | null) => void }) {
  const [y, setY] = useState<EserYapisi | null>(null);
  useEffect(() => { setY(null); if (eser) istemci.iste('eserYapisi', { evren, eser }).then(setY, () => setY(null)); }, [evren, eser]);
  const sahneler = y ? [...y.dogrudan.map((s) => ({ ...s, bolum: '' })), ...y.bolumler.flatMap((b) => b.sahneler.map((s) => ({ ...s, bolum: b.ad })))] : [];
  return (
    <label class="alan"><span class="alan-adi">Okurun öğrendiği sahne</span>
      <select class="girdi" aria-label="Okurun öğrendiği sahne" value={sahne ?? ''} disabled={!eser} onChange={(e) => sec((e.target as HTMLSelectElement).value || null)}>
        <option value="">{eser ? (y && !sahneler.length ? 'Bu eserde sahne yok' : 'Sahne seç…') : 'Önce eseri seç'}</option>
        {sahneler.map((s) => <option value={s.kod}>{s.sira}. {s.ad}{s.bolum ? ` (${s.bolum})` : ''}</option>)}
      </select></label>
  );
}

function BilgiFormu({ istemci, evren, iddia, bilen, okur: okurGirdi, kapat }: {
  istemci: Istemci; evren: string; iddia?: IddiaOzeti; bilen?: KisaKayit; okur?: boolean; kapat: () => void;
}) {
  const okur = okurGirdi ?? bilen?.tur === 'eser';
  const [iddialar, setIddialar] = useState<IddiaOzeti[] | null>(iddia ? [iddia] : null);
  const [iddiaKod, setIddiaKod] = useState(iddia?.kod ?? '');
  const [bilenSecim, setBilenSecim] = useState<Secim | null>(bilen ?? null);
  const [eserler, setEserler] = useState<KisaKayit[]>([]);
  const [inanc, setInanc] = useState<Inanc>('inaniyor');
  const [secenek, setSecenek] = useState('');
  const [sahne, setSahne] = useState<Secim | null>(null);
  const [okurSahne, setOkurSahne] = useState<string | null>(null);
  const [bas, setBas] = useState(''); const [basOlay, setBasOlay] = useState<Secim | null>(null);
  const [bit, setBit] = useState(''); const [bitOlay, setBitOlay] = useState<Secim | null>(null);
  const [kaynak, setKaynak] = useState('');
  const [kaynakKayit, setKaynakKayit] = useState<Secim | null>(null);
  const [saklama, setSaklama] = useState<Secim[] | null>(null);
  const [aciklama, setAciklama] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { if (!iddia) istemci.iste('iddialar', { evren }).then(setIddialar, () => setIddialar([])); }, [evren]);
  useEffect(() => { if (okur && !bilen) istemci.iste('eserler', { evren }).then((l) => { setEserler(l); if (l.length === 1) setBilenSecim(l[0]); }, () => {}); }, [evren, okur]);
  const secili = iddialar?.find((x) => x.kod === iddiaKod) ?? null;
  const sinir = (ifade: string, olay: Secim | null): SinirGirdisi | null => olay ? { olay: olay.kod } : ifade.trim() ? { ifade } : null;
  const kaydet = async (e: Event) => {
    e.preventDefault();
    if (!secili || !bilenSecim) return;
    try {
      await istemci.iste('bilgiEkle', { evren, bilgi: {
        iddia: secili.kod, bilen: bilenSecim.kod, inanc, secenek: inanc === 'bilmiyor' ? null : secenek || null, aciklama,
        ...(okur ? { sahne: okurSahne } : {
          sahne: sahne?.kod ?? null, baslangic: sinir(bas, basOlay), bitis: sinir(bit, bitOlay),
          kaynak: (kaynak || null) as never, kaynakKayit: kaynakKayit?.kod ?? null, saklama: saklama ? saklama.map((x) => x.kod) : null,
        }),
      } });
      kapat();
    } catch (err) { setHata(hataYaz(err)); }
  };
  if (iddialar && !iddialar.length) {
    return <div class="kart"><p class="soluk kucuk">Henüz soru yok. Önce bilginin konusu olan kaydın (ör. olayın) sayfasında “Soru ekle” ile bir soru yazın.</p>
      <button class="dugme kucuk" onClick={kapat}>Tamam</button></div>;
  }
  return (
    <form class="kart iliski-formu" onSubmit={kaydet}>
      {!iddia && (
        <select class="girdi" aria-label="Soru" value={iddiaKod} onChange={(e) => { setIddiaKod((e.target as HTMLSelectElement).value); setSecenek(''); }}>
          <option value="">Hangi soru?</option>
          {(iddialar ?? []).map((x) => <option value={x.kod}>{x.konu.ad}: {x.soru}</option>)}
        </select>
      )}
      <div class="satir">
        {!bilen && !okur && <KayitSec istemci={istemci} evren={evren} secili={bilenSecim} sec={setBilenSecim} etiket="Kim? (karakter ya da grup)" />}
        {!bilen && okur && (
          <select class="girdi" aria-label="Hangi eserin okuru" value={bilenSecim?.kod ?? ''} onChange={(e) => { const k = eserler.find((x) => x.kod === (e.target as HTMLSelectElement).value) ?? null; setBilenSecim(k); setOkurSahne(null); }}>
            <option value="">Hangi eserin okuru?</option>
            {eserler.map((x) => <option value={x.kod}>{x.ad}</option>)}
          </select>
        )}
        <select class="girdi" aria-label="İnanç" value={inanc} onChange={(e) => setInanc((e.target as HTMLSelectElement).value as Inanc)}>
          {INANCLAR.map((x) => <option value={x.kod}>{x.ad}</option>)}
        </select>
        {inanc !== 'bilmiyor' && (
          <select class="girdi" aria-label="Cevap" value={secenek} disabled={!secili} onChange={(e) => setSecenek((e.target as HTMLSelectElement).value)}>
            <option value="">Hangi cevap?</option>
            {(secili?.secenekler ?? []).map((s) => <option value={s.kod}>{s.metin}{s.kod === secili?.gercek ? ' (gerçek)' : ''}</option>)}
          </select>
        )}
      </div>
      {okur
        ? <OkurSahnesi istemci={istemci} evren={evren} eser={bilenSecim?.kod ?? null} sahne={okurSahne} sec={setOkurSahne} />
        : <>
          <div class="satir">
            <SinirGirdi istemci={istemci} evren={evren} etiket="Başlangıç" ifade={bas} setIfade={setBas} olay={basOlay} setOlay={setBasOlay} />
            <SinirGirdi istemci={istemci} evren={evren} etiket="Bitiş" ifade={bit} setIfade={setBit} olay={bitOlay} setOlay={setBitOlay} />
          </div>
          <div class="satir">
            <KayitSec istemci={istemci} evren={evren} secili={sahne} sec={setSahne} etiket="Öğrendiği sahne (isteğe bağlı)" />
            <select class="girdi" aria-label="Nereden biliyor" value={kaynak} onChange={(e) => setKaynak((e.target as HTMLSelectElement).value)}>
              <option value="">Nereden biliyor?</option>
              {BILGI_KAYNAKLARI.map((x) => <option value={x.kod}>{x.ad}</option>)}
            </select>
            <KayitSec istemci={istemci} evren={evren} secili={kaynakKayit} sec={setKaynakKayit} etiket="Kimden / hangi belgeden" />
          </div>
          <SaklamaSecici istemci={istemci} evren={evren} deger={saklama} degis={setSaklama} />
        </>}
      <input class="girdi" aria-label="Açıklama" placeholder="Açıklama (isteğe bağlı)" lang="tr" value={aciklama} onInput={(e) => setAciklama((e.target as HTMLInputElement).value)} />
      <p class="soluk kucuk">{okur ? 'Okurun bilgisi okuma sırasına göre ilerler: sonraki bir sahnedeki kayıt öncekinin yerine geçer.'
        : 'Bitiş yazılmazsa bilgi, aynı soru için bir sonraki kayda kadar sürer. Başlangıç yazılmazsa öğrendiği sahnenin tarihi kullanılır.'}</p>
      {hata && <p class="hata kucuk">{hata}</p>}
      <div class="satir">
        <button class="dugme ana" type="submit" disabled={!secili || !bilenSecim || (inanc !== 'bilmiyor' && !secenek) || (okur && !okurSahne)}>Ekle</button>
        <button class="dugme" type="button" onClick={kapat}>Vazgeç</button>
      </div>
    </form>
  );
}

// ---------- Sahne bağlam panelinde: bakış açısının bildikleri ----------
export function BakisBilgileri({ evren, bakis, liste, tarihVar }: { evren: string; bakis: KisaKayit; liste: AnBilgisi[]; tarihVar: boolean }) {
  return (
    <div class="baglam-kaydi">
      <div class="satir"><span class="soluk">{bakis.ad} bu anda ne biliyor?</span></div>
      {!liste.length && <p class="soluk kucuk">Bu an için kayıtlı bilgisi yok. (Bu, bilmediği anlamına gelmez; yalnızca kaydedilmemiştir.)</p>}
      <ul class="baglam-listesi">
        {liste.map((x) => (
          <li key={x.iddia.kod}>
            <span class="soluk">{x.iddia.soru}</span> <span class="soluk kucuk">({x.iddia.konu.ad})</span>{' '}
            {x.satirlar.map((s, i) => (
              <span key={s.kod}>{i > 0 && <span class="soluk"> ya da </span>}
                <span class={`rozet bilgi-${ETIKET_SINIFI[s.etiket.kod] ?? 'notr'}`}>{s.etiket.ad}</span>{s.secenek ? ` “${s.secenek.metin}”` : ''}
                {s.gecerli === 'belirsiz' && <span class="rozet">belki</span>}
              </span>
            ))}
            {x.durum === 'belirsiz' && x.satirlar.length > 1 && <span class="uyari kucuk"> Birden çok kayıt bu ana denk geliyor; biri seçilmedi.</span>}
            {' '}<a class="kucuk" href={`#/e/${evren}/k/${x.iddia.konu.kod}`}>aç</a>
          </li>
        ))}
      </ul>
      {!tarihVar && liste.length > 0 && <p class="soluk kucuk">Sahnenin tarihi olmadığı için hepsi “belki” sayıldı.</p>}
    </div>
  );
}

// ---------- Bilgi katmanı: evrenin gerçeği · gizli gerçek · birinin inancı ----------
export function gorunurlukYazisi(g: GorunurlukBilgisi | null): string {
  if (!g) return 'Evrenin gerçeği';
  if (g.katman) return `Gerçek değil: yalnızca ${g.katman.ad} böyle sanıyor`;
  return `Gizli gerçek: yalnızca ${g.bilenler.map((x) => x.ad).join(', ')} biliyor`;
}

export function GorunurlukRozeti({ g }: { g: GorunurlukBilgisi | null }) {
  if (!g) return null;
  return <span class={`rozet ${g.katman ? 'inanc' : 'gizli'}`} title={gorunurlukYazisi(g)}>{g.katman ? `${g.katman.ad} sanıyor` : 'gizli'}</span>;
}

export function GorunurlukAlani({ istemci, evren, kod, nesne, deger }: {
  istemci: Istemci; evren: string; kod: string; nesne: 'kayit' | 'iliski'; deger: GorunurlukBilgisi | null;
}) {
  const [ac, setAc] = useState(false);
  const [kip, setKip] = useState<'gercek' | 'gizli' | 'inanc'>('gercek');
  const [bilenler, setBilenler] = useState<Secim[]>([]);
  const [katman, setKatman] = useState<Secim | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const baslat = () => {
    setKip(!deger ? 'gercek' : deger.katman ? 'inanc' : 'gizli');
    setBilenler(deger?.bilenler ?? []); setKatman(deger?.katman ?? null); setHata(null); setAc(true);
  };
  const kaydet = async () => {
    try {
      await istemci.iste('gorunurlukYaz', { evren, kod, nesne, deger: kip === 'gercek' ? null
        : kip === 'gizli' ? { katman: null, gizli: true, bilenler: bilenler.map((x) => x.kod) }
        : { katman: katman?.kod ?? null, gizli: false, bilenler: [] } });
      setAc(false);
    } catch (e) { setHata(hataYaz(e)); }
  };
  const ad = nesne === 'kayit' ? 'Bu kayıt' : 'Bu ilişki';
  return (
    <div class="alan genis">
      <span class="alan-adi">Kimin gerçeği?</span>
      {!ac && (
        <span class="satir">
          <span class={deger ? '' : 'soluk'}>{gorunurlukYazisi(deger)}</span>
          <button class="dugme sade kucuk" onClick={baslat}>Değiştir</button>
        </span>
      )}
      {ac && (
        <div class="kart gorunurluk-formu">
          <label class="satir"><input type="radio" name={`g-${kod}`} checked={kip === 'gercek'} onChange={() => setKip('gercek')} /> Evrenin gerçeği; herkes bilebilir</label>
          <label class="satir"><input type="radio" name={`g-${kod}`} checked={kip === 'gizli'} onChange={() => setKip('gizli')} /> Evrenin gerçeği ama gizli; yalnızca şunlar biliyor:</label>
          {kip === 'gizli' && (
            <span class="satir girinti">
              {bilenler.map((x) => <span key={x.kod} class="rozet">{x.ad} <button type="button" class="dugme sade kucuk" aria-label={`${x.ad}: çıkar`} onClick={() => setBilenler(bilenler.filter((y) => y.kod !== x.kod))}>×</button></span>)}
              <KayitSec istemci={istemci} evren={evren} secili={null} sec={(s) => { if (s && !bilenler.some((x) => x.kod === s.kod)) setBilenler([...bilenler, s]); }} etiket="Bilen ekle" />
            </span>
          )}
          <label class="satir"><input type="radio" name={`g-${kod}`} checked={kip === 'inanc'} onChange={() => setKip('inanc')} /> Gerçek değil; yalnızca birinin inancı:</label>
          {kip === 'inanc' && (
            <span class="satir girinti"><KayitSec istemci={istemci} evren={evren} secili={katman} sec={setKatman} etiket="Kim böyle sanıyor?" /></span>
          )}
          <p class="soluk kucuk">{ad}, bakış açısı seçilen görünümlerde (soy ağacı, ağ, zaman çizelgesi, harita) buna göre gösterilir. Grubun inancı üyelerine kendiliğinden geçmez.</p>
          {hata && <p class="hata kucuk">{hata}</p>}
          <div class="satir">
            <button class="dugme ana kucuk" disabled={(kip === 'gizli' && !bilenler.length) || (kip === 'inanc' && !katman)} onClick={kaydet}>Kaydet</button>
            <button class="dugme kucuk" onClick={() => setAc(false)}>Vazgeç</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Görünümlerde bakış açısı ----------
export function BakisSecici({ istemci, evren, bakis, sec }: { istemci: Istemci; evren: string; bakis: Secim | null; sec: (s: Secim | null) => void }) {
  return (
    <span class="satir kucuk">
      <span class="soluk">Bakış açısı</span>
      <KayitSec istemci={istemci} evren={evren} secili={bakis} sec={sec} etiket="Evrenin gerçeği" />
      {bakis && <button class="dugme sade kucuk" aria-label="Evrenin gerçeğine dön" onClick={() => sec(null)}>×</button>}
    </span>
  );
}

export function BakisAciklamasi({ bakis }: { bakis: { ad: string } | null }) {
  if (!bakis) return null;
  return <p class="bilgi-notu kucuk">{bakis.ad} bakış açısı: onun bilmediği gizli gerçekler gizlendi; yalnızca onun inancında olanlar ayrıca işaretlendi (kesik çizgi).</p>;
}
