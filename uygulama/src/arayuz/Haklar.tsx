import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { HakGirdisi, HakListesi, HakSatiri, HakTanimaDurumu, HakTuru, SinirBilgisi, SinirGirdisi } from '../veri/api';
import { KARARLAR } from '../alan/turler';
import { farkYazisi } from '../alan/tarih';
import { KayitSec } from './KayitBolumleri';
import { SinirGirdi, sinirYazi } from './Anlati';
import type { Secim } from './BaglantiSecici';
import { geriAlinabilir } from './onay';

const TURLER: Record<HakTuru, string> = { mulkiyet: 'Mülkiyet', kullanim: 'Kullanım hakkı', yetki: 'Yetki', yukumluluk: 'Yükümlülük', izin: 'İzin' };
const TANIMALAR: Record<HakTanimaDurumu, string> = { taniyor: 'Tanıyor', tanimiyor: 'Tanımıyor', bilinmiyor: 'Bilinmiyor' };
type Sure = { ifade: string; olay: Secim | null; fark: string };
const bosSure = (): Sure => ({ ifade: '', olay: null, fark: '' });
const sure = (s: SinirBilgisi | null): Sure => ({ ifade: s?.olay ? '' : s?.tarih?.ifade ?? '', olay: s?.olay ?? null, fark: s?.fark ? farkYazisi(s.fark) : '' });
const sinir = (s: Sure): SinirGirdisi | null => s.olay ? { olay: s.olay.kod, fark: s.fark || null } : s.ifade.trim() ? { ifade: s.ifade } : null;
type Taslak = Omit<HakGirdisi, 'konu' | 'sahipler' | 'otorite' | 'baslangic' | 'bitis'> & { konu: Secim | null; sahipler: Secim[]; otorite: Secim | null; baslangic: Sure; bitis: Sure };
const bos = (konu: Secim): Taslak => ({ tur: 'kullanim', konu, sahipler: [], kapsam: '', kosul: '', otorite: null, karar: 'fikir', baslangic: bosSure(), bitis: bosSure() });
const bag = (evren: string, s: Secim) => <a href={`#/e/${evren}/k/${s.kod}`}>{s.ad}</a>;

