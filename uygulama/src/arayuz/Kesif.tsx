// F31 açık verilere dayanan keşif soruları: yazar bir şablon seçer, program tanımlı ilişkilerden aday çıkarır.
// "Mümkün" der, "oldu" demez. Aday yalnızca yazar isterse sahne fikrine ya da açık meseleye dönüşür.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { IddiaOzeti, KesifAdayi, KesifSablonu, KesifSonucu, KisaKayit } from '../veri/api';

const hataYaz = (e: unknown) => (e as Error).message;

export function KesifSekmesi({ istemci, evren }: { istemci: Istemci; evren: string }) {
  const [iddialar, setIddialar] = useState<IddiaOzeti[]>([]);
  const [iddia, setIddia] = useState('');
  const [r, setR] = useState<KesifSonucu | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [kayitlilar, setKayitlilar] = useState<Record<number, { kod: string; bicim: string }>>({});
  useEffect(() => { istemci.iste('iddialar', { evren }).then(setIddialar, () => {}); }, [evren]);
  const sor = (e: Event) => {
    e.preventDefault();
    if (!iddia) return;
    getir('farkli_inananlar');
  };
  const getir = (sablon: KesifSablonu) => istemci.iste('kesifSorusu', { evren, sablon, iddia: sablon === 'farkli_inananlar' ? iddia : null })
    .then((x) => { setR(x); setHata(null); setKayitlilar({}); }, (x) => { setR(null); setHata(hataYaz(x)); });
  const bag = (k: KisaKayit) => <a href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a>;
  const kaydet = (i: number, a: KesifAdayi, bicim: 'sahne' | 'mesele') => {
    const kimler = a.kisiler.map((k) => k.ad).join(' ile ');
    const ad = a.yer
      ? bicim === 'sahne' ? `${kimler}, ${a.yer.ad}` : `${kimler} ${a.yer.ad} içinde karşılaştı mı?`
      : bicim === 'sahne' ? `${kimler}: ${a.konu?.ad ?? ''}` : `${a.konu?.ad ?? ''} üzerinde kimin hakkı geçerli?`;
    istemci.iste('kesifAdayiKaydet', { evren, bicim, ad, aciklama: `${a.yazi} (${a.aralik})`, kisiler: a.kisiler.map((k) => k.kod), yer: a.yer?.kod ?? null, konu: a.konu?.kod ?? null })
      .then((x) => { setKayitlilar({ ...kayitlilar, [i]: { kod: x.kod, bicim } }); setHata(null); }, (x) => setHata(hataYaz(x)));
  };
  return (
    <section class="kesif" aria-label="Keşif soruları">
      <h2>Keşif soruları</h2>
      <p class="soluk kucuk">Bir soru şablonu seçin; program yalnızca yazdığınız ilişkilerden olası adaylar çıkarır. Sonuç bir olasılıktır, olmuş bir şey değildir.</p>
      <form class="kart" onSubmit={sor}>
        <p><strong>Aynı sorunun farklı cevaplarına inanan iki kişi hangi tarihlerde aynı yerde olabilir?</strong></p>
        {iddialar.length ? (
          <div class="satir">
            <label class="alan"><span class="alan-adi">Soru</span>
              <select class="girdi" value={iddia} onChange={(e) => setIddia((e.target as HTMLSelectElement).value)}>
                <option value="">Seçin</option>
                {iddialar.map((d) => <option value={d.kod}>{d.konu.ad}: {d.soru}</option>)}
              </select></label>
            <button class="dugme ana kucuk" type="submit" disabled={!iddia}>Adayları göster</button>
          </div>
        ) : <p class="soluk kucuk">Henüz soru yok. Bir kaydın sayfasında “Soru ekle” ile soru ve kimin neye inandığını yazın.</p>}
      </form>
      <div class="kart">
        <p><strong>Aynı şey üzerinde çelişen hak iddiası olanlar kim?</strong></p>
        <button class="dugme ana kucuk" type="button" onClick={() => getir('celisen_haklar')}>Çelişen hakları göster</button>
      </div>
      {hata && <p class="hata kucuk">{hata}</p>}
      {r && (
        <div class="kesif-sonucu">
          <p class="kucuk">{r.soru}</p>
          {!r.adaylar.length && <p class="kucuk">Kayıtlı yer ve tarihlerde örtüşen bir aday bulunmadı.</p>}
          <ul class="kesif-adaylari">{r.adaylar.map((a, i) => (
            <li key={i} class="kart">
              <div><strong>{a.aralik}</strong> · {a.yer ? bag(a.yer) : a.konu ? bag(a.konu) : null} · {a.kisiler.map((k, j) => <>{j ? ' ile ' : ''}{bag(k)}</>)}</div>
              <div class="kucuk">{a.yazi}</div>
              <div class="soluk kucuk">Dayanak: {a.dayanaklar.join('; ')}</div>
              {kayitlilar[i] ? <p class="kucuk">Kaydedildi: <a href={`#/e/${evren}/k/${kayitlilar[i].kod}`}>{kayitlilar[i].bicim === 'sahne' ? 'sahne fikri' : 'açık mesele'}</a></p> : (
                <span class="satir">
                  <button class="dugme sade kucuk" onClick={() => kaydet(i, a, 'sahne')}>Sahne fikri yap</button>
                  <button class="dugme sade kucuk" onClick={() => kaydet(i, a, 'mesele')}>Açık mesele yap</button>
                </span>
              )}
            </li>
          ))}</ul>
          {r.dahaFazla && <p class="soluk kucuk">Daha fazla aday var; ilk 50 gösteriliyor.</p>}
          <p class="soluk kucuk">{r.kapsam}</p>
          <p class="soluk kucuk">{r.not}</p>
        </div>
      )}
    </section>
  );
}
