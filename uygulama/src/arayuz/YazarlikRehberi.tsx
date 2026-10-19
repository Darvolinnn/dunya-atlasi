// Yazarlık rehberi (K27): programla gelen 24 konu, sağdan açılan yan panelde. Sayfa rehberinden, sorulardaki
// "Neden?" bağlantısından ve komut paletinden açılır. Kullanıcının verisine bakmaz, veri yazmaz.
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { YAZARLIK_KONULARI, type YazarlikKonusu } from './yazarlik-rehberi';

const OLAY = 'dunya-atlasi:yazarlik-rehberi';

/** Rehberi açar; konu verilmezse konu listesi gelir. */
export function yazarlikRehberiAc(konu?: number) {
  window.dispatchEvent(new CustomEvent(OLAY, { detail: konu ?? null }));
}

/** Sayfa rehberinde gösterilen ilgili konular (§12.4 sayfa adlarıyla). */
export const SAYFA_KONULARI: Record<string, number[]> = {
  yaz: [14, 20, 23], masa: [23, 1], kayitlar: [5, 9, 19], inceleme: [21],
  masalar: [19], meseleler: [24, 10], sablonlar: [5, 19], bahsedilen: [19], surumler: [21, 24], cizelge: [18], neden: [13], hatlar: [15, 17], matris: [16, 15],
};

/** Programla gelen soru setlerinin rehber konusu ("Neden?" bağlantısı). */
export const SET_KONULARI: Record<string, number> = {
  baslangic: 1, pusula: 4, cekirdek: 2, eser: 11, seri: 10, sahne_plani: 14, hat: 15, karakter: 5, olay_izi: 5, aliskanlik: 6,
  karsit: 7, iliski: 8, buyu: 9, mekan: 19, sehir: 19, siyasi: 4, topluluk: 4, kultur: 19, dil: 19, haritasiz: 19, rehber: 19,
};

const bul = (no: number) => YAZARLIK_KONULARI.find((k) => k.no === no);

/** "(Konu 5)" gibi atıfları tıklanır yapar. */
function Metin({ yazi, git }: { yazi: string; git: (n: number) => void }) {
  const parcalar = yazi.split(/(\(Konu \d+(?:, \d+)*\))/);
  return <>{parcalar.map((p, i) => {
    const m = p.match(/^\(Konu ([\d, ]+)\)$/);
    if (!m) return p;
    const nolar = m[1].split(',').map((x) => Number(x.trim()));
    return <span key={i}>({nolar.map((n, j) => <>{j > 0 && ', '}<a href="#" onClick={(e) => { e.preventDefault(); git(n); }}>{bul(n)?.baslik ?? `Konu ${n}`}</a></>)})</span>;
  })}</>;
}

function Bolum({ baslik, satirlar, git, liste }: { baslik: string; satirlar?: string[]; git: (n: number) => void; liste?: boolean }) {
  if (!satirlar?.length) return null;
  return <>
    <h3>{baslik}</h3>
    {liste ? <ul>{satirlar.map((s, i) => <li key={i}><Metin yazi={s} git={git} /></li>)}</ul>
      : satirlar.map((s, i) => <p key={i}><Metin yazi={s} git={git} /></p>)}
  </>;
}

function Konu({ k, git }: { k: YazarlikKonusu; git: (n: number) => void }) {
  return <>
    <h2>{k.baslik}</h2>
    <Bolum baslik="Nedir?" satirlar={k.ne} git={git} liste={k.ne.length > 2} />
    <Bolum baslik="Neden işe yarar?" satirlar={k.neden} git={git} />
    <Bolum baslik="Ne zaman gerekmez?" satirlar={k.gerekmez} git={git} />
    <Bolum baslik="Küçük bir adım" satirlar={k.kucukAdim} git={git} liste={k.kucukAdim.length > 1} />
    <details class="yazarlik-ayrinti">
      <summary>Ayrıntı ve örnekler</summary>
      <Bolum baslik="Derinleştirmek isterseniz" satirlar={k.sorular} git={git} liste />
      <Bolum baslik="İşe yarayan örnek" satirlar={k.ornek} git={git} liste={(k.ornek?.length ?? 0) > 1} />
      <Bolum baslik="Yanıltıcı örnek" satirlar={k.yaniltici} git={git} />
      <Bolum baslik="Takılırsanız" satirlar={k.takilirsaniz} git={git} />
      <Bolum baslik="Sınır" satirlar={k.sinir} git={git} />
    </details>
    <Bolum baslik="Sonraki olası adımlar" satirlar={k.sonraki} git={git} />
  </>;
}

/** Kabukta bir kez bulunur; açılma olayını dinler. */
export function YazarlikRehberiPaneli() {
  const [acik, setAcik] = useState(false);
  const [konu, setKonu] = useState<number | null>(null);
  const panel = useRef<HTMLElement>(null);
  const onceki = useRef<Element | null>(null);
  const kapat = () => { setAcik(false); (onceki.current as HTMLElement | null)?.focus?.(); };
  useLayoutEffect(() => {
    const ac = (e: Event) => { onceki.current = document.activeElement; setKonu((e as CustomEvent<number | null>).detail); setAcik(true); };
    window.addEventListener(OLAY, ac);
    return () => window.removeEventListener(OLAY, ac);
  }, []);
  // Esc dinleyicisi panel çizilir çizilmez bağlanır (bkz. SayfaYardimi).
  useLayoutEffect(() => {
    if (!acik) return;
    panel.current?.focus();
    const tus = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); kapat(); } };
    window.addEventListener('keydown', tus, true);
    return () => window.removeEventListener('keydown', tus, true);
  }, [acik]);
  useLayoutEffect(() => { if (acik) panel.current?.scrollTo?.(0, 0); }, [konu]);
  if (!acik) return null;
  const k = konu === null ? null : bul(konu);
  return (
    <aside ref={panel} class="rehber-paneli yazarlik-rehberi" tabIndex={-1} aria-label="Yazarlık rehberi">
      <div class="rehber-ust">
        <span class="rehber-etiket">Yazarlık rehberi</span>
        <button type="button" class="dugme sade kucuk" onClick={kapat}>Kapat</button>
      </div>
      {k ? <>
        <p><a href="#" onClick={(e) => { e.preventDefault(); setKonu(null); }}>← Bütün konular</a></p>
        <Konu k={k} git={setKonu} />
      </> : <>
        <h2>Yazarlık rehberi</h2>
        <p>Roman ve seri yazarken işe yarayan araçlar. Hiçbiri zorunlu değildir; birini okuyup "bu bana göre değil" demek de geçerli bir sonuçtur. Örnekler uydurma bir seriden gelir.</p>
        <ol class="yazarlik-listesi">
          {YAZARLIK_KONULARI.map((x) => <li key={x.no}><a href="#" onClick={(e) => { e.preventDefault(); setKonu(x.no); }}>{x.baslik}</a></li>)}
        </ol>
      </>}
    </aside>
  );
}