export function HaklarBolumu({ istemci, evren, kod, ad, surum, saltOkunur = false }: {
  istemci: Istemci; evren: string; kod: string; ad: string; surum: number; saltOkunur?: boolean;
}) {
  const [liste, setListe] = useState<HakListesi | null>(null), [cop, setCop] = useState<HakListesi | null>(null);
  const [tarih, setTarih] = useState(''), [suz, setSuz] = useState('');
  const [form, setForm] = useState<Taslak | null>(null), [duzenlenen, setDuzenlenen] = useState<string | null>(null);
  const [hata, setHata] = useState(''), [mesgul, setMesgul] = useState(false), [yenile, setYenile] = useState(0);
  useEffect(() => { setForm(null); setDuzenlenen(null); setListe(null); setCop(null); setTarih(''); setSuz(''); setHata(''); }, [evren, kod]);
  useEffect(() => {
    let etkin = true;
    Promise.all([istemci.iste('haklar', { evren, kayit: kod, tarih: suz }), istemci.iste('haklar', { evren, kayit: kod, cop: true })])
      .then(([l, c]) => { if (etkin) { setListe(l); setCop(c); setHata(''); } }, (e) => { if (etkin) setHata(e.message); });
    return () => { etkin = false; };
  }, [evren, kod, surum, suz, yenile]);
  const is = async (f: () => Promise<unknown>) => {
    setMesgul(true); setHata('');
    try { await f(); setYenile((n) => n + 1); } catch (e) { setHata((e as Error).message); } finally { setMesgul(false); }
  };
  const duzenle = (s: HakSatiri) => { setDuzenlenen(s.kod); setForm({ ...s.tanim, konu: s.konu, sahipler: s.sahipler, otorite: s.otorite, baslangic: sure(s.baslangic), bitis: sure(s.bitis) }); };
  const hakKaydet = () => {
    if (!form) return;
    const f = form;
    const hak: HakGirdisi = { ...f, konu: f.konu?.kod ?? '', sahipler: f.sahipler.map((s) => s.kod), otorite: f.otorite?.kod ?? null, baslangic: sinir(f.baslangic), bitis: sinir(f.bitis) };
    return is(async () => { if (duzenlenen) await istemci.iste('hakDegistir', { evren, kod: duzenlenen, hak }); else await istemci.iste('hakEkle', { evren, hak }); setForm(null); setDuzenlenen(null); });
  };
  const kaldirilan = [...new Map([...(cop?.konu ?? []), ...(cop?.sahibi ?? [])].map((s) => [s.kod, s])).values()];
  const satir = (s: HakSatiri) => <li key={s.kod}>
    <p><strong>{s.tanim.kapsam || 'Kapsam yazılmamış'}</strong> · {KARARLAR.find((k) => k.kod === s.tanim.karar)?.ad}</p>
    <p>Konu: {bag(evren, s.konu)} · Sahipleri: {s.sahipler.map((k, i) => <span key={k.kod}>{i > 0 && ', '}{bag(evren, k)}</span>)}</p>
    <p>{sinirYazi(s.baslangic)} – {sinirYazi(s.bitis)} · {s.zaman}</p>
    <p>Tanıyan otorite: {s.otorite ? bag(evren, s.otorite) : 'Yazılmamış'}</p>
    {s.tanim.kosul && <p>Koşul: {s.tanim.kosul}</p>}
    {s.secenekler.length > 0 && <div><p>İki cihazda farklı değerler yazılmış; birini seçmeniz gerekiyor:</p><ul>{s.secenekler.map((d) => <li>{d}</li>)}</ul></div>}
    {s.tanimalar.length > 0 && <><p>Otoritelerin tanımaları:</p><ul>{s.tanimalar.map((t) => <li key={t.kod}>
      {t.secenekler.length ? <><span>İki cihazda farklı tanımalar yazılmış; birini seçmeniz gerekiyor.</span><ul>{t.secenekler.map((d) => <li>{d}</li>)}</ul></> : <>{bag(evren, t.otorite)}: {TANIMALAR[t.durum]}</>}
      {!saltOkunur && <label> Tanımayı değiştir <select class="girdi" disabled={mesgul} value={t.durum} onChange={(e) => is(() => istemci.iste('hakTanimaYaz', { evren, hak: s.kod, kod: t.kod, otorite: t.otorite.kod, durum: e.currentTarget.value as HakTanimaDurumu }))}>
        {Object.entries(TANIMALAR).map(([k, ad]) => <option value={k}>{ad}</option>)}
      </select></label>}
    </li>)}</ul></>}
    {!saltOkunur && <><TanimaFormu key={s.kod} istemci={istemci} evren={evren} mesgul={mesgul} kaydet={(otorite, durum) => is(() => istemci.iste('hakTanimaYaz', { evren, hak: s.kod, otorite, durum }))} />
      <button class="dugme" disabled={mesgul} onClick={() => duzenle(s)}>Düzenle</button>{' '}
      <button class="dugme" disabled={mesgul} onClick={() => is(() => geriAlinabilir('Hak kaydı kaldırıldı.', () => istemci.iste('hakSil', { evren, kod: s.kod }), () => istemci.iste('hakGeriYukle', { evren, kod: s.kod })))}>Kaldır</button>
    </>}
  </li>;
  const gruplar = (l: HakSatiri[]) => Object.entries(TURLER).filter(([tur]) => l.some((s) => s.tanim.tur === tur)).map(([tur, ad]) => <div key={tur}><h4>{ad}</h4><ul>{l.filter((s) => s.tanim.tur === tur).map(satir)}</ul></div>);
  return <section aria-label="Haklar ve yükümlülükler">
    <h2>Haklar ve yükümlülükler</h2>
    <p class="soluk">Bir hak ile o hakkın bir otorite tarafından tanınması ayrı ayrı tutulur. Burada bir kayıt olmaması, hak ya da yükümlülük olmadığını göstermez.</p>
    {hata && <p class="hata" role="alert">{hata}</p>}
    <form class="satir" onSubmit={(e) => { e.preventDefault(); setSuz(tarih); }}>
      <label>Evren tarihi <input class="girdi" placeholder="Boş bırakılırsa bütün dönemler" value={tarih} onInput={(e) => setTarih(e.currentTarget.value)} /></label>
      <button class="dugme" type="submit">Tarihe göre göster</button>
      {suz && <button class="dugme" type="button" onClick={() => { setTarih(''); setSuz(''); }}>Bütün dönemler</button>}
    </form>
    {!liste ? <p class="soluk">Hak kayıtları yükleniyor…</p> : <>
      <h3>Bu kaydı konu alan haklar</h3>{liste.konu.length ? gruplar(liste.konu) : <p class="soluk">Bu kaydı konu alan bir hak kaydı yok.</p>}
      <h3>Sahibi olduğu haklar ve yükümlülükler</h3>{liste.sahibi.length ? gruplar(liste.sahibi) : <p class="soluk">Bu kaydın sahibi olduğu bir hak ya da yükümlülük kaydı yok.</p>}
      {liste.bilgiler.length > 0 && <div aria-label="Hak kayıtlarına ilişkin bilgi">{liste.bilgiler.map((b) => <p>{b.ileti}</p>)}<p class="soluk">Karşılaştırmada yalnızca mülkiyet türü, konu, kapsamın birebir aynı yazılışı ve kayıtlı tarihler dikkate alınır. Koşul yazıları yorumlanmaz.</p></div>}
    </>}
    {!saltOkunur && <>
      <button class="dugme" disabled={mesgul} onClick={() => { setDuzenlenen(null); setForm(bos({ kod, ad })); }}>Hak ekle</button>
      {kaldirilan.length > 0 && <details><summary>Kaldırılan hak kayıtları</summary><ul>{kaldirilan.map((s) => <li key={s.kod}>
        {TURLER[s.tanim.tur]} · {s.konu.ad} · {s.tanim.kapsam || 'Kapsam yazılmamış'}{' '}
        <button class="dugme" disabled={mesgul} onClick={() => is(() => istemci.iste('hakGeriYukle', { evren, kod: s.kod }))}>Geri getir</button>
      </li>)}</ul></details>}
      {form && <div><fieldset disabled={mesgul}><legend>{duzenlenen ? 'Hakkı düzenle' : 'Yeni hak kaydı'}</legend>
        <label>Hak türü <select class="girdi" value={form.tur} onChange={(e) => setForm({ ...form, tur: e.currentTarget.value as HakTuru })}>{Object.entries(TURLER).map(([k, ad]) => <option value={k}>{ad}</option>)}</select></label>
        <p>Konu: <KayitSec istemci={istemci} evren={evren} secili={form.konu} sec={(konu) => setForm({ ...form, konu })} etiket="Hakkın konusunu seç" /></p>
        <p>Hak sahipleri: {form.sahipler.map((s) => <span key={s.kod}>{s.ad}{' '}<button type="button" class="dugme sade" aria-label={`${s.ad} adlı kaydı hak sahiplerinden çıkar`} onClick={() => setForm({ ...form, sahipler: form.sahipler.filter((k) => k.kod !== s.kod) })}>Çıkar</button>{' '}</span>)}</p>
        <KayitSec istemci={istemci} evren={evren} secili={null} etiket="Hak sahibi ekle" sec={(s) => { if (s && !form.sahipler.some((k) => k.kod === s.kod)) setForm({ ...form, sahipler: [...form.sahipler, s] }); }} />
        <p><label>Kapsam <input class="girdi" maxLength={300} value={form.kapsam} onInput={(e) => setForm({ ...form, kapsam: e.currentTarget.value })} /></label></p>
        <label>Koşul (isteğe bağlı) <textarea class="girdi" maxLength={1000} value={form.kosul} onInput={(e) => setForm({ ...form, kosul: e.currentTarget.value })} /></label>
        <p>Tanıyan otorite (isteğe bağlı): <KayitSec istemci={istemci} evren={evren} secili={form.otorite} sec={(otorite) => setForm({ ...form, otorite })} />{' '}
          {form.otorite && <button type="button" class="dugme sade" onClick={() => setForm({ ...form, otorite: null })}>Otoriteyi kaldır</button>}</p>
        {(['baslangic', 'bitis'] as const).map((alan) => <fieldset key={alan}><legend>{alan === 'baslangic' ? 'Başlangıç' : 'Bitiş'}</legend>
          <SinirGirdi istemci={istemci} evren={evren} etiket={alan === 'baslangic' ? 'Başlangıç' : 'Bitiş'} ifade={form[alan].ifade} olay={form[alan].olay}
            setIfade={(ifade) => setForm({ ...form, [alan]: { ...form[alan], ifade } })} setOlay={(olay) => setForm({ ...form, [alan]: { ...form[alan], olay, ifade: '', fark: '' } })} />
          {form[alan].olay && <label>Olaya göre fark <input class="girdi" placeholder="Örn. 3 gün sonra (boşsa olayın kendisi)" value={form[alan].fark} onInput={(e) => setForm({ ...form, [alan]: { ...form[alan], fark: e.currentTarget.value } })} /></label>}
        </fieldset>)}
        <label>Karar durumu <select class="girdi" value={form.karar} onChange={(e) => setForm({ ...form, karar: e.currentTarget.value })}>{KARARLAR.map((k) => <option value={k.kod}>{k.ad}</option>)}</select></label>{' '}
        <button class="dugme ana" type="button" disabled={!form.konu || !form.sahipler.length} onClick={hakKaydet}>Kaydet</button>{' '}
        <button class="dugme" type="button" onClick={() => { setForm(null); setDuzenlenen(null); }}>Vazgeç</button>
      </fieldset></div>}
    </>}
  </section>;
}

function TanimaFormu({ istemci, evren, mesgul, kaydet }: { istemci: Istemci; evren: string; mesgul: boolean; kaydet: (otorite: string, durum: HakTanimaDurumu) => Promise<void> }) {
  const [otorite, setOtorite] = useState<Secim | null>(null), [durum, setDurum] = useState<HakTanimaDurumu>('bilinmiyor');
  return <div class="satir">
    <fieldset disabled={mesgul}><legend>Otoritenin tanımasını ekle</legend>
      <KayitSec istemci={istemci} evren={evren} secili={otorite} sec={setOtorite} etiket="Tanımayı bildiren otorite" />{' '}
      <label>Tanıma durumu <select class="girdi" value={durum} onChange={(e) => setDurum(e.currentTarget.value as HakTanimaDurumu)}>{Object.entries(TANIMALAR).map(([k, ad]) => <option value={k}>{ad}</option>)}</select></label>{' '}
      <button class="dugme" type="button" disabled={!otorite} onClick={() => { if (otorite) void kaydet(otorite.kod, durum); }}>Tanımayı ekle</button>
    </fieldset>
  </div>;
}
