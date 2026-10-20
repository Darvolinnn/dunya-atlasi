// Olay örgüsü masası (K27, P6): bir eserin okuma sırası sütunlarda, yazarın seçtiği izler satırlarda. Var olan
// verilerin tek tablodaki birleşimidir; yeni bir şey tutulmaz. Sahne taşımak bugünkü yerleştirmedir ve evren
// tarihini değiştirmez. Taşımadan sonra neyin yer değiştirdiği sayılarla söylenir; iyi ya da kötü denmez.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { AnlatiEtkisi, KisaKayit, OlayOrgusu, YapiSahnesi } from '../veri/api';
import { DONUM_ETIKETI, SAHNE_CALISMA } from '../alan/sablon';
import { useYukle } from './Anlati';
import { git } from './Uygulama';

const hataYaz = (e: unknown) => (e as Error).message;
const okuYerel = (a: string) => { try { return localStorage.getItem(a); } catch { return null; } };
const yazYerel = (a: string, v: string) => { try { localStorage.setItem(a, v); } catch { /* yok */ } };
const IZ_ANAHTARI = 'dunya-atlasi:olay-orgusu-izleri';

const IZLER = [['donum', 'Dönüm noktaları'], ['hat', 'Kurgu hatları'], ['soru', 'Okur soruları'], ['karakter', 'Karakterler'], ['calisma', 'Çalışma durumu']] as const;
type Iz = typeof IZLER[number][0];
const NIYET_ADI: Record<string, string> = { ipucu: 'ipucu', yaniltmaca: 'yanıltmaca', destekler: 'işaret', zayiflatir: 'zayıflatır', aciklama: 'açıklama' };
const calismaAdi = (k: string | null) => SAHNE_CALISMA.find((x) => x.kod === k)?.ad ?? '';
/** İlk açılışta en çok görünen bu kadar karakter gösterilir; gerisi bir tıkla açılır. */
const KARAKTER_SINIRI = 6;

function izleriOku(): Iz[] {
  const v = okuYerel(IZ_ANAHTARI);
  if (v === null) return IZLER.map(([k]) => k);
  return v.split(',').filter((x): x is Iz => IZLER.some(([k]) => k === x));
}

/** Taşımadan önceki ve sonraki masaya bakarak taşınan sahnenin götürdüklerini söyler. */
function etkiOzeti(once: OlayOrgusu, sonra: OlayOrgusu, sahne: string, etki: AnlatiEtkisi[]): string[] {
  const i = once.sutunlar.findIndex((s) => s.kod === sahne), j = sonra.sutunlar.findIndex((s) => s.kod === sahne);
  if (i < 0 || j < 0) return [];
  const a = once.sutunlar[i], b = sonra.sutunlar[j];
  const l: string[] = [];
  if (i !== j) l.push(`“${a.ad}” ${i + 1}. sahneden ${j + 1}. sahneye geçti.`);
  const yer = (x: string | null) => (x ? `“${x}” içinde` : 'bölümsüz');
  if (a.ust !== b.ust) l.push(`“${a.ad}” artık ${yer(b.bolum)} (önce ${yer(a.bolum)})${i === j ? `; okuma sırasında yine ${j + 1}. sahne` : ''}.`);
  if (i === j) return l.length ? l : ['Sahnenin yeri değişmedi.'];
  for (const q of once.sorular) {
    const t = q.hucreler[i];
    if (t) l.push(`“${q.iddia.soru}” sorusundaki ${NIYET_ADI[t]} artık ${j + 1}. sahnede (önce ${i + 1}.).`);
  }
  for (const h of once.hatlar) if (h.hucreler[i] !== null) l.push(`“${h.hat.ad}” hattındaki yeri ${i + 1}. sahneden ${j + 1}. sahneye geçti.`);
  for (const x of etki) {
    l.push(x.yeni ? `“${x.kayit.ad}” artık ilk kez “${x.yeni.ad}” sahnesinde geçiyor${x.onceki ? ` (önce “${x.onceki.ad}”)` : ''}.` : `“${x.kayit.ad}” artık bu eserde geçmiyor.`);
  }
  return l;
}

