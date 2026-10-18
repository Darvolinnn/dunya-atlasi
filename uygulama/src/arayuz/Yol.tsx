// Rota ve yolculuk kayıtlarının yapılı bilgileri (§4.2, §8.4). Rota: iki uç, elle girilmiş mesafe ve koşula göre
// süreler; program koşulu yorumlamaz. Yolculuk: aşamalar (nereden, nereye, hangi rotayla, ne zaman); planlanan ile
// gerçekleşen ayrıdır. Yolcular ilişkilerden gelir.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { Kayit, KisaKayit, RotaGirdisi, RotaVerisi, Yolculuk, YolculukAsamaGirdisi } from '../veri/api';
import { KayitSec } from './KayitBolumleri';

const hataYaz = (e: unknown) => (e as Error).message;
const bag = (evren: string, k: KisaKayit | null) => (k ? <a href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a> : <span class="soluk">seçilmedi</span>);
const gunYaz = (n: number) => `${n.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} gün`;

function useVeri<T>(istemci: Istemci, evren: string, yukle: () => Promise<T>, bagimli: unknown[]) {
  const [v, setV] = useState<T | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => istemci.dinle((d) => { if (d.evren === evren) setN((x) => x + 1); }), [evren]);
  useEffect(() => { yukle().then(setV, () => setV(null)); }, [...bagimli, n]);
  return v;
}

export function RotaBolumu({ istemci, evren, kayit }: { istemci: Istemci; evren: string; kayit: Kayit }) {
  const r = useVeri<RotaVerisi>(istemci, evren, () => istemci.iste('rota', { evren, kod: kayit.kod }), [kayit.kod]);
  const [hata, setHata] = useState<string | null>(null);
  const [yeniKosul, setYeniKosul] = useState('');
  const [yeniGun, setYeniGun] = useState('');
  if (!r) return null;
  const girdi = (): RotaGirdisi => ({ a: r.a?.kod ?? null, b: r.b?.kod ?? null, mesafe: r.mesafe, sureler: r.sureler, duraklar: r.duraklar.map((d) => d.kod) });
  const yaz = (d: Partial<RotaGirdisi>) => istemci.iste('rotaYaz', { evren, kod: kayit.kod, rota: { ...girdi(), ...d } }).then(() => setHata(null), (e) => { setHata(hataYaz(e)); throw e; });
  const sessiz = (p: Promise<unknown>) => { p.catch(() => {}); };
  return (
    <section class="yol-bolumu" aria-label="Rota">
      <h2>Rota</h2>
      <p class="soluk kucuk">Rotanın süresi elle girilir; harita ölçeğinden süre üretilmez. Koşul yalnızca bir etikettir (yaz, kış, yaya, atlı). Denetimler en kısa tanımlı süreyi kullanır.</p>
      <div class="satir">
        <span class="alan-adi">Uçlar</span> {bag(evren, r.a)}
        <KayitSec istemci={istemci} evren={evren} secili={null} etiket={r.a ? 'Değiştir' : 'Bir uç seç'} sec={(s) => { if (s) sessiz(yaz({ a: s.kod })); }} />
        <span>–</span> {bag(evren, r.b)}
        <KayitSec istemci={istemci} evren={evren} secili={null} etiket={r.b ? 'Değiştir' : 'Öbür ucu seç'} sec={(s) => { if (s) sessiz(yaz({ b: s.kod })); }} />
      </div>
      <div class="satir">
        <label class="alan"><span class="alan-adi">Mesafe</span>
          <input class="girdi" type="number" min={0} step="any" style="width:110px" aria-label="Mesafe" value={r.mesafe?.deger ?? ''}
            onChange={(e) => { const v = (e.target as HTMLInputElement).value; sessiz(yaz({ mesafe: v === '' ? null : { deger: Number(v), birim: r.mesafe?.birim ?? '' } })); }} /></label>
        <label class="alan"><span class="alan-adi">Birim</span>
          <input class="girdi" lang="tr" style="width:120px" aria-label="Mesafe birimi" placeholder="fersah, menzil" value={r.mesafe?.birim ?? ''} disabled={!r.mesafe}
            onChange={(e) => { if (r.mesafe) sessiz(yaz({ mesafe: { deger: r.mesafe.deger, birim: (e.target as HTMLInputElement).value } })); }} /></label>
      </div>
      <div class="alan genis"><span class="alan-adi">Süreler</span>
        {r.sureler.length === 0 && <p class="soluk kucuk">Henüz süre yok.</p>}
        <ul class="yol-listesi">
          {r.sureler.map((s, i) => (
            <li key={i} class="satir"><span>{s.kosul || 'Koşulsuz'}: {gunYaz(s.gun)}</span>
              <button class="dugme sade kucuk" aria-label={`${s.kosul || 'Koşulsuz'} süresini kaldır`} onClick={() => sessiz(yaz({ sureler: r.sureler.filter((_, j) => j !== i) }))}>Kaldır</button></li>
          ))}
        </ul>
        <form class="satir" onSubmit={(e) => { e.preventDefault(); yaz({ sureler: [...r.sureler, { kosul: yeniKosul, gun: Number(yeniGun) }] }).then(() => { setYeniKosul(''); setYeniGun(''); }, () => {}); }}>
          <input class="girdi" lang="tr" aria-label="Koşul" placeholder="Koşul (isteğe bağlı): yazın, atlı" value={yeniKosul} onInput={(e) => setYeniKosul((e.target as HTMLInputElement).value)} />
          <input class="girdi" type="number" min={0} step="any" style="width:90px" aria-label="Gün" placeholder="Gün" value={yeniGun} onInput={(e) => setYeniGun((e.target as HTMLInputElement).value)} />
          <button class="dugme kucuk" disabled={!(Number(yeniGun) > 0)}>Süre ekle</button>
        </form>
      </div>
      <div class="alan genis"><span class="alan-adi">Duraklar</span>
        <ol class="yol-listesi">
          {r.duraklar.map((d, i) => <li key={d.kod + i}>{bag(evren, d)} <button class="dugme sade kucuk" onClick={() => sessiz(yaz({ duraklar: girdi().duraklar.filter((_, j) => j !== i) }))}>Kaldır</button></li>)}
        </ol>
        <KayitSec istemci={istemci} evren={evren} secili={null} etiket="Durak ekle" sec={(s) => { if (s) sessiz(yaz({ duraklar: [...girdi().duraklar, s.kod] })); }} />
      </div>
      {r.kullananlar.length > 0 && <p class="kucuk">Bu rotayı kullanan yolculuklar: {r.kullananlar.map((k, i) => <span key={k.kod}>{i > 0 && ', '}{bag(evren, k)}</span>)}</p>}
      {hata && <p class="hata kucuk">{hata}</p>}
    </section>
  );
}

