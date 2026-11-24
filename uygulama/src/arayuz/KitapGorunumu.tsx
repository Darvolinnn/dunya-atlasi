// Kitap görünümü (K38, §10.11): kapak, bölüm başı, sahne ayracı, içindekiler ve kitap sonu ekleri. PDF, Word ve
// EPUB aynı ayarları kullanır; ayarlar eser başına saklanır. Sağda ilk bölümün başı canlı önizlenir.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import { AYRAC_METNI, SUS, siraSayisi, type IcindekilerDerinligi, type Kitap, type KitapGorunumu, type SahneAyraci } from '../alan/kitap';
import { Gorsel } from './gorsel';

type Secenekler = { gorseller: { kayit: string; ad: string; gorsel: string }[]; haritalar: { kod: string; ad: string }[]; sayilar: { kisiler: number; terimler: number }; takvimVar: boolean };

const AYRACLAR: [SahneAyraci, string, string][] = [['yildizlar', '⁂', 'Üç yıldız, üçgen'], ['uc-yildiz', '* * *', 'Üç yıldız, yan yana'], ['sus', SUS, 'Süs'], ['bos', 'Boş satır', 'Boş satır']];
const ICINDEKILER: [IcindekilerDerinligi, string][] = [['bolumler', 'Bölümler'], ['sahneler', 'Bölümler ve sahneler'], ['yok', 'Yok']];

function Secim({ secili, onClick, children, baslik }: { secili: boolean; onClick: () => void; children: preact.ComponentChildren; baslik?: string }) {
  return <button type="button" class={`cip kitap-cipi${secili ? ' aktif' : ''}`} aria-pressed={secili} title={baslik} aria-label={baslik} onClick={onClick}>{children}</button>;
}

