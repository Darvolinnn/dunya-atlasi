// F12 "Neden her yerde kullanılmıyor?" masası: bağlı alanlar ve her biri için maliyet, erişim, karşı önlem, yasak.
// Hücreler yazarın metinleridir; program hüküm vermez. Yazılmamış hücre eksik sayılmaz.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { KullanimAlani, KullanimMasasi } from '../veri/api';
import { KULLANIM_HUCRELERI } from '../alan/kullanim-masasi';
import { KayitSec } from './KayitBolumleri';
import { useYukle } from './Anlati';

const hataYaz = (e: unknown) => (e as Error).message;
type Satir = KullanimAlani & { gorunenAd: string };

export function KullanimMasasiBolumu({ istemci, evren, kod, saltOkunur }: { istemci: Istemci; evren: string; kod: string; saltOkunur?: boolean }) {
  const [m] = useYukle<KullanimMasasi>(istemci, evren, () => istemci.iste('kullanimMasasi', { evren, kod }), [kod]);
  const [taslak, setTaslak] = useState<Satir[] | null>(null);
  const [yeniAd, setYeniAd] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { setTaslak(null); setHata(null); }, [kod]);
  if (!m) return null;
  const satirlar: Satir[] = taslak ?? m.alanlar.map((a) => ({ kod: a.kod, ad: a.ad, kayit: a.kayit, maliyet: a.maliyet, erisim: a.erisim, karsiOnlem: a.karsiOnlem, yasak: a.yasak, gorunenAd: a.ad || a.kayitKaydi?.ad || '' }));
  const duzenle = !!taslak;
  const ekle = (s: Partial<Satir>) => setTaslak([...satirlar, { kod: '', ad: '', kayit: null, maliyet: '', erisim: '', karsiOnlem: '', yasak: '', gorunenAd: '', ...s }]);
  const degis = (i: number, alan: keyof KullanimAlani, v: string) => setTaslak(satirlar.map((x, j) => (j === i ? { ...x, [alan]: v } : x)));
  const kaydet = () => istemci.iste('kullanimMasasiYaz', { evren, kod, tanim: { alanlar: satirlar.map(({ gorunenAd: _, ...a }) => a) } })
    .then(() => { setTaslak(null); setHata(null); }, (e) => setHata(hataYaz(e)));
  const bag = (k: { kod: string; ad: string }) => <a href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a>;
  return (
    <section class="surecler kullanim-masasi" aria-label="Neden her yerde kullanılmıyor">
      <div class="satir"><h2>Neden her yerde kullanılmıyor?</h2><span class="bosluk" />
        {!saltOkunur && !duzenle && <button class="dugme sade kucuk" onClick={() => setTaslak(satirlar)}>Düzenle</button>}</div>
      <p class="soluk kucuk">Bağlı alanları (mahkeme, diplomasi, ticaret…) ekleyin; her biri için maliyeti, kimin erişebildiğini, karşı önlemi ve yasağı kısaca yazın.</p>
      {satirlar.length > 0 && (
        <div class="tablo-kap">
          <table class="karsilastirma kucuk">
            <thead><tr><th>Alan</th>{KULLANIM_HUCRELERI.map((h) => <th>{h.ad}</th>)}{duzenle && <th />}</tr></thead>
            <tbody>{satirlar.map((s, i) => (
              <tr key={s.kod || `y${i}`}>
                <th scope="row">{duzenle && !s.kayit
                  ? <input class="girdi" lang="tr" aria-label={`${i + 1}. alanın adı`} maxLength={80} value={s.ad} onInput={(e) => degis(i, 'ad', (e.target as HTMLInputElement).value)} />
                  : s.kayit ? bag({ kod: s.kayit, ad: s.gorunenAd }) : s.ad}</th>
                {KULLANIM_HUCRELERI.map((h) => (
                  <td>{duzenle
                    ? <textarea class="girdi" lang="tr" rows={2} maxLength={300} aria-label={`${s.gorunenAd || s.ad}: ${h.ad}`} value={s[h.kod]} onInput={(e) => degis(i, h.kod, (e.target as HTMLTextAreaElement).value)} />
                    : s[h.kod] || <span class="soluk">yazılmamış</span>}</td>
                ))}
                {duzenle && <td><button class="dugme sade kucuk" aria-label="Alanı çıkar" onClick={() => setTaslak(satirlar.filter((_, j) => j !== i))}>×</button></td>}
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {duzenle && (
        <>
          {m.adaylar.filter((a) => !satirlar.some((s) => s.kayit === a.kod)).length > 0 && (
            <div class="satir kucuk"><span class="soluk">Bu kayda bağlı olanlar:</span>
              {m.adaylar.filter((a) => !satirlar.some((s) => s.kayit === a.kod)).map((a) => <button class="dugme sade kucuk" onClick={() => ekle({ kayit: a.kod, gorunenAd: a.ad })}>+ {a.ad}</button>)}
            </div>
          )}
          <div class="satir">
            <input class="girdi" lang="tr" maxLength={80} placeholder="Alan adı (ör. Mahkeme)" aria-label="Yeni alanın adı" value={yeniAd} onInput={(e) => setYeniAd((e.target as HTMLInputElement).value)} />
            <button class="dugme sade kucuk" disabled={!yeniAd.trim()} onClick={() => { ekle({ ad: yeniAd.trim(), gorunenAd: yeniAd.trim() }); setYeniAd(''); }}>Alan ekle</button>
            <KayitSec istemci={istemci} evren={evren} secili={null} etiket="Kayıttan alan ekle" sec={(s) => { if (s && !satirlar.some((x) => x.kayit === s.kod)) ekle({ kayit: s.kod, gorunenAd: s.ad }); }} />
          </div>
          {hata && <p class="hata kucuk">{hata}</p>}
          <div class="satir">
            <button class="dugme ana kucuk" onClick={kaydet}>Kaydet</button>
            <button class="dugme sade kucuk" onClick={() => { setTaslak(null); setHata(null); }}>Vazgeç</button>
          </div>
        </>
      )}
      <p class="soluk kucuk">{m.not}</p>
    </section>
  );
}
