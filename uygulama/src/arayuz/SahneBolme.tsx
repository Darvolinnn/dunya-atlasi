// Sahneyi imleçten bölme ve sonraki sahneyle birleştirme (K38). Önce ne olacağı gösterilir; iş tek değişikliktir
// ve "Geri al" şeridiyle tek adımda geri döner.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { BirlesmeGeri, BolmeOnizlemesi, SahneBirlesmeOnizlemesi } from '../veri/api';
import { useYumusakKapanis } from './kapanis';
import { geriAlinabilir } from './onay';

const sayiYaz = (n: number) => n.toLocaleString('tr-TR');
const sayilar = (l: [number, string][]) => l.filter(([n]) => n > 0).map(([n, ad]) => `${sayiYaz(n)} ${ad}`).join(', ');

function Pencere({ baslik, kapat, children }: { baslik: string; kapat: () => void; children: preact.ComponentChildren }) {
  const [perdeRef, vazgec] = useYumusakKapanis(kapat);
  useEffect(() => {
    const tus = (e: KeyboardEvent) => { if (e.key === 'Escape') vazgec(); };
    addEventListener('keydown', tus);
    return () => removeEventListener('keydown', tus);
  }, []);
  return (
    <div class="perde" role="dialog" aria-label={baslik} ref={perdeRef} onClick={(e) => { if (e.target === e.currentTarget) vazgec(); }}>
      <div class="perde-ic sahne-bolme">
        <h3>{baslik}</h3>
        {children}
      </div>
    </div>
  );
}

export function SahneBolPenceresi({ istemci, evren, sahne, konum, temel, kapat, bitti }: {
  istemci: Istemci; evren: string; sahne: string; konum: number; temel: string[]; kapat: () => void; bitti: () => void;
}) {
  const [o, setO] = useState<BolmeOnizlemesi | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [ad, setAd] = useState('');
  const [gozlem, setGozlem] = useState<'kalsin' | 'gecsin'>('kalsin');
  const [mesgul, setMesgul] = useState(false);
  useEffect(() => { istemci.iste('sahneBolOnizle', { evren, sahne, konum, temel }).then((x) => { setO(x); setAd(x.ad); }, (e) => setHata((e as Error).message)); }, []);
  const bol = async () => {
    setMesgul(true); setHata(null);
    try {
      let yeni = '', bitisik = false;
      await geriAlinabilir('Sahne bölündü.', async () => {
        const x = await istemci.iste('sahneBol', { evren, sahne, konum, temel, ad, sonGozlemler: gozlem });
        yeni = x.yeni; bitisik = x.bitisik;
      }, () => istemci.iste('sahneBirlestir', { evren, sahne, ikinci: yeni, bitisik }).then(bitti));
      bitti();
    } catch (e) { setHata((e as Error).message); setMesgul(false); }
  };
  const kopya = o ? [o.tarih && `tarih (${o.tarih})`, o.yer && `yer (${o.yer})`, o.bakis && `bakış açısı (${o.bakis})`, o.sahnedekiler > 0 && 'sahnedekiler'].filter(Boolean).join(', ') : '';
  const giden = o ? sayilar([[o.baglanti, 'bağlantı'], [o.isaret, 'metin işareti'], [o.parca, 'bağlam parçası'], [o.kullanim, 'alıntı']]) : '';
  return (
    <Pencere baslik="Sahneyi böl" kapat={kapat}>
      {!o && !hata && <p class="soluk">Hazırlanıyor…</p>}
      {hata && <p class="hata">{hata}</p>}
      {o && <>
        <p>İmleçten sonraki <b>{sayiYaz(o.paragraf)} paragraf</b> ({sayiYaz(o.kelime)} kelime), bu bölümde hemen ardından gelen yeni bir sahneye taşınır.</p>
        <label class="alan">Yeni sahnenin adı
          <input class="girdi" lang="tr" value={ad} onInput={(e) => setAd((e.target as HTMLInputElement).value)} />
        </label>
        {kopya && <p class="kucuk">Yeni sahneye kopyalanır: {kopya}.</p>}
        {giden && <p class="kucuk">Taşınan paragraflarla gider: {giden}.</p>}
        {o.sonGozlem > 0 && (
          <fieldset class="sahne-bolme-secim">
            <legend class="kucuk">Sahne sonu süreklilik gözlemleri ({sayiYaz(o.sonGozlem)}):</legend>
            <label><input type="radio" name="gozlem" checked={gozlem === 'kalsin'} onChange={() => setGozlem('kalsin')} /> Bu sahnede kalsın</label>
            <label><input type="radio" name="gozlem" checked={gozlem === 'gecsin'} onChange={() => setGozlem('gecsin')} /> Yeni sahneye geçsin (sahnenin sonu artık orası)</label>
          </fieldset>
        )}
      </>}
      <div class="satir sag">
        <button class="dugme sade" onClick={kapat}>Vazgeç</button>
        <button class="dugme ana" disabled={!o || mesgul || !ad.trim()} onClick={() => void bol()}>Böl</button>
      </div>
    </Pencere>
  );
}

export function SahneBirlestirPenceresi({ istemci, evren, sahne, kapat, bitti }: {
  istemci: Istemci; evren: string; sahne: string; kapat: () => void; bitti: () => void;
}) {
  const [o, setO] = useState<SahneBirlesmeOnizlemesi | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);
  useEffect(() => { istemci.iste('sahneBirlestirOnizle', { evren, sahne }).then(setO, (e) => setHata((e as Error).message)); }, []);
  const birlestir = async () => {
    setMesgul(true); setHata(null);
    try {
      let geri: BirlesmeGeri | null = null;
      await geriAlinabilir(`“${o!.ikinci.ad}” bu sahneye eklendi.`, async () => { geri = await istemci.iste('sahneBirlestir', { evren, sahne }); },
        () => istemci.iste('sahneBirlesmesiniGeriAl', { evren, geri: geri! }).then(bitti));
      bitti();
    } catch (e) { setHata((e as Error).message); setMesgul(false); }
  };
  const gelen = o ? sayilar([[o.katilimci, 'katılımcı'], [o.olay, 'olay'], [o.isaret, 'metin işareti'], [o.parca, 'bağlam parçası'], [o.kullanim, 'alıntı']]) : '';
  return (
    <Pencere baslik="Sonraki sahneyle birleştir" kapat={kapat}>
      {!o && !hata && <p class="soluk">Hazırlanıyor…</p>}
      {hata && <p class="hata">{hata}</p>}
      {o && <>
        <p>“{o.ikinci.ad}” sahnesinin metni ({sayiYaz(o.paragraf)} paragraf, {sayiYaz(o.kelime)} kelime) bu sahnenin sonuna eklenir; o sahne çöp kutusuna gider.</p>
        {gelen && <p class="kucuk">Bu sahneye geçer: {gelen}.</p>}
        <p class="kucuk soluk">Yeri, bakış açısı ve tarihi bu sahnede boş değilse bu sahneninki kalır. O sahnenin sonundaki süreklilik gözlemleri bu sahnenin sonu olur.</p>
      </>}
      <div class="satir sag">
        <button class="dugme sade" onClick={kapat}>Vazgeç</button>
        <button class="dugme ana" disabled={!o || mesgul} onClick={() => void birlestir()}>Birleştir</button>
      </div>
    </Pencere>
  );
}
