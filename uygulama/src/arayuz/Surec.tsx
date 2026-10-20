// Süreç kuralları (§3.10) ve makamı yürütenler (§3.8). Kural bir kayda aittir; olay sayfasında adımların durumu
// işaretlenir. Program sonucu yalnızca yazarın işaretlerinden ve kuralın açık tanımından okur.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { AdimDurumu, MakamYurutucusu, OlaySurecleri, SurecAdimi, SurecKurali } from '../veri/api';
import { SurecSorumluBolumu } from './SurecSorumlu';
import { geriAlinabilir } from './onay';

const hataYaz = (e: unknown) => (e as Error).message;
const DURUMLAR: { kod: AdimDurumu; ad: string }[] = [
  { kod: 'planlandi', ad: 'Planlandı' }, { kod: 'basladi', ad: 'Başladı' }, { kod: 'tamam', ad: 'Tamamlandı' },
  { kod: 'yarida', ad: 'Yarıda kaldı' }, { kod: 'yapilmadi', ad: 'Yapılmadı' },
];
export const SUREC_SAHIPLERI = ['makam', 'topluluk', 'siyasi', 'kultur', 'inanc', 'rituel', 'antlasma', 'buyu_sistemi', 'buyu_uygulamasi', 'evren_kurali', 'teknoloji'];
const yeniAdimKodu = () => 'a' + Math.random().toString(36).slice(2, 10);

function useYenile<T>(oku: () => Promise<T>, bag: unknown[]) {
  const [v, setV] = useState<T | null>(null);
  useEffect(() => { let iptal = false; oku().then((x) => { if (!iptal) setV(x); }, () => {}); return () => { iptal = true; }; }, bag);
  return v;
}

