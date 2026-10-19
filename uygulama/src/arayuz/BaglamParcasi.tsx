// Sahne içinde bağlam parçası (F29): seçili paragrafın ya da cümlenin kendi tarihi, yeri ve bakış açısı.
// Her alan sahneyle aynı kalabilir, boş bırakılabilir ya da bu parçaya özgü olabilir.
import { useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { BaglamParcasi, BaglamParcasiTanimi, ParcaKipi } from '../veri/api';
import { KayitSec } from './KayitBolumleri';
import type { Secim } from './BaglantiSecici';

const KIPLER: { kod: ParcaKipi; ad: string }[] = [{ kod: 'sahne', ad: 'Sahneyle aynı' }, { kod: 'bos', ad: 'Belirtilmemiş' }, { kod: 'deger', ad: 'Bu parçaya özgü' }];

function KipSecici({ etiket, kip, degis }: { etiket: string; kip: ParcaKipi; degis: (k: ParcaKipi) => void }) {
  return (
    <select class="girdi kucuk-secim" aria-label={etiket} value={kip} onChange={(e) => degis((e.target as HTMLSelectElement).value as ParcaKipi)}>
      {KIPLER.map((k) => <option value={k.kod}>{k.ad}</option>)}
    </select>
  );
}

/** Parçanın bağlamını tek satırda anlatır. */
export function parcaYazisi(p: BaglamParcasi): string {
  const k = (kip: ParcaKipi, deger: string) => kip === 'sahne' ? null : kip === 'bos' ? 'belirtilmemiş' : deger;
  const l = [['tarih', k(p.tarih.kip, p.tarih.ifade)], ['yer', k(p.yer.kip, p.yer.kayit?.ad ?? 'silinmiş kayıt')], ['bakış', k(p.bakis.kip, p.bakis.kayit?.ad ?? 'silinmiş kayıt')]]
    .filter(([, v]) => v !== null).map(([a, v]) => `${a}: ${v}`);
  return (l.length ? l.join(' · ') : 'sahneyle aynı') + (p.not ? ` · ${p.not}` : '');
}

export function BaglamParcasiFormu({ istemci, evren, onceki, metin, kaydet, vazgec }: {
  istemci: Istemci; evren: string; onceki: BaglamParcasi | null; metin: string;
  kaydet: (t: BaglamParcasiTanimi) => Promise<unknown>; vazgec: () => void;
}) {
  const [tarihKipi, setTarihKipi] = useState<ParcaKipi>(onceki?.tarih.kip ?? 'deger');
  const [tarih, setTarih] = useState(onceki?.tarih.ifade ?? '');
  const [yerKipi, setYerKipi] = useState<ParcaKipi>(onceki?.yer.kip ?? 'sahne');
  const [yer, setYer] = useState<Secim | null>(onceki?.yer.kayit ?? null);
  const [bakisKipi, setBakisKipi] = useState<ParcaKipi>(onceki?.bakis.kip ?? 'sahne');
  const [bakis, setBakis] = useState<Secim | null>(onceki?.bakis.kayit ?? null);
  const [not, setNot] = useState(onceki?.not ?? '');
  const [hata, setHata] = useState<string | null>(null);
  const gonder = (e: Event) => {
    e.preventDefault();
    kaydet({ tarih: { kip: tarihKipi, ifade: tarih }, yer: { kip: yerKipi, kod: yer?.kod ?? null }, bakis: { kip: bakisKipi, kod: bakis?.kod ?? null }, not })
      .catch((x) => setHata((x as Error).message));
  };
  return (
    <form class="kart ayirma" onSubmit={gonder} aria-label="Parçanın bağlamı">
      <p class="kucuk" style="margin:0 0 6px">{metin ? `“${metin.slice(0, 120)}” için ayrı bağlam (geçmişe dönüş, okunan mektup, öbür cephe). ` : ''}Sahneyi bölmeniz gerekmez.</p>
      <div class="satir kucuk">
        <span>Tarih</span><KipSecici etiket="Tarih" kip={tarihKipi} degis={setTarihKipi} />
        {tarihKipi === 'deger' && <input class="girdi" style="max-width:160px" aria-label="Parçanın tarihi" placeholder="ör. 398" value={tarih} onInput={(e) => setTarih((e.target as HTMLInputElement).value)} />}
      </div>
      <div class="satir kucuk">
        <span>Yer</span><KipSecici etiket="Yer" kip={yerKipi} degis={setYerKipi} />
        {yerKipi === 'deger' && <KayitSec istemci={istemci} evren={evren} secili={yer} etiket="Yer seç" sec={setYer} />}
      </div>
      <div class="satir kucuk">
        <span>Bakış açısı</span><KipSecici etiket="Bakış açısı" kip={bakisKipi} degis={setBakisKipi} />
        {bakisKipi === 'deger' && <KayitSec istemci={istemci} evren={evren} secili={bakis} etiket="Bakış açısı seç" sec={setBakis} />}
      </div>
      <div class="satir">
        <input class="girdi" style="flex:1;min-width:160px" lang="tr" aria-label="Not" placeholder="Not (ör. Geçmişe dönüş)" value={not} onInput={(e) => setNot((e.target as HTMLInputElement).value)} />
        <button class="dugme ana kucuk">Kaydet</button>
        <button type="button" class="dugme sade kucuk" onClick={vazgec}>Vazgeç</button>
      </div>
      {hata && <p class="hata kucuk">{hata}</p>}
    </form>
  );
}
