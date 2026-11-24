import { useEffect, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { SahneYerlesimi as Yerlesim, YerlesimAni, YerlesimNoktasi as Nokta, YerlesimOgesi as Oge, YerlesimOkumasi, YerlesimPlanSecimi } from '../veri/api';
import { yeniKod } from '../alan/kod';
import { andaGorur, gorusHatti, karakterAni, katAdi, katYerlesimi, sesKatlarArasi, sesUlasir, type KarakterAni } from '../alan/gorus';
import { gorselAdresi } from './gorsel';

const ADLAR = { duvar: 'Duvar', kapi: 'Kapı', pencere: 'Pencere', siper: 'Siper', karakter: 'Karakter', isik: 'Işık', ses: 'Ses', gecit: 'Merdiven ya da açıklık' };
type Karakter = Extract<Oge, { tur: 'karakter' }>;
const konum = (o: Oge): Nokta => 'a' in o ? { x: (o.a.x + o.b.x) / 2, y: (o.a.y + o.b.y) / 2 } : o.konum;
const renk = (o: Oge) => ({ duvar: '#333', kapi: o.tur === 'kapi' && o.acik ? '#2b8c55' : '#a44', pencere: '#2299bd', siper: '#845b33', karakter: '#4f46b5', isik: '#c99a00', ses: '#ab3481', gecit: '#8a6a2c' })[o.tur];

/** İlk an, bugünkü yerleşimden ve karakterlerin hareket adımlarından kurulur (K38: adımlar anlara taşınır). */
function anlariKur(y: Yerlesim): Yerlesim {
  if (y.anlar?.length) return y;
  const karakterler = y.ogeler.filter((o): o is Karakter => o.tur === 'karakter');
  const adim = Math.max(0, ...karakterler.map((k) => k.adimlar.length));
  const anlar: YerlesimAni[] = Array.from({ length: adim + 1 }, (_, i) => ({
    kod: yeniKod(), ad: i ? `${i}. adım` : 'Başlangıç',
    konumlar: Object.fromEntries(karakterler.filter((k) => i === 0 || k.adimlar[i - 1]).map((k) => [k.kod, { kat: null, konum: i ? k.adimlar[i - 1] : k.konum, yon: k.yon }])),
  }));
  return { ...y, anlar, ogeler: y.ogeler.map((o) => o.tur === 'karakter' ? { ...o, adimlar: [] } : o) };
}

export function SahneYerlesimi({ istemci, evren, kod, surum, saltOkunur }: { istemci: Istemci; evren: string; kod: string; surum: number; saltOkunur: boolean }) {
  const [okuma, setOkuma] = useState<YerlesimOkumasi | null>(null);
  const [y, setY] = useState<Yerlesim | null>(null);
  const [planlar, setPlanlar] = useState<YerlesimPlanSecimi[]>([]);
  const [resim, setResim] = useState<string | null>(null);
  const [hata, setHata] = useState('');
  const [bilgi, setBilgi] = useState('');
  const [kirli, setKirli] = useState(false);
  const kirliRef = useRef(false);
  const [eski, setEski] = useState(false);
  const [yaziliyor, setYaziliyor] = useState(false);
  const [kip, setKip] = useState<'sec' | 'ciz' | 'tasi' | 'adim'>('sec');
  const [tur, setTur] = useState<Oge['tur']>('duvar');
  const [kisi, setKisi] = useState('');
  const [secili, setSecili] = useState('');
  const [ilk, setIlk] = useState<Nokta | null>(null);
  const [yenile, setYenile] = useState(0);
  const [kat, setKat] = useState<string | null>(null);
  const [an, setAn] = useState(0);
  useEffect(() => {
    let iptal = false;
    Promise.all([istemci.iste('yerlesim', { evren, sahne: kod }), istemci.iste('yerlesimPlanlari', { evren })]).then(([o, p]) => {
      if (iptal) return;
      setOkuma(o); setPlanlar(p);
      if (kirliRef.current) setEski(true);
      else { setY(o.yerlesim); setEski(false); }
    }, (e: Error) => { if (!iptal) setHata(e.message); });
    return () => { iptal = true; };
  }, [evren, kod, surum, yenile]);
  // Görünen kat kaldırılmışsa ilk kata, an kaldırılmışsa sonuncuya dönülür.
  useEffect(() => { if (y && kat !== null && !y.ekKatlar?.some((k) => k.kod === kat)) setKat(null); }, [y, kat]);
  useEffect(() => { if (y && an >= Math.max(1, y.anlar?.length ?? 0)) setAn(Math.max(0, (y.anlar?.length ?? 1) - 1)); }, [y, an]);
  const ky = y ? katYerlesimi(y, kat) : null;
  useEffect(() => {
    let iptal = false; setResim(null);
    if (ky) gorselAdresi(istemci, evren, ky.plan.gorsel, false).then((r) => { if (!iptal) setResim(r.url); }, (e: Error) => { if (!iptal) setHata(e.message); });
    return () => { iptal = true; };
  }, [evren, ky?.plan.gorsel]);
  const degistir = (v: Yerlesim) => { setY(v); setKirli(true); kirliRef.current = true; setBilgi('Kaydedilmemiş değişiklikler var.'); };
  const anliMi = !!y?.anlar?.length;
  const karakterler = (y?.ogeler.filter((o): o is Karakter => o.tur === 'karakter') ?? []);
  const anDurumu = (k: Karakter, n = an): KarakterAni => y ? karakterAni(y, k, anliMi ? n : -1) : { kat: null, konum: k.konum, yon: k.yon };
  // Bu katta görünen öğeler: katın kendi öğeleri ve o anda bu katta olan karakterler (o andaki yer ve yönle).
  const gorunen: Oge[] = y && ky ? [...ky.ogeler, ...karakterler.flatMap((k) => { const d = anDurumu(k); return d.kat === kat ? [{ ...k, konum: d.konum, yon: d.yon }] : []; })] : [];
  const sec = gorunen.find((o) => o.kod === secili) ?? y?.ogeler.find((o) => o.kod === secili && o.tur !== 'karakter') ?? null;
  const secKarakter = karakterler.find((k) => k.kod === secili);
  /** Öğeyi düzenler: karakterin yeri ve yönü anlıysa o anın kaydına, başka her şey öğenin bulunduğu katın listesine. */
  const duzenle = (o: Oge) => {
    if (!y) return;
    if (o.tur === 'karakter') {
      const asil = karakterler.find((k) => k.kod === o.kod)!;
      if (anliMi) {
        const anlar = y.anlar!.map((a, i) => i === an ? { ...a, konumlar: { ...a.konumlar, [o.kod]: { kat, konum: o.konum, yon: o.yon } } } : a);
        degistir({ ...y, anlar, ogeler: y.ogeler.map((x) => x.kod === o.kod ? { ...o, konum: asil.konum, yon: asil.yon } : x) });
      } else degistir({ ...y, ogeler: y.ogeler.map((x) => x.kod === o.kod ? o : x) });
      return;
    }
    if (kat === null) degistir({ ...y, ogeler: y.ogeler.map((x) => x.kod === o.kod ? o : x) });
    else degistir({ ...y, ekKatlar: y.ekKatlar!.map((k) => k.kod === kat ? { ...k, ogeler: k.ogeler.map((x) => x.kod === o.kod ? o : x) } : k) });
  };
  const katOgesiEkle = (v: Yerlesim, o: Oge): Yerlesim => kat === null ? { ...v, ogeler: [...v.ogeler, o] } : { ...v, ekKatlar: v.ekKatlar!.map((k) => k.kod === kat ? { ...k, ogeler: [...k.ogeler, o] } : k) };
  const ogeSil = (o: Oge) => {
    if (!y) return;
    if (o.tur === 'karakter') degistir({ ...y, ogeler: y.ogeler.filter((x) => x.kod !== o.kod), anlar: y.anlar?.map((a) => { const { [o.kod]: _, ...k } = a.konumlar; return { ...a, konumlar: k }; }) });
    else if (kat === null) degistir({ ...y, ogeler: y.ogeler.filter((x) => x.kod !== o.kod) });
    else degistir({ ...y, ekKatlar: y.ekKatlar!.map((k) => k.kod === kat ? { ...k, ogeler: k.ogeler.filter((x) => x.kod !== o.kod) } : k) });
    setSecili('');
  };
  const kilit = saltOkunur || yaziliyor || eski || !!okuma?.catismali;
  const sayi = (ad: string, deger: number, yaz: (n: number) => void, min = 0, max = 1000) => <label class="alan"><span>{ad}</span><input class="girdi" type="number" step="any" min={min} max={max} value={deger} disabled={kilit} onInput={(e) => { const v = e.currentTarget.valueAsNumber; if (Number.isFinite(v)) yaz(v); }} /></label>;
  const digerKatlar = y ? [null, ...(y.ekKatlar ?? []).map((k) => k.kod)].filter((k) => k !== kat) : [];
  const tikla = (e: PointerEvent) => {
    if (!y || kilit || !resim || kip === 'sec' || e.pointerType === 'touch') return;
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const p = { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) };
    if (kip === 'tasi' && sec) {
      if ('a' in sec) {
        const c = konum(sec), dx = p.x - c.x, dy = p.y - c.y;
        const a = { x: sec.a.x + dx, y: sec.a.y + dy }, b = { x: sec.b.x + dx, y: sec.b.y + dy };
        if ([a.x, a.y, b.x, b.y].some((v) => v < 0 || v > 1)) { setHata('Çizginin tamamı görselin içinde kalmalı.'); return; }
        duzenle({ ...sec, a, b });
      } else duzenle({ ...sec, konum: p });
      return;
    }
    if (kip === 'adim' && sec?.tur === 'karakter') { duzenle({ ...sec, adimlar: [...sec.adimlar, p] }); return; }
    if (kip !== 'ciz') return;
    const temel = { kod: yeniKod(), ad: ADLAR[tur] };
    if (tur === 'karakter') {
      const k = okuma?.katilimcilar.find((k) => k.kod === kisi);
      if (!k) { setHata('Önce bir sahne katılımcısı seçin.'); return; }
      const var_ = karakterler.find((o) => o.kisi === kisi);
      // Anlı yerleşimde karakter bu anda bu kata, bu yere konur; ilk kez ekleniyorsa sahneye de eklenir.
      if (var_ && !anliMi) { setHata('Bu karakter yerleşimde zaten var. Yerini değiştirmek için “Taşı” ya da anları kullanın.'); return; }
      const v0 = kat !== null || var_ ? anlariKur(y) : y;
      const o: Karakter = var_ ?? { ...temel, ad: k.ad, tur, kisi, konum: p, yon: 0, aci: 90, uzaklik: 0.5, adimlar: [] };
      const v1 = var_ ? v0 : { ...v0, ogeler: [...v0.ogeler, o] };
      degistir(v1.anlar?.length ? { ...v1, anlar: v1.anlar.map((a, i) => i === an ? { ...a, konumlar: { ...a.konumlar, [o.kod]: { kat, konum: p, yon: var_ ? anDurumu(var_).yon : 0 } } } : a) } : v1);
      setSecili(o.kod); setHata(''); return;
    }
    let o: Oge;
    if (['duvar', 'kapi', 'pencere', 'siper'].includes(tur)) {
      if (!ilk) { setIlk(p); return; }
      if (Math.hypot(p.x - ilk.x, p.y - ilk.y) < 0.001) return;
      o = { ...temel, tur: tur as 'duvar', a: ilk, b: p, acik: false }; setIlk(null);
    } else if (tur === 'isik') o = { ...temel, tur, konum: p, yaricap: 0.2 };
    else if (tur === 'gecit') {
      if (!digerKatlar.length) { setHata('Merdiven ya da açıklık başka bir kata bağlanır. Önce “Kat planı ekle” ile ikinci katı ekleyin.'); return; }
      o = { ...temel, ad: 'Merdiven', tur, konum: p, kat: digerKatlar[0] };
    } else o = { ...temel, tur: 'ses', konum: p, duzey: 'Belirtilmemiş', uzaklik: null, azaltma: 0, gurultu: '' };
    degistir(katOgesiEkle(y, o)); setSecili(o.kod); setHata('');
  };
  const kaydet = async () => {
    if (!y || kilit) return;
    setYaziliyor(true);
    try {
      await istemci.iste('yerlesimYaz', { evren, sahne: kod, ...y });
      kirliRef.current = false; setKirli(false); setBilgi('Sahne yerleşimi kaydedildi.'); setHata(''); setYenile((n) => n + 1);
    } catch (e) { setHata((e as Error).message); } finally { setYaziliyor(false); }
  };
  const yukle = () => { kirliRef.current = false; setKirli(false); setEski(false); setIlk(null); setSecili(''); setYenile((n) => n + 1); };
  const anEkle = () => {
    if (!y) return;
    const v = anlariKur(y);
    const n = v.anlar!.length;
    degistir({ ...v, anlar: [...v.anlar!, { kod: yeniKod(), ad: `${n + 1}. an`, konumlar: {} }] }); setAn(n);
  };
  const planSec = (p: YerlesimPlanSecimi, ekle: boolean) => {
    if (!y) { degistir({ plan: { mekan: p.mekan, gorsel: p.gorsel, en: p.en, boy: p.boy }, ogeler: [] }); return; }
    const plan = { mekan: p.mekan, gorsel: p.gorsel, en: p.en, boy: p.boy };
    if (ekle) {
      const yeni = { kod: yeniKod(), ad: `${(y.ekKatlar?.length ?? 0) + 1}. kat`, plan, ogeler: [] };
      degistir({ ...y, katAdi: y.katAdi || 'Zemin kat', ekKatlar: [...(y.ekKatlar ?? []), yeni] }); setKat(yeni.kod); setSecili(''); setIlk(null);
      return;
    }
    if (ky?.ogeler.length && !confirm('Planı değiştirirseniz bu kattaki öğeler kaldırılır. Devam edilsin mi?')) return;
    if (kat === null) degistir({ ...y, plan, ogeler: y.ogeler.filter((o) => o.tur === 'karakter') });
    else degistir({ ...y, ekKatlar: y.ekKatlar!.map((k) => k.kod === kat ? { ...k, plan, ogeler: [] } : k) });
    setSecili(''); setIlk(null);
  };
  const katKaldir = () => {
    if (!y || kat === null || !confirm('Bu kat planı ve üstündeki öğeler sahneden kaldırılsın mı? Bu kattaki karakterler o anlarda ilk kata döner.')) return;
    const gecitsiz = (l: Oge[]) => l.filter((o) => !(o.tur === 'gecit' && o.kat === kat));
    degistir({ ...y, ekKatlar: y.ekKatlar!.filter((k) => k.kod !== kat).map((k) => ({ ...k, ogeler: gecitsiz(k.ogeler) })), ogeler: gecitsiz(y.ogeler),
      anlar: y.anlar?.map((a) => ({ ...a, konumlar: Object.fromEntries(Object.entries(a.konumlar).map(([k, d]) => [k, d.kat === kat ? { ...d, kat: null } : d])) })) });
    setKat(null);
  };
  const plan = ky?.plan ?? y?.plan;
  const oran = plan ? plan.boy / plan.en : 1;
  // Nokta örneklemesi yalnız bir önizlemedir; satır sonuçları doğrudan kesişim hesabından gelir.
  const alan = y && ky && sec && (sec.tur === 'karakter' || sec.tur === 'ses') && !eski && !okuma?.catismali ? Array.from({ length: 900 }, (_, i) => {
    const p = { x: (i % 30 + 0.5) / 30, y: (Math.floor(i / 30) + 0.5) / 30 };
    const varMi = sec.tur === 'karakter' ? gorusHatti(ky, sec, p) : sesUlasir(ky, sec, p);
    return varMi ? <rect key={i} x={p.x - 1 / 60} y={(p.y - 1 / 60) * oran} width={1 / 30} height={oran / 30} fill={sec.tur === 'ses' ? '#ab3481' : '#4f46b5'} opacity="0.16" pointer-events="none" /> : null;
  }) : null;
  // Bütün katlardaki ses kaynakları (karşılaştırma için hangi katta oldukları ile).
  const sesler = y ? [null, ...(y.ekKatlar ?? []).map((k) => k.kod)].flatMap((kt) => katYerlesimi(y, kt).ogeler.filter((o): o is Extract<Oge, { tur: 'ses' }> => o.tur === 'ses').map((s) => ({ s, kat: kt }))) : [];
  const katlarVar = !!y?.ekKatlar?.length;
  const anAdi = anliMi ? `${an + 1}. anda (${y!.anlar![an].ad})` : 'Bu yerleşimde';
  return <section aria-label="Sahne yerleşimi">
    <details open><summary><h2 style="display:inline">Sahne yerleşimi</h2></summary>
      <p>Bu sahne için yaptığınız yerleşim, mekânın kalıcı planını değiştirmez. Kullanılan plan görselinin o anki sürümü saklanır.</p>
      <p class="soluk kucuk">Uzaklık ve yarıçap planın enine göre ölçülür: 1, görselin eni kadardır. Yönde 0° sağı, 90° aşağıyı gösterir. Görüş açıyla, uzaklıkla ve engellerle sınırlıdır; başka kattaki görülmez. Duvar, kapalı kapı ve siper görüşü keser, pencere ve açık kapı kesmez. Sesin ulaştığı uzaklıktan, arada kalan her engel için yazdığınız miktar düşülür; ses merdiven ya da açıklıktan öbür kata geçer ve her kat değişiminde yazdığınız miktar kadar azalır. Yansıma, kırılma, duvar malzemesi, ışığın algıya etkisi ve dikkat hesaba katılmaz. Renkli alan yaklaşık bir önizlemedir. Sonuçlar yalnızca bu varsayımlarla geçerlidir.</p>
      {hata && <p class="hata" role="alert">{hata}</p>}
      <p role="status">{bilgi}</p>
      {!okuma && !hata && <p>Açılıyor…</p>}
      {okuma?.catismali && <p class="uyari">Sahne yerleşiminde iki farklı değer var. Önce yukarıdaki çatışma bölümünden birini seçin. O zamana kadar hesap gösterilmez.</p>}
      {eski && <p class="uyari">Kaydedilmiş bilgiler bu arada değişti ve taslağınız eski bilgilere dayanıyor. Kaydetmek için önce yeniden yükleyin.</p>}
      <div class="satir">
        <label>{katlarVar ? 'Bu katın planı' : 'Kat planı'} <select class="girdi" disabled={kilit} value="" onChange={(e) => { const p = planlar[Number(e.currentTarget.value)]; if (p) planSec(p, false); e.currentTarget.value = ''; }}>
          <option value="">{y ? 'Başka plan seç…' : 'Bir mekân görseli seç…'}</option>{planlar.map((p, i) => <option value={i}>{p.ad} · {i + 1}. görsel</option>)}</select></label>
        <button class="dugme" disabled={!kirli || kilit} onClick={() => void kaydet()}>{yaziliyor ? 'Kaydediliyor…' : 'Yerleşimi kaydet'}</button>
        <button class="dugme" disabled={yaziliyor} onClick={() => { if (!kirli || confirm('Kaydedilmemiş değişikliklerden vazgeçilsin mi?')) yukle(); }}>Yeniden yükle</button>
      </div>
      {okuma && !planlar.length && !y && <p>Önce bir mekân kaydına kat planı görseli ekleyin.</p>}
      {y && ky && <>
        <div class="satir yerlesim-katlari" role="group" aria-label="Katlar">
          <span>Kat:</span>
          {[null, ...(y.ekKatlar ?? []).map((k) => k.kod)].map((k) => <button key={k ?? 'ilk'} class={`cip kitap-cipi${kat === k ? ' aktif' : ''}`} aria-pressed={kat === k} onClick={() => { setKat(k); setSecili(''); setIlk(null); }}>{katAdi(y, k)}</button>)}
          <select class="girdi" aria-label="Kat planı ekle" disabled={kilit} value="" onChange={(e) => { const p = planlar[Number(e.currentTarget.value)]; if (p) planSec(p, true); e.currentTarget.value = ''; }}>
            <option value="">+ Kat planı ekle…</option>{planlar.map((p, i) => <option value={i}>{p.ad} · {i + 1}. görsel</option>)}</select>
        </div>
        {katlarVar && <div class="satir kucuk">
          <label>Katın adı <input class="girdi" maxLength={60} disabled={kilit} value={katAdi(y, kat)} onInput={(e) => { const ad = e.currentTarget.value; degistir(kat === null ? { ...y, katAdi: ad } : { ...y, ekKatlar: y.ekKatlar!.map((k) => k.kod === kat ? { ...k, ad } : k) }); }} /></label>
          {kat !== null && <button class="dugme sade kucuk" disabled={kilit} onClick={katKaldir}>Bu katı kaldır</button>}
        </div>}
        <div class="yerlesim-anlari" role="tablist" aria-label="Sahne içi anlar">
          {(y.anlar ?? []).map((a, i) => <button key={a.kod} role="tab" aria-selected={an === i} class="yerlesim-ani" onClick={() => setAn(i)}>{i + 1} · {a.ad}</button>)}
          <button class="yerlesim-ani ekle" disabled={kilit} onClick={anEkle}>+ An ekle</button>
        </div>
        {anliMi && <div class="satir kucuk">
          <label>Anın adı <input class="girdi" maxLength={120} disabled={kilit} value={y.anlar![an].ad} onInput={(e) => { const ad = e.currentTarget.value; degistir({ ...y, anlar: y.anlar!.map((a, i) => i === an ? { ...a, ad } : a) }); }} /></label>
          {y.anlar!.length > 1 && <button class="dugme sade kucuk" disabled={kilit} onClick={() => degistir({ ...y, anlar: y.anlar!.filter((_, i) => i !== an) })}>Bu anı kaldır</button>}
          <span class="soluk">Bu anda yeri yazılmayan karakter önceki andaki yerindedir. Karakteri seçip “Taşı” ile bu andaki yerine tıklayın.</span>
        </div>}
        <p class="soluk">Kullanılan plan: {planlar.find((p) => p.mekan === ky.plan.mekan)?.ad ?? 'Kaydedilmiş mekân görseli'} · {ky.plan.en} × {ky.plan.boy}. Bu sahne için kaydedilen görsel gösteriliyor.</p>
        <div class="satir" role="toolbar" aria-label="Yerleşim kipleri">
          {(['sec', 'ciz', 'tasi', 'adim'] as const).filter((k) => k !== 'adim' || !anliMi).map((k) => <button class="dugme" aria-pressed={kip === k} disabled={k !== 'sec' && (kilit || k === 'tasi' && !sec || k === 'adim' && sec?.tur !== 'karakter')} onClick={() => { setKip(k); setIlk(null); }}>{({ sec: 'Seç', ciz: 'Çiz', tasi: 'Taşı', adim: 'Hareket adımı ekle' })[k]}</button>)}
          <select class="girdi" aria-label="Eklenecek öğe" disabled={kilit} value={tur} onChange={(e) => { setTur(e.currentTarget.value as Oge['tur']); setIlk(null); }}>{Object.entries(ADLAR).map(([t, ad]) => <option value={t}>{ad}</option>)}</select>
          {tur === 'karakter' && <select class="girdi" aria-label="Sahne katılımcısı" value={kisi} onChange={(e) => setKisi(e.currentTarget.value)}><option value="">Katılımcı seç…</option>{okuma?.katilimcilar.map((k) => <option value={k.kod}>{k.ad}</option>)}</select>}
        </div>
        <p>{kip === 'sec' ? 'Seçmek için öğeye ya da aşağıdaki adına tıklayın.' : kip === 'ciz' ? (ilk ? 'Çizginin ikinci ucuna tıklayın.' : 'Kalem ya da fareyle konumu seçin. Çizgi için iki ucuna sırayla tıklayın.') : kip === 'adim' ? 'Kalem ya da fareyle karakterin sonraki adımının yerine tıklayın.' : 'Kalem ya da fareyle seçilen öğenin yeni yerine tıklayın. Çizgilerde çizginin ortası buraya taşınır.'} Parmakla sayfayı kaydırabilirsiniz. Konumları aşağıdaki alanlardan da değiştirebilirsiniz.</p>
        {!resim && <p class="uyari">Kaydedilen plan görseli bu cihazda açılamıyor. Yerleşim saklanıyor, ama görsel açılana kadar çizim yapılamaz.</p>}
        <div class="yerlesim-govde">
          <svg viewBox={`0 0 1 ${oran}`} role="img" aria-label={`Sahnenin kat planı ve geçici öğeleri${katlarVar ? ` · ${katAdi(y, kat)}` : ''}`} style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: `${ky.plan.en}/${ky.plan.boy}`, touchAction: 'pan-y', border: '1px solid #999' }} onPointerDown={tikla}>
            {resim && <image href={resim} width="1" height={oran} />}{alan}
            {/* Önceki anda aynı kattaysa karakterin geliş yolu kesik çizgiyle. */}
            {anliMi && an > 0 && karakterler.map((k) => { const o = anDurumu(k, an - 1), s = anDurumu(k); return o.kat === kat && s.kat === kat && (o.konum.x !== s.konum.x || o.konum.y !== s.konum.y)
              ? <line key={`gel${k.kod}`} x1={o.konum.x} y1={o.konum.y * oran} x2={s.konum.x} y2={s.konum.y * oran} stroke="#8a6a50" stroke-width="0.003" stroke-dasharray="0.01 0.008" pointer-events="none" /> : null; })}
            {gorunen.map((o) => <g key={o.kod} onPointerDown={(e) => { if (kip === 'sec') { e.stopPropagation(); setSecili(o.kod); } }}>
              <title>{o.ad}</title>
              {'a' in o ? <line x1={o.a.x} y1={o.a.y * oran} x2={o.b.x} y2={o.b.y * oran} stroke={renk(o)} stroke-width={o.kod === secili ? 0.012 : 0.007} stroke-dasharray={o.tur === 'kapi' && o.acik ? '0.015 0.01' : undefined} /> : <>
                {(o.tur === 'isik' || o.tur === 'ses' && o.uzaklik !== null) && <circle cx={o.konum.x} cy={o.konum.y * oran} r={o.tur === 'isik' ? o.yaricap : o.uzaklik!} fill={o.tur === 'isik' ? '#ffdf66' : 'none'} fill-opacity="0.2" stroke={renk(o)} stroke-width="0.002" pointer-events="none" />}
                {o.tur === 'karakter' && <>
                  <line x1={o.konum.x} y1={o.konum.y * oran} x2={o.konum.x + Math.cos(o.yon * Math.PI / 180) * 0.06} y2={o.konum.y * oran + Math.sin(o.yon * Math.PI / 180) * 0.06} stroke={renk(o)} stroke-width="0.005" />
                  {!anliMi && <polyline points={[o.konum, ...o.adimlar].map((p) => `${p.x},${p.y * oran}`).join(' ')} fill="none" stroke={renk(o)} stroke-width="0.003" stroke-dasharray="0.008" />}
                  <text x={o.konum.x} y={o.konum.y * oran + 0.045} text-anchor="middle" font-size="0.025" fill="#2a251d" pointer-events="none">{o.ad}</text>
                </>}
                {o.tur === 'gecit' ? <>
                  <rect x={o.konum.x - 0.035} y={o.konum.y * oran - 0.035} width="0.07" height="0.07" fill="#c9b48a" stroke={renk(o)} stroke-width={o.kod === secili ? 0.006 : 0.003} />
                  <text x={o.konum.x} y={o.konum.y * oran + 0.008} text-anchor="middle" font-size="0.018" fill="#2a251d" pointer-events="none">{o.ad} → {katAdi(y, o.kat)}</text>
                  {sesler.filter((x) => x.kat === o.kat).map((x, i) => <text key={x.s.kod} x={o.konum.x} y={o.konum.y * oran + 0.06 + i * 0.026} text-anchor="middle" font-size="0.02" fill="#a3262f" pointer-events="none">{katAdi(y, x.kat)}: {x.s.ad}</text>)}
                </> : <circle cx={o.konum.x} cy={o.konum.y * oran} r={o.kod === secili ? 0.018 : 0.012} fill={renk(o)} />}
              </>}
            </g>)}
            {/* Başka kattan bu kata inen ya da çıkan merdivenler aynı oranlı yerde, kesik çerçeveyle. */}
            {y && [null, ...(y.ekKatlar ?? []).map((k) => k.kod)].filter((kt) => kt !== kat).flatMap((kt) => katYerlesimi(y, kt).ogeler.filter((o): o is Extract<Oge, { tur: 'gecit' }> => o.tur === 'gecit' && o.kat === kat).map((o) => <g key={`karsi${o.kod}`} pointer-events="none">
              <rect x={o.konum.x - 0.035} y={o.konum.y * oran - 0.035} width="0.07" height="0.07" fill="#c9b48a" fill-opacity="0.5" stroke={renk(o)} stroke-width="0.003" stroke-dasharray="0.008 0.005" />
              <text x={o.konum.x} y={o.konum.y * oran + 0.008} text-anchor="middle" font-size="0.018" fill="#2a251d">{o.ad} ← {katAdi(y, kt)}</text>
            </g>))}
            {ilk && <circle cx={ilk.x} cy={ilk.y * oran} r="0.01" fill="#e44" />}
          </svg>
          {secKarakter && !eski && !okuma?.catismali && (() => {
            const a = anDurumu(secKarakter);
            const digerleri = karakterler.filter((k) => k.kod !== secKarakter.kod);
            return <div class="yerlesim-sonuclari" aria-label="Görüş ve ses sonuçları">
              <h3>{anAdi} · {secKarakter.ad}{katlarVar ? ` · ${katAdi(y, a.kat)}` : ''}</h3>
              <ul>
                {digerleri.map((k) => { const b = anDurumu(k); const g = andaGorur(y, secKarakter, anliMi ? an : -1, b);
                  return <li key={k.kod}>{secKarakter.ad} → {k.ad}: <strong>{g ? 'görüyor' : 'görmüyor'}</strong> <span class="soluk">({b.kat !== a.kat ? `başka katta: ${katAdi(y, b.kat)}` : g ? 'açık hat' : 'açı, uzaklık ya da engel'})</span></li>; })}
                {sesler.map(({ s, kat: sk }) => { const r = sesKatlarArasi(y, s, sk, { kat: a.kat, konum: a.konum });
                  return <li key={s.kod}>{s.ad}{sk !== a.kat ? ` (${katAdi(y, sk)})` : ''} → {secKarakter.ad}: <strong>{r.ulasir === null ? 'hesaplanamıyor' : r.ulasir ? 'duyulur' : 'duyulmaz'}</strong>{' '}
                    <span class="soluk">{r.ulasir === null ? '(duyulma uzaklığını ve arka plan gürültüsünü yazın)' : `(${[r.katDegisimi ? `${r.katDegisimi} kat değiştirerek, merdivenden ya da açıklıktan geçerek` : '', s.gurultu ? `gürültü varsayımı: ${s.gurultu}` : ''].filter(Boolean).join('; ') || 'aynı katta'})`}</span></li>; })}
                {gorunen.filter((o) => o.tur !== 'karakter' && o.tur !== 'ses').map((o) => <li key={o.kod}>{o.ad}: {a.kat === kat && gorusHatti(ky, { ...secKarakter, konum: a.konum, yon: a.yon }, konum(o)) ? 'görüş hattında' : 'görüş hattı kapalı'}{'a' in o ? ' (çizginin orta noktası)' : ''}</li>)}
              </ul>
              {anliMi && an > 0 && (() => { const o = anDurumu(secKarakter, an - 1); return <p class="soluk kucuk">{an}. anda {secKarakter.ad} {o.kat !== a.kat ? `başka kattaydı (${katAdi(y, o.kat)})` : o.konum.x === a.konum.x && o.konum.y === a.konum.y ? 'aynı yerdeydi' : 'kesik çizginin başladığı yerdeydi'}. Ses ve görüş yalnız fiziksel tahmindir; dikkat ve algı çıkarılmaz.</p>; })()}
              <p class="soluk kucuk">Kapsam: bu sahne, seçilen plan sürümü, bu an ve {kirli ? 'kaydedilmemiş' : 'kaydedilmiş'} yerleşim. Dayanak: açı, uzaklık, çizgiler ve ses varsayımları.</p>
            </div>;
          })()}
        </div>
        <div class="satir">{gorunen.map((o) => <button class="dugme" aria-pressed={secili === o.kod} onClick={() => setSecili(o.kod)}>{o.ad}</button>)}</div>
        {sec && <fieldset disabled={kilit}><legend>Seçilen öğe: {ADLAR[sec.tur]}</legend>
          <label>Ad <input class="girdi" value={sec.ad} maxLength={120} onInput={(e) => sec.tur === 'karakter' ? degistir({ ...y, ogeler: y.ogeler.map((x) => x.kod === sec.kod ? { ...x, ad: e.currentTarget.value } : x) }) : duzenle({ ...sec, ad: e.currentTarget.value })} /></label>
          {'a' in sec ? <div class="satir">{sayi('İlk ucun yatay oranı', sec.a.x, (x) => duzenle({ ...sec, a: { ...sec.a, x } }), 0, 1)}{sayi('İlk ucun düşey oranı', sec.a.y, (v) => duzenle({ ...sec, a: { ...sec.a, y: v } }), 0, 1)}{sayi('İkinci ucun yatay oranı', sec.b.x, (x) => duzenle({ ...sec, b: { ...sec.b, x } }), 0, 1)}{sayi('İkinci ucun düşey oranı', sec.b.y, (v) => duzenle({ ...sec, b: { ...sec.b, y: v } }), 0, 1)}</div> : <div class="satir">{sayi('Yatay oran', sec.konum.x, (x) => duzenle({ ...sec, konum: { ...sec.konum, x } }), 0, 1)}{sayi('Düşey oran', sec.konum.y, (v) => duzenle({ ...sec, konum: { ...sec.konum, y: v } }), 0, 1)}</div>}
          {sec.tur === 'kapi' && <label><input type="checkbox" checked={sec.acik} onChange={(e) => duzenle({ ...sec, acik: e.currentTarget.checked })} /> Kapı açık</label>}
          {sec.tur === 'gecit' && <label>Bağlandığı kat <select class="girdi" value={sec.kat ?? ''} onChange={(e) => duzenle({ ...sec, kat: e.currentTarget.value || null })}>{digerKatlar.map((k) => <option value={k ?? ''}>{katAdi(y, k)}</option>)}</select></label>}
          {sec.tur === 'karakter' && <>
            <div class="satir">{sayi('Bakış yönü (derece)', sec.yon, (yon) => duzenle({ ...sec, yon }), 0, 360)}{sayi('Görüş açısı (derece)', sec.aci, (aci) => degistir({ ...y, ogeler: y.ogeler.map((x) => x.kod === sec.kod ? { ...x, aci } : x) }), 0, 360)}{sayi('Görüş uzaklığı', sec.uzaklik, (uzaklik) => degistir({ ...y, ogeler: y.ogeler.map((x) => x.kod === sec.kod ? { ...x, uzaklik } : x) }))}</div>
            {!anliMi && <>
              <button class="dugme" onClick={() => duzenle({ ...sec, adimlar: [...sec.adimlar, { ...sec.konum }] })}>Bulunduğu yerden hareket adımı ekle</button>
              <ol>{sec.adimlar.map((p, i) => <li><div class="satir">{sayi(`${i + 1}. adımın yatay oranı`, p.x, (x) => duzenle({ ...sec, adimlar: sec.adimlar.map((q, j) => j === i ? { ...q, x } : q) }), 0, 1)}{sayi(`${i + 1}. adımın düşey oranı`, p.y, (v) => duzenle({ ...sec, adimlar: sec.adimlar.map((q, j) => j === i ? { ...q, y: v } : q) }), 0, 1)}<button class="dugme" onClick={() => duzenle({ ...sec, konum: p })}>Bu adımdaki konumdan incele</button><button class="dugme" onClick={() => duzenle({ ...sec, adimlar: sec.adimlar.filter((_, j) => j !== i) })}>Adımı sil</button></div></li>)}</ol>
              {sec.adimlar.length > 0 && <p class="soluk kucuk">“+ An ekle” ile hareket adımları sahne içi anlara dönüşür.</p>}
            </>}
          </>}
          {sec.tur === 'isik' && sayi('Işığın yarıçapı', sec.yaricap, (yaricap) => duzenle({ ...sec, yaricap }))}
          {sec.tur === 'ses' && <>
            <label>Ses düzeyi <input class="girdi" maxLength={300} value={sec.duzey} onInput={(e) => duzenle({ ...sec, duzey: e.currentTarget.value })} /></label>
            <label>Arka plan gürültüsü varsayımı <input class="girdi" maxLength={300} value={sec.gurultu} onInput={(e) => duzenle({ ...sec, gurultu: e.currentTarget.value })} /></label>
            <label>Duyulma uzaklığı (boşsa hesaplanmaz) <input class="girdi" type="number" min="0" max="1000" step="any" value={sec.uzaklik ?? ''} onInput={(e) => duzenle({ ...sec, uzaklik: e.currentTarget.value === '' ? null : e.currentTarget.valueAsNumber })} /></label>
            {sayi('Her engelde uzaklıktan düşülecek miktar', sec.azaltma, (azaltma) => duzenle({ ...sec, azaltma }))}
            {katlarVar && sayi('Her kat değişiminde düşülecek miktar', sec.katAzaltma ?? sec.azaltma, (katAzaltma) => duzenle({ ...sec, katAzaltma }))}
          </>}
          <button class="dugme" onClick={() => ogeSil(sec)}>Öğeyi sil</button>
        </fieldset>}
      </>}
    </details>
  </section>;
}
