import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { EserSozlesmesi, KisaKayit, SozlesmeHatirlatmasi, SozlesmeMaddesi, SozlesmeTanimi } from '../veri/api';
import { KARARLAR } from '../alan/turler';
import { turkceKarsilastir } from '../alan/turkce';
import { onayla } from './onay';

const TURLER = { aciklanmayacak: 'Açıklanmayacak', acik_birakildi: 'Bilinçli açık bırakıldı', anlati_kurali: 'Anlatı kuralı' };
const bos = (eser?: string): SozlesmeTanimi => ({ metin: '', tur: 'anlati_kurali', karar: 'fikir', kapsam: eser ? { tur: 'eserler', eserler: [eser] } : { tur: 'evren' }, bagliKayitlar: [] });
function useDegisim(istemci: Istemci, evren: string) {
  const [n, setN] = useState(0);
  useEffect(() => istemci.dinle((d) => { if (d.evren === evren) setN((v) => v + 1); }), [istemci, evren]);
  return n;
}
const bag = (evren: string, k: KisaKayit) => <a href={`#/e/${evren}/k/${k.kod}`}>{k.ad}</a>;
function MaddeMetni({ m, evren, acikRozeti = true }: { m: SozlesmeMaddesi; evren: string; acikRozeti?: boolean }) {
  return <>
    <p>{m.metin}</p>
    <p class="soluk kucuk">{TURLER[m.tur]} · {KARARLAR.find((k) => k.kod === m.karar)?.ad} · {m.kapsam.tur === 'evren' ? 'Bütün evren' : m.eserler.map((k) => k.ad).join(', ')}</p>
    {m.bagli.length > 0 && <p class="kucuk">Bağlı kayıtlar: {m.bagli.map((k, i) => <span key={k.kod}>{i > 0 && ', '}{bag(evren, k)}{acikRozeti && m.tur === 'acik_birakildi' && m.karar !== 'vazgecildi' && !m.silindi && !m.catismali && <span class="soluk"> · açık bırakıldı</span>}</span>)}</p>}
    {m.catismali && <p>İki cihazdan gelen değerlerden birini seçmeniz gerekiyor. <a href={`#/e/${evren}/inceleme`}>Uyarıları aç</a></p>}
  </>;
}
function MaddeFormu({ istemci, evren, eser, madde, saltOkunur, bitir }: { istemci: Istemci; evren: string; eser?: string; madde?: SozlesmeMaddesi; saltOkunur: boolean; bitir: () => void }) {
  const [t, setT] = useState<SozlesmeTanimi>(() => madde ? { metin: madde.metin, tur: madde.tur, karar: madde.karar, kapsam: madde.kapsam, bagliKayitlar: madde.bagliKayitlar } : bos(eser));
  const [kayitlar, setKayitlar] = useState<KisaKayit[]>([]), [hata, setHata] = useState(''), [mesgul, setMesgul] = useState(false);
  const [secEser, setSecEser] = useState(''), [secKayit, setSecKayit] = useState('');
  useEffect(() => {
    let etkin = true;
    istemci.iste('kayitlar', { evren }).then((l) => { if (etkin) setKayitlar([...l].sort((a, b) => turkceKarsilastir(a.ad, b.ad))); }, (e: Error) => { if (etkin) setHata(e.message); });
    return () => { etkin = false; };
  }, [evren]);
  const ad = (kod: string) => kayitlar.find((k) => k.kod === kod)?.ad ?? madde?.bagli.find((k) => k.kod === kod)?.ad ?? madde?.eserler.find((k) => k.kod === kod)?.ad ?? 'Kaldırılmış kayıt';
  const secici = (etiket: string, deger: string, degis: (v: string) => void, liste: KisaKayit[]) => <label>{etiket} <select class="girdi" aria-label={etiket} value={deger} onChange={(e) => degis(e.currentTarget.value)}><option value="">Seçin…</option>{liste.map((k) => <option key={k.kod} value={k.kod}>{k.ad}</option>)}</select></label>;
  return <form onSubmit={async (e) => {
    e.preventDefault(); if (mesgul || saltOkunur) return;
    setMesgul(true); setHata('');
    try { await istemci.iste('sozlesmeMaddeYaz', { evren, kod: madde?.kod ?? null, tanim: t }); setT(bos(eser)); bitir(); }
    catch (x) { setHata((x as Error).message); } finally { setMesgul(false); }
  }}>
    <fieldset disabled={mesgul || saltOkunur}><legend>{madde ? 'Sözleşme maddesini düzenle' : eser ? 'Bu esere özel madde ekle' : 'Sözleşme maddesi ekle'}</legend>
      <label>Madde <textarea class="girdi" lang="tr" required maxLength={500} value={t.metin} onInput={(e) => setT({ ...t, metin: e.currentTarget.value })} /></label>
      <div class="satir"><label>Tür <select class="girdi" aria-label="Tür" value={t.tur} onChange={(e) => setT({ ...t, tur: e.currentTarget.value as SozlesmeTanimi['tur'] })}>{Object.entries(TURLER).map(([k, ad]) => <option value={k}>{ad}</option>)}</select></label>
        <label>Karar durumu <select class="girdi" aria-label="Karar durumu" value={t.karar} onChange={(e) => setT({ ...t, karar: e.currentTarget.value as SozlesmeTanimi['karar'] })}>{KARARLAR.map((k) => <option value={k.kod}>{k.ad}</option>)}</select></label>
        {!eser && <label>Kapsam <select class="girdi" aria-label="Kapsam" value={t.kapsam.tur} onChange={(e) => setT({ ...t, kapsam: e.currentTarget.value === 'evren' ? { tur: 'evren' } : { tur: 'eserler', eserler: [] } })}><option value="evren">Bütün evren</option><option value="eserler">Seçilen eserler</option></select></label>}
      </div>
      {!eser && t.kapsam.tur === 'eserler' && <div>
        <ul>{t.kapsam.eserler.map((k) => <li key={k}>{ad(k)} <button type="button" class="dugme" aria-label={`${ad(k)} eserini kapsamdan çıkar`} onClick={() => { if (t.kapsam.tur === 'eserler') setT({ ...t, kapsam: { tur: 'eserler', eserler: t.kapsam.eserler.filter((s) => s !== k) } }); }}>Çıkar</button></li>)}</ul>
        {secici('Kapsama eklenecek eser', secEser, setSecEser, kayitlar.filter((k) => k.tur === 'eser' && t.kapsam.tur === 'eserler' && !t.kapsam.eserler.includes(k.kod)))}{' '}
        <button type="button" class="dugme" disabled={!secEser} onClick={() => { if (t.kapsam.tur === 'eserler') setT({ ...t, kapsam: { tur: 'eserler', eserler: [...t.kapsam.eserler, secEser] } }); setSecEser(''); }}>Eseri kapsama ekle</button>
      </div>}
      <p class="soluk kucuk">Kayıt bağlamak isteğe bağlıdır. Program madde metnini yorumlamaz; hatırlatma yalnızca aşağıda bağladığınız kayıtlarda çıkar.</p>
      <ul>{t.bagliKayitlar.map((k) => <li key={k}>{ad(k)} <button type="button" class="dugme" aria-label={`${ad(k)} kaydının bağını kaldır`} onClick={() => setT({ ...t, bagliKayitlar: t.bagliKayitlar.filter((s) => s !== k) })}>Bağı kaldır</button></li>)}</ul>
      {secici('Bağlanacak kayıt', secKayit, setSecKayit, kayitlar.filter((k) => !t.bagliKayitlar.includes(k.kod)))}{' '}
      <button type="button" class="dugme" disabled={!secKayit} onClick={() => { setT({ ...t, bagliKayitlar: [...t.bagliKayitlar, secKayit] }); setSecKayit(''); }}>Kaydı bağla</button>
      <p><button type="submit" class="dugme ana" disabled={!t.metin.trim() || t.kapsam.tur === 'eserler' && !t.kapsam.eserler.length}>{mesgul ? 'Kaydediliyor…' : 'Maddeyi kaydet'}</button>{' '}
        <button type="button" class="dugme" onClick={() => { setT(bos(eser)); bitir(); }}>Vazgeç</button></p>
    </fieldset>
    {hata && <p class="hata" role="alert">{hata}</p>}
  </form>;
}