// ---------- Kuralın sahibi olan kayıtta ----------
export function SurecKurallariBolumu({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const l = useYenile(() => istemci.iste('surecKurallari', { evren, sahip: kod }), [kod, surum]);
  const [ad, setAd] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  if (!l) return null;
  return (
    <section class="surecler" aria-label="Süreç kuralları">
      <h2>Süreç kuralları</h2>
      <p class="soluk kucuk">Bir şeyin nasıl yapıldığını ya da kazanıldığını yazın: adımlar, önkoşullar, geri dönülmez eşikler ve sonuç için hangi adımların gerektiği. Program kendiliğinden kural koymaz, yalnızca sizin yazdığınızı uygular.</p>
      {l.map((k) => <KuralDuzenleyici key={k.kod} istemci={istemci} evren={evren} k={k} />)}
      <form class="satir" onSubmit={(e) => { e.preventDefault(); istemci.iste('surecKuraliOlustur', { evren, sahip: kod, ad }).then(() => { setAd(''); setHata(null); }, (x) => setHata(hataYaz(x))); }}>
        <input class="girdi" style="flex:1;min-width:180px" lang="tr" aria-label="Yeni süreç kuralının adı" placeholder="Yeni kural (ör. Kuzey geleneğine göre taç)" value={ad} onInput={(e) => setAd((e.target as HTMLInputElement).value)} />
        <button class="dugme kucuk" type="submit" disabled={!ad.trim()}>Kural ekle</button>
      </form>
      {hata && <p class="hata kucuk">{hata}</p>}
    </section>
  );
}

function KuralDuzenleyici({ istemci, evren, k }: { istemci: Istemci; evren: string; k: SurecKurali }) {
  const kayitli = JSON.stringify({ ad: k.ad, kosullar: k.kosullar, adimlar: k.adimlar });
  const [t, setT] = useState(() => ({ ad: k.ad, kosullar: k.kosullar, adimlar: structuredClone(k.adimlar) }));
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => setT({ ad: k.ad, kosullar: k.kosullar, adimlar: structuredClone(k.adimlar) }), [kayitli]);
  const degisti = JSON.stringify(t) !== kayitli;
  const adim = (i: number, f: (a: SurecAdimi) => void) => { const l = structuredClone(t.adimlar); f(l[i]); setT({ ...t, adimlar: l }); };
  const kaldir = (i: number) => { const silinen = t.adimlar[i].kod; setT({ ...t, adimlar: t.adimlar.filter((_, j) => j !== i).map((a) => ({ ...a, onkosul: a.onkosul.filter((x) => x !== silinen) })) }); };
  return (
    <details class="kart surec-kurali" open={!k.adimlar.length}>
      <summary><strong>{k.ad}</strong> <span class="soluk kucuk">· {k.adimlar.length} adım</span></summary>
      <label class="alan"><span class="alan-adi">Kuralın adı</span>
        <input class="girdi" lang="tr" value={t.ad} onInput={(e) => setT({ ...t, ad: (e.target as HTMLInputElement).value })} /></label>
      <label class="alan"><span class="alan-adi">Başlangıç koşulları</span>
        <textarea class="girdi" rows={2} lang="tr" placeholder="Bu metin yalnızca gösterilir, program ondan sonuç çıkarmaz." value={t.kosullar} onInput={(e) => setT({ ...t, kosullar: (e.target as HTMLTextAreaElement).value })} /></label>
      <ol class="adim-listesi">
        {t.adimlar.map((a, i) => (
          <li key={a.kod}>
            <div class="satir">
              <input class="girdi" style="flex:2;min-width:140px" lang="tr" aria-label={`${i + 1}. adımın adı`} value={a.ad} onInput={(e) => adim(i, (x) => { x.ad = (e.target as HTMLInputElement).value; })} />
              <label class="satir kucuk"><input type="checkbox" checked={a.sonuc} onChange={() => adim(i, (x) => { x.sonuc = !x.sonuc; })} /> Sonuç için gerekli</label>
              <label class="satir kucuk"><input type="checkbox" checked={a.esik} onChange={() => adim(i, (x) => { x.esik = !x.esik; })} /> Geri dönülmez eşik</label>
              <button class="dugme sade kucuk" aria-label={`${a.ad || 'Adım'}: kaldır`} onClick={() => kaldir(i)}>×</button>
            </div>
            <input class="girdi kucuk" lang="tr" aria-label={`${i + 1}. adımın etkisi`} placeholder="Etkisi (isteğe bağlı, ör. bedel burada ödenir)" value={a.etki} onInput={(e) => adim(i, (x) => { x.etki = (e.target as HTMLInputElement).value; })} />
            {i > 0 && (
              <span class="satir kucuk soluk">Önce gerekenler:
                {t.adimlar.slice(0, i).map((o) => (
                  <label key={o.kod} class="satir"><input type="checkbox" checked={a.onkosul.includes(o.kod)}
                    onChange={() => adim(i, (x) => { x.onkosul = x.onkosul.includes(o.kod) ? x.onkosul.filter((y) => y !== o.kod) : [...x.onkosul, o.kod]; })} /> {o.ad || '(adsız)'}</label>
                ))}
              </span>
            )}
          </li>
        ))}
      </ol>
      <div class="satir">
        <button class="dugme sade kucuk" onClick={() => setT({ ...t, adimlar: [...t.adimlar, { kod: yeniAdimKodu(), ad: '', onkosul: [], esik: false, sonuc: false, etki: '' }] })}>Adım ekle</button>
        <span class="bosluk" />
        <button class="dugme ana kucuk" disabled={!degisti} onClick={() => istemci.iste('surecKuraliYaz', { evren, kod: k.kod, tanim: t }).then(() => setHata(null), (x) => setHata(hataYaz(x)))}>Kaydet</button>
        <button class="dugme kucuk" disabled={!degisti} onClick={() => setT({ ad: k.ad, kosullar: k.kosullar, adimlar: structuredClone(k.adimlar) })}>Vazgeç</button>
        <button class="dugme sade kucuk" onClick={() => void geriAlinabilir('Kural kaldırıldı.', () => istemci.iste('surecKuraliSil', { evren, kod: k.kod }), () => istemci.iste('surecKuraliSil', { evren, kod: k.kod, geriYukle: true }))}>Kuralı kaldır</button>
      </div>
      {!t.adimlar.some((a) => a.sonuc) && t.adimlar.length > 0 && <p class="soluk kucuk">Hiçbir adım “sonuç için gerekli” olarak işaretlenmedi. Bu yüzden program sonucun gerçekleşip gerçekleşmediğini söyleyemez.</p>}
      {hata && <p class="hata kucuk">{hata}</p>}
    </details>
  );
}