export function KitapGorunumuAyarlari({ istemci, evren, eser, sahneler }: { istemci: Istemci; evren: string; eser: string; sahneler?: string[] }) {
  const [g, setG] = useState<KitapGorunumu | null>(null);
  const [s, setS] = useState<Secenekler | null>(null);
  const [kitap, setKitap] = useState<Kitap | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [kapakSecimi, setKapakSecimi] = useState(false);
  const dosya = useRef<HTMLInputElement>(null);
  const anahtar = sahneler?.join(',') ?? '';
  useEffect(() => {
    let iptal = false;
    istemci.iste('kitapGorunumu', { evren, eser, sahneler }).then(({ gorunum, ...x }) => { if (!iptal) { setG(gorunum); setS(x); } }, (e) => setHata((e as Error).message));
    istemci.iste('eserKitabi', { evren, eser, sahneler }).then((r) => { if (!iptal) setKitap(r.kitap); }, () => { if (!iptal) setKitap(null); });
    return () => { iptal = true; };
  }, [evren, eser, anahtar]);
  if (!g || !s) return hata ? <p class="hata kucuk">{hata}</p> : null;

  const degis = (d: Partial<KitapGorunumu>) => {
    const yeni = { ...g, ...d };
    setG(yeni); setHata(null);
    istemci.iste('kitapGorunumuYaz', { evren, eser, gorunum: yeni }).catch((e) => setHata((e as Error).message));
  };
  const dosyadan = async (f: File | undefined) => {
    if (!f) return;
    try {
      const r = await istemci.iste('gorselEkle', { evren, kod: eser, dosyaAdi: f.name, tur: f.type, veri: new Uint8Array(await f.arrayBuffer()) });
      degis({ kapak: r.ad }); setKapakSecimi(false);
    } catch (e) { setHata((e as Error).message); }
  };
  const tekGorseller = s.gorseller.filter((x, i, l) => l.findIndex((y) => y.gorsel === x.gorsel) === i);

  // Önizleme: ilk bölümün adı ve ilk iki sahnesinin başı.
  const bolum = kitap?.bolumler[0];
  const sahneMetni = (i: number) => bolum?.sahneler[i]?.bloklar.find((b) => b.tur === 'paragraf')?.parcalar.map((p) => p.metin).join('') ?? '';
  const ilk = sahneMetni(0).slice(0, 260), ikinci = sahneMetni(1).slice(0, 120);
  const kitapAdi = kitap?.ad ?? '';
  return (
    <details class="kitap-gorunumu" open>
      <summary class="kucuk"><strong>Kitap görünümü</strong> <span class="soluk">PDF, Word ve EPUB aynı ayarları kullanır; bu eser için saklanır.</span></summary>
      <div class="kitap-gorunumu-ic">
        <div class="kitap-ayarlari">
          <div class="kitap-ayari">
            <span class="alan-adi">Kapak görseli</span>
            <div class="satir">
              <button type="button" class="dugme kucuk" aria-expanded={kapakSecimi} onClick={() => setKapakSecimi(!kapakSecimi)} disabled={!tekGorseller.length}>Kayıtların görsellerinden seç</button>
              <button type="button" class="dugme kucuk" onClick={() => dosya.current?.click()}>Dosyadan</button>
              <input ref={dosya} type="file" accept="image/*" hidden onChange={(e) => { const t = e.target as HTMLInputElement; void dosyadan(t.files?.[0]); t.value = ''; }} />
              {g.kapak ? <button type="button" class="dugme sade kucuk" onClick={() => degis({ kapak: null })}>Kapak görselini kaldır</button>
                : <span class="soluk kucuk">Seçilmezse yalnız ad ve yazar yazılı sade kapak</span>}
            </div>
            {kapakSecimi && (
              <div class="kapak-secenekleri" role="listbox" aria-label="Kapak görseli">
                {tekGorseller.map((x) => (
                  <button key={x.gorsel} type="button" role="option" aria-selected={g.kapak === x.gorsel} class={g.kapak === x.gorsel ? 'aktif' : ''} title={x.ad}
                    onClick={() => { degis({ kapak: x.gorsel }); setKapakSecimi(false); }}>
                    <Gorsel istemci={istemci} evren={evren} ad={x.gorsel} alt={x.ad} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div class="kitap-ayari">
            <span class="alan-adi">Bölüm başı</span>
            <div class="liste">
              <Secim secili={g.basHarf} onClick={() => degis({ basHarf: !g.basHarf })}>Büyük baş harf</Secim>
              <Secim secili={g.sus} onClick={() => degis({ sus: true })}>Süs: {SUS}</Secim>
              <Secim secili={!g.sus} onClick={() => degis({ sus: false })}>Süs yok</Secim>
              <Secim secili={g.bolumYaziyla} onClick={() => degis({ bolumYaziyla: !g.bolumYaziyla })}>Bölüm numarası yazıyla (“Birinci Bölüm”)</Secim>
            </div>
          </div>
          <div class="kitap-ayari">
            <span class="alan-adi">Sahne ayracı</span>
            <div class="liste">{AYRACLAR.map(([k, yazi, ad]) => <Secim key={k} secili={g.ayrac === k} baslik={ad} onClick={() => degis({ ayrac: k })}>{yazi}</Secim>)}</div>
          </div>
          <div class="kitap-ayari">
            <span class="alan-adi">İçindekiler</span>
            <div class="liste">{ICINDEKILER.map(([k, ad]) => <Secim key={k} secili={g.icindekiler === k} onClick={() => degis({ icindekiler: k })}>{ad}</Secim>)}</div>
          </div>
          <div class="kitap-ayari">
            <span class="alan-adi">Kitap sonu ekleri</span>
            <label class="kucuk"><input type="checkbox" checked={g.kisiler} onChange={(e) => degis({ kisiler: (e.target as HTMLInputElement).checked })} /> Kişiler dizini <span class="soluk">(çıktıda geçen {s.sayilar.kisiler} karakter, kısa özetleriyle)</span></label>
            <label class="kucuk"><input type="checkbox" checked={g.terimler} onChange={(e) => degis({ terimler: (e.target as HTMLInputElement).checked })} /> Terimler sözlüğü <span class="soluk">(Sözlük'ten, geçen {s.sayilar.terimler} terim)</span></label>
            <label class="kucuk"><input type="checkbox" checked={g.takvim} disabled={!s.takvimVar && !g.takvim} onChange={(e) => degis({ takvim: (e.target as HTMLInputElement).checked })} /> Takvim <span class="soluk">({s.takvimVar ? 'ay ve gün adları' : 'takvim tanımlanmamış'})</span></label>
            <div class="satir kucuk">
              <label><input type="checkbox" checked={!!g.harita} disabled={!s.haritalar.length} onChange={(e) => degis({ harita: (e.target as HTMLInputElement).checked ? s.haritalar[0]?.kod ?? null : null })} /> Harita:</label>
              {s.haritalar.length ? (
                <select value={g.harita ?? s.haritalar[0].kod} onChange={(e) => degis({ harita: (e.target as HTMLSelectElement).value })}>
                  {s.haritalar.map((h) => <option key={h.kod} value={h.kod}>{h.ad}</option>)}
                </select>
              ) : <span class="soluk">harita yok</span>}
            </div>
            <p class="soluk kucuk">Ekler yalnız çıktıya giren sahnelerde geçen kayıtlarla kitabın sonuna eklenir.</p>
          </div>
          {hata && <p class="hata kucuk" role="alert">{hata}</p>}
        </div>
        <div class="kitap-onizleme" aria-label="Önizleme">
          <div class="kitap-kapak">
            {g.kapak && <Gorsel istemci={istemci} evren={evren} ad={g.kapak} alt="" sinif="kitap-kapak-gorseli" />}
            <strong>{kitapAdi}</strong>
          </div>
          <div class="kitap-sayfa" lang="tr">
            {bolum ? <>
              {g.bolumYaziyla && <p class="kitap-numara">{siraSayisi(1)} Bölüm</p>}
              <h4>{bolum.baslik}</h4>
              {g.sus && <p class="kitap-sus" aria-hidden="true">{SUS}</p>}
              <p class={g.basHarf ? 'bas-harfli' : ''}>{ilk || <span class="soluk">Bu bölümün metni henüz yok.</span>}{sahneMetni(0).length > 260 ? '…' : ''}</p>
              {ikinci && <>
                {g.ayrac === 'bos' ? <p class="kitap-ayrac" aria-hidden="true">&nbsp;</p> : <p class="kitap-ayrac" aria-hidden="true">{AYRAC_METNI[g.ayrac]}</p>}
                <p>{ikinci}{sahneMetni(1).length > 120 ? '…' : ''}</p>
              </>}
            </> : <p class="soluk kucuk">Önizleme için çıktıya giren bir bölüm gerekiyor.</p>}
          </div>
        </div>
      </div>
    </details>
  );
}