export function AnlatiSozlesmesiSekmesi({ istemci, evren, surum, saltOkunur = false }: { istemci: Istemci; evren: string; surum: number; saltOkunur?: boolean }) {
  const [liste, setListe] = useState<SozlesmeMaddesi[]>([]), [cop, setCop] = useState<SozlesmeMaddesi[]>([]);
  const [secili, setSecili] = useState<SozlesmeMaddesi | undefined>(), [hata, setHata] = useState(''), [mesgul, setMesgul] = useState(false), [form, setForm] = useState(0);
  const n = useDegisim(istemci, evren);
  useEffect(() => {
    let etkin = true;
    Promise.all([istemci.iste('sozlesmeMaddeleri', { evren }), istemci.iste('sozlesmeMaddeleri', { evren, cop: true })]).then(([a, b]) => { if (etkin) { setListe(a); setCop(b); setHata(''); } }, (e: Error) => { if (etkin) setHata(e.message); });
    return () => { etkin = false; };
  }, [evren, surum, n]);
  const is = async (f: () => Promise<unknown>) => { if (mesgul || saltOkunur) return; setMesgul(true); try { await f(); setHata(''); } catch (e) { setHata((e as Error).message); } finally { setMesgul(false); } };
  return <section aria-label="Anlatı sözleşmesi">
    <h2>Anlatı sözleşmesi</h2><p>Anlatıyla ilgili bilinçli kararlarınız. Evren maddeleri her esere uygulanır, ama bir maddeyi eserin kendi sayfasından o eser için dışarıda bırakabilirsiniz. Boş bırakılan alanlar eksik sayılmaz.</p>
    {hata && <p class="hata" role="alert">{hata}</p>}
    {!liste.length && <p>Henüz sözleşme maddesi yok. Madde eklemek isteğe bağlıdır.</p>}
    <ul>{liste.map((m) => <li key={m.kod}><MaddeMetni m={m} evren={evren} />
      <button class="dugme" disabled={mesgul || saltOkunur || m.catismali} onClick={() => { setSecili(m); setForm((v) => v + 1); }}>Düzenle</button>{' '}
      <button class="dugme" disabled={mesgul || saltOkunur} onClick={() => onayla('Bu madde kaldırılsın mı? Daha sonra “Kaldırılan maddeler” bölümünden geri getirebilirsiniz.') && is(async () => { await istemci.iste('sozlesmeMaddeSil', { evren, kod: m.kod }); if (secili?.kod === m.kod) { setSecili(undefined); setForm((v) => v + 1); } })}>Kaldır</button>
    </li>)}</ul>
    {cop.length > 0 && <details><summary>Kaldırılan maddeler</summary><ul>{cop.map((m) => <li key={m.kod}><MaddeMetni m={m} evren={evren} /><button class="dugme" disabled={mesgul || saltOkunur} onClick={() => is(() => istemci.iste('sozlesmeMaddeGeriYukle', { evren, kod: m.kod }))}>Geri getir</button></li>)}</ul></details>}
    {!saltOkunur && <MaddeFormu key={`${evren}:${form}`} istemci={istemci} evren={evren} madde={secili} saltOkunur={mesgul || !!liste.find((m) => m.kod === secili?.kod)?.catismali} bitir={() => { setSecili(undefined); setForm((v) => v + 1); }} />}
  </section>;
}

