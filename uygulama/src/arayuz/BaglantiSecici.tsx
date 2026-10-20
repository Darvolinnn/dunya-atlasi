// Bağlantı seçim kutusu (§5.1): mevcut bir kaydı seç ya da türü ve özetiyle yeni kayıt oluştur.
// Yeni kayıt "fikir" durumunda doğar ve "Bahsedilen ama yazılmamış" listesine düşer.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { AramaSonucu } from '../veri/api';
import { turBul, grupSinifi } from '../alan/turler';
import { KararRozeti, TurSecici } from './ortak';

export interface Secim { kod: string; ad: string }

const NEREDEN: Record<string, string> = { lakap: 'lakabı', onceki: 'eski adı', okunus: 'okunuşu', kok: 'çekimli biçimden', ozet: 'özetinde' };

/** Yeni kayıt için ad önerisi: kesmeden sonraki ek atılır ("Velkar'dan" → "Velkar"); gerisini yazar düzeltir. */
const adOnerisi = (sorgu: string) => sorgu.replace(/['’][\p{L}]+$/u, '').trim();

/** Satır içi kipte klavye editörde kalır; ok tuşları, Enter ve Esc buraya iletilir. */
export interface SeciciTutamagi { tus(e: KeyboardEvent): boolean }

export function BaglantiSecici({ istemci, evren, sorgu: disSorgu, konum, sec, kapat, satirIci, tutamak, kendiligindenTek }: {
  istemci: Istemci; evren: string; sorgu: string; konum: { left: number; top: number };
  sec: (s: AramaSonucu | Secim) => void; kapat: () => void;
  /** true: arama metni editörde yazılır ("[[" sonrası); kutuda ayrı arama alanı olmaz. */
  satirIci?: boolean; tutamak?: { current: SeciciTutamagi | null };
  /** Tek güçlü eşleşme varsa sormadan seç ("]]" ile kapatılan kısayol). */
  kendiligindenTek?: boolean;
}) {
  const [icSorgu, setSorgu] = useState(disSorgu);
  const sorgu = satirIci ? disSorgu : icSorgu;
  const [sonuclar, setSonuclar] = useState<AramaSonucu[]>([]);
  const [etkin, setEtkin] = useState(0);
  const [yeni, setYeni] = useState<{ ad: string; tur: string; ozet: string } | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const girdi = useRef<HTMLInputElement>(null);
  const kutu = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!satirIci) { girdi.current?.focus(); girdi.current?.select(); } }, []);
  useEffect(() => {
    let iptal = false;
    if (!sorgu.trim()) { setSonuclar([]); return; }
    istemci.iste('ara', { evren, metin: sorgu, sinir: 8, metinde: false }).then((r) => {
      if (iptal) return;
      const tam = r.filter((x) => x.tam);
      if (kendiligindenTek && tam.length === 1) { sec(tam[0]); return; }
      setSonuclar(r);
      setEtkin(0);
    });
    return () => { iptal = true; };
  }, [sorgu]);
  useEffect(() => {
    const disari = (e: MouseEvent) => { if (kutu.current && !kutu.current.contains(e.target as Node)) kapat(); };
    document.addEventListener('mousedown', disari);
    return () => document.removeEventListener('mousedown', disari);
  }, []);

  const tamlar = sonuclar.filter((s) => s.tam);
  const yeniSecenek = sorgu.trim() && !sonuclar.some((s) => s.nereden.tur === 'ad' && s.tam);
  const secenekSayisi = sonuclar.length + (yeniSecenek ? 1 : 0);

  const yeniAc = () => {
    setYeni({ ad: adOnerisi(sorgu), tur: 'karakter', ozet: '' });
  };

  const olustur = async (e: Event) => {
    e.preventDefault();
    if (!yeni || !yeni.ad.trim()) return;
    try {
      const { kod } = await istemci.iste('kayitOlustur', { evren, ad: yeni.ad, tur: yeni.tur, ozet: yeni.ozet, karar: 'fikir' });
      sec({ kod, ad: yeni.ad.trim() });
    } catch (err) { setHata((err as Error).message); }
  };

  const tus = (e: KeyboardEvent): boolean => {
    if (e.key === 'Escape') kapat();
    else if (e.key === 'ArrowDown') setEtkin((i) => Math.min(secenekSayisi - 1, i + 1));
    else if (e.key === 'ArrowUp') setEtkin((i) => Math.max(0, i - 1));
    else if (e.key === 'Enter' || (e.key === 'Tab' && satirIci)) {
      if (etkin < sonuclar.length) sec(sonuclar[etkin]);
      else if (yeniSecenek) yeniAc();
      else return false;
    } else return false;
    e.preventDefault();
    return true;
  };
  if (tutamak) tutamak.current = yeni ? null : { tus };

  // Ekranın dışına taşmasın.
  const sol = Math.max(8, Math.min(konum.left, innerWidth - 360));
  const ust = Math.min(konum.top, innerHeight - 80);

  return (
    <div ref={kutu} class="secici" style={{ left: sol + 'px', top: ust + 'px' }} role="dialog" aria-label="Bağlantı">
      {!yeni ? (
        <>
          {satirIci ? <p class="kucuk secici-not">Bağlantı: <strong>{sorgu || '…'}</strong> <span class="soluk">· ↑↓ seç, Enter bağla, Esc vazgeç</span></p> :
          <input ref={girdi} class="girdi" value={sorgu} placeholder="Kayıt ara" aria-label="Bağlanacak kayıt" lang="tr" spellcheck={false}
            role="combobox" aria-expanded="true" aria-controls="secici-liste" aria-activedescendant={`secici-${etkin}`}
            onInput={(e) => setSorgu((e.target as HTMLInputElement).value)} onKeyDown={tus} />}
          {tamlar.length > 1 && <p class="soluk kucuk secici-not">Bu adla birden çok kayıt var; türlerine ve özetlerine bakarak seçin.</p>}
          <ul id="secici-liste" class="secici-liste" role="listbox">
            {sonuclar.map((s, i) => {
              const tur = turBul(s.tur);
              return (
                <li id={`secici-${i}`} role="option" aria-selected={i === etkin} class={i === etkin ? 'etkin' : ''}
                  onMouseEnter={() => setEtkin(i)} onMouseDown={(e) => { e.preventDefault(); sec(s); }}>
                  <span class={`tur-rozeti kucuk-rozet ${grupSinifi(tur)}`} aria-hidden="true">{tur.kisa}</span>
                  <span class="govde">
                    <span class="satir-ad">{s.ad} <KararRozeti karar={s.karar} /></span>
                    <span class="soluk kucuk">{tur.ad}{s.ozet ? ` · ${s.ozet}` : ''}{NEREDEN[s.nereden.tur] && s.nereden.tur !== 'ozet' ? ` · ${NEREDEN[s.nereden.tur]}${s.nereden.tur !== 'kok' ? ` “${s.nereden.metin}”` : ''}` : ''}</span>
                  </span>
                </li>
              );
            })}
            {yeniSecenek && (
              <li id={`secici-${sonuclar.length}`} role="option" aria-selected={etkin === sonuclar.length} class={etkin === sonuclar.length ? 'etkin' : ''}
                onMouseEnter={() => setEtkin(sonuclar.length)} onMouseDown={(e) => { e.preventDefault(); yeniAc(); }}>
                <span class="tur-rozeti kucuk-rozet" aria-hidden="true">+</span>
                <span class="govde"><span class="satir-ad">Yeni kayıt: “{adOnerisi(sorgu)}”</span><span class="soluk kucuk">Fikir olarak oluşturulur</span></span>
              </li>
            )}
          </ul>
          {!sorgu.trim() && <p class="soluk kucuk secici-not">Bağlanacak kaydın adını yazın.</p>}
        </>
      ) : (
        <form class="secici-yeni" onSubmit={olustur} onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setYeni(null); } }}>
          <strong>Yeni kayıt</strong>
          <label class="alan"><span class="alan-adi">Ad</span>
            <input class="girdi" value={yeni.ad} autoFocus lang="tr" spellcheck={false} onInput={(e) => setYeni({ ...yeni, ad: (e.target as HTMLInputElement).value })} /></label>
          <label class="alan"><span class="alan-adi">Tür</span>
            <TurSecici deger={yeni.tur} onDegis={(tur) => setYeni({ ...yeni, tur })} /></label>
          <label class="alan"><span class="alan-adi">Kısa özet (isteğe bağlı)</span>
            <input class="girdi" value={yeni.ozet} lang="tr" onInput={(e) => setYeni({ ...yeni, ozet: (e.target as HTMLInputElement).value })} /></label>
          {hata && <span class="hata kucuk">{hata}</span>}
          <div class="satir">
            <button class="dugme ana" type="submit" disabled={!yeni.ad.trim()}>Oluştur ve bağla</button>
            <button class="dugme" type="button" onClick={() => setYeni(null)}>Geri</button>
          </div>
        </form>
      )}
    </div>
  );
}