export function OlayOrgusuGorunumu({ istemci, evren, eser }: { istemci: Istemci; evren: string; eser: string | null }) {
  const [eserler] = useYukle<KisaKayit[]>(istemci, evren, () => istemci.iste('eserler', { evren }), []);
  const secili = eser ?? (eserler?.length === 1 ? eserler[0].kod : null);
  const [o, yenile] = useYukle<OlayOrgusu | null>(istemci, evren, () => (secili ? istemci.iste('olayOrgusu', { evren, eser: secili }) : Promise.resolve(null)), [secili]);
  const [yerlesmemis] = useYukle<YapiSahnesi[]>(istemci, evren, () => istemci.iste('yerlesmemisler', { evren }).then((l) => l.filter((x) => x.tur === 'sahne')), []);
  const [izler, setIzler] = useState<Iz[]>(izleriOku);
  const [butunKarakterler, setButunKarakterler] = useState(false);
  const [sahne, setSahne] = useState<string | null>(null);
  const [ozet, setOzet] = useState<string[] | null>(null);
  /** Son taşımadan önceki yer; "Geri al" sahneyi oraya koyar. */
  const [geri, setGeri] = useState<{ kod: string; ust: string; sira: number } | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [surukle, setSurukle] = useState<string | null>(null);
  const [yeniAd, setYeniAd] = useState('');
  useEffect(() => { setSahne(null); setOzet(null); setGeri(null); }, [secili]);

  if (!eserler) return <p class="soluk">Açılıyor…</p>;
  if (!eserler.length) return <p class="soluk">Henüz eser yok. “Eser” türünde bir kayıt açıp bölümlerini ve sahnelerini ekleyebilirsiniz.</p>;
  const izAc = (k: Iz, ac: boolean) => { const l = ac ? [...izler, k] : izler.filter((x) => x !== k); setIzler(l); yazYerel(IZ_ANAHTARI, l.join(',')); };
  const var_ = (k: Iz) => izler.includes(k);

  /** Bir değişiklikten sonra masayı yeniden okur ve taşımanın özetini çıkarır. */
  const tasindi = async (kod: string, is: Promise<{ etki: AnlatiEtkisi[] }>, geriAliniyor = false) => {
    const once = o!;
    const eski = once.sutunlar.find((x) => x.kod === kod);
    try {
      const { etki } = await is;
      const sonra = await istemci.iste('olayOrgusu', { evren, eser: secili! });
      setOzet(etkiOzeti(once, sonra, kod, etki));
      setGeri(eski && !geriAliniyor ? { kod, ust: eski.ust, sira: once.sutunlar.filter((x) => x.ust === eski.ust && x.sira < eski.sira).length } : null);
      setHata(null);
    } catch (x) { setHata(hataYaz(x)); }
    yenile();
  };
  const tasi = (kod: string, yon: -1 | 1) => tasindi(kod, istemci.iste('montajTasi', { evren, sahne: kod, yon }));
  /** Sürüklenen sahneyi hedef sahnenin önüne koyar (hedefin bölümünde). */
  const birak = (kod: string, hedef: string) => {
    if (!o || kod === hedef) return;
    const h = o.sutunlar.find((s) => s.kod === hedef)!;
    const kardes = o.sutunlar.filter((s) => s.ust === h.ust && s.kod !== kod);
    tasindi(kod, istemci.iste('anlatiYerlestir', { evren, kod, ust: h.ust, sira: kardes.findIndex((s) => s.kod === hedef) }));
  };
  const donumYap = (kod: string, ekle: boolean) =>
    istemci.iste('kayitListe', ekle ? { evren, kod, liste: 'etiket', ekle: DONUM_ETIKETI } : { evren, kod, liste: 'etiket', cikar: DONUM_ETIKETI }).then(() => setHata(null), (x) => setHata(hataYaz(x)));
  const bosSahne = async (ardina: OlayOrgusu['sutunlar'][number] | null) => {
    const ad = yeniAd.trim() || 'Adsız sahne';
    try {
      const ust = ardina?.ust ?? secili!;
      const { kod } = await istemci.iste('anlatiOlustur', { evren, ust, ad, tur: 'sahne' });
      if (ardina && o) {
        const kardes = o.sutunlar.filter((s) => s.ust === ust);
        await istemci.iste('anlatiYerlestir', { evren, kod, ust, sira: kardes.findIndex((s) => s.kod === ardina.kod) + 1 });
      }
      setYeniAd(''); setSahne(kod); setOzet(null); setHata(null);
    } catch (x) { setHata(hataYaz(x)); }
  };
  const ekle = (kod: string) => {
    const son = o?.sutunlar[o.sutunlar.length - 1];
    tasindi(kod, istemci.iste('anlatiYerlestir', { evren, kod, ust: son?.ust ?? secili!, sira: null }));
  };

  const sutunlar = o?.sutunlar ?? [];
  const karakterler = o ? (butunKarakterler ? o.karakterler : o.karakterler.slice(0, KARAKTER_SINIRI)) : [];
  // Bölüm başlığı: art arda aynı üstteki sahneler bir başlık altında.
  const bolumler: { ad: string; sayi: number }[] = [];
  sutunlar.forEach((s, i) => {
    if (i > 0 && sutunlar[i - 1].ust === s.ust) bolumler[bolumler.length - 1].sayi++;
    else bolumler.push({ ad: s.bolum ?? 'Bölümsüz', sayi: 1 });
  });
  const sinir = (i: number) => (i > 0 && sutunlar[i - 1].ust !== sutunlar[i].ust ? 'bolum-siniri' : '');
  const sec = (i: number) => (sutunlar[i].kod === sahne ? ' secili' : '');
  const hucre = (i: number, ic: preact.ComponentChildren, sinif = '') => <td key={i} class={`${sinir(i)}${sec(i)} ${sinif}`.trim()}>{ic}</td>;
  const s = sahne ? sutunlar.find((x) => x.kod === sahne) ?? null : null;
  const si = s ? sutunlar.indexOf(s) : -1;

  return (
    <div class="gorunum olay-orgusu">
      <div class="satir">
        <label class="satir"><span>Eser</span>
          <select class="girdi kucuk-girdi" value={secili ?? ''} onChange={(e) => { const v = (e.target as HTMLSelectElement).value; if (v) git(`/e/${evren}/orgu/${v}`); }}>
            <option value="">Seçin…</option>
            {eserler.map((x) => <option value={x.kod}>{x.ad}</option>)}
          </select></label>
        <span class="soluk kucuk">Satırlar:</span>
        {IZLER.map(([k, ad]) => (
          <label key={k} class="satir kucuk"><input type="checkbox" checked={var_(k)} onChange={(e) => izAc(k, (e.target as HTMLInputElement).checked)} /> {ad}</label>
        ))}
      </div>
      <p class="soluk kucuk">Sütunlar okuma sırasıdır. Bir sahneyi başlığından sürükleyip başka bir sahnenin üstüne bırakırsanız onun önüne geçer; evrenin tarihi değişmez. Sahne adına tıklayınca altta ayrıntısı açılır.</p>
      {hata && <p class="hata">{hata}</p>}
      {secili && !o && <p class="soluk">Açılıyor…</p>}
      {o && !sutunlar.length && <p class="soluk">Bu eserde henüz sahne yok. Aşağıdan boş bir sahne ekleyebilir ya da yerleşmemiş bir sahneyi bu esere alabilirsiniz.</p>}
      {o && sutunlar.length > 0 && (
        <div class="tablo-kap">
          <table class="matris orgu-tablosu">
            <thead>
              <tr><th scope="col"></th>{bolumler.map((b, i) => <th key={i} colSpan={b.sayi} class={i > 0 ? 'bolum-siniri' : ''}>{b.ad}</th>)}</tr>
              <tr><th scope="col">Sahne</th>{sutunlar.map((x, i) => (
                <th key={x.kod} scope="col" class={`${sinir(i)}${sec(i)}${surukle && surukle !== x.kod ? ' birakilabilir' : ''}`} draggable
                  onDragStart={(e) => { setSurukle(x.kod); e.dataTransfer?.setData('text/plain', x.kod); }} onDragEnd={() => setSurukle(null)}
                  onDragOver={(e) => { if (surukle) e.preventDefault(); }} onDrop={(e) => { e.preventDefault(); if (surukle) birak(surukle, x.kod); setSurukle(null); }}>
                  <button type="button" class="baglanti-dugme" aria-pressed={x.kod === sahne} onClick={() => { setSahne(x.kod === sahne ? null : x.kod); setOzet(null); }}>{x.ad}</button>
                </th>
              ))}</tr>
            </thead>
            <tbody>
              {var_('donum') && (
                <tr><th scope="row">Dönüm noktaları</th>{sutunlar.map((x, i) => hucre(i, x.donum ? <><span class="orgu-nokta" aria-hidden="true" /> {x.olaylar[0]?.ad ?? 'dönüm'}</> : null))}</tr>
              )}
              {var_('hat') && o.hatlar.map((h) => (
                <tr key={h.hat.kod}><th scope="row">Hat: <a href={`#/e/${evren}/k/${h.hat.kod}`}>{h.hat.ad}</a></th>
                  {h.hucreler.map((c, i) => hucre(i, c === null ? null : <span class="orgu-hat" title={c || 'Hatta bağlı'}>{c ? c.replace(/^İpucu: /, 'ipucu ') : ''}</span>))}</tr>
              ))}
              {var_('soru') && o.sorular.map((q) => (
                <tr key={q.iddia.kod}><th scope="row">Soru: {q.iddia.soru}</th>
                  {q.hucreler.map((c, i) => hucre(i, c ? <span class={`niyet-${c}`}>{NIYET_ADI[c]}</span> : i === q.hucreler.length - 1 && q.acikKaliyor ? <span class="soluk kucuk">açık kalıyor</span> : null))}</tr>
              ))}
              {var_('karakter') && karakterler.map((k) => (
                <tr key={k.kisi.kod}><th scope="row"><a href={`#/e/${evren}/k/${k.kisi.kod}`}>{k.kisi.ad}</a></th>{k.hucreler.map((c, i) => hucre(i, c ? '●' : null))}</tr>
              ))}
              {var_('calisma') && (
                <tr><th scope="row">Çalışma durumu</th>{sutunlar.map((x, i) => hucre(i, x.metinVar || x.calisma ? calismaAdi(x.calisma) || 'metni var' : 'metni yok', 'kucuk soluk'))}</tr>
              )}
            </tbody>
          </table>
          {var_('karakter') && o.karakterler.length > KARAKTER_SINIRI && (
            <button type="button" class="dugme sade kucuk" onClick={() => setButunKarakterler(!butunKarakterler)}>
              {butunKarakterler ? 'En çok görünenleri göster' : `Bütün karakterler (${o.karakterler.length})`}</button>
          )}
          {var_('hat') && !o.hatlar.length && <p class="soluk kucuk">Bu eserin sahneleri henüz bir kurgu hattına bağlı değil.</p>}
          {var_('soru') && !o.sorular.length && <p class="soluk kucuk">Bu eserde ipucu, yanıltmaca ya da açıklama işaretlenmiş okur sorusu yok. Sahnelere niyet, sahnenin sayfasındaki kurgu montajından eklenir.</p>}
        </div>
      )}
      {ozet && (
        <div class="orgu-ozet" role="status"><strong>Taşımanın etkisi</strong><ul>{ozet.map((x, i) => <li key={i}>{x}</li>)}</ul>
          {geri && <button type="button" class="dugme sade kucuk" onClick={() => tasindi(geri.kod, istemci.iste('anlatiYerlestir', { evren, kod: geri.kod, ust: geri.ust, sira: geri.sira }), true)}>Taşımayı geri al</button>}
        </div>
      )}
      {o && s && (
        <div class="orgu-secili">
          <p><strong>{s.ad}</strong> · {si + 1}. sahne{s.bolum ? ` · ${s.bolum}` : ''}{!s.metinVar && <span class="soluk"> · metni yok (plan sahnesi)</span>}</p>
          {s.olaylar.length > 0 && <p class="kucuk">Anlattığı olay: {s.olaylar.map((x, i) => <>{i > 0 && ', '}<a href={`#/e/${evren}/k/${x.kod}`}>{x.ad}</a></>)}</p>}
          {o.sorular.filter((q) => q.hucreler[si]).map((q) => <p key={q.iddia.kod} class="kucuk">“{q.iddia.soru}” sorusunda {NIYET_ADI[q.hucreler[si]!]} taşıyor.</p>)}
          <div class="satir">
            <a class="dugme kucuk" href={`#/e/${evren}/yaz/${s.kod}`}>Sahneyi yaz</a>
            <a class="dugme sade kucuk" href={`#/e/${evren}/k/${s.kod}`}>Sayfasını aç</a>
            <button type="button" class="dugme sade kucuk" disabled={si === 0} onClick={() => tasi(s.kod, -1)}>← Bir öne</button>
            <button type="button" class="dugme sade kucuk" disabled={si === sutunlar.length - 1} onClick={() => tasi(s.kod, 1)}>Bir sonraya →</button>
            <button type="button" class="dugme sade kucuk" onClick={() => donumYap(s.kod, !s.donum)}>{s.donum ? 'Dönüm noktası değil' : 'Dönüm noktası olarak işaretle'}</button>
          </div>
        </div>
      )}
      {o && (
        <div class="satir orgu-ekle">
          <input class="girdi kucuk-girdi" lang="tr" aria-label="Yeni sahnenin adı" placeholder="Yeni sahnenin adı" value={yeniAd} onInput={(e) => setYeniAd((e.target as HTMLInputElement).value)} />
          <button type="button" class="dugme sade kucuk" onClick={() => bosSahne(s)}>{s ? `+ “${s.ad}” sahnesinin ardına boş sahne` : '+ Sona boş sahne'}</button>
          <span class="soluk kucuk">Metni sonra Yaz ekranında yazılır.</span>
        </div>
      )}
      {o && yerlesmemis && yerlesmemis.length > 0 && (
        <details class="orgu-yerlesmemis">
          <summary>Hiçbir esere yerleşmemiş sahneler ({yerlesmemis.length})</summary>
          <ul>{yerlesmemis.map((x) => (
            <li key={x.kod}><a href={`#/e/${evren}/k/${x.kod}`}>{x.ad}</a> <button type="button" class="dugme sade kucuk" onClick={() => ekle(x.kod)}>Bu eserin sonuna al</button></li>
          ))}</ul>
        </details>
      )}
    </div>
  );
}
