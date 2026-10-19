// Kalıtım ve veraset (§15-8). Biyolojik ebeveynlik, hukuki ebeveynlik ve veraset ayrı gösterilir.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { KalitimBilgisi, KalitimDegeri, KalitimOzelligi, KisaKayit, TahtSirasi, VerasetKurali } from '../veri/api';

const hataYaz = (e: unknown) => (e as Error).message;
const bag = (evren: string, k: KisaKayit) => <a href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a>;
const KIPLER: { kod: KalitimOzelligi['kip']; ad: string }[] = [{ kod: 'baskin', ad: 'tek genli, baskın' }, { kod: 'cekinik', ad: 'tek genli, çekinik' }, { kod: 'cok_genli', ad: 'çok genli' }];
const yuzde = (x: number) => `%${Math.round(x * 100)}`;
const KURALLAR: { kod: VerasetKurali['tur']; ad: string }[] = [
  { kod: 'ilk_dogan', ad: 'İlk doğan ve soyu, sonra kardeşler' }, { kod: 'kardes_once', ad: 'Önce kardeşler, sonra çocuklar' }, { kod: 'secim', ad: 'Seçimle (sıra hesaplanmaz)' },
];

export function KalitimBolumu({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [k, setK] = useState<KalitimBilgisi | null>(null);
  const [yeni, setYeni] = useState<{ ad: string; kip: KalitimOzelligi['kip'] }>({ ad: '', kip: 'baskin' });
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { istemci.iste('kalitim', { evren, kod }).then(setK, () => {}); }, [kod, surum]);
  if (!k) return null;
  const degerYaz = (ozellik: string, d: KalitimDegeri) => istemci.iste('kalitimDegeriYaz', { evren, kod, ozellik, deger: d }).then(() => setHata(null), (x) => setHata(hataYaz(x)));
  return (
    <section class="surecler" aria-label="Kalıtım">
      <details open={k.ozellikler.length > 0}>
        <summary><h2 style="display:inline">Kalıtım</h2></summary>
        <p class="soluk kucuk">Yalnızca biyolojik ebeveynlerden hesaplanır{k.ebeveynler.length ? ` (${k.ebeveynler.map((x) => x.ad).join(', ')})` : ''}.{k.evlatlik.length ? ` Evlatlık ilişkisi (${k.evlatlik.map((x) => x.ad).join(', ')}) kalıtımda sayılmaz.` : ''} Olasılık bir aralıktır; kesin sonuç değildir.</p>
        {k.ozellikler.length > 0 && <ul class="toplanan-listesi">{k.ozellikler.map((s) => {
          const d: KalitimDegeri = s.deger ?? { gorunur: null, kopya: null };
          return (
            <li key={s.ozellik.kod}><strong>{s.ozellik.ad}</strong> <span class="soluk kucuk">({KIPLER.find((x) => x.kod === s.ozellik.kip)!.ad})</span>
              <div class="satir">
                <select class="girdi kucuk-secim" aria-label={`${s.ozellik.ad} görünür mü`} value={d.gorunur === null ? '' : d.gorunur ? 'evet' : 'hayir'}
                  onChange={(e) => { const v = (e.target as HTMLSelectElement).value; void degerYaz(s.ozellik.kod, { ...d, gorunur: v === '' ? null : v === 'evet' }); }}>
                  <option value="">görünürlüğü bilinmiyor</option><option value="evet">görünür</option><option value="hayir">görünmez</option>
                </select>
                {s.ozellik.kip !== 'cok_genli' && (
                  <select class="girdi kucuk-secim" aria-label={`${s.ozellik.ad} kaç kopya`} value={d.kopya === null ? '' : String(d.kopya)}
                    onChange={(e) => { const v = (e.target as HTMLSelectElement).value; void degerYaz(s.ozellik.kod, { ...d, kopya: v === '' ? null : Number(v) as 0 | 1 | 2 }); }}>
                    <option value="">taşıdığı bilinmiyor</option><option value="0">taşımıyor</option><option value="1">bir kopya</option><option value="2">iki kopya</option>
                  </select>
                )}
                {s.olasilik && <span class="kucuk">Ebeveynlerine göre görünme olasılığı: {s.olasilik.enAz === s.olasilik.enCok ? yuzde(s.olasilik.enAz) : `${yuzde(s.olasilik.enAz)}–${yuzde(s.olasilik.enCok)}`}</span>}
              </div>
              <div class={s.beklenmez ? 'kucuk uyari-yazisi' : 'soluk kucuk'}>{s.aciklama}</div>
              {s.ozellik.not && <div class="soluk kucuk">{s.ozellik.not}</div>}
            </li>
          );
        })}</ul>}
        <form class="satir" onSubmit={(e) => { e.preventDefault(); istemci.iste('kalitimOzelligiYaz', { evren, kod: null, tanim: { ...yeni, not: '' } }).then(() => { setYeni({ ad: '', kip: yeni.kip }); setHata(null); istemci.iste('kalitim', { evren, kod }).then(setK); }, (x) => setHata(hataYaz(x))); }}>
          <input class="girdi" lang="tr" aria-label="Yeni özellik" placeholder="Yeni özellik (gümüş göz…)" value={yeni.ad} onInput={(e) => setYeni({ ...yeni, ad: (e.target as HTMLInputElement).value })} />
          <select class="girdi kucuk-secim" aria-label="Kalıtım biçimi" value={yeni.kip} onChange={(e) => setYeni({ ...yeni, kip: (e.target as HTMLSelectElement).value as KalitimOzelligi['kip'] })}>
            {KIPLER.map((x) => <option value={x.kod}>{x.ad}</option>)}
          </select>
          <button class="dugme kucuk" type="submit" disabled={!yeni.ad.trim()}>Özellik ekle</button>
        </form>
        <p class="soluk kucuk">Özellikler evrenin bütün karakterleri için ortaktır.</p>
        {hata && <p class="hata kucuk">{hata}</p>}
      </details>
    </section>
  );
}

