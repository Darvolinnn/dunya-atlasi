// Takvimler (§3.4) ve zaman çizelgesi (§7): ana takvim ve çağları, paralel takvimler, zaman akışları.
// Takvim değişince tarihlerin yazılışı korunur, evrendeki yerleri yeniden hesaplanır; kaydetmeden önce hangi
// tarihlerin yerinin değişeceği gösterilir.
import { sayiGirdisi } from '../alan/nicelik';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { CizelgeOgesi, KisaKayit, TakvimEtkisi } from '../veri/api';
import { anaTakvim, cagYili, eksenYili, paralelYazilar, takvimGecerli, takvimKaymasi, tarihAciklamasi, tarihCoz, VARSAYILAN_TAKVIM, yilGunu, yilParcasi, yilYazisi,
  type Akis, type ParalelTakvim, type Takvim, type TakvimYa, type ZamanSeti } from '../alan/tarih';
import { turBul } from '../alan/turler';
import { kirikEksen, satirlaraDagit, yilAdimi } from '../alan/cizelge-eksen';
import { KararRozeti } from './ortak';
import { BakisAciklamasi, BakisSecici } from './Bilgiler';
import type { Secim } from './BaglantiSecici';
import { KayitSec } from './KayitBolumleri';

const hataYaz = (e: unknown) => (e as Error).message;
const BOS_SET: ZamanSeti = { ana: VARSAYILAN_TAKVIM, diger: [], akislar: [] };
const onbellek = new Map<string, ZamanSeti>();

/** Evrenin zaman tanımları (ana takvim, paralel takvimler, akışlar); önizlemeler bununla okunur. Değişince yenilenir. */
export function useTakvim(istemci: Istemci, evren: string): ZamanSeti {
  const [t, setT] = useState<ZamanSeti>(onbellek.get(evren) ?? BOS_SET);
  useEffect(() => {
    let iptal = false;
    const oku = () => istemci.iste('zamanSeti', { evren }).then((x) => { onbellek.set(evren, x); if (!iptal) setT(x); }, () => {});
    oku();
    const birak = istemci.dinle((d) => { if (d.evren === evren) oku(); });
    return () => { iptal = true; birak(); };
  }, [evren]);
  return t;
}

/** Takvim yazarken örnek ifadeler. */
export function takvimOrnegi(x: TakvimYa): string {
  const t = anaTakvim(x);
  const ay = t.aylar?.[0]?.ad;
  const cag = t.caglar?.find((c) => !c.ters)?.ad;
  return ay ? `Örn. 412, ${ay} 412, 12 ${ay} 412, 410–415${cag ? `, ${cag} 12` : ''}` : `Örn. 412, yaklaşık 300, 410–415${cag ? `, ${cag} 12` : ''}`;
}

// ---------- Takvimler sekmesi ----------
export function TakvimSekmesi({ istemci, evren }: { istemci: Istemci; evren: string }) {
  const z = useTakvim(istemci, evren);
  const [acik, setAcik] = useState<string | null>(null);
  const [akisAcik, setAkisAcik] = useState<string | null>(null);
  const capYazisi = (p: ParalelTakvim) => p.cap ? `${p.ad} ${p.cap.yil}, ana takvimde ${p.cap.ana} ile başlar` : 'Ana takvimle eşlemesi bilinmediği için tarihleri sıralamaya giremez';
  return (
    <div class="takvim-editoru">
      <h2>Ana takvim</h2>
      <TakvimDuzenleyici istemci={istemci} evren={evren} z={z} takvim={z.ana} paralel={false} />

      <h2>Paralel takvimler</h2>
      <p class="soluk kucuk">Bir kültürün, kurumun ya da boyutun kendi takvimi. Tarihi o takvimin yıl sözüyle yazarsınız (“Döngü 12”). Ana takvimle eşlemesi biliniyorsa tarih ana sıraya yerleşir ve her tarihin öbür takvimlerdeki karşılığı da gösterilir. Eşleme bilinmiyorsa kesin bir dönüşüm yapılmaz.</p>
      <ul class="takvim-listesi">
        {z.diger.map((p) => (
          <li key={p.kod}>
            <div class="satir">
              <strong>{p.ad}</strong><span class="soluk kucuk">{capYazisi(p)}</span><span class="bosluk" />
              <button class="dugme sade kucuk" onClick={() => setAcik(acik === p.kod ? null : p.kod)}>{acik === p.kod ? 'Kapat' : 'Düzenle'}</button>
            </div>
            {acik === p.kod && <div class="kart"><TakvimDuzenleyici istemci={istemci} evren={evren} z={z} takvim={p} paralel kapat={() => setAcik(null)} /></div>}
          </li>
        ))}
      </ul>
      {acik === 'yeni'
        ? <div class="kart"><TakvimDuzenleyici istemci={istemci} evren={evren} z={z} paralel yeni kapat={() => setAcik(null)}
            takvim={{ kod: '', surum: 0, ad: '', yilGun: 365, aylar: [], gunBolumleri: [], mevsimler: [], cap: { yil: 1, ana: '' }, bagli: null } as ParalelTakvim} /></div>
        : <button class="dugme" onClick={() => setAcik('yeni')}>Paralel takvim ekle</button>}

      <h2>Zaman akışları</h2>
      <p class="soluk kucuk">Zamanın kendi hızıyla aktığı yerler: bir peri boyutu, rüya âlemi, bir lanetin içi. Akıştaki bir tarihi akışın adıyla yazarsınız (“Fey 30. gün”, “Fey 2. yıl”). Tarih, yazdığınız oranla ana akışa çevrilir. Oran bir aralıksa sonuç da aralık olur. Oran bilinmiyorsa yalnızca neyin önce, neyin sonra olduğu bilinir.</p>
      <ul class="takvim-listesi">
        {z.akislar.map((a) => (
          <li key={a.kod}>
            <div class="satir">
              <strong>{a.ad}</strong><span class="soluk kucuk">başlangıç: {a.cap} · {a.oranlar.map(oranYazisi).join('; ')}</span><span class="bosluk" />
              <button class="dugme sade kucuk" onClick={() => setAkisAcik(akisAcik === a.kod ? null : a.kod)}>{akisAcik === a.kod ? 'Kapat' : 'Düzenle'}</button>
            </div>
            {akisAcik === a.kod && <div class="kart"><AkisDuzenleyici istemci={istemci} evren={evren} z={z} akis={a} kapat={() => setAkisAcik(null)} /></div>}
          </li>
        ))}
      </ul>
      {akisAcik === 'yeni'
        ? <div class="kart"><AkisDuzenleyici istemci={istemci} evren={evren} z={z} akis={null} kapat={() => setAkisAcik(null)} /></div>
        : <button class="dugme" onClick={() => setAkisAcik('yeni')}>Zaman akışı ekle</button>}
    </div>
  );
}

const oranYazisi = (o: Akis['oranlar'][number]) => `${o.bas ? `${o.bas} tarihinden itibaren ` : ''}${o.ana ? `${sayiGirdisi(o.akis)} gün = ana akışta ${o.ana[0] === o.ana[1] ? sayiGirdisi(o.ana[0]) : `${sayiGirdisi(o.ana[0])}–${sayiGirdisi(o.ana[1])}`} gün` : 'oran bilinmiyor'}`;

// ---------- Takvim düzenleyici (ana ya da paralel) ----------
type Taslak = Takvim & { cap?: { yil: number; ana: string } | null; bagli?: string | null };
const kopya = (t: Taslak): Taslak => ({ ...t, aylar: [...(t.aylar ?? [])].map((a) => ({ ...a })), gunBolumleri: [...(t.gunBolumleri ?? [])],
  mevsimler: [...(t.mevsimler ?? [])].map((m) => ({ ...m })), caglar: [...(t.caglar ?? [])].map((c) => ({ ...c })), ...(t.cap !== undefined ? { cap: t.cap ? { ...t.cap } : null } : {}) });
