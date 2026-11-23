// Sürüm farkı (K38, §10.8): seçilen eski hâl şimdiki metinle karşılaştırılır; değişen her paragraf tek başına
// eski hâline döndürülebilir. "İç içe" silinenleri ve eklenenleri aynı satırda, "Yan yana" iki sütunda gösterir.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { Spans } from '../veri/api';
import { metinFarki, type FarkParcasi, type ParagrafFarki } from '../alan/metin-farki';
import { belgeYap } from './MetinEditoru';

const paragraflar = (spans: Spans) => { const d = belgeYap(spans); const l: string[] = []; d.forEach((c) => l.push(c.textContent)); return l; };
const anahtar = 'dunya-atlasi:surum-farki-gorunumu';
const okuYerel = (a: string) => { try { return localStorage.getItem(a); } catch { return null; } };
const yazYerel = (a: string, v: string) => { try { localStorage.setItem(a, v); } catch { /* yok */ } };

function Parcalar({ l, yan }: { l: FarkParcasi[]; yan?: 'eski' | 'yeni' }) {
  return <>{l.map((p, i) => p.tur === 'ayni' ? <span key={i}>{p.metin}</span>
    : p.tur === 'sil' ? (yan === 'yeni' ? null : <del key={i}>{p.metin}</del>)
    : (yan === 'eski' ? null : <ins key={i}>{p.metin}</ins>))}</>;
}

export function SurumFarki({ istemci, evren, kayit, basliklar, baslik, tumunuDondur, tumunuAdi, degisti }: {
  istemci: Istemci; evren: string; kayit: string; basliklar: string[]; baslik: string;
  tumunuDondur: () => Promise<void>; tumunuAdi: string; degisti: () => void;
}) {
  const [v, setV] = useState<{ fark: ParagrafFarki[]; temel: string[] } | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yan, setYan] = useState(() => okuYerel(anahtar) === 'yan');
  const [surum, setSurum] = useState(0);
  useEffect(() => {
    let iptal = false;
    Promise.all([istemci.iste('metinSurumu', { evren, kayit, alan: 'govde', basliklar }), istemci.iste('metinAc', { evren, kayit, alan: 'govde' })])
      .then(([e, s]) => { if (!iptal) { setV({ fark: metinFarki(paragraflar(e.spans), paragraflar(s.spans)), temel: s.basliklar }); setHata(null); } }, (x) => setHata((x as Error).message));
    return () => { iptal = true; };
  }, [kayit, basliklar.join(','), surum]);
  const gorunum = (y: boolean) => { setYan(y); yazYerel(anahtar, y ? 'yan' : 'ic'); };
  const geriAl = async (a: { eski?: number; yeni?: number; yer?: number }) => {
    try {
      await istemci.iste('metinParagrafGeriAl', { evren, kayit, alan: 'govde', basliklar, temel: v!.temel, ...a });
      setSurum((x) => x + 1); degisti();
    } catch (e) { setHata((e as Error).message); setSurum((x) => x + 1); }
  };
  if (!v) return hata ? <p class="hata">{hata}</p> : <p class="soluk">Karşılaştırılıyor…</p>;
  const sayi = v.fark.filter((f) => f.tur !== 'ayni').length;
  return (
    <div class={yan ? 'surum-farki yan-yana' : 'surum-farki'}>
      <div class="satir">
        <div class="sekmeler" role="tablist" aria-label="Karşılaştırma görünümü">
          <button class="sekme" role="tab" aria-selected={!yan} onClick={() => gorunum(false)}>İç içe</button>
          <button class="sekme" role="tab" aria-selected={yan} onClick={() => gorunum(true)}>Yan yana</button>
        </div>
      </div>
      <p class="soluk kucuk">{baslik} ile şimdiki metin · {sayi ? `${sayi} paragraf değişmiş` : 'fark yok'}</p>
      {hata && <p class="hata kucuk">{hata}</p>}
      <div class="fark-metni">
        {v.fark.map((f, i) => {
          const eylem = f.tur === 'ayni' ? <span>değişmedi</span>
            : f.tur === 'degisti' ? <button class="dugme kucuk" onClick={() => void geriAl({ eski: f.eski, yeni: f.yeni })}>Bu paragrafı geri al</button>
            : f.tur === 'eklendi' ? <><span>yeni paragraf</span><button class="dugme kucuk" onClick={() => void geriAl({ yeni: f.yeni })}>Kaldır</button></>
            : <><span>silinmiş paragraf</span><button class="dugme kucuk" onClick={() => void geriAl({ eski: f.eski, yer: f.yer })}>Geri koy</button></>;
          const eski = f.tur === 'ayni' ? f.metin : f.tur === 'degisti' ? <Parcalar l={f.parcalar} yan="eski" /> : f.tur === 'silindi' ? <del>{f.metin}</del> : null;
          const yeni = f.tur === 'ayni' ? f.metin : f.tur === 'degisti' ? <Parcalar l={f.parcalar} yan="yeni" /> : f.tur === 'eklendi' ? <ins>{f.metin}</ins> : null;
          const ic = f.tur === 'ayni' ? f.metin : f.tur === 'degisti' ? <Parcalar l={f.parcalar} /> : f.tur === 'eklendi' ? <ins>{f.metin}</ins> : <del>{f.metin}</del>;
          return (
            <div key={i} class={`fark-paragrafi${f.tur === 'ayni' ? ' ayni' : ''}`}>
              {yan ? <><div>{eski}</div><div>{yeni}</div></> : <div>{ic}</div>}
              <div class="fark-eylem">{eylem}</div>
            </div>
          );
        })}
      </div>
      <div class="satir"><button class="dugme" onClick={() => void tumunuDondur()}>{tumunuAdi}</button></div>
    </div>
  );
}
