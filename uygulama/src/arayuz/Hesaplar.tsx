// Komut paletinden açılan iki küçük hesap (§5.8): iki yer arası yolculuk süresi ve takvim günü hesabı.
// Yolculuk, kayıtlı rotalarla en kısa yolu (§15-2) kullanır; takvim hesabı evrenin takvimiyle (§3.4) yapılır.
// İkisi de evrende hiçbir şey değiştirmez.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { RotaSonucu } from '../veri/api';
import { anaTakvim, eksenAraligi, farkCoz, gunFarki, kaydir, tarihAciklamasi, tarihCoz, type Takvim } from '../alan/tarih';
import { KayitSec } from './KayitBolumleri';
import { RotaCozumu } from './Haber';
import { useTakvim } from './Takvim';

export type HesapTuru = 'yolculuk' | 'takvim';
type Secim = { kod: string; ad: string };

export function HesapPenceresi({ istemci, evren, tur, kapat }: { istemci: Istemci; evren: string; tur: HesapTuru; kapat: () => void }) {
  const ic = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ic.current?.querySelector<HTMLElement>('button, input')?.focus();
    const tus = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.secici')) kapat(); };
    document.addEventListener('keydown', tus);
    return () => document.removeEventListener('keydown', tus);
  }, []);
  const baslik = tur === 'yolculuk' ? 'Yolculuk süresi' : 'Takvim günü hesabı';
  return (
    <div class="perde palet-perdesi" onClick={(e) => { if (e.target === e.currentTarget) kapat(); }}>
      <div class="palet kart hesap-penceresi" role="dialog" aria-label={baslik} ref={ic}>
        <div class="satir"><strong>{baslik}</strong><span class="bosluk" /><button class="dugme sade kucuk" aria-label="Kapat" onClick={kapat}>×</button></div>
        {tur === 'yolculuk' ? <YolculukHesabi istemci={istemci} evren={evren} /> : <TakvimHesabi istemci={istemci} evren={evren} />}
      </div>
    </div>
  );
}

function YolculukHesabi({ istemci, evren }: { istemci: Istemci; evren: string }) {
  const [nereden, setNereden] = useState<Secim | null>(null);
  const [nereye, setNereye] = useState<Secim | null>(null);
  const [kosul, setKosul] = useState('');
  const [r, setR] = useState<RotaSonucu | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const hesapla = (e: Event) => {
    e.preventDefault();
    if (!nereden || !nereye) return;
    istemci.iste('enKisaRota', { evren, nereden: nereden.kod, nereye: nereye.kod, kosul: kosul.trim() || null })
      .then((x) => { setR(x); setHata(null); }, (x) => { setR(null); setHata((x as Error).message); });
  };
  return (
    <form class="hesap-formu" onSubmit={hesapla}>
      <div class="satir">
        <KayitSec istemci={istemci} evren={evren} secili={nereden} etiket="Nereden?" sec={(s) => { setNereden(s); setR(null); }} />
        <span aria-hidden="true">→</span>
        <KayitSec istemci={istemci} evren={evren} secili={nereye} etiket="Nereye?" sec={(s) => { setNereye(s); setR(null); }} />
      </div>
      <div class="satir">
        <input class="girdi" style="flex:1;min-width:140px" lang="tr" aria-label="Koşul" placeholder="koşul (kış, atlı…; boşsa en kısa)" value={kosul} onInput={(e) => setKosul((e.target as HTMLInputElement).value)} />
        <button class="dugme ana" type="submit" disabled={!nereden || !nereye}>Hesapla</button>
      </div>
      {hata && <p class="hata kucuk">{hata}</p>}
      {r && <div class="rota-sonucu"><RotaCozumu evren={evren} r={r} /><p class="soluk kucuk">{r.kapsam}</p></div>}
      <p class="soluk kucuk">Yalnızca kayıtlı rotalar ve sürelerle hesaplanır. Ayrıntılı seçenekler (kimin bildiği yollar, izinler, varsayım paketi) yer sayfasındaki “Buradan en kısa yol” bölümündedir.</p>
    </form>
  );
}