const ozelMi = (t: Takvim) => t.kod !== VARSAYILAN_TAKVIM.kod;
/** Karşılaştırma için takvimin içeriği (sürüm ve kod hariç). */
const ozet = (t: Taslak) => JSON.stringify([t.ad, t.aylar?.length ? 0 : t.yilGun, t.aylar ?? [], t.gunBolumleri ?? [], t.aylar?.length ? t.mevsimler ?? [] : [], t.caglar ?? [], t.cap ?? null, t.bagli ?? null]);

function TakvimDuzenleyici({ istemci, evren, z, takvim, paralel, yeni = false, kapat }: {
  istemci: Istemci; evren: string; z: ZamanSeti; takvim: Taslak; paralel: boolean; yeni?: boolean; kapat?: () => void;
}) {
  const [taslak, setTaslak] = useState<Taslak>(kopya(takvim));
  const [bolumYazi, setBolumYazi] = useState((takvim.gunBolumleri ?? []).join(', '));
  const [etki, setEtki] = useState<{ hedef: Taslak | null; e: TakvimEtkisi } | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [kaydedildi, setKaydedildi] = useState(false);
  const [deneme, setDeneme] = useState('');
  const [bagli, setBagli] = useState<Secim | null>(null);
  const [anahtar, setAnahtar] = useState(`${takvim.kod}:${takvim.surum}`);

  // Takvim başka yerden değişirse (başka cihaz) taslak yenilenir.
  useEffect(() => {
    const k = `${takvim.kod}:${takvim.surum}`;
    if (k !== anahtar) { setAnahtar(k); setTaslak(kopya(takvim)); setBolumYazi((takvim.gunBolumleri ?? []).join(', ')); setEtki(null); }
  }, [takvim]);
  useEffect(() => {
    if (paralel && takvim.bagli) istemci.iste('kayit', { evren, kod: takvim.bagli }).then((k) => setBagli({ kod: k.kod, ad: k.ad }), () => {});
  }, [takvim.bagli]);

  const guncelle = (f: (t: Taslak) => void) => { const t = kopya(taslak); f(t); setTaslak(t); setEtki(null); setKaydedildi(false); };
  const bolumler = bolumYazi.split(',').map((x) => x.trim()).filter(Boolean);
  const hedef: Taslak = { ...taslak, kod: paralel ? (takvim.kod || 'yeni0000') : 'ana', ad: taslak.ad.trim() || (paralel ? '' : 'Yıl'), gunBolumleri: bolumler,
    aylar: taslak.aylar!.map((a) => ({ ad: a.ad.trim(), gun: Number(a.gun) })), mevsimler: taslak.aylar!.length ? taslak.mevsimler : [],
    caglar: taslak.caglar!.map((c) => ({ ad: c.ad.trim(), baslangic: Number(c.baslangic), ...(c.ters ? { ters: true } : {}) })),
    ...(paralel ? { bagli: bagli?.kod ?? null } : {}) };
  if (!hedef.caglar!.length) delete hedef.caglar;
  if (hedef.aylar!.length) hedef.yilGun = yilGunu(hedef);
  const gecerli = takvimGecerli({ ...hedef, ad: hedef.ad || 'X', surum: Math.max(1, hedef.surum) }) && (!paralel || !!hedef.ad);
  const ayni = !yeni && ozet(hedef) === ozet(takvim);
  const deneSet: ZamanSeti = paralel
    ? { ...z, diger: [...z.diger.filter((x) => x.kod !== takvim.kod), { ...(hedef as ParalelTakvim), cap: hedef.cap?.ana ? hedef.cap : null, bagli: null }] }
    : { ...z, ana: hedef };

  const gonder = (h: Taslak | null) => {
    if (!paralel) return h ? { ...h } : null;
    return h ? { ...h, cap: h.cap?.ana.trim() ? h.cap : null } as ParalelTakvim : null;
  };
  const onizle = async (h: Taslak | null) => {
    try {
      if (paralel && yeni) { await yaz(h); return; }
      const e = await istemci.iste('takvimEtkisi', { evren, takvim: gonder(h), kod: paralel ? takvim.kod : null });
      setHata(null);
      if (e.degisenSayisi === 0 && e.goreliSayisi === 0) await yaz(h); else setEtki({ hedef: h, e });
    } catch (e) { setHata(hataYaz(e)); }
  };
  const yaz = async (h: Taslak | null) => {
    try {
      if (paralel) await istemci.iste('paralelTakvimYaz', { evren, kod: yeni ? null : takvim.kod, takvim: gonder(h) as ParalelTakvim | null });
      else await istemci.iste('takvimYaz', { evren, takvim: h });
      setEtki(null); setHata(null); setKaydedildi(true);
      if (paralel && (yeni || !h)) kapat?.();
    } catch (e) { setHata(hataYaz(e)); }
  };
  const ayKaldir = (i: number) => guncelle((t) => {
    t.aylar!.splice(i, 1);
    t.mevsimler = t.mevsimler!.filter((m) => m.ilkAy !== i && m.sonAy !== i).map((m) => ({ ...m, ilkAy: m.ilkAy > i ? m.ilkAy - 1 : m.ilkAy, sonAy: m.sonAy > i ? m.sonAy - 1 : m.sonAy }));
  });
  const ayTasi = (i: number, j: number) => guncelle((t) => {
    if (j < 0 || j >= t.aylar!.length) return;
    [t.aylar![i], t.aylar![j]] = [t.aylar![j], t.aylar![i]];
    const d = (x: number) => (x === i ? j : x === j ? i : x);
    t.mevsimler = t.mevsimler!.map((m) => ({ ...m, ilkAy: d(m.ilkAy), sonAy: d(m.sonAy) }));
  });
  const denemeSonucu = deneme.trim() ? tarihCoz(deneme, deneSet) : null;
  const capOnizleme = paralel && hedef.cap?.ana.trim() ? tarihCoz(hedef.cap.ana, z.ana) : null;

  return (
    <div>
      {!paralel && <p class="soluk kucuk">Tarihleri bu takvimle yazarsınız. Takvimi sonradan değiştirirseniz yazdığınız tarihler silinmez. Yazılışları aynı kalır, evrendeki yerleri yeni takvime göre yeniden hesaplanır.
        {!ozelMi(takvim) && ' Şu an varsayılan takvim kullanılıyor: ay yok, bir yıl 365 gün.'}</p>}

      <div class="alanlar">
        <label class="alan"><span class="alan-adi">Yıl için kullanılan söz</span>
          <input class="girdi" lang="tr" value={taslak.ad} placeholder={paralel ? 'Örn. Döngü' : 'Yıl'} onInput={(e) => guncelle((t) => { t.ad = (e.target as HTMLInputElement).value; })} />
          <span class="soluk kucuk">“{hedef.ad || '…'} 412” biçiminde okunur.</span></label>
        {!taslak.aylar!.length && (
          <label class="alan"><span class="alan-adi">Bir yıldaki gün sayısı</span>
            <input class="girdi" type="number" min={1} value={taslak.yilGun} onInput={(e) => guncelle((t) => { t.yilGun = Number((e.target as HTMLInputElement).value); })} /></label>
        )}
      </div>

      {paralel && <>
        <h3>Ana takvimle eşleme</h3>
        <label class="satir"><input type="checkbox" checked={!!taslak.cap} onChange={(e) => guncelle((t) => { t.cap = (e.target as HTMLInputElement).checked ? { yil: 1, ana: '' } : null; })} /> Bu takvimin ana takvimdeki başlangıcı biliniyor</label>
        {taslak.cap && (
          <div class="satir">
            <span>{hedef.ad || 'Bu takvim'}</span>
            <input class="girdi" style="width:90px" type="number" aria-label="Eşlenen yıl" value={taslak.cap.yil} onInput={(e) => guncelle((t) => { t.cap!.yil = Number((e.target as HTMLInputElement).value); })} />
            <span>. yılının ilk günü, ana takvimde</span>
            <input class="girdi" style="flex:1;min-width:140px" lang="tr" aria-label="Ana takvimdeki başlangıç" value={taslak.cap.ana} placeholder={takvimOrnegi(z.ana)}
              onInput={(e) => guncelle((t) => { t.cap!.ana = (e.target as HTMLInputElement).value; })} />
          </div>
        )}
        {taslak.cap && <p class="soluk kucuk">{capOnizleme ? `${tarihAciklamasi(capOnizleme, z.ana)}. Yalnızca yılı yazarsanız dönüşüm bir yıllık bir aralık verir.` : 'Ana takvimde bir tarih yazın.'}</p>}
        <div class="satir"><span class="soluk kucuk">Bağlı olduğu kayıt (isteğe bağlı):</span>
          <KayitSec istemci={istemci} evren={evren} secili={bagli} sec={(s) => { setBagli(s); setEtki(null); setKaydedildi(false); }} etiket="Kültür, kurum ya da boyut seç" />
          {bagli && <button class="dugme sade kucuk" onClick={() => setBagli(null)}>Bağı kaldır</button>}</div>
      </>}

      <h3>Aylar</h3>
      {!taslak.aylar!.length && <p class="soluk kucuk">Ay tanımlanmadı. Ay eklerseniz yılın uzunluğu ayların toplamı olur.</p>}
      <ul class="takvim-listesi">
        {taslak.aylar!.map((a, i) => (
          <li class="satir" key={i}>
            <span class="soluk kucuk sira">{i + 1}.</span>
            <input class="girdi" style="flex:2;min-width:140px" lang="tr" aria-label={`${i + 1}. ayın adı`} value={a.ad} onInput={(e) => guncelle((t) => { t.aylar![i].ad = (e.target as HTMLInputElement).value; })} />
            <input class="girdi" style="width:90px" type="number" min={1} aria-label={`${i + 1}. ayın gün sayısı`} value={a.gun} onInput={(e) => guncelle((t) => { t.aylar![i].gun = Number((e.target as HTMLInputElement).value); })} />
            <span class="soluk kucuk">gün</span>
            <button class="dugme sade kucuk" aria-label={`${a.ad || `${i + 1}. ay`}: yukarı`} disabled={i === 0} onClick={() => ayTasi(i, i - 1)}>↑</button>
            <button class="dugme sade kucuk" aria-label={`${a.ad || `${i + 1}. ay`}: aşağı`} disabled={i === taslak.aylar!.length - 1} onClick={() => ayTasi(i, i + 1)}>↓</button>
            <button class="dugme sade kucuk tehlikeli" onClick={() => ayKaldir(i)}>Kaldır</button>
          </li>
        ))}
      </ul>
      <button class="dugme" onClick={() => guncelle((t) => { t.aylar!.push({ ad: '', gun: 30 }); })}>Ay ekle</button>
      {taslak.aylar!.length > 0 && <p class="soluk kucuk">Bir yıl {yilGunu(hedef)} gün.</p>}

      <h3>Gün bölümleri</h3>
      <label class="alan genis"><span class="alan-adi">Virgülle ayırarak, günün başından sonuna doğru</span>
        <input class="girdi" lang="tr" value={bolumYazi} placeholder="Örn. sabah, öğle, akşam, gece" onInput={(e) => { setBolumYazi((e.target as HTMLInputElement).value); setEtki(null); setKaydedildi(false); }} />
        <span class="soluk kucuk">Gün eşit parçalara bölünür. Tarih “12 Hasat 412 öğle” gibi yazılır. Gün bölümü yalnızca günü belli olan tarihlere eklenebilir.</span></label>

      {taslak.aylar!.length > 0 && <>
        <h3>Mevsimler</h3>
        {!taslak.mevsimler!.length && <p class="soluk kucuk">Mevsim tanımlanmadı.</p>}
        <ul class="takvim-listesi">
          {taslak.mevsimler!.map((m, i) => (
            <li class="satir" key={i}>
              <input class="girdi" style="flex:2;min-width:140px" lang="tr" aria-label={`${i + 1}. mevsimin adı`} value={m.ad} onInput={(e) => guncelle((t) => { t.mevsimler![i].ad = (e.target as HTMLInputElement).value; })} />
              <select class="girdi" style="flex:1;min-width:110px" aria-label={`${m.ad || 'Mevsim'}: ilk ay`} value={m.ilkAy} onChange={(e) => guncelle((t) => { t.mevsimler![i].ilkAy = Number((e.target as HTMLSelectElement).value); })}>
                {taslak.aylar!.map((a, j) => <option value={j}>{a.ad || `${j + 1}. ay`}</option>)}
              </select>
              <span class="soluk kucuk">ile</span>
              <select class="girdi" style="flex:1;min-width:110px" aria-label={`${m.ad || 'Mevsim'}: son ay`} value={m.sonAy} onChange={(e) => guncelle((t) => { t.mevsimler![i].sonAy = Number((e.target as HTMLSelectElement).value); })}>
                {taslak.aylar!.map((a, j) => <option value={j}>{a.ad || `${j + 1}. ay`}</option>)}
              </select>
              <span class="soluk kucuk">arası</span>
              <button class="dugme sade kucuk tehlikeli" onClick={() => guncelle((t) => { t.mevsimler!.splice(i, 1); })}>Kaldır</button>
            </li>
          ))}
        </ul>
        <button class="dugme" onClick={() => guncelle((t) => { t.mevsimler!.push({ ad: '', ilkAy: 0, sonAy: 0 }); })}>Mevsim ekle</button>
        <p class="soluk kucuk">Son ayı ilk ayından önce gelen bir mevsim, yıl sonunu aşıp ertesi yıla uzanır.</p>
      </>}

      <h3>Çağlar</h3>
      <p class="soluk kucuk">Çağ, yılların adlandırılmış bir bölümüdür. Tarihi “İkinci Çağ 12” diye yazarsınız. Her çağ için ilk yılının düz sayımdaki karşılığını girin. Geriye sayan çağ (“Kuruluş öncesi 30”) o yıldan geriye doğru sayılır ve öbür çağlardan önce gelir. Geriye sayan en çok bir çağ olabilir.</p>
      {!taslak.caglar!.length && <p class="soluk kucuk">Çağ tanımlanmadı.</p>}
      <ul class="takvim-listesi">
        {taslak.caglar!.map((c, i) => (
          <li class="satir" key={i}>
            <input class="girdi" style="flex:2;min-width:140px" lang="tr" aria-label={`${i + 1}. çağın adı`} value={c.ad} placeholder="Örn. İkinci Çağ" onInput={(e) => guncelle((t) => { t.caglar![i].ad = (e.target as HTMLInputElement).value; })} />
            <span class="soluk kucuk">{c.ters ? 'son yılı (1. yılı)' : 'ilk yılı'}</span>
            <input class="girdi" style="width:100px" type="number" aria-label={`${c.ad || `${i + 1}. çağ`}: başladığı yıl`} value={c.baslangic} onInput={(e) => guncelle((t) => { t.caglar![i].baslangic = Number((e.target as HTMLInputElement).value); })} />
            <label class="satir kucuk"><input type="checkbox" checked={!!c.ters} onChange={(e) => guncelle((t) => { t.caglar![i].ters = (e.target as HTMLInputElement).checked; })} /> geriye sayar</label>
            <button class="dugme sade kucuk tehlikeli" onClick={() => guncelle((t) => { t.caglar!.splice(i, 1); })}>Kaldır</button>
          </li>
        ))}
      </ul>
      <button class="dugme" onClick={() => guncelle((t) => { t.caglar!.push({ ad: '', baslangic: (t.caglar!.filter((x) => !x.ters).reduce((a, x) => Math.max(a, x.baslangic), 0) || 0) + 1 }); })}>Çağ ekle</button>

      <h3>Dene</h3>
      <label class="alan genis"><span class="alan-adi">Bir tarih yazın, bu takvimle nasıl okunduğunu görün</span>
        <input class="girdi" lang="tr" value={deneme} placeholder={paralel ? `Örn. ${hedef.ad || 'Döngü'} 12` : takvimOrnegi(hedef)} onInput={(e) => setDeneme((e.target as HTMLInputElement).value)} />
        <span class="soluk kucuk">{denemeSonucu ? tarihAciklamasi(denemeSonucu, deneSet) : ' '}</span>
        {denemeSonucu && paralelYazilar(denemeSonucu, deneSet).map((p) => <span class="soluk kucuk">{p.takvim}: {p.yazi}</span>)}</label>

      {!gecerli && <p class="hata kucuk">{paralel && !hedef.ad ? 'Yıl için kullanılan sözü yazın. ' : ''}Her ayın, gün bölümünün, mevsimin ve çağın bir adı olmalı. Adlar birbirini tekrar etmemeli ve sayı içermemeli. Gün sayıları 1 ya da daha büyük olmalı. Geriye sayan çağ öbür çağlardan önce başlamalı.</p>}
      {hata && <p class="hata kucuk">{hata}</p>}

      {etki ? <TakvimEtkiPaneli evren={evren} etki={etki.e} onOnay={() => yaz(etki.hedef)} onVazgec={() => setEtki(null)} />
        : (
          <div class="satir" style="margin-top:16px">
            <button class="dugme ana" disabled={!gecerli || ayni} onClick={() => onizle(hedef)}>{yeni ? 'Takvimi ekle' : 'Kaydet'}</button>
            {!paralel && ozelMi(takvim) && <button class="dugme" onClick={() => onizle(null)}>Varsayılan takvime dön</button>}
            {paralel && !yeni && <button class="dugme tehlikeli" onClick={() => onizle(null)}>Takvimi kaldır</button>}
            {!ayni && !yeni && <button class="dugme sade" onClick={() => { setTaslak(kopya(takvim)); setBolumYazi((takvim.gunBolumleri ?? []).join(', ')); }}>Değişikliklerden vazgeç</button>}
            {yeni && <button class="dugme sade" onClick={kapat}>Vazgeç</button>}
            {kaydedildi && ayni && <span class="soluk kucuk" role="status">Kaydedildi.</span>}
          </div>
        )}
    </div>
  );
}