// ---------- Olay sayfasında ----------
export function OlaySurecBolumu({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const s = useYenile<OlaySurecleri>(() => istemci.iste('olaySurecleri', { evren, olay: kod }), [kod, surum]);
  const tum = useYenile<SurecKurali[]>(() => istemci.iste('surecKurallari', { evren }), [surum]);
  const [hata, setHata] = useState<string | null>(null);
  if (!s || !tum) return null;
  const isle = (p: Promise<unknown>) => p.then(() => setHata(null), (x) => setHata(hataYaz(x)));
  const bagli = new Set(s.surecler.map((x) => x.kural.kod));
  const eklenebilir = tum.filter((k) => !bagli.has(k.kod));
  if (!s.surecler.length && !tum.length) return null;
  return (
    <section class="surecler" aria-label="Süreç">
      <h2>Süreç</h2>
      {!s.surecler.length && <p class="soluk kucuk">Bu olay bir süreç kuralına bağlı değil. Bağlarsanız her adımda ne olduğunu ayrı ayrı işaretleyebilirsiniz. İşaretlenmeyen bir adım “olmadı” sayılmaz.</p>}
      {s.surecler.map((x) => (
        <div key={x.kural.kod} class="kart surec-olayi">
          <div class="satir"><strong>{x.kural.ad}</strong><span class="soluk kucuk">· <a href={`#/e/${evren}/k/${x.kural.sahip.kod}`}>{x.kural.sahip.ad}</a></span>
            {x.fiili && <> <span class="rozet">fiilen uygulanan</span></>}<span class="bosluk" />
            <button class="dugme sade kucuk" onClick={() => isle(istemci.iste('surecBagla', { evren, olay: kod, kural: x.kural.kod, bagli: false }))}>Bu olaydan çıkar</button></div>
          {x.kural.kosullar && <p class="soluk kucuk">Başlangıç koşulları: {x.kural.kosullar}</p>}
          <ol class="adim-listesi">
            {x.kural.adimlar.map((a) => (
              <li key={a.kod} class="satir">
                <span style="flex:1">{a.ad}{a.esik && <> <span class="rozet">eşik</span></>}{a.sonuc && <> <span class="rozet">sonuç için gerekli</span></>}
                  {a.etki && <span class="soluk kucuk"> · {a.etki}</span>}</span>
                <select class="girdi kucuk-secim" aria-label={`${x.kural.ad}: ${a.ad}`} value={x.durumlar[a.kod] ?? ''}
                  onChange={(e) => isle(istemci.iste('surecAdimi', { evren, olay: kod, kural: x.kural.kod, adim: a.kod, durum: ((e.target as HTMLSelectElement).value || null) as AdimDurumu | null }))}>
                  <option value="">İşaretlenmedi</option>
                  {DURUMLAR.map((d) => <option value={d.kod}>{d.ad}</option>)}
                </select>
              </li>
            ))}
          </ol>
          <p class={`kucuk sonuc-${x.sonuc.durum}`}>{x.sonuc.yazi}</p>
          {x.sonuc.esik && <p class="kucuk">Geri dönülmez eşik geçildi: “{x.sonuc.esik}”. Süreç sonradan yarıda kalsa da bu adım geri alınmış sayılmaz.</p>}
          {x.celismeler.map((c) => <p class="uyari kucuk" key={c}>{c} Olay kaydı değiştirilmez, ama bir açıklama gerekebilir.</p>)}
          {s.catisma && !x.fiili && <button class="dugme sade kucuk" onClick={() => isle(istemci.iste('surecFiili', { evren, olay: kod, kural: x.kural.kod }))}>Fiilen bu uygulandı</button>}
        </div>
      ))}
      {s.catisma && (
        <p class="kucuk">Kurallar farklı sonuçlar veriyor. Bu, evrenin içindeki bir anlaşmazlıktır ve program hiçbirini doğru saymaz.
          {s.surecler.some((x) => x.fiili) && <> <button class="dugme sade kucuk" onClick={() => isle(istemci.iste('surecFiili', { evren, olay: kod, kural: null }))}>Fiilî seçimi kaldır</button></>}</p>
      )}
      {eklenebilir.length > 0 && (
        <select class="girdi kucuk-secim" aria-label="Bu olaya süreç kuralı bağla" value="" onChange={(e) => { const v = (e.target as HTMLSelectElement).value; if (v) isle(istemci.iste('surecBagla', { evren, olay: kod, kural: v, bagli: true })); }}>
          <option value="">Süreç kuralı bağla…</option>
          {eklenebilir.map((k) => <option value={k.kod}>{k.sahip.ad}: {k.ad}</option>)}
        </select>
      )}
      {!tum.length && <p class="soluk kucuk">Henüz süreç kuralı yok. Bir makam, kurum, kültür ya da ritüel sayfasından ekleyebilirsiniz.</p>}
      <SurecSorumluBolumu istemci={istemci} evren={evren} olay={kod} surum={surum} />
      {hata && <p class="hata kucuk">{hata}</p>}
    </section>
  );
}

// ---------- Makam sayfasında ----------
export function MakamYurutenleri({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const l = useYenile<MakamYurutucusu[]>(() => istemci.iste('makamYurutenleri', { evren, makam: kod }), [kod, surum]);
  if (!l) return null;
  return (
    <section class="yurutenler" aria-label="Yürütenler">
      <h2>Yürütenler</h2>
      {!l.length ? <p class="soluk kucuk">Bu makamı yürüten kayıtlı değil. Bir kişinin sayfasından “Yürüttüğü makam” ilişkisini tarihleriyle ekleyebilirsiniz.</p> : (
        <ul class="toplanan-listesi">
          {l.map((x) => (
            <li key={x.iliski}><a href={`#/e/${evren}/k/${x.kisi.kod}`}>{x.kisi.ad}</a>
              <span class="soluk kucuk"> · {x.baslangic?.ifade ?? '…'} – {x.bitis?.ifade ?? (x.baslangic ? 'sürüyor' : '…')}{x.fikir ? ' · fikir' : ''}</span>
              {x.not && <div class="soluk kucuk">{x.not}</div>}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
