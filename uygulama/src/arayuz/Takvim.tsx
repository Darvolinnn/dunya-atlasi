// Özel takvim tanımı (§3.4) ve basit zaman çizelgesi (§7). Takvim değişince tarihlerin yazılışı korunur,
// evrendeki yerleri yeniden hesaplanır; kaydetmeden önce hangi tarihlerin yerinin değişeceği gösterilir.
import { useEffect, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { CizelgeOgesi, KisaKayit, TakvimEtkisi } from '../veri/api';
import { eksenYili, takvimGecerli, tarihAciklamasi, tarihCoz, VARSAYILAN_TAKVIM, yilGunu, type EvrenTarihi, type Takvim } from '../alan/tarih';
import { turBul } from '../alan/turler';
import { KararRozeti } from './ortak';

const hataYaz = (e: unknown) => (e as Error).message;
const onbellek = new Map<string, Takvim>();

/** Evrenin geçerli takvimi; önizlemeler bununla okunur. Takvim değişince yenilenir. */
export function useTakvim(istemci: Istemci, evren: string): Takvim {
  const [t, setT] = useState<Takvim>(onbellek.get(evren) ?? VARSAYILAN_TAKVIM);
  useEffect(() => {
    let iptal = false;
    const oku = () => istemci.iste('takvim', { evren }).then((x) => { onbellek.set(evren, x); if (!iptal) setT(x); }, () => {});
    oku();
    const birak = istemci.dinle((d) => { if (d.evren === evren) oku(); });
    return () => { iptal = true; birak(); };
  }, [evren]);
  return t;
}

/** Takvim yazarken örnek ifadeler. */
export function takvimOrnegi(t: Takvim): string {
  const ay = t.aylar?.[0]?.ad;
  return ay ? `Örn. 412, ${ay} 412, 12 ${ay} 412, 410–415` : 'Örn. 412, yaklaşık 300, 410–415';
}

// ---------- Takvim düzenleyici ----------
const bosTaslak = (t: Takvim): Takvim => ({ ...t, aylar: [...(t.aylar ?? [])].map((a) => ({ ...a })), gunBolumleri: [...(t.gunBolumleri ?? [])], mevsimler: [...(t.mevsimler ?? [])].map((m) => ({ ...m })) });
const ozelMi = (t: Takvim) => t.kod !== VARSAYILAN_TAKVIM.kod;
/** Karşılaştırma için takvimin içeriği (sürüm ve kod hariç). */
const ozet = (t: Takvim) => JSON.stringify([t.ad, t.aylar?.length ? 0 : t.yilGun, t.aylar ?? [], t.gunBolumleri ?? [], t.aylar?.length ? t.mevsimler ?? [] : []]);

export function TakvimSekmesi({ istemci, evren }: { istemci: Istemci; evren: string }) {
  const takvim = useTakvim(istemci, evren);
  const [taslak, setTaslak] = useState<Takvim>(bosTaslak(takvim));
  const [bolumYazi, setBolumYazi] = useState((takvim.gunBolumleri ?? []).join(', '));
  const [etki, setEtki] = useState<{ hedef: Takvim | null; e: TakvimEtkisi } | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [kaydedildi, setKaydedildi] = useState(false);
  const [deneme, setDeneme] = useState('');
  const [anahtar, setAnahtar] = useState(`${takvim.kod}:${takvim.surum}`);

  // Takvim başka yerden değişirse (başka cihaz) taslak yenilenir.
  useEffect(() => {
    const k = `${takvim.kod}:${takvim.surum}`;
    if (k !== anahtar) { setAnahtar(k); setTaslak(bosTaslak(takvim)); setBolumYazi((takvim.gunBolumleri ?? []).join(', ')); setEtki(null); }
  }, [takvim]);

  const guncelle = (f: (t: Takvim) => void) => { const t = bosTaslak(taslak); f(t); setTaslak(t); setEtki(null); setKaydedildi(false); };
  const bolumler = bolumYazi.split(',').map((x) => x.trim()).filter(Boolean);
  const hedef: Takvim = { ...taslak, kod: 'ana', ad: taslak.ad.trim() || 'Yıl', gunBolumleri: bolumler,
    aylar: taslak.aylar!.map((a) => ({ ad: a.ad.trim(), gun: Number(a.gun) })), mevsimler: taslak.aylar!.length ? taslak.mevsimler : [] };
  if (hedef.aylar!.length) hedef.yilGun = yilGunu(hedef);
  const gecerli = takvimGecerli(hedef);
  const ayni = ozet(hedef) === ozet(takvim);

  const onizle = async (h: Takvim | null) => {
    try {
      const e = await istemci.iste('takvimEtkisi', { evren, takvim: h });
      setHata(null);
      if (e.degisenSayisi === 0) await yaz(h); else setEtki({ hedef: h, e });
    } catch (e) { setHata(hataYaz(e)); }
  };
  const yaz = async (h: Takvim | null) => {
    try { await istemci.iste('takvimYaz', { evren, takvim: h }); setEtki(null); setHata(null); setKaydedildi(true); } catch (e) { setHata(hataYaz(e)); }
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
  const denemeSonucu = deneme.trim() ? tarihCoz(deneme, hedef) : null;

  return (
    <div class="takvim-editoru">
      <p class="soluk kucuk">Tarihleri bu takvimle yazarsın. Takvimi sonradan değiştirmek yazdığın tarihleri silmez: yazılışları aynı kalır, evrendeki yerleri yeni takvime göre yeniden hesaplanır.
        {!ozelMi(takvim) && ' Şu an varsayılan takvim kullanılıyor: yalnızca yıl, yılda 365 gün.'}</p>

      <div class="alanlar">
        <label class="alan"><span class="alan-adi">Yıl için kullanılan söz</span>
          <input class="girdi" lang="tr" value={taslak.ad} placeholder="Yıl" onInput={(e) => guncelle((t) => { t.ad = (e.target as HTMLInputElement).value; })} />
          <span class="soluk kucuk">“{hedef.ad} 412” biçiminde okunur.</span></label>
        {!taslak.aylar!.length && (
          <label class="alan"><span class="alan-adi">Bir yıldaki gün sayısı</span>
            <input class="girdi" type="number" min={1} value={taslak.yilGun} onInput={(e) => guncelle((t) => { t.yilGun = Number((e.target as HTMLInputElement).value); })} /></label>
        )}
      </div>

      <h2>Aylar</h2>
      {!taslak.aylar!.length && <p class="soluk kucuk">Ay tanımlanmadı. Ay eklersen yılın uzunluğu ayların toplamı olur.</p>}
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
      {taslak.aylar!.length > 0 && <p class="soluk kucuk">Yıl {yilGunu(hedef)} gün.</p>}

      <h2>Gün bölümleri</h2>
      <label class="alan genis"><span class="alan-adi">Virgülle ayırarak, günün başından sonuna doğru</span>
        <input class="girdi" lang="tr" value={bolumYazi} placeholder="Örn. sabah, öğle, akşam, gece" onInput={(e) => { setBolumYazi((e.target as HTMLInputElement).value); setEtki(null); setKaydedildi(false); }} />
        <span class="soluk kucuk">Gün eşit parçalara bölünür. “12 Hasat 412 öğle” gibi yazılır; gün bölümü yalnızca günü belli tarihe eklenir.</span></label>

      {taslak.aylar!.length > 0 && <>
        <h2>Mevsimler</h2>
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
        <p class="soluk kucuk">Son ayı ilk aydan önce gelen mevsim yılın sonundan ertesi yıla taşar.</p>
      </>}

      <h2>Dene</h2>
      <label class="alan genis"><span class="alan-adi">Bir tarih yaz, bu takvimle nasıl okunduğunu gör</span>
        <input class="girdi" lang="tr" value={deneme} placeholder={takvimOrnegi(hedef)} onInput={(e) => setDeneme((e.target as HTMLInputElement).value)} />
        <span class="soluk kucuk">{denemeSonucu ? tarihAciklamasi(denemeSonucu, hedef) : ' '}</span></label>

      {!gecerli && <p class="hata kucuk">Her ayın, gün bölümünün ve mevsimin bir adı olmalı; adlar birbirini tekrar etmemeli ve sayı içermemeli. Gün sayıları 1 ya da daha büyük olmalı.</p>}
      {hata && <p class="hata kucuk">{hata}</p>}

      {etki ? <TakvimEtkiPaneli evren={evren} etki={etki.e} onOnay={() => yaz(etki.hedef)} onVazgec={() => setEtki(null)} />
        : (
          <div class="satir" style="margin-top:16px">
            <button class="dugme ana" disabled={!gecerli || ayni} onClick={() => onizle(hedef)}>Kaydet</button>
            {ozelMi(takvim) && <button class="dugme" onClick={() => onizle(null)}>Varsayılan takvime dön</button>}
            {!ayni && <button class="dugme sade" onClick={() => { setTaslak(bosTaslak(takvim)); setBolumYazi((takvim.gunBolumleri ?? []).join(', ')); }}>Değişiklikleri bırak</button>}
            {kaydedildi && ayni && <span class="soluk kucuk" role="status">Kaydedildi.</span>}
          </div>
        )}
    </div>
  );
}

function TakvimEtkiPaneli({ evren, etki, onOnay, onVazgec }: { evren: string; etki: TakvimEtkisi; onOnay: () => void; onVazgec: () => void }) {
  return (
    <div class="uyari takvim-etkisi" role="region" aria-label="Takvim değişikliğinin etkisi">
      <p><strong>{etki.toplam} tarihten {etki.degisenSayisi} tanesinin okunuşu ya da sıradaki yeri değişecek.</strong> Yazılışları aynı kalır; yalnızca yılı yazılmış tarihler etkilenmez.</p>
      {etki.cozulemezSayisi > 0 && <p class="hata kucuk">{etki.cozulemezSayisi} tarih yeni takvime çevrilemeyecek (örneğin artık olmayan bir ay ya da gün). Bu tarihler silinmez; sıralamadaki yerleri belirsiz olur ve takvimi düzeltince geri gelir.</p>}
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
        <button class="dugme ana" onClick={onOnay}>Takvimi değiştir</button>
        <button class="dugme" onClick={onVazgec}>Vazgeç</button>
      </div>
    </div>
  );
}

// ---------- Zaman çizelgesi ----------
export function ZamanCizelgesi({ istemci, evren }: { istemci: Istemci; evren: string }) {
  const takvim = useTakvim(istemci, evren);
  const [ogeler, setOgeler] = useState<CizelgeOgesi[] | null>(null);
  const [eserler, setEserler] = useState<KisaKayit[]>([]);
  const [tur, setTur] = useState('');
  const [eser, setEser] = useState('');
  const [n, setN] = useState(0);
  useEffect(() => istemci.dinle((d) => { if (d.evren === evren) setN((x) => x + 1); }), [evren]);
  useEffect(() => {
    istemci.iste('zamanCizelgesi', { evren }).then(setOgeler, () => setOgeler([]));
    istemci.iste('eserler', { evren }).then(setEserler, () => {});
  }, [evren, n]);
  if (!ogeler) return <p class="soluk">Açılıyor…</p>;

  const turler = [...new Set(ogeler.map((o) => o.tur))];
  const suzulmus = ogeler.filter((o) => (!tur || o.tur === tur) && (!eser || o.eser === eser));
  const yerlesen = suzulmus.filter((o) => o.tarih.eksen);
  const yerlesmeyen = suzulmus.filter((o) => !o.tarih.eksen);
  const uclar = yerlesen.flatMap((o) => [o.tarih.eksen!.enErken, o.tarih.eksen!.enGec]).filter((x): x is number => x !== null);
  const alt = uclar.length ? Math.min(...uclar) : 0;
  const ust = uclar.length ? Math.max(...uclar) : 1;
  const pay = Math.max(1, (ust - alt) * 0.04);
  const bas = alt - pay, uzunluk = ust + pay - bas;
  const yuzde = (x: number) => `${(((x - bas) / uzunluk) * 100).toFixed(2)}%`;
  const yil0 = eksenYili(bas, takvim), yil1 = eksenYili(bas + uzunluk, takvim);

  return (
    <div class="cizelge">
      <p class="soluk kucuk">Evren tarihi olan kayıtlar, tarih sırasıyla. Kesin tarihler nokta, aralık ve yaklaşık tarihler bant, “önce” ve “sonra” tarihleri ok olarak görünür.</p>
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
      </div>
      {!ogeler.length && <p class="soluk">Henüz evren tarihi verilmiş kayıt yok. Bir kaydın sayfasında “Evren tarihi” alanına yazabilirsin.</p>}
      {ogeler.length > 0 && !suzulmus.length && <p class="soluk">Bu süzgece uyan kayıt yok.</p>}
      {yerlesen.length > 0 && (
        <ol class="cizelge-listesi" aria-label="Zaman çizelgesi">
          <li class="cizelge-olcek" aria-hidden="true"><span /><span class="cizelge-iz"><span style="left:0">{takvim.ad} {yil0}</span><span style="right:0">{takvim.ad} {yil1}</span></span></li>
          {yerlesen.map((o) => <CizelgeSatiri o={o} evren={evren} takvim={takvim} yuzde={yuzde} />)}
        </ol>
      )}
      {yerlesmeyen.length > 0 && (
        <section>
          <h2>Sıralamaya yerleşmeyenler</h2>
          <p class="soluk kucuk">Bu tarihler takvime çevrilemedi ya da bilinmiyor; yazdığın hâliyle duruyorlar.</p>
          <ul>
            {yerlesmeyen.map((o) => <li key={o.kod}><a class="satir-ad" href={`#/e/${evren}/k/${o.kod}`}>{o.ad}</a> <span class="soluk kucuk">{turBul(o.tur).ad} · {o.tarih.bicim === 'bilinmiyor' ? 'bilinmiyor' : `“${o.tarih.ifade}”`}</span> <KararRozeti karar={o.karar} /></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

function CizelgeSatiri({ o, evren, takvim, yuzde }: { o: CizelgeOgesi; evren: string; takvim: Takvim; yuzde: (x: number) => string }) {
  const t: EvrenTarihi = o.tarih;
  const { enErken, enGec } = t.eksen!;
  let isaret;
  if (t.bicim === 'once') isaret = <span class="cizelge-ok sola" style={{ left: '0', width: yuzde(enGec!) }} />;
  else if (t.bicim === 'sonra') isaret = <span class="cizelge-ok saga" style={{ left: yuzde(enErken!), right: '0' }} />;
  else if (t.bicim === 'kesin') isaret = <span class="cizelge-nokta" style={{ left: yuzde((enErken! + enGec!) / 2) }} />;
  else isaret = <span class="cizelge-bant" style={{ left: yuzde(enErken!), width: `calc(${yuzde(enGec!)} - ${yuzde(enErken!)})` }} />;
  return (
    <li class={`cizelge-satiri karar-${o.karar}`}>
      <span class="cizelge-etiket">
        <a class="satir-ad" href={`#/e/${evren}/k/${o.kod}`}>{o.ad}</a> <KararRozeti karar={o.karar} />
        <span class="soluk kucuk"> {turBul(o.tur).ad} · {tarihAciklamasi(t, takvim)}</span>
      </span>
      <span class="cizelge-iz" title={tarihAciklamasi(t, takvim)}>{isaret}</span>
    </li>
  );
}
