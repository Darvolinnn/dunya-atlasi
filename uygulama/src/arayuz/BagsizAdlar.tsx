// Metnin altında bağlantısız geçen adlar (K29, §5.1, taslak A). Program kendiliğinden bağlamaz: "Bağla" yazarın
// açık editörüne bağlantıyı ekler ve metin her zamanki yoldan kaydedilir. Liste kaydedilmiş metinden hesaplanır;
// yazarken öneri açılmaz.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Node as PmNode } from 'prosemirror-model';
import type { Istemci } from '../veri/istemci';
import type { AdDizini } from '../veri/api';
import { bagsizAdlar, yerAnahtari, type BagsizAd, type MetinBlogu } from '../alan/bagsiz-ad';
import { bagTuru } from './baglanti-eklentisi';
import { ayirtEtme } from './Calisma';

/** Belgenin paragrafları: düz yazı, her harfin bağlantı içinde olup olmadığı ve belgede başladığı yer. */
export function bloklar(doc: PmNode): (MetinBlogu & { pos: number })[] {
  const l: (MetinBlogu & { pos: number })[] = [];
  doc.descendants((n, pos) => {
    if (!n.isTextblock) return true;
    let metin = '';
    const bagli: boolean[] = [];
    n.forEach((c) => {
      const yazi = c.isText ? c.text! : '￼';
      const b = c.marks.some((m) => m.type === bagTuru);
      metin += yazi;
      for (let i = 0; i < yazi.length; i++) bagli.push(b);
    });
    l.push({ metin, bagli, pos: pos + 1 });
    return false;
  });
  return l;
}

export function BagsizAdlar({ istemci, evren, kayit, belge, bagla }: {
  istemci: Istemci; evren: string; kayit: string;
  /** Son kaydedilmiş belge; null iken liste gösterilmez. */
  belge: PmNode | null;
  /** Belgedeki aralığı kayda bağlar; aralık o arada değişmişse false döner. */
  bagla: (from: number, to: number, ifade: string, kod: string) => boolean;
}) {
  const [dizin, setDizin] = useState<AdDizini | null>(null);
  const [acik, setAcik] = useState(false);
  const [secim, setSecim] = useState<BagsizAd | null>(null);
  const zaman = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let iptal = false;
    const oku = () => istemci.iste('adDizini', { evren }).then((d) => { if (!iptal) setDizin(d); }, () => {});
    void oku();
    const birak = istemci.dinle((d) => {
      if (d.evren !== evren) return;
      if (zaman.current) clearTimeout(zaman.current);
      zaman.current = setTimeout(oku, 1500);
    });
    return () => { iptal = true; birak(); if (zaman.current) clearTimeout(zaman.current); };
  }, [evren]);

  const bl = useMemo(() => (belge ? bloklar(belge) : []), [belge]);
  const liste = useMemo(() => {
    if (!dizin || !belge) return [];
    const adlar = dizin.adlar.flatMap((a) => a.ifadeler.map((ifade) => ({ kod: a.kod, ifade })));
    const atla = new Set(dizin.atla);
    return bagsizAdlar(bl, adlar, new Set([kayit, ...dizin.hic])).filter((x) => !x.kodlar.every((k) => atla.has(yerAnahtari(kayit, k, x.cumle))));
  }, [dizin, bl, kayit]);
  const kayitlar = useMemo(() => new Map((dizin?.adlar ?? []).map((a) => [a.kod, a])), [dizin]);
  const hicler = (dizin?.hic ?? []).filter((k) => kayitlar.has(k));

  if (!liste.length && !hicler.length) return null;
  const ayar = (anahtar: string, deger: boolean) => istemci.iste('bagsizAdAyari', { evren, anahtar, deger }).catch(() => {});
  const baglaVe = (x: BagsizAd, kod: string) => {
    const b = bl[x.blok];
    if (b && bagla(b.pos + x.bas, b.pos + x.son, x.ifade, kod)) setSecim(null);
  };

  return (
    <details class="bagsiz-adlar" open={acik} onToggle={(e) => setAcik((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>{liste.length ? `Bu metinde bağlantısız geçen ${liste.length}${liste.length >= 50 ? '+' : ''} ad var` : 'Bağlantısız ad önerisi'} · <span class="bagsiz-ac">{acik ? 'Gizle' : 'Göster'}</span></summary>
      {liste.map((x) => {
        const ad = kayitlar.get(x.kodlar[0])?.ad ?? x.ifade;
        const i = x.cumle.toLocaleLowerCase('tr-TR').indexOf(x.ifade.toLocaleLowerCase('tr-TR'));
        return (
          <div key={`${x.blok}-${x.bas}`} class="bagsiz-ad">
            <strong>{ad}</strong>
            <span class="bagsiz-cumle">“{i < 0 ? x.cumle : <>{x.cumle.slice(0, i)}<mark>{x.cumle.slice(i, i + x.ifade.length)}</mark>{x.cumle.slice(i + x.ifade.length)}</>}”</span>
            <span class="satir bagsiz-eylem">
              {x.kodlar.length === 1
                ? <button type="button" class="dugme kucuk" onClick={() => baglaVe(x, x.kodlar[0])}>Bağla</button>
                : <button type="button" class="dugme kucuk" aria-expanded={secim === x} onClick={() => setSecim(secim === x ? null : x)}>Bağla…</button>}
              <button type="button" class="dugme sade kucuk" onClick={() => { for (const k of x.kodlar) void ayar(`atla:${yerAnahtari(kayit, k, x.cumle)}`, true); }}>Bu sefer değil</button>
              <button type="button" class="dugme sade kucuk" onClick={() => { for (const k of x.kodlar) void ayar(`hic:${k}`, true); }}>Bu adı hiç önerme</button>
            </span>
            {secim === x && (
              <ul class="bagsiz-secim" aria-label={`${ad}: hangi kayıt?`}>
                {x.kodlar.map((k) => { const r = kayitlar.get(k); return r && <li key={k}><button type="button" class="dugme sade kucuk" onClick={() => baglaVe(x, k)}>{r.ad} <span class="soluk">· {ayirtEtme(r)}</span></button></li>; })}
              </ul>
            )}
          </div>
        );
      })}
      <p class="soluk kucuk">Program kendiliğinden bağlamaz. Liste metin kaydedilince güncellenir.</p>
      {hicler.length > 0 && (
        <p class="soluk kucuk">Önerilmeyen adlar: {hicler.map((k, i) => <span key={k}>{i > 0 && ', '}{kayitlar.get(k)!.ad} <button type="button" class="dugme sade kucuk" onClick={() => void ayar(`hic:${k}`, false)}>Yeniden öner</button></span>)}</p>
      )}
    </details>
  );
}