export function EserSozlesmesiBolumu({ istemci, evren, kod, surum, saltOkunur }: { istemci: Istemci; evren: string; kod: string; surum: number; saltOkunur: boolean }) {
  const [s, setS] = useState<EserSozlesmesi | null>(null), [hata, setHata] = useState(''), [mesgul, setMesgul] = useState(false), [form, setForm] = useState(0);
  const n = useDegisim(istemci, evren);
  useEffect(() => {
    let etkin = true;
    istemci.iste('eserSozlesmesi', { evren, eser: kod }).then((v) => { if (etkin) { setS(v); setHata(''); } }, (e: Error) => { if (etkin) setHata(e.message); });
    return () => { etkin = false; };
  }, [evren, kod, surum, n]);
  const sec = async (madde: string, disarida: boolean) => {
    if (saltOkunur || mesgul) return; setMesgul(true);
    try { await istemci.iste('sozlesmeDisaridaYaz', { evren, madde, eser: kod, disarida }); setHata(''); } catch (e) { setHata((e as Error).message); } finally { setMesgul(false); }
  };
  const satir = (m: EserSozlesmesi['maddeler'][number]) => <li key={m.madde.kod}><MaddeMetni m={m.madde} evren={evren} acikRozeti={m.durum === 'gecerli'} />
    {m.durum === 'belirsiz' ? <div><p>Bu maddenin bu eserde geçerli olup olmadığını seçmeniz gerekiyor. <a href={`#/e/${evren}/inceleme`}>Uyarıları aç</a></p>
      {!m.madde.catismali && m.madde.kapsam.tur === 'evren' && <><button class="dugme" disabled={mesgul || saltOkunur} onClick={() => void sec(m.madde.kod, false)}>Bu eserde geçerli</button>{' '}<button class="dugme" disabled={mesgul || saltOkunur} onClick={() => void sec(m.madde.kod, true)}>Bu eserde geçerli değil</button></>}
    </div> : m.madde.kapsam.tur === 'evren' && <button class="dugme" disabled={mesgul || saltOkunur} onClick={() => void sec(m.madde.kod, m.durum === 'gecerli')}>{m.durum === 'gecerli' ? 'Bu eserde geçerli değil' : 'Bu eserde yeniden geçerli'}</button>}
  </li>;
  return <section aria-label="Bu eserin sözleşmesi"><details open><summary><h2 style="display:inline">Bu eserin sözleşmesi</h2></summary>
    <p class="soluk kucuk">Evrenin maddeleri ve bu esere özel maddeler. Henüz fikir aşamasındaki maddeler karar durumlarıyla birlikte gösterilir. Vazgeçilen ve kaldırılan maddeler hatırlatılmaz.</p>
    {hata && <p class="hata" role="alert">{hata}</p>}
    {s && <><h3>Geçerli maddeler</h3>{!s.maddeler.some((m) => m.durum === 'gecerli') && <p>Bu eser için geçerli madde yok.</p>}<ul>{s.maddeler.filter((m) => m.durum === 'gecerli').map(satir)}</ul>
      {s.maddeler.some((m) => m.durum === 'disarida') && <details open><summary>Dışarıda bırakılanlar</summary><ul>{s.maddeler.filter((m) => m.durum === 'disarida').map(satir)}</ul></details>}
      {s.maddeler.some((m) => m.durum === 'belirsiz') && <div><h3>Seçim bekleyenler</h3><ul>{s.maddeler.filter((m) => m.durum === 'belirsiz').map(satir)}</ul></div>}</>}
    <p><a href={`#/e/${evren}/sozlesme`}>Bütün sözleşme maddelerini düzenle</a></p>
    {!saltOkunur && <MaddeFormu key={`${evren}:${kod}:${form}`} istemci={istemci} evren={evren} eser={kod} saltOkunur={mesgul} bitir={() => setForm((v) => v + 1)} />}
  </details></section>;
}

