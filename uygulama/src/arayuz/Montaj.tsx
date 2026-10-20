// Kurgu montajı (§15-9) ve sahnenin niyet işaretleri (F13). Okurun öğrenmesi okuma sırasından hesaplanır; sahne
// taşınınca kendiliğinden değişir. Uyarı yalnızca yazarın hedef seçtiği sorular içindir.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { AnlatiEtkisi, IddiaOzeti, KurguMontaji, MontajHedefi, SahneNiyeti } from '../veri/api';
import { EtkiOzeti } from './Anlati';
import { geriAlinabilir } from './onay';

const hataYaz = (e: unknown) => (e as Error).message;
const OLAY_ADLARI: Record<KurguMontaji['sorular'][number]['olaylar'][number]['tur'], string> = {
  ipucu: 'ipucu', yaniltmaca: 'yanıltmaca', destekler: 'destekler', zayiflatir: 'zayıflatır', aciklama: 'açıklama', okur: 'okur öğrenir',
};
const NIYETLER: { kod: SahneNiyeti['tur']; ad: string }[] = [{ kod: 'destekler', ad: 'Destekler' }, { kod: 'zayiflatir', ad: 'Zayıflatır' }, { kod: 'aciklar', ad: 'Açıklar' }];

export function KurguMontajiBolumu({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [acik, setAcik] = useState(false);
  const [m, setM] = useState<KurguMontaji | null>(null);
  const [etki, setEtki] = useState<AnlatiEtkisi[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yenile, setYenile] = useState(0);
  // Sahne taşımak eserin kendisini değiştirmeyebilir (bölüm içinde); sonuç burada ayrıca yenilenir.
  useEffect(() => { if (acik) istemci.iste('kurguMontaji', { evren, eser: kod }).then(setM, (x) => setHata(hataYaz(x))); }, [acik, kod, surum, yenile]);
  const tasi = (sahne: string, yon: -1 | 1) => istemci.iste('montajTasi', { evren, sahne, yon }).then((r) => { setEtki(r.etki); setHata(null); setYenile((x) => x + 1); }, (x) => setHata(hataYaz(x)));
  const hedef = (iddia: string, h: MontajHedefi | null) => istemci.iste('montajHedefiYaz', { evren, eser: kod, iddia, hedef: h }).then(() => setYenile((x) => x + 1), (x) => setHata(hataYaz(x)));
  return (
    <section class="surecler montaj" aria-label="Kurgu montajı">
      <details open={acik} onToggle={(e) => setAcik((e.target as HTMLDetailsElement).open)}>
        <summary><h2 style="display:inline">Kurgu montajı</h2></summary>
        {hata && <p class="hata kucuk">{hata}</p>}
        {etki && <EtkiOzeti evren={evren} etki={etki} kapat={() => setEtki(null)} />}
        {m && (
          <>
            {!m.sahneler.length ? <p class="soluk kucuk">Bu esere yerleştirilmiş sahne yok.</p> : (
              <>
                <h3>Okuma sırası</h3>
                <ol class="montaj-sahneleri">{m.sahneler.map((s, i) => (
                  <li key={s.kod}><a href={`#/e/${evren}/k/${s.kod}`}>{s.ad}</a>{s.bolum && <span class="soluk kucuk"> · {s.bolum}</span>}{' '}
                    <button class="dugme sade kucuk" disabled={i === 0} aria-label={`${s.ad} sahnesini öne al`} onClick={() => tasi(s.kod, -1)}>↑</button>
                    <button class="dugme sade kucuk" disabled={i === m.sahneler.length - 1} aria-label={`${s.ad} sahnesini sonraya al`} onClick={() => tasi(s.kod, 1)}>↓</button></li>
                ))}</ol>
              </>
            )}
            <h3>Sırlar ve açıklamalar</h3>
            {!m.sorular.length ? <p class="soluk kucuk">Bu eserde niyet işareti ya da okur bilgisi olan soru yok. Sahnelerin “Niyet işaretleri” bölümünden ekleyebilirsiniz.</p> : (
              <ul class="toplanan-listesi">{m.sorular.map((q) => (
                <li key={q.iddia.kod}><strong>{q.iddia.soru}</strong> <span class="soluk kucuk">· {q.iddia.konu.ad}{q.iddia.gercek ? ` · gerçek: ${q.iddia.gercek}` : ''}</span>{' '}
                  <select class="girdi kucuk-secim" aria-label={`${q.iddia.soru} hedefi`} value={q.hedef ?? ''} onChange={(e) => hedef(q.iddia.kod, ((e.target as HTMLSelectElement).value || null) as MontajHedefi | null)}>
                    <option value="">Hedef yok</option><option value="surpriz">Sürpriz</option><option value="gerilim">Gerilim</option>
                  </select>
                  <div class="kucuk">{q.olaylar.map((o, i) => <span key={i} class={`rozet montaj-${o.tur}`}>{o.sira}. {OLAY_ADLARI[o.tur]}{o.secenek ? `: ${o.secenek}` : ''}</span>)}</div>
                  {q.uyarilar.map((u) => <div class="kucuk uyari-yazisi" key={u}>{u}</div>)}
                </li>
              ))}</ul>
            )}
            {m.izler.length > 0 && (
              <>
                <h3>İşaretli kullanımlar</h3>
                <ul class="toplanan-listesi">{m.izler.map((z) => (
                  <li key={z.kayit.kod}><a href={`#/e/${evren}/k/${z.kayit.kod}`}>{z.kayit.ad}</a> <span class="soluk kucuk">· sahneler {z.siralar.join(', ')} · {z.sondan ? `son kullanım ${z.sondan} sahne önce` : 'son sahnede'} · en uzun ara {z.enUzunAra} sahne</span></li>
                ))}</ul>
              </>
            )}
            {m.yokluk.length > 0 && <YoklukHaritasi evren={evren} m={m} />}
            <p class="soluk kucuk">{m.not}</p>
          </>
        )}
      </details>
    </section>
  );
}

function YoklukHaritasi({ evren, m }: { evren: string; m: KurguMontaji }) {
  const enCok = Math.max(1, ...m.yokluk.flatMap((y) => y.hucreler));
  return (
    <>
      <h3>Karakterlerin yokluğu</h3>
      <p class="soluk kucuk">Dolu kare: karakter o sahnede var. Renk ne kadar koyuysa karakterin son göründüğü sahneden bu yana o kadar çok sahne geçmiştir.</p>
      <div class="yokluk-haritasi" role="table" aria-label="Karakter yokluk haritası">
        {m.yokluk.map((y) => (
          <div class="yokluk-satiri" role="row" key={y.kisi.kod}>
            <a role="rowheader" href={`#/e/${evren}/k/${y.kisi.kod}`}>{y.kisi.ad}</a>
            {y.hucreler.map((h, i) => (
              <span role="cell" key={i} class={h === 0 ? 'yh var' : h < 0 ? 'yh once' : 'yh yok'} style={h > 0 ? `opacity:${(0.15 + 0.85 * h / enCok).toFixed(2)}` : undefined}
                title={`${m.sahneler[i].sira}. ${m.sahneler[i].ad}: ${h === 0 ? 'bulunuyor' : h < 0 ? 'henüz görünmedi' : `${h} sahnedir görünmüyor`}`} />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

export function SahneNiyetleriBolumu({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [l, setL] = useState<SahneNiyeti[] | null>(null);
  const [iddialar, setIddialar] = useState<IddiaOzeti[]>([]);
  const [yeni, setYeni] = useState<{ iddia: string; secenek: string; tur: SahneNiyeti['tur'] }>({ iddia: '', secenek: '', tur: 'destekler' });
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => {
    istemci.iste('sahneNiyetleri', { evren, sahne: kod }).then(setL, () => {});
    istemci.iste('iddialar', { evren }).then(setIddialar, () => {});
  }, [kod, surum]);
  if (!l || !iddialar.length) return null;
  const yaz = (n: SahneNiyeti[]) => istemci.iste('sahneNiyetleriYaz', { evren, sahne: kod, niyetler: n }).then(() => { setHata(null); return true; }, (x) => { setHata(hataYaz(x)); return false; });
  const iddia = (k: string) => iddialar.find((x) => x.kod === k);
  const secili = iddia(yeni.iddia);
  return (
    <section class="surecler" aria-label="Niyet işaretleri">
      <h2>Niyet işaretleri</h2>
      <p class="soluk kucuk">Bu sahne, okura sunulan hangi açıklamayı desteklemek, zayıflatmak ya da doğrulamak için yazıldı? Bu sizin niyetinizdir; okurun ne düşündüğü ölçülmez.</p>
      {l.length > 0 && <ul class="toplanan-listesi">{l.map((n, i) => {
        const q = iddia(n.iddia);
        return <li key={i}>{q?.soru ?? 'Silinmiş soru'}: <strong>{NIYETLER.find((x) => x.kod === n.tur)!.ad.toLocaleLowerCase('tr-TR')}</strong>{n.secenek && ` “${q?.secenekler.find((s) => s.kod === n.secenek)?.metin ?? ''}”`}{' '}
          <button class="dugme sade kucuk" onClick={() => void geriAlinabilir('Niyet kaldırıldı.', () => yaz(l.filter((_, j) => j !== i)), () => yaz(l))}>Kaldır</button></li>;
      })}</ul>}
      <form class="satir" onSubmit={(e) => { e.preventDefault(); void yaz([...l, { iddia: yeni.iddia, secenek: yeni.secenek || null, tur: yeni.tur }]).then((ok) => ok && setYeni({ ...yeni, secenek: '' })); }}>
        <select class="girdi kucuk-secim" aria-label="Soru" value={yeni.iddia} onChange={(e) => setYeni({ ...yeni, iddia: (e.target as HTMLSelectElement).value, secenek: '' })}>
          <option value="">Soru seç</option>
          {iddialar.map((q) => <option value={q.kod}>{q.soru} ({q.konu.ad})</option>)}
        </select>
        <select class="girdi kucuk-secim" aria-label="Niyet" value={yeni.tur} onChange={(e) => setYeni({ ...yeni, tur: (e.target as HTMLSelectElement).value as SahneNiyeti['tur'] })}>
          {NIYETLER.map((x) => <option value={x.kod}>{x.ad}</option>)}
        </select>
        {secili && (
          <select class="girdi kucuk-secim" aria-label="Açıklama" value={yeni.secenek} onChange={(e) => setYeni({ ...yeni, secenek: (e.target as HTMLSelectElement).value })}>
            <option value="">{yeni.tur === 'aciklar' ? 'Hangi cevap? (isteğe bağlı)' : 'Hangi açıklama?'}</option>
            {secili.secenekler.map((s) => <option value={s.kod}>{s.metin}</option>)}
          </select>
        )}
        <button class="dugme kucuk" type="submit" disabled={!yeni.iddia || (yeni.tur !== 'aciklar' && !yeni.secenek)}>İşaret ekle</button>
      </form>
      {hata && <p class="hata kucuk">{hata}</p>}
    </section>
  );
}