// ---------- Zaman akışı düzenleyici ----------
type OranTaslagi = { bas: string; akis: string; ana1: string; ana2: string; bilinmiyor: boolean };
function AkisDuzenleyici({ istemci, evren, z, akis, kapat }: { istemci: Istemci; evren: string; z: ZamanSeti; akis: Akis | null; kapat: () => void }) {
  const [ad, setAd] = useState(akis?.ad ?? '');
  const [cap, setCap] = useState(akis?.cap ?? '');
  const [bagli, setBagli] = useState<Secim | null>(null);
  const [oranlar, setOranlar] = useState<OranTaslagi[]>((akis?.oranlar ?? [{ bas: null, akis: 1, ana: [1, 1] }]).map((o) => ({
    bas: o.bas ?? '', akis: String(o.akis), ana1: o.ana ? String(o.ana[0]) : '1', ana2: o.ana && o.ana[1] !== o.ana[0] ? String(o.ana[1]) : '', bilinmiyor: !o.ana })));
  const [etki, setEtki] = useState<TakvimEtkisi | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [deneme, setDeneme] = useState('');
  useEffect(() => { if (akis?.bagli) istemci.iste('kayit', { evren, kod: akis.bagli }).then((k) => setBagli({ kod: k.kod, ad: k.ad }), () => {}); }, [akis?.bagli]);
  const hedef: Akis = {
    kod: akis?.kod ?? 'yeni0000', ad: ad.trim(), bagli: bagli?.kod ?? null, cap: cap.trim(),
    oranlar: oranlar.map((o, i) => ({ bas: i === 0 ? null : o.bas.trim(), akis: Number(o.akis), ana: o.bilinmiyor ? null : [Number(o.ana1), Number(o.ana2 || o.ana1)] as [number, number] })),
  };
  const degis = (i: number, f: (o: OranTaslagi) => void) => { const y = oranlar.map((o) => ({ ...o })); f(y[i]); setOranlar(y); setEtki(null); };
  const deneSet: ZamanSeti = { ...z, akislar: [...z.akislar.filter((x) => x.kod !== hedef.kod), hedef] };
  const denemeSonucu = deneme.trim() ? tarihCoz(deneme, deneSet) : null;
  const kaydet = async (onayli = false, sil = false) => {
    try {
      if (akis && !onayli) {
        const e = await istemci.iste('akisEtkisi', { evren, kod: akis.kod, akis: sil ? null : hedef });
        if (e.degisenSayisi > 0) { setEtki(e); setHata(null); return; }
      }
      await istemci.iste('akisYaz', { evren, kod: akis?.kod ?? null, akis: sil ? null : hedef });
      setHata(null); setEtki(null); kapat();
    } catch (e) { setHata(hataYaz(e)); }
  };
  const [silinecek, setSilinecek] = useState(false);
  return (
    <div>
      <div class="alanlar">
        <label class="alan"><span class="alan-adi">Adı</span>
          <input class="girdi" lang="tr" value={ad} placeholder="Örn. Fey" onInput={(e) => { setAd((e.target as HTMLInputElement).value); setEtki(null); }} />
          <span class="soluk kucuk">Tarih “{ad.trim() || '…'} 30. gün” biçiminde yazılır.</span></label>
        <label class="alan"><span class="alan-adi">Akışın 1. günü, ana takvimde</span>
          <input class="girdi" lang="tr" value={cap} placeholder={takvimOrnegi(z.ana)} onInput={(e) => { setCap((e.target as HTMLInputElement).value); setEtki(null); }} />
          <span class="soluk kucuk">{cap.trim() ? (() => { const t = tarihCoz(cap, z.ana); return t ? tarihAciklamasi(t, z.ana) : ''; })() : 'Örneğin kapının ilk açıldığı gün.'}</span></label>
      </div>
      <div class="satir"><span class="soluk kucuk">Bağlı olduğu yer (isteğe bağlı):</span>
        <KayitSec istemci={istemci} evren={evren} secili={bagli} sec={(s) => { setBagli(s); setEtki(null); }} etiket="Mekân ya da boyut seç" />
        {bagli && <button class="dugme sade kucuk" onClick={() => setBagli(null)}>Bağı kaldır</button>}</div>
      <h3>Oran</h3>
      <p class="soluk kucuk">Akışta geçen günlerin ana akışta kaç güne denk geldiği. Ana akıştaki gün sayısı bir aralık olabilir (“1–2 gün”). Oran zamanla değiştiyse yeni bir dönem ekleyip başladığı tarihi yazın.</p>
      <ul class="takvim-listesi">
        {oranlar.map((o, i) => (
          <li class="satir" key={i}>
            {i === 0 ? <span class="soluk kucuk">Akışın başından</span>
              : <input class="girdi" style="min-width:120px" lang="tr" aria-label={`${i + 1}. dönemin başladığı tarih`} value={o.bas} placeholder="Başlangıç (ana takvimde)" onInput={(e) => degis(i, (x) => { x.bas = (e.target as HTMLInputElement).value; })} />}
            <span class="soluk kucuk">akışta</span>
            <input class="girdi" style="width:80px" type="number" min={0} aria-label="Akışta geçen gün" value={o.akis} onInput={(e) => degis(i, (x) => { x.akis = (e.target as HTMLInputElement).value; })} />
            <span class="soluk kucuk">gün =</span>
            {o.bilinmiyor ? <span class="soluk kucuk">ana akışta bilinmiyor</span> : <>
              <span class="soluk kucuk">ana akışta</span>
              <input class="girdi" style="width:80px" type="number" min={0} aria-label="Ana akışta en az" value={o.ana1} onInput={(e) => degis(i, (x) => { x.ana1 = (e.target as HTMLInputElement).value; })} />
              <span class="soluk kucuk">–</span>
              <input class="girdi" style="width:80px" type="number" min={0} aria-label="Ana akışta en çok (aralıksa)" value={o.ana2} placeholder="(aralıksa)" onInput={(e) => degis(i, (x) => { x.ana2 = (e.target as HTMLInputElement).value; })} />
              <span class="soluk kucuk">gün</span></>}
            <label class="satir kucuk"><input type="checkbox" checked={o.bilinmiyor} onChange={(e) => degis(i, (x) => { x.bilinmiyor = (e.target as HTMLInputElement).checked; })} /> bilinmiyor</label>
            {i > 0 && <button class="dugme sade kucuk tehlikeli" onClick={() => { setOranlar(oranlar.filter((_, j) => j !== i)); setEtki(null); }}>Kaldır</button>}
          </li>
        ))}
      </ul>
      <button class="dugme" onClick={() => setOranlar([...oranlar, { bas: '', akis: '1', ana1: '1', ana2: '', bilinmiyor: false }])}>Dönem ekle</button>
      <h3>Dene</h3>
      <label class="alan genis"><span class="alan-adi">Akışta bir tarih yazın</span>
        <input class="girdi" lang="tr" value={deneme} placeholder={`Örn. ${ad.trim() || 'Fey'} 30. gün`} onInput={(e) => setDeneme((e.target as HTMLInputElement).value)} />
        <span class="soluk kucuk">{denemeSonucu ? tarihAciklamasi(denemeSonucu, deneSet) : ' '}</span></label>
      {hata && <p class="hata kucuk">{hata}</p>}
      {etki ? <TakvimEtkiPaneli evren={evren} etki={etki} onOnay={() => kaydet(true, silinecek)} onVazgec={() => { setEtki(null); setSilinecek(false); }} />
        : (
          <div class="satir" style="margin-top:16px">
            <button class="dugme ana" onClick={() => { setSilinecek(false); kaydet(); }}>{akis ? 'Kaydet' : 'Akışı ekle'}</button>
            {akis && <button class="dugme tehlikeli" onClick={() => { setSilinecek(true); kaydet(false, true); }}>Akışı kaldır</button>}
            <button class="dugme sade" onClick={kapat}>Vazgeç</button>
          </div>
        )}
    </div>
  );
}