export function VerasetBolumu({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [kural, setKural] = useState<VerasetKurali | null | undefined>(undefined);
  const [tarih, setTarih] = useState('');
  const [t, setT] = useState<TahtSirasi | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { istemci.iste('veraset', { evren, kod }).then(setKural, () => {}); }, [kod, surum]);
  if (kural === undefined) return null;
  const k: VerasetKurali = kural ?? { tur: 'ilk_dogan', evlatlik: false, evlilikDisi: false, not: '' };
  const yaz = (x: Partial<VerasetKurali>) => istemci.iste('verasetYaz', { evren, kod, kural: { ...k, ...x } }).then(() => setHata(null), (e) => setHata(hataYaz(e)));
  const goster = () => istemci.iste('tahtSirasi', { evren, kod, tarih }).then((x) => { setT(x); setHata(null); }, (e) => { setT(null); setHata(hataYaz(e)); });
  return (
    <section class="surecler" aria-label="Veraset">
      <h2>Veraset</h2>
      <div class="satir">
        <select class="girdi kucuk-secim" aria-label="Veraset kuralı" value={kural ? k.tur : ''} onChange={(e) => { const v = (e.target as HTMLSelectElement).value; if (v) void yaz({ tur: v as VerasetKurali['tur'] }); else istemci.iste('verasetYaz', { evren, kod, kural: null }).catch((x) => setHata(hataYaz(x))); }}>
          <option value="">Kural yazılmamış</option>
          {KURALLAR.map((x) => <option value={x.kod}>{x.ad}</option>)}
        </select>
        {kural && kural.tur !== 'secim' && (
          <>
            <label class="kucuk"><input type="checkbox" checked={k.evlatlik} onChange={(e) => yaz({ evlatlik: (e.target as HTMLInputElement).checked })} /> Evlatlık varis olur</label>
            <label class="kucuk"><input type="checkbox" checked={k.evlilikDisi} onChange={(e) => yaz({ evlilikDisi: (e.target as HTMLInputElement).checked })} /> Evlilik dışı çocuk varis olur</label>
          </>
        )}
      </div>
      <form class="satir" onSubmit={(e) => { e.preventDefault(); void goster(); }}>
        <input class="girdi" style="width:140px" lang="tr" aria-label="Taht sırası tarihi" placeholder="tarih" value={tarih} onInput={(e) => setTarih((e.target as HTMLInputElement).value)} />
        <button class="dugme kucuk" type="submit" disabled={!tarih.trim()}>Bu tarihte sıra</button>
      </form>
      {hata && <p class="hata kucuk">{hata}</p>}
      {t && (
        <div class="taht-sirasi">
          {t.durum === 'yuruten_yok' && <p class="kucuk">Bu tarihte yürüten kayıtlı değil. Yürütenler makamın “Yürüten” ilişkilerinden okunur.</p>}
          {t.durum === 'birden_cok' && <p class="kucuk">Bu tarihte birden çok yürüten görünüyor; sıra hesaplanmadı.</p>}
          {t.durum === 'kural_yok' && <p class="kucuk">Veraset kuralı seçilmemiş. Yürüten: {bag(evren, t.yuruten!)}.</p>}
          {t.durum === 'secim' && <p class="kucuk">Seçimle belirlenir; sıra hesaplanmaz. Yürüten: {bag(evren, t.yuruten!)}.</p>}
          {t.durum === 'hesaplandi' && (
            <>
              <p class="kucuk">Yürüten: {bag(evren, t.yuruten!)}. Hukuki sıra:</p>
              {!t.sira.length ? <p class="soluk kucuk">Kurala uyan yaşayan akraba kayıtlı değil.</p> : (
                <ol class="toplanan-listesi">{t.sira.map((s) => (
                  <li key={s.kisi.kod}>{bag(evren, s.kisi)} <span class="soluk kucuk">· {s.yakinlik}{s.uyarilar.length ? ` · ${s.uyarilar.join(', ')}` : ''}</span></li>
                ))}</ol>
              )}
            </>
          )}
          {t.sonrakiler.length > 0 && <p class="kucuk">Fiilen sonra yürütenler: {t.sonrakiler.map((s, i) => <>{i > 0 && ', '}{bag(evren, s.kisi)} ({s.baslangic})</>)}</p>}
          <p class="soluk kucuk">{t.not}</p>
        </div>
      )}
    </section>
  );
}