const gunYazisi = (n: number) => `${Math.abs(n).toLocaleString('tr-TR')} gün`;
const aralikGun = (f: { enAz: number; enCok: number }) => {
  const once = f.enCok < 0;
  const [a, b] = once ? [-f.enCok, -f.enAz] : [f.enAz, f.enCok];
  if (f.enAz < 0 && f.enCok > 0) return `Sıra belli değil: ikinci tarih ${gunYazisi(-f.enAz)} önce ile ${gunYazisi(f.enCok)} sonra arasında olabilir.`;
  const sayi = a === b ? gunYazisi(a) : `${a.toLocaleString('tr-TR')}–${gunYazisi(b)}`;
  return `${sayi} ${once ? 'önce' : 'sonra'}`;
};
/** Eksendeki noktanın okunuşu: aylar tanımlıysa gün, değilse yıl. */
const nokta = (n: number, t: Takvim) => eksenAraligi({ enErken: n, enGec: n }, t);

function TakvimHesabi({ istemci, evren }: { istemci: Istemci; evren: string }) {
  const z = useTakvim(istemci, evren);
  const t = anaTakvim(z);
  const [kip, setKip] = useState<'ekle' | 'fark'>('ekle');
  const [ilk, setIlk] = useState('');
  const [ikinci, setIkinci] = useState('');
  const a = ilk.trim() ? tarihCoz(ilk, z) : null;
  const b = kip === 'fark' && ikinci.trim() ? tarihCoz(ikinci, z) : null;
  const fark = kip === 'ekle' && ikinci.trim() ? farkCoz(ikinci) : null;

  let sonuc: string | null = null, uyari: string | null = null;
  if (ilk.trim() && !a) uyari = 'İlk tarih okunamadı.';
  else if (a && !a.eksen) uyari = 'Bu tarih takvimde bir yere oturmuyor; hesap yapılamaz.';
  else if (kip === 'ekle' && ikinci.trim() && (!fark || fark.en === null)) uyari = 'Farkı “40 gün sonra” ya da “3 yıl önce” gibi yazın.';
  else if (kip === 'fark' && ikinci.trim() && !b?.eksen) uyari = 'İkinci tarih okunamadı ya da takvimde bir yere oturmuyor.';
  else if (a?.eksen && fark) {
    const e = kaydir(a.eksen, fark, t);
    if (e && e.enErken !== null && e.enGec !== null) {
      const x = nokta(e.enErken, t), y = nokta(e.enGec, t);
      sonuc = x === y ? x : `${x} ile ${y} arası`;
    }
  } else if (a && b) {
    const f = gunFarki(a, b);
    sonuc = f ? aralikGun(f) : null;
    if (!f) uyari = 'Tarihlerden birinin ucu açık; gün sayısı hesaplanamaz.';
  }

  return (
    <div class="hesap-formu">
      <div class="satir" role="radiogroup" aria-label="Hesap">
        <label class="satir kucuk"><input type="radio" name="takvim-hesabi" checked={kip === 'ekle'} onChange={() => { setKip('ekle'); setIkinci(''); }} /> Tarihe gün ya da yıl ekle</label>
        <label class="satir kucuk"><input type="radio" name="takvim-hesabi" checked={kip === 'fark'} onChange={() => { setKip('fark'); setIkinci(''); }} /> İki tarih arası</label>
      </div>
      <input class="girdi" lang="tr" aria-label="Tarih" placeholder="Tarih (ör. 412)" value={ilk} onInput={(e) => setIlk((e.target as HTMLInputElement).value)} />
      {a && <span class="soluk kucuk">{tarihAciklamasi(a, z)}</span>}
      <input class="girdi" lang="tr" aria-label={kip === 'ekle' ? 'Fark' : 'İkinci tarih'} placeholder={kip === 'ekle' ? 'Fark (ör. 40 gün sonra, 3 yıl önce)' : 'İkinci tarih'}
        value={ikinci} onInput={(e) => setIkinci((e.target as HTMLInputElement).value)} />
      {sonuc && <p role="status"><strong>{sonuc}</strong></p>}
      {uyari && <p class="uyari kucuk">{uyari}</p>}
      <p class="soluk kucuk">Evrenin ana takvimiyle hesaplanır. Yaklaşık ya da yalnız yılı yazılmış tarihlerde sonuç bir aralıktır.</p>
    </div>
  );
}
