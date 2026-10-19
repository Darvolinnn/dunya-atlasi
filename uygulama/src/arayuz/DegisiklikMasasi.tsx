// F04 değişiklik masası (§9.2): olayın tarihini değiştirmeden önce sonucu görmek ve korunacakları seçmek.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { DegisiklikMasasi, EtkiSatiri, Kayit } from '../veri/api';
import { turBul } from '../alan/turler';

const hataYaz = (e: unknown) => (e as Error).message;

export function DegisiklikMasasiPaneli({ istemci, evren, kayit, kapat }: { istemci: Istemci; evren: string; kayit: Kayit; kapat: () => void }) {
  const [ifade, setIfade] = useState('');
  const [koru, setKoru] = useState<string[]>([]);
  const [m, setM] = useState<DegisiklikMasasi | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const sira = useRef(0);
  useEffect(() => {
    if (!ifade.trim()) { setM(null); setHata(null); return; }
    const n = ++sira.current;
    const zaman = setTimeout(() => {
      istemci.iste('degisiklikMasasi', { evren, kod: kayit.kod, ifade, koru }).then(
        (x) => { if (n === sira.current) { setM(x); setHata(null); } },
        (e) => { if (n === sira.current) { setM(null); setHata(hataYaz(e)); } });
    }, 300);
    return () => clearTimeout(zaman);
  }, [ifade, koru.join('|')]);
  const uygula = async () => {
    try { await istemci.iste('degisiklikUygula', { evren, kod: kayit.kod, ifade, koru }); kapat(); } catch (e) { setHata(hataYaz(e)); }
  };
  const bag = (x: { kod: string; ad: string; tur: string }) => <><a href={`#/e/${evren}/k/${x.kod}`}>{x.ad}</a> <span class="soluk">· {turBul(x.tur).ad}</span></>;
  const liste = (baslik: string, aciklama: string, l: EtkiSatiri[]) => (
    <div class="etki-grubu">
      <strong class="kucuk">{baslik} ({l.length})</strong>
      <p class="soluk kucuk">{aciklama}</p>
      {l.length > 0 && <ul class="kucuk">{l.map((x, i) => <li key={x.kod + i}>{bag(x)}: {x.aciklama}</li>)}</ul>}
    </div>
  );
  return (
    <section class="kart degisiklik-masasi" role="region" aria-label="Değişiklik masası">
      <div class="satir">
        <strong>Değişiklik masası</strong>
        <span class="bosluk" />
        <button class="dugme sade kucuk" onClick={kapat}>Kapat</button>
      </div>
      <p class="soluk kucuk">Yeni tarihi yazın. Uygulamadan önce nelerin kayacağını görün ve korunacakları seçin. Önizleme hiçbir şeyi değiştirmez.</p>
      <label class="alan"><span class="alan-adi">Yeni tarih (şimdiki: {kayit.tarih?.ifade ?? '—'})</span>
        <input class="girdi" lang="tr" value={ifade} placeholder="Örn. 432" onInput={(e) => setIfade((e.target as HTMLInputElement).value)} /></label>
      {hata && <p class="hata kucuk">{hata}</p>}
      {m && <>
        <p class="kucuk">{m.olay.ad}: {m.once} → <strong>{m.sonra}</strong></p>
        <div class="etki-grubu">
          <strong class="kucuk">Hesapla değişenler ({m.hesap.length})</strong>
          <p class="soluk kucuk">Bu olaya bağlı tarihler ve yaşlar. Korumak istediklerinizi işaretleyin. Korunan tarih, şimdiki değeriyle yazılı bir tarih olarak kalır.</p>
          {m.hesap.length > 0 && <ul class="kucuk masa-listesi">{m.hesap.map((x, i) => (
            <li key={(x.anahtar ?? x.kod) + i}>
              {x.anahtar && x.korunabilir && <label class="satir"><input type="checkbox" checked={koru.includes(x.anahtar)}
                onChange={(e) => { const a = x.anahtar!; setKoru((e.target as HTMLInputElement).checked ? [...koru, a] : koru.filter((y) => y !== a)); }} /> Koru</label>}
              <span>{bag(x)}: {x.once} → {x.sonra}</span>
              <span class="soluk"> · {x.aciklama}{x.korunamaz ? ` ${x.korunamaz}` : ''}</span>
            </li>
          ))}</ul>}
        </div>
        <div class="etki-grubu">
          <strong class="kucuk">Sabit kararla çelişenler ({m.celisen.length})</strong>
          <p class="soluk kucuk">Yazılı tarihler, neden–sonuç sırası ve korunan kararlarla uyuşmayanlar. Yine de değişikliği uygulayabilirsiniz.</p>
          {m.celisen.length > 0 && <ul class="kucuk">{m.celisen.map((x, i) => <li key={x.kod + i}>{bag(x)}: {x.aciklama}</li>)}</ul>}
        </div>
        {liste('İncelenecekler', 'Sizin açıkça kurduğunuz bağlar yüzünden etkilenenler. Uygulayınca inceleme listesine eklenir.', m.incelenecek)}
        {liste('Yalnızca bahsedenler', 'Metninde bu kayda bağlantı olanlar. Yalnızca bilgi içindir, inceleme listesine eklenmez.', m.bahseden)}
        <div class="satir">
          <button class="dugme ana" onClick={uygula}>Uygula</button>
          <button class="dugme" onClick={kapat}>Vazgeç</button>
        </div>
      </>}
    </section>
  );
}
