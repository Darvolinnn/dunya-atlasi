// Takvimler (§3.4) ve zaman çizelgesi (§7): ana takvim ve çağları, paralel takvimler, zaman akışları.
// Takvim değişince tarihlerin yazılışı korunur, evrendeki yerleri yeniden hesaplanır; kaydetmeden önce hangi
// tarihlerin yerinin değişeceği gösterilir.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { CizelgeOgesi, KisaKayit, TakvimEtkisi } from '../veri/api';
import { anaTakvim, eksenYili, paralelYazilar, takvimGecerli, takvimKaymasi, tarihAciklamasi, tarihCoz, VARSAYILAN_TAKVIM, yilGunu, yilParcasi, yilYazisi,
  type Akis, type EvrenTarihi, type ParalelTakvim, type Takvim, type TakvimYa, type ZamanSeti } from '../alan/tarih';
import { turBul } from '../alan/turler';
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

const oranYazisi = (o: Akis['oranlar'][number]) => `${o.bas ? `${o.bas} tarihinden itibaren ` : ''}${o.ana ? `${o.akis} gün = ana akışta ${o.ana[0] === o.ana[1] ? o.ana[0] : `${o.ana[0]}–${o.ana[1]}`} gün` : 'oran bilinmiyor'}`;

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

export function ZamanCizelgesi({ istemci, evren }: { istemci: Istemci; evren: string }) {
  const z = useTakvim(istemci, evren);
  const [ogeler, setOgeler] = useState<CizelgeOgesi[] | null>(null);
  const [eserler, setEserler] = useState<KisaKayit[]>([]);
  const [tur, setTur] = useState('');
  const [eser, setEser] = useState('');
  const [akis, setAkis] = useState('');
  const [olcek, setOlcek] = useState('');
  const [bakis, setBakis] = useState<Secim | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => istemci.dinle((d) => { if (d.evren === evren) setN((x) => x + 1); }), [evren]);
  useEffect(() => {
    istemci.iste('zamanCizelgesi', { evren, bakis: bakis?.kod ?? null }).then(setOgeler, () => setOgeler([]));
    istemci.iste('eserler', { evren }).then(setEserler, () => {});
  }, [evren, bakis?.kod, n]);
  if (!ogeler) return <p class="soluk">Açılıyor…</p>;

  const turler = [...new Set(ogeler.map((o) => o.tur))];
  const suzulmus = ogeler.filter((o) => (!tur || o.tur === tur) && (!eser || o.eser === eser)
    && (!akis || (akis === 'ana' ? !o.tarih.akis : o.tarih.akis === akis)));
  const yerlesen = suzulmus.filter((o) => o.tarih.eksen && (o.tarih.eksen.enErken !== null || o.tarih.eksen.enGec !== null));
  const yerlesmeyen = suzulmus.filter((o) => !yerlesen.includes(o));
  const uclar = yerlesen.flatMap((o) => [o.tarih.eksen!.enErken, o.tarih.eksen!.enGec]).filter((x): x is number => x !== null);
  const alt = uclar.length ? Math.min(...uclar) : 0;
  const ust = uclar.length ? Math.max(...uclar) : 1;
  const pay = Math.max(1, (ust - alt) * 0.04);
  const bas = alt - pay, uzunluk = ust + pay - bas;
  const yuzde = (x: number) => `${(((Math.min(Math.max(x, bas), bas + uzunluk) - bas) / uzunluk) * 100).toFixed(2)}%`;
  // Ölçek hangi takvimle okunsun: ana takvim ya da ana takvimle eşlemesi bilinen bir paralel takvim.
  const esli = z.diger.filter((p) => takvimKaymasi(p, z.ana));
  const olcekTakvimi = esli.find((p) => p.kod === olcek);
  const ucYazisi = (x: number) => {
    if (!olcekTakvimi) return yilYazisi(eksenYili(x, z.ana), z.ana);
    const k = takvimKaymasi(olcekTakvimi, z.ana)!;
    const y1 = Math.floor((x - k[1]) / yilParcasi(olcekTakvimi)), y2 = Math.floor((x - k[0]) / yilParcasi(olcekTakvimi));
    return y1 === y2 ? yilYazisi(y1, olcekTakvimi) : `${yilYazisi(y1, olcekTakvimi)}–${y2}`;
  };
  const caglar = cagAraliklari(z.ana).filter((c) => (c.son === null || c.son >= bas) && (c.bas === null || c.bas <= bas + uzunluk));

  return (
    <div class="cizelge">
      <p class="soluk kucuk">Evren tarihi olan kayıtlar, tarih sırasıyla. Kesin tarihler nokta, aralık ve yaklaşık tarihler bant, “önce” ve “sonra” tarihleri ok olarak görünür. Bir olaya göre verilmiş tarihler kesik çizgili bantla, olası aralıklarıyla gösterilir.</p>
      <div class="satir">
        <select class="girdi kucuk-girdi" aria-label="Türe göre süz" value={tur} onChange={(e) => setTur((e.target as HTMLSelectElement).value)}>
          <option value="">Bütün türler</option>
          {turler.map((t) => <option value={t}>{turBul(t).ad}</option>)}
        </select>
        {eserler.length > 0 && (
          <select class="girdi kucuk-girdi" aria-label="Esere göre süz" value={eser} onChange={(e) => setEser((e.target as HTMLSelectElement).value)}>
            <option value="">Bütün eserler</option>
            {eserler.map((x) => <option value={x.kod}>{x.ad}</option>)}
          </select>
        )}
        {z.akislar.length > 0 && (
          <select class="girdi kucuk-girdi" aria-label="Zaman akışına göre süz" value={akis} onChange={(e) => setAkis((e.target as HTMLSelectElement).value)}>
            <option value="">Bütün akışlar</option>
            <option value="ana">Yalnızca ana akış</option>
            {z.akislar.map((a) => <option value={a.kod}>{a.ad}</option>)}
          </select>
        )}
        {esli.length > 0 && (
          <select class="girdi kucuk-girdi" aria-label="Ölçeği hangi takvimle göster" value={olcek} onChange={(e) => setOlcek((e.target as HTMLSelectElement).value)}>
            <option value="">Ölçek: {z.ana.ad === 'Yıl' ? 'ana takvim' : z.ana.ad}</option>
            {esli.map((p) => <option value={p.kod}>Ölçek: {p.ad}</option>)}
          </select>
        )}
        <BakisSecici istemci={istemci} evren={evren} bakis={bakis} sec={setBakis} />
      </div>
      <BakisAciklamasi bakis={bakis} />
      {!ogeler.length && <p class="soluk">Henüz evren tarihi verilmiş kayıt yok. Bir kaydın sayfasında “Evren tarihi” alanına yazabilirsiniz.</p>}
      {ogeler.length > 0 && !suzulmus.length && <p class="soluk">Bu süzgece uyan kayıt yok.</p>}
      {yerlesen.length > 0 && (
        <ol class="cizelge-listesi" aria-label="Zaman çizelgesi">
          <li class="cizelge-olcek" aria-hidden="true"><span /><span class="cizelge-iz"><span style="left:0">{ucYazisi(bas)}</span><span style="right:0">{ucYazisi(bas + uzunluk)}</span></span></li>
          {caglar.length > 0 && (
            <li class="cizelge-caglar" aria-label="Çağlar"><span class="soluk kucuk">Çağlar</span>
              <span class="cizelge-iz">{caglar.map((c, i) => {
                const l = c.bas === null ? bas : Math.max(c.bas, bas), r = c.son === null ? bas + uzunluk : Math.min(c.son, bas + uzunluk);
                return <span class={`cizelge-cag cag-${i % 2}`} title={c.ad} style={{ left: yuzde(l), width: `calc(${yuzde(r)} - ${yuzde(l)})` }}>{c.ad}</span>;
              })}</span></li>
          )}
          {yerlesen.map((o) => <CizelgeSatiri o={o} evren={evren} z={z} yuzde={yuzde} />)}
        </ol>
      )}
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

function CizelgeSatiri({ o, evren, z, yuzde }: { o: CizelgeOgesi; evren: string; z: ZamanSeti; yuzde: (x: number) => string }) {
  const t: EvrenTarihi = o.tarih;
  const { enErken, enGec } = t.eksen!;
  let isaret;
  const goreli = t.bicim === 'goreli' || !!t.akis;
  if (enErken === null || t.bicim === 'once') isaret = <span class={`cizelge-ok sola${goreli ? ' goreli' : ''}`} style={{ left: '0', width: yuzde(enGec!) }} />;
  else if (enGec === null || t.bicim === 'sonra') isaret = <span class={`cizelge-ok saga${goreli ? ' goreli' : ''}`} style={{ left: yuzde(enErken), right: '0' }} />;
  else if (t.bicim === 'kesin' && !t.akis) isaret = <span class="cizelge-nokta" style={{ left: yuzde((enErken + enGec) / 2) }} />;
  else isaret = <span class={`cizelge-bant${goreli ? ' goreli' : ''}`} style={{ left: yuzde(enErken), width: `calc(${yuzde(enGec)} - ${yuzde(enErken)})` }} />;
  const aciklama = t.bicim === 'goreli' ? `${t.ifade} · ${tarihAciklamasi(t, z)}` : tarihAciklamasi(t, z);
  const paralel = paralelYazilar(t, z).map((p) => `${p.takvim}: ${p.yazi}`).join(' · ');
  return (
    <li class={`cizelge-satiri karar-${o.karar}${o.inanc ? ' inanc' : ''}`}>
      <span class="cizelge-etiket">
        <a class="satir-ad" href={`#/e/${evren}/k/${o.kod}`}>{o.ad}</a> <KararRozeti karar={o.karar} />{o.inanc && <span class="rozet inanc">yalnızca inanç</span>}
        {t.akis && <span class="rozet">{z.akislar.find((a) => a.kod === t.akis)?.ad ?? 'akış'}</span>}
        <span class="soluk kucuk"> {turBul(o.tur).ad} · {aciklama}</span>
        {paralel && <span class="soluk kucuk cizelge-paralel"> {paralel}</span>}
      </span>
      <span class="cizelge-iz" title={paralel ? `${aciklama} · ${paralel}` : aciklama}>{isaret}</span>
    </li>
  );
}
