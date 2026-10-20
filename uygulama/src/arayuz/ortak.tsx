// Ekranlarda ortak kullanılan küçük parçalar.
import { TURLER, KARARLAR, KURGU_TURLERI, uzakTurMu } from '../alan/turler';
import type { ComponentChildren } from 'preact';
import { YAZARLIK_KONULARI } from './yazarlik-rehberi';
import { yazarlikRehberiAc } from './YazarlikRehberi';
import { useKurgu } from './kurgu';

const GRUPLAR = [...new Set(TURLER.map((t) => t.grup))];

export function TurSecici({ deger, onDegis, hepsi, etiket = 'Tür' }: { deger: string; onDegis: (v: string) => void; hepsi?: string; etiket?: string }) {
  // Kurguya uzak türler (K28) silinmez, en sona katlanır.
  const kurgu = useKurgu();
  const uzak = TURLER.filter((t) => uzakTurMu(kurgu, t.kod));
  return (
    <select class="girdi" aria-label={etiket} value={deger} onChange={(e) => onDegis((e.target as HTMLSelectElement).value)}>
      {hepsi !== undefined && <option value="">{hepsi}</option>}
      {GRUPLAR.map((g) => {
        const l = TURLER.filter((t) => t.grup === g && !uzakTurMu(kurgu, t.kod));
        return l.length > 0 && <optgroup label={g}>{l.map((t) => <option value={t.kod}>{t.ad}</option>)}</optgroup>;
      })}
      {uzak.length > 0 && <optgroup label="Diğer türler (kurgunuza uzak)">{uzak.map((t) => <option value={t.kod}>{t.ad}</option>)}</optgroup>}
    </select>
  );
}

/** Kesinleşmiş kayıtlar için rozet gösterilmez; fikir ve vazgeçilmiş görünür. */
export function KararRozeti({ karar }: { karar: string }) {
  if (karar === 'kesin') return null;
  const ad = KARARLAR.find((k) => k.kod === karar)?.ad ?? karar;
  return <span class={`rozet karar-${karar}`}>{ad}</span>;
}

/** Alan düzeyinde karar durumu (§3.6). Kesin varsayılandır ve sade görünür; fikir ve vazgeçilmiş belirgindir. */
export function KararSecici({ karar, onDegis, etiket }: { karar: string; onDegis: (k: string) => void; etiket: string }) {
  return (
    <select class={`karar-sec karar-${karar}`} aria-label={`${etiket}: karar durumu`} value={karar}
      onChange={(e) => onDegis((e.target as HTMLSelectElement).value)}>
      {KARARLAR.map((k) => <option value={k.kod}>{k.ad}</option>)}
    </select>
  );
}

/** "Ne yazıyorsunuz?" kartları (§4, K28). Yeniden tıklanan kart seçimi kaldırır. */
export function KurguSecici({ deger, degis }: { deger: string | null; degis: (k: string | null) => void }) {
  return (
    <div class="kurgu-secici" role="radiogroup" aria-label="Ne yazıyorsunuz?">
      {KURGU_TURLERI.map((k) => (
        <button type="button" key={k.kod} role="radio" aria-checked={deger === k.kod} class={`kurgu-karti tg-${k.renk}${deger === k.kod ? ' secili' : ''}`}
          onClick={() => degis(deger === k.kod ? null : k.kod)}>
          <strong>{k.ad}</strong><span class="kucuk">{k.aciklama}</span>
        </button>
      ))}
    </div>
  );
}

/** Boş sayfa (§12.4, K28): ne işe yaradığını söyleyen bir cümle, işi yapan tek düğme ve rehberde ilgili konu. */
export function BosSayfa({ baslik, children, eylem, konu }: { baslik: string; children: ComponentChildren; eylem?: { ad: string; yap: () => void }; konu?: number }) {
  const k = konu ? YAZARLIK_KONULARI.find((x) => x.no === konu) : null;
  return (
    <div class="bos bos-sayfa">
      <h3>{baslik}</h3>
      <p>{children}</p>
      <div class="satir" style="justify-content:center">
        {eylem && <button class="dugme ana" onClick={eylem.yap}>{eylem.ad}</button>}
        {k && <button class="dugme sade kucuk" onClick={() => yazarlikRehberiAc(k.no)}>Yazarlık rehberi: {k.baslik}</button>}
      </div>
    </div>
  );
}

/** Boş sayfadaki düğmenin sayfanın kendi girdisine götürmesi için. */
export function odakla(secici: string, tikla = false) {
  const el = document.querySelector<HTMLElement>(secici);
  if (!el) return;
  el.scrollIntoView?.({ block: 'center' });
  if (tikla) el.click(); else el.focus();
}

/** Kart listelerinin sonundaki "+ Yeni …" kartı (§12.4, K28). */
export function YeniKarti({ ad, yap }: { ad: string; yap: () => void }) {
  return <button type="button" class="kart yeni-karti" onClick={yap}>+ {ad}</button>;
}
