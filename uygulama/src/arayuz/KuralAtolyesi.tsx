// Kural atölyesi (F16, formülsüz): bir hukuk kuralının örnek durumları. Her örnek kuralın bugünkü ve bir önceki
// tanımıyla değerlendirilir; beklentiyle uyuşmayan ya da kural değişince sonucu değişen örnekler öne çıkar.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { KuralOrnegi, KuralOrnekleri, OrnekBeklentisi, OrnekSonucu } from '../veri/api';
import { KayitSec } from './KayitBolumleri';
import { onayla } from './onay';

const hataYaz = (e: unknown) => (e as Error).message;
const BEKLENTILER: { kod: OrnekBeklentisi; ad: string }[] = [
  { kod: 'uygulanir', ad: 'Uygulanmalı' }, { kod: 'uygulanmaz', ad: 'Uygulanmamalı' }, { kod: 'sinir', ad: 'Sınır durumu (belirsiz kalmalı)' },
];
const SONUC: Record<OrnekSonucu, string> = { uygulanir: 'uygulanıyor', uygulanmaz: 'uygulanmıyor', belirsiz: 'belirsiz', hesaplanamadi: 'hesaplanamadı' };
const HUKUM: Record<KuralOrnegi['hukum'], string> = { geciyor: 'Beklendiği gibi', uyariyor: 'Beklenenden farklı', belirsiz: 'Karar verilemiyor' };
type Secim = { kod: string; ad: string } | null;

export function KuralOrnekleriBolumu({ istemci, evren, kural, surum }: { istemci: Istemci; evren: string; kural: string; surum: number }) {
  const [l, setL] = useState<KuralOrnekleri | null>(null);
  const [kisi, setKisi] = useState<Secim>(null);
  const [yer, setYer] = useState<Secim>(null);
  const [tarih, setTarih] = useState('');
  const [beklenen, setBeklenen] = useState<OrnekBeklentisi>('uygulanir');
  const [not, setNot] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const yukle = () => istemci.iste('kuralOrnekleri', { evren, kural }).then(setL, (x) => setHata(hataYaz(x)));
  useEffect(() => { yukle(); }, [kural, surum]);
  const ekle = () => {
    if (!kisi || !yer) { setHata('Kişi ve yer seçin.'); return; }
    istemci.iste('kuralOrnegiYaz', { evren, kural, tanim: { kisi: kisi.kod, yer: yer.kod, tarih, beklenen, not } })
      .then(() => { setTarih(''); setNot(''); setHata(null); yukle(); }, (x) => setHata(hataYaz(x)));
  };
  if (!l) return hata ? <p class="hata kucuk">{hata}</p> : null;
  const farkli = l.ornekler.filter((o) => o.hukum === 'uyariyor').length;
  const degisen = l.ornekler.filter((o) => o.onceki !== null && o.onceki !== o.sonuc).length;
  return (
    <div class="kural-ornekleri" aria-label="Örnek durumlar">
      <h3 class="kucuk">Örnek durumlar</h3>
      <p class="soluk kucuk">Bir kişi, bir yer ve isterseniz bir tarih seçin; kuralın bu durumda uygulanması gerekip gerekmediğini belirtin. Kural değişince sonuçlar yeniden hesaplanır, örneklerin kendisi değişmez.</p>
      {!!l.ornekler.length && <p class="kucuk">{farkli ? `${farkli} örnek beklenenden farklı.` : 'Hiçbir örnek beklenenden farklı değil.'}{l.oncekiTanimVar ? ` Son değişiklikle sonucu değişen örnek sayısı: ${degisen}.` : ''}</p>}
      <ul class="toplanan-listesi">
        {l.ornekler.map((o) => (
          <li key={o.kod} class={o.hukum === 'uyariyor' ? 'ornek-farkli' : ''}>
            <strong>{o.kisi.ad}</strong> · {o.yer.ad}{o.tanim.tarih ? ` · ${o.tanim.tarih}` : ''}
            <span class="soluk kucuk"> · beklenen: {BEKLENTILER.find((b) => b.kod === o.tanim.beklenen)!.ad.toLocaleLowerCase('tr-TR')}</span>
            <div class="kucuk"><strong>{HUKUM[o.hukum]}</strong>: kural şu an {SONUC[o.sonuc]}. {o.neden}</div>
            {o.onceki !== null && o.onceki !== o.sonuc && <div class="kucuk uyari">Son değişiklikten önceki sonuç: {SONUC[o.onceki]}.</div>}
            {o.tanim.not && <div class="kucuk soluk">{o.tanim.not}</div>}
            <button class="dugme sade kucuk" onClick={() => onayla('Bu örnek kaldırılsın mı?') && istemci.iste('kuralOrnegiSil', { evren, kod: o.kod }).then(yukle, (x) => setHata(hataYaz(x)))}>Örneği kaldır</button>
          </li>
        ))}
      </ul>
      <div class="satir kucuk">
        <KayitSec istemci={istemci} evren={evren} secili={kisi} etiket="Kişi seç" sec={setKisi} />
        <KayitSec istemci={istemci} evren={evren} secili={yer} etiket="Yer seç" sec={setYer} />
        <input class="girdi" style="max-width:140px" aria-label="Örneğin tarihi" placeholder="Tarih (isteğe bağlı)" value={tarih} onInput={(e) => setTarih((e.target as HTMLInputElement).value)} />
        <select class="girdi kucuk-secim" aria-label="Beklenen sonuç" value={beklenen} onChange={(e) => setBeklenen((e.target as HTMLSelectElement).value as OrnekBeklentisi)}>
          {BEKLENTILER.map((b) => <option value={b.kod}>{b.ad}</option>)}
        </select>
      </div>
      <div class="satir">
        <input class="girdi" style="flex:1;min-width:160px" lang="tr" aria-label="Örnek notu" placeholder="Not (isteğe bağlı)" value={not} onInput={(e) => setNot((e.target as HTMLInputElement).value)} />
        <button class="dugme kucuk" onClick={ekle}>Örnek ekle</button>
      </div>
      {hata && <p class="hata kucuk">{hata}</p>}
    </div>
  );
}