function TakvimEtkiPaneli({ evren, etki, onOnay, onVazgec }: { evren: string; etki: TakvimEtkisi; onOnay: () => void; onVazgec: () => void }) {
  return (
    <div class="uyari takvim-etkisi" role="region" aria-label="Takvim değişikliğinin etkisi">
      <p><strong>{etki.toplam} tarihten {etki.degisenSayisi} tanesinin okunuşu ya da sıradaki yeri değişecek.</strong> Yazılışları aynı kalır.</p>
      {etki.cozulemezSayisi > 0 && <p class="hata kucuk">{etki.cozulemezSayisi} tarih yeni tanıma çevrilemeyecek (örneğin artık olmayan bir ay, gün ya da takvim). Bu tarihler silinmez. Sıralamadaki yerleri belirsiz kalır, tanımı düzelttiğinizde geri gelir.</p>}
      {etki.goreliSayisi > 0 && <p class="kucuk">{etki.goreliSayisi} tarih bir olaya göre verilmiş (“Tufan'dan 80 yıl sonra”). Yazılışları değişmez, olası yerleri dayandıkları tarihlerden yeniden hesaplanır.</p>}
      <ul class="etki-listesi">
        {etki.degisen.map((d) => (
          <li class={d.cozulemez ? 'cozulemez' : ''}>
            <a class="satir-ad" href={`#/e/${evren}/k/${d.kayit}`}>{d.yer}</a>: “{d.ifade}”
            <div class="soluk kucuk">{d.once} → {d.sonra}</div>
          </li>
        ))}
      </ul>
      {etki.degisenSayisi > etki.degisen.length && <p class="soluk kucuk">…ve {etki.degisenSayisi - etki.degisen.length} tarih daha.</p>}
      <div class="satir">
        <button class="dugme ana" onClick={onOnay}>Değiştir</button>
        <button class="dugme" onClick={onVazgec}>Vazgeç</button>
      </div>
    </div>
  );
}

// ---------- Zaman çizelgesi ----------
/** Çağların ana eksendeki aralıkları (çizelgede arka plan şeridi). */
function cagAraliklari(t: Takvim): { ad: string; bas: number | null; son: number | null }[] {
  const yp = yilParcasi(t);
  const ileri = (t.caglar ?? []).filter((c) => !c.ters).sort((a, b) => a.baslangic - b.baslangic);
  const ters = (t.caglar ?? []).find((c) => c.ters);
  return [
    ...(ters ? [{ ad: ters.ad, bas: null, son: (ters.baslangic + 1) * yp - 1 }] : []),
    ...ileri.map((c, i) => ({ ad: c.ad, bas: c.baslangic * yp, son: i + 1 < ileri.length ? ileri[i + 1].baslangic * yp - 1 : null })),
  ];
}

const OLAY_SERIDI = '';
const SERIT_ADI_GEN = 150;
const SATIR_YUK = 30;
const cizelgeAnahtari = 'dunya-atlasi:cizelge-gorunusu';
const okuYerel = (a: string) => { try { return localStorage.getItem(a); } catch { return null; } };
const yazYerel = (a: string, v: string) => { try { localStorage.setItem(a, v); } catch { /* yok */ } };
/** Bir öğenin eksendeki uçları; "önce" ve "sonra" tarihlerinde bilinen uç iki kez kullanılır. */
const uclari = (o: CizelgeOgesi): [number, number] => {
  const { enErken, enGec } = o.tarih.eksen!;
  return [enErken ?? enGec!, enGec ?? enErken!];
};
const yaziGen = (s: string) => s.length * 7 + 14;

/** Zaman çizelgesi (§7, taslak 3A ve 3B): çağlar arka planda bant, olaylar ve her eser kendi şeridinde; uzun boş
 *  süreler kırık eksenle kısalır. Altta bütün zamanın özet çizgisi ve seçilen aralık. Dar ekranda kendiliğinden
 *  tarih defterine (dikey, yıl yıl) döner; ikisi arasında elle de geçilir. */
export function ZamanCizelgesi({ istemci, evren }: { istemci: Istemci; evren: string }) {
  const z = useTakvim(istemci, evren);
  const [ogeler, setOgeler] = useState<CizelgeOgesi[] | null>(null);
  const [eserler, setEserler] = useState<KisaKayit[]>([]);
  const [tur, setTur] = useState('');
  const [gizli, setGizli] = useState<string[]>([]);
  const [akis, setAkis] = useState('');
  const [olcek, setOlcek] = useState('');
  const [bakis, setBakis] = useState<Secim | null>(null);
  const [aralik, setAralik] = useState<[number, number] | null>(null);
  const [secim, setSecimDurumu] = useState<'cizelge' | 'defter' | null>(() => { const v = okuYerel(cizelgeAnahtari); return v === 'cizelge' || v === 'defter' ? v : null; });
  const setSecim = (v: 'cizelge' | 'defter') => { setSecimDurumu(v); yazYerel(cizelgeAnahtari, v); };
  const [gen, setGen] = useState(900);
  const kap = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(0);
  useEffect(() => istemci.dinle((d) => { if (d.evren === evren) setN((x) => x + 1); }), [evren]);
  useEffect(() => {
    istemci.iste('zamanCizelgesi', { evren, bakis: bakis?.kod ?? null }).then(setOgeler, () => setOgeler([]));
    istemci.iste('eserler', { evren }).then(setEserler, () => {});
  }, [evren, bakis?.kod, n]);
  useLayoutEffect(() => {
    const k = kap.current; if (!k) return;
    const olc = () => setGen(k.clientWidth || 900);
    olc();
    const g = new ResizeObserver(olc); g.observe(k);
    return () => g.disconnect();
  }, [ogeler !== null]);
  if (!ogeler) return <p class="soluk">Açılıyor…</p>;

  const turler = [...new Set(ogeler.map((o) => o.tur))];
  // Şeritler: önce eserlere bağlı olmayan olaylar ve kayıtlar, sonra her eser.
  const seritler = [{ kod: OLAY_SERIDI, ad: 'Olaylar' }, ...eserler.filter((e) => ogeler.some((o) => o.eser === e.kod))];
  const suzulmus = ogeler.filter((o) => (!tur || o.tur === tur) && !gizli.includes(o.eser ?? OLAY_SERIDI)
    && (!akis || (akis === 'ana' ? !o.tarih.akis : o.tarih.akis === akis)));
  const yerlesen = suzulmus.filter((o) => o.tarih.eksen && (o.tarih.eksen.enErken !== null || o.tarih.eksen.enGec !== null));
  const yerlesmeyen = suzulmus.filter((o) => !yerlesen.includes(o));
  // Ölçeği hangi takvimle okunsun: ana takvim ya da ana takvimle eşlemesi bilinen bir paralel takvim.
  const esli = z.diger.filter((p) => takvimKaymasi(p, z.ana));
  const olcekTakvimi = esli.find((p) => p.kod === olcek);
  const yilYaz = (x: number, kisa = false) => {
    if (!olcekTakvimi) {
      const y = eksenYili(x, z.ana);
      return kisa ? String(cagYili(y, z.ana)?.n ?? y) : yilYazisi(y, z.ana);
    }
    const k = takvimKaymasi(olcekTakvimi, z.ana)!;
    const y1 = Math.floor((x - k[1]) / yilParcasi(olcekTakvimi)), y2 = Math.floor((x - k[0]) / yilParcasi(olcekTakvimi));
    const yaz = (y: number) => (kisa ? String(cagYili(y, olcekTakvimi)?.n ?? y) : yilYazisi(y, olcekTakvimi));
    return y1 === y2 ? yaz(y1) : `${yaz(y1)}–${cagYili(y2, olcekTakvimi)?.n ?? y2}`;
  };
  const defter = (secim ?? (gen < 720 ? 'defter' : 'cizelge')) === 'defter';

  const ust = (
    <>
      <div class="satir cizelge-suzgec" role="group" aria-label="Süz">
        {seritler.map((s) => {
          const acik = !gizli.includes(s.kod);
          return <button key={s.kod} class={`cip bag-cipi ${acik ? 'aktif' : ''}`} aria-pressed={acik} onClick={() => setGizli(acik ? [...gizli, s.kod] : gizli.filter((x) => x !== s.kod))}>{s.ad}</button>;
        })}
        <select class="girdi kucuk-girdi" aria-label="Türe göre süz" value={tur} onChange={(e) => setTur((e.target as HTMLSelectElement).value)}>
          <option value="">Bütün türler</option>
          {turler.map((t) => <option value={t}>{turBul(t).ad}</option>)}
        </select>
        {z.akislar.length > 0 && (
          <select class="girdi kucuk-girdi" aria-label="Zaman akışına göre süz" value={akis} onChange={(e) => setAkis((e.target as HTMLSelectElement).value)}>
            <option value="">Bütün akışlar</option>
            <option value="ana">Yalnızca ana akış</option>
            {z.akislar.map((a) => <option value={a.kod}>{a.ad}</option>)}
          </select>
        )}
        {esli.length > 0 && (
          <select class="girdi kucuk-girdi" aria-label="Ölçeği hangi takvimle göster" value={olcek} onChange={(e) => setOlcek((e.target as HTMLSelectElement).value)}>
            <option value="">Takvim: {z.ana.ad === 'Yıl' ? 'ana takvim' : z.ana.ad}</option>
            {esli.map((p) => <option value={p.kod}>Takvim: {p.ad}</option>)}
          </select>
        )}
        <BakisSecici istemci={istemci} evren={evren} bakis={bakis} sec={setBakis} />
        <span class="bosluk" />
        <span class="dugme-grubu" role="group" aria-label="Gösterim">
          <button class={`dugme kucuk ${!defter ? 'ana' : ''}`} aria-pressed={!defter} onClick={() => setSecim('cizelge')}>Çizelge</button>
          <button class={`dugme kucuk ${defter ? 'ana' : ''}`} aria-pressed={defter} onClick={() => setSecim('defter')}>Tarih defteri</button>
        </span>
      </div>
      <BakisAciklamasi bakis={bakis} />
    </>
  );

  return (
    <div class="cizelge" ref={kap}>
      {ust}
      {!ogeler.length && <p class="soluk">Henüz evren tarihi verilmiş kayıt yok. Bir kaydın sayfasında “Evren tarihi” alanına yazabilirsiniz.</p>}
      {ogeler.length > 0 && !suzulmus.length && <p class="soluk">Bu süzgece uyan kayıt yok.</p>}
      {yerlesen.length > 0 && (defter
        ? <TarihDefteri evren={evren} z={z} ogeler={yerlesen} eserler={eserler} yilYaz={yilYaz} />
        : <SeritliCizelge evren={evren} z={z} ogeler={yerlesen} seritler={seritler.filter((s) => !gizli.includes(s.kod))} gen={gen} yilYaz={yilYaz} aralik={aralik} setAralik={setAralik} />)}
      {yerlesmeyen.length > 0 && (
        <section>
          <h2>Sıralamaya yerleşmeyenler</h2>
          <p class="soluk kucuk">Bu tarihler takvime çevrilemedi, bilinmiyor, ana takvimle eşlemesi olmayan bir takvimde yazıldı ya da kısıtları birbiriyle çelişiyor. Yazdığınız hâliyle saklanıyorlar.</p>
          <ul>
            {yerlesmeyen.map((o) => <li key={o.kod}><a class="satir-ad" href={`#/e/${evren}/k/${o.kod}`}>{o.ad}</a> <span class="soluk kucuk">{turBul(o.tur).ad} · {o.tarih.bicim === 'bilinmiyor' ? 'bilinmiyor' : `“${o.tarih.ifade}” · ${tarihAciklamasi(o.tarih, z)}`}</span> <KararRozeti karar={o.karar} /></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

function ogeAciklamasi(o: CizelgeOgesi, z: ZamanSeti) {
  const t = o.tarih;
  const aciklama = t.bicim === 'goreli' ? `${t.ifade} · ${tarihAciklamasi(t, z)}` : tarihAciklamasi(t, z);
  const paralel = paralelYazilar(t, z).map((p) => `${p.takvim}: ${p.yazi}`).join(' · ');
  return `${o.ad} · ${turBul(o.tur).ad} · ${aciklama}${paralel ? ` · ${paralel}` : ''}${o.karar === 'fikir' ? ' · fikir' : ''}${o.inanc ? ' · yalnızca inanç' : ''}`;
}

function SeritliCizelge({ evren, z, ogeler, seritler, gen, yilYaz, aralik, setAralik }: {
  evren: string; z: ZamanSeti; ogeler: CizelgeOgesi[]; seritler: { kod: string; ad: string }[]; gen: number;
  yilYaz: (x: number, kisa?: boolean) => string; aralik: [number, number] | null; setAralik: (a: [number, number] | null) => void;
}) {
  const genislik = Math.max(320, gen - SERIT_ADI_GEN - 24);
  const tumUclar = ogeler.map(uclari);
  const bas = Math.min(...tumUclar.map((u) => u[0])), son = Math.max(...tumUclar.map((u) => u[1]));
  const gorunen = aralik ? ogeler.filter((o) => { const [a, b] = uclari(o); return b >= aralik[0] && a <= aralik[1]; }) : ogeler;
  const eksen = kirikEksen(gorunen.length ? gorunen.map(uclari) : [[bas, son]], genislik - 16);
  const x = (t: number) => 8 + eksen.konum(t);
  // Her şeritte öğeler, yazılarıyla birlikte çakışmayacak satırlara dağılır.
  const satirlar = seritler.map((s) => {
    const l = gorunen.filter((o) => (o.eser ?? OLAY_SERIDI) === s.kod);
    const geo = l.map((o) => {
      const [a, b] = uclari(o);
      const x0 = x(a), x1 = Math.max(x(b), x0);
      // Kısa aralık da nokta olarak çizilir; kesin olmayan tarihin noktası içi boş ve kesik kenarlıdır.
      const nokta = x1 - x0 < 8;
      const yaziX = (nokta ? (x0 + x1) / 2 + 9 : x1 + 6);
      return { o, x0, x1, nokta, yaziX, son: yaziX + yaziGen(o.ad) };
    });
    const sira = satirlaraDagit(geo.map((g) => [g.x0 - 6, g.son]));
    const adet = Math.max(1, ...sira.map((r) => r + 1));
    return { s, geo: geo.map((g, i) => ({ ...g, satir: sira[i] })), adet };
  });
  const EKSEN_YUK = 34;
  let y = EKSEN_YUK;
  const seritY = satirlar.map((r) => { const y0 = y; y += r.adet * SATIR_YUK + 14; return y0; });
  const yukseklik = y + 4;
  const yp = yilParcasi(z.ana);
  const caglar = cagAraliklari(z.ana);
  // Yıl çizgileri her doğrusal parçada ayrı aralıkla.
  const cizgiler: { x: number; yazi: string }[] = [];
  for (const p of eksen.parcalar) {
    const y0 = eksenYili(p.bas, z.ana), y1 = eksenYili(p.son, z.ana);
    const adim = yilAdimi(y1 - y0 + 1, p.x1 - p.x0);
    let ilk = true;
    for (let yl = Math.ceil(y0 / adim) * adim; yl <= y1; yl += adim) {
      const t = yl * yp;
      if (t < p.bas || t > p.son) continue;
      cizgiler.push({ x: x(t), yazi: yilYaz(t, !ilk) }); ilk = false;
    }
  }
  return (
    <>
      <div class="cizelge-cerceve" role="region" aria-label="Zaman çizelgesi çizimi">
        <div class="cizelge-seritadlari" style={{ width: `${SERIT_ADI_GEN}px` }}>
          {satirlar.map((r, i) => (
            <div key={r.s.kod} class="cizelge-seritadi" style={{ top: `${seritY[i]}px`, height: `${r.adet * SATIR_YUK + 14}px` }}>
              {r.s.kod ? <a href={`#/e/${evren}/yaz/${r.s.kod}`}>{r.s.ad}</a> : r.s.ad}
            </div>
          ))}
        </div>
        <svg class="cizelge-svg" width={genislik} height={yukseklik} viewBox={`0 0 ${genislik} ${yukseklik}`}>
          {caglar.map((c, i) => {
            const a = Math.max(0, c.bas === null ? 0 : x(c.bas)), b = Math.min(genislik, c.son === null ? genislik : x(c.son));
            if (b <= a) return null;
            return <g key={i} class={`cizelge-cagbandi cag-${i % 3}`}><rect x={a} y={0} width={b - a} height={yukseklik} /><text x={a + 6} y={14}>{c.ad}</text></g>;
          })}
          {satirlar.map((r, i) => <line key={r.s.kod} class="cizelge-serit-cizgisi" x1={0} x2={genislik} y1={seritY[i] - 6} y2={seritY[i] - 6} />)}
          {cizgiler.map((c, i) => <g key={i} class="cizelge-yil"><line x1={c.x} x2={c.x} y1={18} y2={yukseklik} /><text x={c.x + 3} y={30}>{c.yazi}</text></g>)}
          {eksen.kiriklar.map((k, i) => {
            const yil = Math.round((k.son - k.bas) / yp);
            return (
              <g key={i} class="cizelge-kirik">
                <rect x={8 + k.x0} y={18} width={k.x1 - k.x0} height={yukseklik - 18} />
                <text x={8 + (k.x0 + k.x1) / 2} y={30} text-anchor="middle">≈</text>
                <title>{`${yil.toLocaleString('tr-TR')} yıl kısaltıldı: bu aralıkta kayıt yok`}</title>
              </g>
            );
          })}
          {satirlar.map((r, i) => r.geo.map((g) => {
            const yy = seritY[i] + g.satir * SATIR_YUK + SATIR_YUK / 2;
            const t = g.o.tarih;
            const goreli = t.bicim === 'goreli' || !!t.akis;
            const once = t.eksen!.enErken === null || t.bicim === 'once', sonra = t.eksen!.enGec === null || t.bicim === 'sonra';
            return (
              <a key={g.o.kod} href={`#/e/${evren}/k/${g.o.kod}`} class={`cizelge-oge karar-${g.o.karar}${g.o.inanc ? ' inanc' : ''}${goreli ? ' goreli' : ''}`} aria-label={ogeAciklamasi(g.o, z)}>
                <title>{ogeAciklamasi(g.o, z)}</title>
                {once ? <path class="cizelge-ok" d={`M${g.x1},${yy} H${Math.max(2, g.x1 - 36)} m6,-5 l-6,5 l6,5`} />
                  : sonra ? <path class="cizelge-ok" d={`M${g.x0},${yy} H${g.x0 + 36} m-6,-5 l6,5 l-6,5`} />
                  : g.nokta ? <circle class={`cizelge-isaret${t.bicim !== 'kesin' ? ' belirsiz' : ''}`} cx={(g.x0 + g.x1) / 2} cy={yy} r={6} />
                  : <rect class="cizelge-isaret bant" x={g.x0} y={yy - 7} width={Math.max(6, g.x1 - g.x0)} height={14} rx={7} />}
                <text class="cizelge-yazi" x={sonra && !g.nokta ? g.x0 + 42 : g.yaziX} y={yy + 4.5}>{g.o.ad}</text>
              </a>
            );
          }))}
        </svg>
      </div>
      <OzetCizgisi ogeler={ogeler} bas={bas} son={son} genislik={genislik} aralik={aralik} setAralik={setAralik} yilYaz={yilYaz} />
      <p class="soluk kucuk">Kesin tarih nokta, aralık ve belirsiz tarih bant, “önce” ve “sonra” ok olarak görünür; kesik çizgili bant bir olaya göre verilmiş tarihtir. Uzun boş aralıklar “≈” ile kısaltılır.</p>
    </>
  );
}

/** Bütün zamanın özet çizgisi: sürükleyerek bir aralık seçilir, çizelge o aralığa yakınlaşır. Klavyede ← → aralığı
 *  kaydırır, + ve − daraltıp genişletir. */
function OzetCizgisi({ ogeler, bas, son, genislik, aralik, setAralik, yilYaz }: {
  ogeler: CizelgeOgesi[]; bas: number; son: number; genislik: number; aralik: [number, number] | null; setAralik: (a: [number, number] | null) => void; yilYaz: (x: number) => string;
}) {
  const [surukle, setSurukle] = useState<[number, number] | null>(null);
  const uz = Math.max(1, son - bas);
  const px = (t: number) => ((t - bas) / uz) * genislik;
  const an = (p: number) => bas + (Math.min(Math.max(p, 0), genislik) / genislik) * uz;
  const yer = (e: PointerEvent) => e.clientX - (e.currentTarget as SVGElement).getBoundingClientRect().left;
  const goster = surukle ? [Math.min(...surukle), Math.max(...surukle)] as [number, number] : aralik;
  const tus = (e: KeyboardEvent) => {
    const [a, b] = aralik ?? [bas, son];
    const w = b - a;
    const kay = (d: number) => { const na = Math.min(Math.max(bas, a + d), son - w); setAralik([na, na + w]); };
    if (e.key === 'ArrowLeft') { e.preventDefault(); kay(-w * 0.2); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); kay(w * 0.2); }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); setAralik([a + w * 0.2, b - w * 0.2]); }
    else if (e.key === '-') { e.preventDefault(); const na = Math.max(bas, a - w * 0.25), nb = Math.min(son, b + w * 0.25); setAralik(na <= bas && nb >= son ? null : [na, nb]); }
    else if (e.key === 'Escape' && aralik) { e.preventDefault(); setAralik(null); }
  };
  return (
    <div class="ozet-cizgisi">
      <div class="satir kucuk">
        <span class="soluk">Bütün zaman: {yilYaz(bas)} – {yilYaz(son)}{aralik ? ` · gösterilen: ${yilYaz(aralik[0])} – ${yilYaz(aralik[1])}` : ''}</span>
        <span class="bosluk" />
        {aralik && <button class="dugme sade kucuk" onClick={() => setAralik(null)}>Bütün zamanı göster</button>}
      </div>
      <svg width={genislik} height={34} class="ozet-svg" tabIndex={0} role="group" aria-label="Bütün zaman. Bir aralık seçmek için sürükleyin; klavyede sol ve sağ ok aralığı kaydırır, artı ve eksi daraltır ve genişletir."
        onKeyDown={tus}
        onPointerDown={(e) => { (e.currentTarget as SVGElement).setPointerCapture(e.pointerId); const t = an(yer(e)); setSurukle([t, t]); }}
        onPointerMove={(e) => { if (surukle) setSurukle([surukle[0], an(yer(e))]); }}
        onPointerUp={() => {
          if (surukle) { const [a, b] = [Math.min(...surukle), Math.max(...surukle)]; setAralik(px(b) - px(a) < 6 ? null : [a, b]); }
          setSurukle(null);
        }}>
        <rect class="ozet-zemin" x={0} y={8} width={genislik} height={18} rx={9} />
        {ogeler.map((o) => { const [a, b] = uclari(o); return <rect key={o.kod} class="ozet-oge" x={px(a) - 1.5} y={12} width={Math.max(3, px(b) - px(a) + 3)} height={10} rx={2} />; })}
        {goster && <rect class="ozet-secim" x={px(goster[0])} y={4} width={Math.max(4, px(goster[1]) - px(goster[0]))} height={26} rx={6} />}
      </svg>
    </div>
  );
}

/** Tarih defteri (taslak 3B): yıl yıl dikey akış; uzun boşluklar tek satırla söylenir, aynı eserde aynı tarihli
 *  sahneler tek kartta toplanır. */
function TarihDefteri({ evren, z, ogeler, eserler, yilYaz }: {
  evren: string; z: ZamanSeti; ogeler: CizelgeOgesi[]; eserler: KisaKayit[]; yilYaz: (x: number) => string;
}) {
  const yp = yilParcasi(z.ana);
  const yillar = new Map<number, CizelgeOgesi[]>();
  for (const o of ogeler) { const y = eksenYili(uclari(o)[0], z.ana); yillar.set(y, [...(yillar.get(y) ?? []), o]); }
  const sirali = [...yillar.entries()].sort((a, b) => a[0] - b[0]);
  const eserAdi = (k: string | null) => eserler.find((e) => e.kod === k)?.ad ?? null;
  return (
    <ol class="tarih-defteri" aria-label="Tarih defteri">
      {sirali.map(([yil, l], i) => {
        const onceki = sirali[i - 1]?.[0];
        const bos = onceki !== undefined ? yil - onceki - 1 : 0;
        // Aynı esere ve aynı tarih ifadesine sahip sahneler tek kartta.
        const gruplar: CizelgeOgesi[][] = [];
        for (const o of l) {
          const g = o.tur === 'sahne' ? gruplar.find((x) => x[0].tur === 'sahne' && x[0].eser === o.eser && x[0].tarih.ifade === o.tarih.ifade) : undefined;
          if (g) g.push(o); else gruplar.push([o]);
        }
        return (
          <li key={yil}>
            {bos > 0 && <div class="defter-bosluk">— {bos.toLocaleString('tr-TR')} yıl kayıt yok —</div>}
            <div class="defter-yil">
              <div class="defter-yil-adi">{yilYaz(yil * yp)}</div>
              <div class="defter-kartlar">
                {gruplar.map((g) => g.length > 1 ? (
                  <div key={g[0].kod} class="kart defter-karti">
                    <div><strong>{g.length} sahne</strong>{eserAdi(g[0].eser) && <span class="soluk"> · {eserAdi(g[0].eser)}</span>} <span class="soluk kucuk">· {g[0].tarih.ifade}</span></div>
                    <div class="defter-alt-kartlar">{g.map((o) => <a key={o.kod} class="defter-alt" href={`#/e/${evren}/k/${o.kod}`} title={ogeAciklamasi(o, z)}>{o.ad}</a>)}</div>
                  </div>
                ) : (
                  <a key={g[0].kod} class={`kart defter-karti karar-${g[0].karar}${g[0].tarih.bicim !== 'kesin' ? ' belirsiz' : ''}`} href={`#/e/${evren}/k/${g[0].kod}`} title={ogeAciklamasi(g[0], z)}>
                    <strong>{g[0].ad}</strong> <span class="soluk kucuk">· {turBul(g[0].tur).ad} · {tarihAciklamasi(g[0].tarih, z)}</span>
                    {eserAdi(g[0].eser) && <span class="soluk kucuk"> · {eserAdi(g[0].eser)}</span>}
                    {g[0].karar !== 'kesin' && <> <KararRozeti karar={g[0].karar} /></>}
                  </a>
                ))}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