/** Sessiz hatırlatma: uyarı rengi, sayaç, bildirim veya açılır pencere üretmez. */
export function SozlesmeHatirlatmasiSatiri({ istemci, evren, kod, surum }: { istemci: Istemci; evren: string; kod: string; surum: number }) {
  const [liste, setListe] = useState<SozlesmeHatirlatmasi[]>([]);
  const n = useDegisim(istemci, evren);
  useEffect(() => {
    let etkin = true; setListe([]);
    istemci.iste('sozlesmeHatirlatmalari', { evren, kayit: kod }).then((l) => { if (etkin) setListe(l); }, () => {});
    return () => { etkin = false; };
  }, [evren, kod, surum, n]);
  if (!liste.length) return null;
  return <aside class="soluk kucuk" aria-label="Sözleşme hatırlatması">{liste.map((s) => <p key={s.madde.kod}>Sözleşme: {s.madde.metin} · {s.evren ? 'Bütün evren' : s.eserler.map((k) => k.ad).join(', ')}
    {s.evren && s.eserler.length > 0 && ` · Geçerli eserler: ${s.eserler.map((k) => k.ad).join(', ')}`}
    {s.disaridaEserler.length > 0 && ` · Şu eserlerde geçerli değil: ${s.disaridaEserler.map((k) => k.ad).join(', ')}`}
    {s.madde.karar === 'fikir' && ' · Fikir'}{s.madde.tur === 'acik_birakildi' && <span> · açık bırakıldı</span>}
  </p>)}</aside>;
}