export function YolculukBolumu({ istemci, evren, kayit }: { istemci: Istemci; evren: string; kayit: Kayit }) {
  const y = useVeri<Yolculuk>(istemci, evren, () => istemci.iste('yolculuk', { evren, kod: kayit.kod }), [kayit.kod]);
  const [hata, setHata] = useState<string | null>(null);
  if (!y) return null;
  const girdiler = (): YolculukAsamaGirdisi[] => y.asamalar.map((a) => ({ nereden: a.nereden?.kod ?? null, nereye: a.nereye?.kod ?? null, rota: a.rota?.kod ?? null,
    cikis: a.cikis?.ifade ?? '', varis: a.varis?.ifade ?? '', durum: a.durum }));
  const yaz = (l: YolculukAsamaGirdisi[]) => istemci.iste('yolculukYaz', { evren, kod: kayit.kod, asamalar: l }).then(() => setHata(null), (e) => setHata(hataYaz(e)));
  const degistir = (i: number, d: Partial<YolculukAsamaGirdisi>) => yaz(girdiler().map((g, j) => (j === i ? { ...g, ...d } : g)));
  return (
    <section class="yol-bolumu" aria-label="Yolculuğun aşamaları">
      <h2>Aşamalar</h2>
      <p class="soluk kucuk">Her aşama bir yerden ötekine gider; rota seçilirse süresi rotanın tanımlı süresiyle karşılaştırılır. Planlanan aşamalar denetimlerde yolcunun bulunduğu yer sayılmaz.</p>
      {y.asamalar.length === 0 && <p class="soluk">Henüz aşama yok.</p>}
      <ol class="yolculuk-asamalari">
        {y.asamalar.map((a, i) => (
          <li key={i} class={`kart yolculuk-asamasi ${a.durum}`}>
            <div class="satir">
              {bag(evren, a.nereden)}<KayitSec istemci={istemci} evren={evren} secili={null} etiket="Nereden" sec={(s) => { if (s) void degistir(i, { nereden: s.kod }); }} />
              <span>→</span>
              {bag(evren, a.nereye)}<KayitSec istemci={istemci} evren={evren} secili={null} etiket="Nereye" sec={(s) => { if (s) void degistir(i, { nereye: s.kod }); }} />
            </div>
            <div class="satir">
              <span class="alan-adi">Rota</span> {a.rota ? bag(evren, a.rota) : <span class="soluk kucuk">belirtilmedi</span>}
              <KayitSec istemci={istemci} evren={evren} secili={null} etiket={a.rota ? 'Değiştir' : 'Rota seç'} sec={(s) => { if (s) void degistir(i, { rota: s.kod }); }} />
              {a.rota && <button class="dugme sade kucuk" onClick={() => void degistir(i, { rota: null })}>Rotayı kaldır</button>}
            </div>
            <div class="satir">
              <AsamaTarihi etiket={`${i + 1}. aşama çıkış`} deger={a.cikis?.ifade ?? ''} kaydet={(v) => degistir(i, { cikis: v })} />
              <AsamaTarihi etiket={`${i + 1}. aşama varış`} deger={a.varis?.ifade ?? ''} kaydet={(v) => degistir(i, { varis: v })} />
              <select class="girdi" aria-label={`${i + 1}. aşamanın durumu`} value={a.durum} onChange={(e) => void degistir(i, { durum: (e.target as HTMLSelectElement).value as 'plan' | 'gerceklesti' })}>
                <option value="gerceklesti">Gerçekleşti</option><option value="plan">Planlandı</option>
              </select>
              <button class="dugme sade kucuk tehlikeli" onClick={() => void yaz(girdiler().filter((_, j) => j !== i))}>Aşamayı kaldır</button>
            </div>
            {a.sure && <p class="soluk kucuk">Süre: {a.sure.enAz === a.sure.enCok ? gunYaz(a.sure.enAz) : `${gunYaz(a.sure.enAz)} ile ${gunYaz(a.sure.enCok)} arası`}</p>}
            {a.uyari && <p class="uyari kucuk">{a.uyari}</p>}
          </li>
        ))}
      </ol>
      <button class="dugme kucuk" onClick={() => { const l = girdiler(); const son = l[l.length - 1]; void yaz([...l, { nereden: son?.nereye ?? null, nereye: null, rota: null, cikis: son?.varis ?? '', varis: '', durum: 'gerceklesti' }]); }}>Aşama ekle</button>
      <h3>Yolcular</h3>
      {y.yolcular.length === 0 ? <p class="soluk kucuk">Yolcu yok. Aşağıdaki ilişkilerden “Yolculuktakiler” ile ekle; katılma ve ayrılma tarihleri ilişkinin başlangıcı ve bitişidir.</p>
        : <p class="kucuk">{y.yolcular.map((k, i) => <span key={k.kod}>{i > 0 && ', '}{bag(evren, k)}{k.rol === 'tasinan' ? ' (taşınan)' : ''}</span>)}</p>}
      {hata && <p class="hata kucuk">{hata}</p>}
    </section>
  );
}

function AsamaTarihi({ etiket, deger, kaydet }: { etiket: string; deger: string; kaydet: (v: string) => Promise<unknown> }) {
  const [v, setV] = useState(deger);
  useEffect(() => setV(deger), [deger]);
  return <label class="satir kucuk">{etiket.endsWith('çıkış') ? 'Çıkış' : 'Varış'}<input class="girdi" lang="tr" style="width:150px" aria-label={etiket} placeholder={etiket.endsWith('çıkış') ? 'Çıkış tarihi' : 'Varış tarihi'} value={v}
    onInput={(e) => setV((e.target as HTMLInputElement).value)} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    onBlur={() => { if (v.trim() !== deger) void kaydet(v.trim()); }} /></label>;
}
