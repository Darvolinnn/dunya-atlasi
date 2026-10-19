// Uzun süren baştan kurmanın şeridi (§10.7): program güncellemesinden sonra ya da evren bu cihaza indirilirken
// kayıtlar yeniden düzenlenir. Bu sırada ekran "Açılıyor…" demek yerine ilerlemeyi gösterir.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { IlerlemeBildirimi } from '../veri/api';

export function HazirlanmaSeridi({ istemci }: { istemci: Istemci }) {
  const [d, setD] = useState<IlerlemeBildirimi | null>(null);
  useEffect(() => istemci.ilerlemeDinle((x) => setD(x.yapilan >= x.toplam ? null : x)), []);
  if (!d) return null;
  const yuzde = Math.floor((100 * d.yapilan) / d.toplam);
  const ad = d.ad ? `“${d.ad}” evreni` : 'Evren';
  return (
    <div class="esitleme-seridi hazirlanma-seridi" role="status">
      <span>
        {d.neden === 'guncelleme'
          ? <>Program güncellendi; {ad} yeni sürüme hazırlanıyor · %{yuzde}. Verileriniz korunuyor; bu yalnızca bir kez olur.</>
          : <>{ad} bu cihazda hazırlanıyor · %{yuzde}</>}
      </span>
      <progress max={d.toplam} value={d.yapilan} aria-label="Hazırlanma ilerlemesi" />
    </div>
  );
}
