// F28 iddia dosyası (§3.9): bir soru hakkındaki çelişen anlatımlar, kaynakları ve her cevap için destek ya da
// itiraz. Anlatımlar gerçeği değiştirmez; aynı kökten gelen (kopya, tercüme, aktarma) anlatımlar tek kaynak sayılır.
import { useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { Anlatim, AnlatimTanimi, IddiaDosyasi } from '../veri/api';
import { ANLATIM_TURLERI, DAYANAK_TURLERI } from '../alan/anlatim';
import { KararRozeti, KararSecici } from './ortak';
import { KayitSec } from './KayitBolumleri';
import { useYukle } from './Anlati';
import { geriAlinabilir } from './onay';

const hataYaz = (e: unknown) => (e as Error).message;
const turAdi = (k: string) => ANLATIM_TURLERI.find((x) => x.kod === k)?.ad ?? k;
const DURUM_YAZISI: Record<IddiaDosyasi['cevaplar'][number]['durum'], string> = {
  'ikisi de': 'Destekleyen de itiraz eden de var', 'destek var': 'Yalnızca destekleyen var', 'itiraz var': 'Yalnızca itiraz eden var', 'dayanak yok': 'Hiçbir anlatım değinmiyor',
};

export function IddiaDosyasiBolumu({ istemci, evren, iddia }: { istemci: Istemci; evren: string; iddia: string }) {
  const [d] = useYukle<IddiaDosyasi>(istemci, evren, () => istemci.iste('iddiaDosyasi', { evren, iddia }), [iddia]);
  const [form, setForm] = useState<Anlatim | 'yeni' | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  if (!d) return null;
  const secenek = (k: string) => d.cevaplar.find((c) => c.secenek.kod === k)?.secenek.metin ?? 'kaldırılmış cevap';
  const ad = (k: string) => { const a = d.anlatimlar.find((x) => x.kod === k); return a ? `${turAdi(a.tur)}${a.kaynakKaydi ? `: ${a.kaynakKaydi.ad}` : ''}` : 'anlatım'; };
  const kaldir = (kod: string, geri: boolean) => istemci.iste(geri ? 'anlatimGeriYukle' : 'anlatimSil', { evren, kod }).then(() => { setHata(null); return true; }, (e) => { setHata(hataYaz(e)); return false; });
  return (
    <div class="iddia-dosyasi">
      <table class="karsilastirma kucuk">
        <thead><tr><th>Cevap</th><th>Destekleyen</th><th>İtiraz eden</th><th>Durum</th></tr></thead>
        <tbody>{d.cevaplar.map((c) => (
          <tr key={c.secenek.kod}>
            <th scope="row">{c.secenek.metin}{c.gercek && <span class="rozet gercek"> gerçek</span>}</th>
            <td>{c.destek.length ? `${c.destek.length} anlatım, ${c.bagimsizDestek} bağımsız kaynak` : '—'}</td>
            <td>{c.itiraz.length ? `${c.itiraz.length} anlatım, ${c.bagimsizItiraz} bağımsız kaynak` : '—'}</td>
            <td>{DURUM_YAZISI[c.durum]}</td>
          </tr>
        ))}</tbody>
      </table>
      {d.anlatimlar.length > 0 && (
        <ul class="anlatim-listesi">{d.anlatimlar.map((a) => (
          <li key={a.kod} class={`karar-satir-${a.karar}`}>
            <strong>{turAdi(a.tur)}</strong>{a.kaynakKaydi && <> · <a href={`#/e/${evren}/k/${a.kaynakKaydi.kod}`}>{a.kaynakKaydi.ad}</a></>} <KararRozeti karar={a.karar} />
            {a.catismali && <span class="rozet uyari">İki cihazda farklı yazıldı</span>}
            <div class="kucuk">
              {a.destek && <span>Destekler: “{secenek(a.destek)}”. </span>}
              {a.itiraz.length > 0 && <span>İtiraz eder: {a.itiraz.map((x) => `“${secenek(x)}”`).join(', ')}. </span>}
              {a.dayanak && <span class="soluk">{DAYANAK_TURLERI.find((x) => x.kod === a.dayanakTuru)?.ad}: {ad(a.dayanak)} (bağımsız kaynak sayılmaz). </span>}
            </div>
            {a.ozet && <div class="kucuk soluk">{a.ozet}</div>}
            <span class="satir">
              <button class="dugme sade kucuk" onClick={() => setForm(a)}>Düzenle</button>
              <button class="dugme sade kucuk tehlikeli" onClick={() => void geriAlinabilir('Anlatım kaldırıldı.', () => kaldir(a.kod, false), () => kaldir(a.kod, true))}>Kaldır</button>
            </span>
          </li>
        ))}</ul>
      )}
      {d.kaldirilan.length > 0 && (
        <details class="kucuk"><summary>Kaldırılan anlatımlar ({d.kaldirilan.length})</summary>
          <ul>{d.kaldirilan.map((k) => <li key={k.kod}>{k.kaynakKaydi?.ad ?? 'Kaynağı yazılmamış'}{k.ozet ? ` · ${k.ozet}` : ''} <button class="dugme sade kucuk" onClick={() => kaldir(k.kod, true)}>Geri getir</button></li>)}</ul>
        </details>
      )}
      {hata && <p class="hata kucuk">{hata}</p>}
      {form ? <AnlatimFormu istemci={istemci} evren={evren} d={d} eski={form === 'yeni' ? null : form} kapat={() => setForm(null)} />
        : <button class="dugme sade kucuk" onClick={() => setForm('yeni')}>Anlatım ekle</button>}
      <p class="soluk kucuk">{d.not}</p>
    </div>
  );
}

function AnlatimFormu({ istemci, evren, d, eski, kapat }: { istemci: Istemci; evren: string; d: IddiaDosyasi; eski: Anlatim | null; kapat: () => void }) {
  const [t, setT] = useState<AnlatimTanimi>(eski ? { iddia: eski.iddia, kaynak: eski.kaynak, tur: eski.tur, destek: eski.destek, itiraz: eski.itiraz, dayanak: eski.dayanak, dayanakTuru: eski.dayanakTuru, ozet: eski.ozet, karar: eski.karar }
    : { iddia: d.iddia.kod, kaynak: null, tur: 'tanik', destek: null, itiraz: [], dayanak: null, dayanakTuru: null, ozet: '', karar: 'kesin' });
  const [kaynak, setKaynak] = useState<{ kod: string; ad: string } | null>(eski?.kaynakKaydi ?? null);
  const [hata, setHata] = useState<string | null>(null);
  const kaydet = (e: Event) => {
    e.preventDefault();
    istemci.iste('anlatimYaz', { evren, kod: eski?.kod ?? null, tanim: { ...t, kaynak: kaynak?.kod ?? null } }).then(kapat, (x) => setHata(hataYaz(x)));
  };
  const tutum = (k: string) => t.destek === k ? 'destek' : t.itiraz.includes(k) ? 'itiraz' : '';
  const tutumSec = (k: string, v: string) => setT({ ...t, destek: v === 'destek' ? k : t.destek === k ? null : t.destek, itiraz: v === 'itiraz' ? [...t.itiraz.filter((x) => x !== k), k] : t.itiraz.filter((x) => x !== k) });
  const digerleri = d.anlatimlar.filter((a) => a.kod !== eski?.kod);
  return (
    <form class="kart anlatim-formu" onSubmit={kaydet}>
      <div class="satir">
        <label class="alan"><span class="alan-adi">Türü</span>
          <select class="girdi" value={t.tur} onChange={(e) => setT({ ...t, tur: (e.target as HTMLSelectElement).value as AnlatimTanimi['tur'] })}>
            {ANLATIM_TURLERI.map((x) => <option value={x.kod}>{x.ad}</option>)}
          </select></label>
        <div class="alan"><span class="alan-adi">Kimden ya da nereden?</span>
          <span class="satir"><KayitSec istemci={istemci} evren={evren} secili={kaynak} etiket="Kaynak seç (isteğe bağlı)" sec={setKaynak} />
            {kaynak && <button type="button" class="dugme sade kucuk" aria-label="Kaynağı kaldır" onClick={() => setKaynak(null)}>×</button>}</span></div>
      </div>
      <div class="alan"><span class="alan-adi">Bu anlatım cevaplar hakkında ne diyor?</span>
        {d.cevaplar.map((c) => (
          <label class="satir kucuk" key={c.secenek.kod}><span style="min-width:10em">{c.secenek.metin}</span>
            <select class="girdi" aria-label={`${c.secenek.metin}: anlatımın tutumu`} value={tutum(c.secenek.kod)} onChange={(e) => tutumSec(c.secenek.kod, (e.target as HTMLSelectElement).value)}>
              <option value="">Değinmiyor</option><option value="destek">Destekliyor</option><option value="itiraz">İtiraz ediyor</option>
            </select></label>
        ))}
      </div>
      {digerleri.length > 0 && (
        <div class="satir">
          <label class="alan"><span class="alan-adi">Başka bir anlatıma mı dayanıyor?</span>
            <select class="girdi" value={t.dayanak ?? ''} onChange={(e) => { const v = (e.target as HTMLSelectElement).value || null; setT({ ...t, dayanak: v, dayanakTuru: v ? t.dayanakTuru ?? 'kopya' : null }); }}>
              <option value="">Hayır, kendi kaynağı var</option>
              {digerleri.map((a) => <option value={a.kod}>{turAdi(a.tur)}{a.kaynakKaydi ? `: ${a.kaynakKaydi.ad}` : ''}{a.ozet ? ` · ${a.ozet.slice(0, 40)}` : ''}</option>)}
            </select></label>
          {t.dayanak && (
            <label class="alan"><span class="alan-adi">Nasıl?</span>
              <select class="girdi" value={t.dayanakTuru ?? 'kopya'} onChange={(e) => setT({ ...t, dayanakTuru: (e.target as HTMLSelectElement).value as AnlatimTanimi['dayanakTuru'] })}>
                {DAYANAK_TURLERI.map((x) => <option value={x.kod}>{x.ad}</option>)}
              </select></label>
          )}
        </div>
      )}
      <label class="alan"><span class="alan-adi">Kısa açıklama</span>
        <input class="girdi" lang="tr" maxLength={300} value={t.ozet} onInput={(e) => setT({ ...t, ozet: (e.target as HTMLInputElement).value })} /></label>
      <label class="alan"><span class="alan-adi">Karar durumu</span>
        <KararSecici etiket="Anlatım" karar={t.karar} onDegis={(k) => setT({ ...t, karar: k })} /></label>
      {hata && <p class="hata kucuk">{hata}</p>}
      <div class="satir">
        <button class="dugme ana kucuk" type="submit">{eski ? 'Kaydet' : 'Anlatımı ekle'}</button>
        <button class="dugme sade kucuk" type="button" onClick={kapat}>Vazgeç</button>
      </div>
    </form>
  );
}
