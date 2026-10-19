// Sayfa rehberi (§12.4, K25): başlığın yanındaki "?" düğmesi, sayfanın ne işe yaradığını anlatan yan paneli açar.
// Panel sayfayı örtmez; sağdan gelir, Esc ya da yeniden "?" ile kapanır.
import { useEffect, useRef, useState } from 'preact/hooks';
import { REHBERLER } from './rehber';

export function SayfaYardimi({ sayfa }: { sayfa: string }) {
  const rehber = REHBERLER[sayfa];
  const [acik, setAcik] = useState(false);
  const dugme = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => { setAcik(false); }, [sayfa]);
  useEffect(() => {
    if (!acik) return;
    panel.current?.focus();
    const tus = (e: KeyboardEvent) => { if (e.key === 'Escape') { setAcik(false); dugme.current?.focus(); } };
    window.addEventListener('keydown', tus);
    return () => window.removeEventListener('keydown', tus);
  }, [acik]);
  if (!rehber) return null;
  const kimlik = `rehber-${sayfa}`;
  return (
    <>
      <button ref={dugme} type="button" class={acik ? 'yardim-dugmesi acik' : 'yardim-dugmesi'} aria-expanded={acik} aria-controls={kimlik}
        title="Bu sayfa ne işe yarar?" aria-label="Bu sayfa ne işe yarar?" onClick={() => setAcik(!acik)}>?</button>
      {acik && (
        <aside ref={panel} id={kimlik} class="rehber-paneli" tabIndex={-1} aria-label={`${rehber.baslik} rehberi`}>
          <div class="rehber-ust">
            <span class="rehber-etiket">Bu sayfa ne işe yarar?</span>
            <button type="button" class="dugme sade kucuk" onClick={() => { setAcik(false); dugme.current?.focus(); }}>Kapat</button>
          </div>
          <h2>{rehber.baslik}</h2>
          {rehber.ne.map((p, i) => <p key={i}>{p}</p>)}
          {rehber.neZaman && <><h3>Ne zaman kullanılır?</h3><p>{rehber.neZaman}</p></>}
          <h3>Adım adım</h3>
          <ol>{rehber.adimlar.map((a, i) => <li key={i}>{a}</li>)}</ol>
          {rehber.ipuclari?.length ? <><h3>Bilmeniz gerekenler</h3><ul>{rehber.ipuclari.map((a, i) => <li key={i}>{a}</li>)}</ul></> : null}
        </aside>
      )}
    </>
  );
}
