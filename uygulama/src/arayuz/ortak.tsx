// Ekranlarda ortak kullanılan küçük parçalar.
import { TURLER, KARARLAR } from '../alan/turler';

const GRUPLAR = [...new Set(TURLER.map((t) => t.grup))];

export function TurSecici({ deger, onDegis, hepsi, etiket = 'Tür' }: { deger: string; onDegis: (v: string) => void; hepsi?: string; etiket?: string }) {
  return (
    <select class="girdi" aria-label={etiket} value={deger} onChange={(e) => onDegis((e.target as HTMLSelectElement).value)}>
      {hepsi !== undefined && <option value="">{hepsi}</option>}
      {GRUPLAR.map((g) => (
        <optgroup label={g}>
          {TURLER.filter((t) => t.grup === g).map((t) => <option value={t.kod}>{t.ad}</option>)}
        </optgroup>
      ))}
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
