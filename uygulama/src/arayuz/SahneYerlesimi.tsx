import { useEffect, useRef, useState } from 'preact/hooks';
import type { Istemci } from '../veri/istemci';
import type { SahneYerlesimi as Yerlesim, YerlesimNoktasi as Nokta, YerlesimOgesi as Oge, YerlesimOkumasi, YerlesimPlanSecimi } from '../veri/api';
import { yeniKod } from '../alan/kod';
import { gorusHatti, sesUlasir } from '../alan/gorus';
import { gorselAdresi } from './gorsel';

const ADLAR = { duvar: 'Duvar', kapi: 'Kapı', pencere: 'Pencere', siper: 'Siper', karakter: 'Karakter', isik: 'Işık', ses: 'Ses' };
const konum = (o: Oge): Nokta => 'a' in o ? { x: (o.a.x + o.b.x) / 2, y: (o.a.y + o.b.y) / 2 } : o.konum;
const renk = (o: Oge) => ({ duvar: '#333', kapi: o.tur === 'kapi' && o.acik ? '#2b8c55' : '#a44', pencere: '#2299bd', siper: '#845b33', karakter: '#4f46b5', isik: '#c99a00', ses: '#ab3481' })[o.tur];

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
  useEffect(() => {
    let iptal = false; setResim(null);
    if (y) gorselAdresi(istemci, evren, y.plan.gorsel, false).then((r) => { if (!iptal) setResim(r.url); }, (e: Error) => { if (!iptal) setHata(e.message); });
    return () => { iptal = true; };
  }, [evren, y?.plan.gorsel]);
  const degistir = (v: Yerlesim) => { setY(v); setKirli(true); kirliRef.current = true; setBilgi('Kaydedilmemiş değişiklikler var.'); };
  const sec = y?.ogeler.find((o) => o.kod === secili);
  const duzenle = (o: Oge) => { if (y) degistir({ ...y, ogeler: y.ogeler.map((x) => x.kod === o.kod ? o : x) }); };
  const kilit = saltOkunur || yaziliyor || eski || !!okuma?.catismali;
  const sayi = (ad: string, deger: number, yaz: (n: number) => void, min = 0, max = 1000) => <label class="alan"><span>{ad}</span><input class="girdi" type="number" step="any" min={min} max={max} value={deger} disabled={kilit} onInput={(e) => { const v = e.currentTarget.valueAsNumber; if (Number.isFinite(v)) yaz(v); }} /></label>;
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
    let o: Oge;
    if (['duvar', 'kapi', 'pencere', 'siper'].includes(tur)) {
      if (!ilk) { setIlk(p); return; }
      if (Math.hypot(p.x - ilk.x, p.y - ilk.y) < 0.001) return;
      o = { ...temel, tur: tur as 'duvar', a: ilk, b: p, acik: false }; setIlk(null);
    } else if (tur === 'karakter') {
      const k = okuma?.katilimcilar.find((k) => k.kod === kisi);
      if (!k) { setHata('Önce bir sahne katılımcısı seçin.'); return; }
      if (y.ogeler.some((o) => o.tur === 'karakter' && o.kisi === kisi)) { setHata('Bu karakter yerleşimde zaten var. Yerini değiştirmek için hareket adımlarını kullanın.'); return; }
      o = { ...temel, ad: k.ad, tur, kisi, konum: p, yon: 0, aci: 90, uzaklik: 0.5, adimlar: [] };
    } else if (tur === 'isik') o = { ...temel, tur, konum: p, yaricap: 0.2 };
    else o = { ...temel, tur: 'ses', konum: p, duzey: 'Belirtilmemiş', uzaklik: null, azaltma: 0, gurultu: '' };
    degistir({ ...y, ogeler: [...y.ogeler, o] }); setSecili(o.kod); setHata('');
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
  const oran = y ? y.plan.boy / y.plan.en : 1;
  // Nokta örneklemesi yalnız bir önizlemedir; satır sonuçları doğrudan kesişim hesabından gelir.
  const alan = y && sec && (sec.tur === 'karakter' || sec.tur === 'ses') && !eski && !okuma?.catismali ? Array.from({ length: 900 }, (_, i) => {
    const p = { x: (i % 30 + 0.5) / 30, y: (Math.floor(i / 30) + 0.5) / 30 };
    const varMi = sec.tur === 'karakter' ? gorusHatti(y, sec, p) : sesUlasir(y, sec, p);
    return varMi ? <rect key={i} x={p.x - 1 / 60} y={(p.y - 1 / 60) * oran} width={1 / 30} height={oran / 30} fill={sec.tur === 'ses' ? '#ab3481' : '#4f46b5'} opacity="0.16" pointer-events="none" /> : null;
  }) : null;
  return <section aria-label="Sahne yerleşimi">
    <details open><summary><h2 style="display:inline">Sahne yerleşimi</h2></summary>
      <p>Bu sahne için yaptığınız yerleşim, mekânın kalıcı planını değiştirmez. Kullanılan plan görselinin o anki sürümü saklanır.</p>
      <p class="soluk kucuk">Uzaklık ve yarıçap planın enine göre ölçülür: 1, görselin eni kadardır. Yönde 0° sağı, 90° aşağıyı gösterir. Görüş açıyla, uzaklıkla ve engellerle sınırlıdır. Duvar, kapalı kapı ve siper görüşü keser, pencere ve açık kapı kesmez. Sesin ulaştığı uzaklıktan, arada kalan her engel için yazdığınız miktar düşülür. Yansıma, kırılma, duvar malzemesi, ışığın algıya etkisi ve dikkat hesaba katılmaz. Renkli alan yaklaşık bir önizlemedir. Sonuçlar yalnızca bu varsayımlarla geçerlidir.</p>
      {hata && <p class="hata" role="alert">{hata}</p>}
      <p role="status">{bilgi}</p>
      {!okuma && !hata && <p>Açılıyor…</p>}
      {okuma?.catismali && <p class="uyari">Sahne yerleşiminde iki farklı değer var. Önce yukarıdaki çatışma bölümünden birini seçin. O zamana kadar hesap gösterilmez.</p>}
      {eski && <p class="uyari">Kaydedilmiş bilgiler bu arada değişti ve taslağınız eski bilgilere dayanıyor. Kaydetmek için önce yeniden yükleyin.</p>}
      <div class="satir">
        <label>Kat planı <select class="girdi" disabled={kilit} value="" onChange={(e) => {
          const p = planlar[Number(e.currentTarget.value)]; if (!p) return;
          if (y?.ogeler.length && !confirm('Planı değiştirirseniz bu taslaktaki öğeler kaldırılır. Devam edilsin mi?')) return;
          degistir({ plan: { mekan: p.mekan, gorsel: p.gorsel, en: p.en, boy: p.boy }, ogeler: [] }); setSecili(''); setIlk(null);
        }}><option value="">{y ? 'Başka plan seç…' : 'Bir mekân görseli seç…'}</option>{planlar.map((p, i) => <option value={i}>{p.ad} · {i + 1}. görsel</option>)}</select></label>
        <button class="dugme" disabled={!kirli || kilit} onClick={() => void kaydet()}>{yaziliyor ? 'Kaydediliyor…' : 'Yerleşimi kaydet'}</button>
        <button class="dugme" disabled={yaziliyor} onClick={() => { if (!kirli || confirm('Kaydedilmemiş değişikliklerden vazgeçilsin mi?')) yukle(); }}>Yeniden yükle</button>
      </div>
      {okuma && !planlar.length && !y && <p>Önce bir mekân kaydına kat planı görseli ekleyin.</p>}
      {y && <>
        <p class="soluk">Kullanılan plan: {planlar.find((p) => p.mekan === y.plan.mekan)?.ad ?? 'Kaydedilmiş mekân görseli'} · {y.plan.en} × {y.plan.boy}. Bu sahne için kaydedilen görsel gösteriliyor.</p>
        <div class="satir" role="toolbar" aria-label="Yerleşim kipleri">
          {(['sec', 'ciz', 'tasi', 'adim'] as const).map((k) => <button class="dugme" aria-pressed={kip === k} disabled={k !== 'sec' && (kilit || k === 'tasi' && !sec || k === 'adim' && sec?.tur !== 'karakter')} onClick={() => { setKip(k); setIlk(null); }}>{({ sec: 'Seç', ciz: 'Çiz', tasi: 'Taşı', adim: 'Hareket adımı ekle' })[k]}</button>)}
          <select class="girdi" aria-label="Eklenecek öğe" disabled={kilit} value={tur} onChange={(e) => { setTur(e.currentTarget.value as Oge['tur']); setIlk(null); }}>{Object.entries(ADLAR).map(([t, ad]) => <option value={t}>{ad}</option>)}</select>
          {tur === 'karakter' && <select class="girdi" aria-label="Sahne katılımcısı" value={kisi} onChange={(e) => setKisi(e.currentTarget.value)}><option value="">Katılımcı seç…</option>{okuma?.katilimcilar.map((k) => <option value={k.kod}>{k.ad}</option>)}</select>}
        </div>
        <p>{kip === 'sec' ? 'Seçmek için öğeye ya da aşağıdaki adına tıklayın.' : kip === 'ciz' ? (ilk ? 'Çizginin ikinci ucuna tıklayın.' : 'Kalem ya da fareyle konumu seçin. Çizgi için iki ucuna sırayla tıklayın.') : kip === 'adim' ? 'Kalem ya da fareyle karakterin sonraki adımının yerine tıklayın.' : 'Kalem ya da fareyle seçilen öğenin yeni yerine tıklayın. Çizgilerde çizginin ortası buraya taşınır.'} Parmakla sayfayı kaydırabilirsiniz. Konumları aşağıdaki alanlardan da değiştirebilirsiniz.</p>
        {!resim && <p class="uyari">Kaydedilen plan görseli bu cihazda açılamıyor. Yerleşim saklanıyor, ama görsel açılana kadar çizim yapılamaz.</p>}
        <svg viewBox={`0 0 1 ${oran}`} role="img" aria-label="Sahnenin kat planı ve geçici öğeleri" style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: `${y.plan.en}/${y.plan.boy}`, touchAction: 'pan-y', border: '1px solid #999' }} onPointerDown={tikla}>
          {resim && <image href={resim} width="1" height={oran} />}{alan}
          {y.ogeler.map((o) => <g key={o.kod} onPointerDown={(e) => { if (kip === 'sec') { e.stopPropagation(); setSecili(o.kod); } }}>
            <title>{o.ad}</title>
            {'a' in o ? <line x1={o.a.x} y1={o.a.y * oran} x2={o.b.x} y2={o.b.y * oran} stroke={renk(o)} stroke-width={o.kod === secili ? 0.012 : 0.007} stroke-dasharray={o.tur === 'kapi' && o.acik ? '0.015 0.01' : undefined} /> : <>
              {(o.tur === 'isik' || o.tur === 'ses' && o.uzaklik !== null) && <circle cx={o.konum.x} cy={o.konum.y * oran} r={o.tur === 'isik' ? o.yaricap : o.uzaklik!} fill={o.tur === 'isik' ? '#ffdf66' : 'none'} fill-opacity="0.2" stroke={renk(o)} stroke-width="0.002" pointer-events="none" />}
              {o.tur === 'karakter' && <>
                <line x1={o.konum.x} y1={o.konum.y * oran} x2={o.konum.x + Math.cos(o.yon * Math.PI / 180) * 0.06} y2={o.konum.y * oran + Math.sin(o.yon * Math.PI / 180) * 0.06} stroke={renk(o)} stroke-width="0.005" />
                <polyline points={[o.konum, ...o.adimlar].map((p) => `${p.x},${p.y * oran}`).join(' ')} fill="none" stroke={renk(o)} stroke-width="0.003" stroke-dasharray="0.008" />
              </>}
              <circle cx={o.konum.x} cy={o.konum.y * oran} r={o.kod === secili ? 0.018 : 0.012} fill={renk(o)} />
            </>}
          </g>)}
          {ilk && <circle cx={ilk.x} cy={ilk.y * oran} r="0.01" fill="#e44" />}
        </svg>
        <div class="satir">{y.ogeler.map((o) => <button class="dugme" aria-pressed={secili === o.kod} onClick={() => setSecili(o.kod)}>{o.ad}</button>)}</div>
        {sec && <fieldset disabled={kilit}><legend>Seçilen öğe: {ADLAR[sec.tur]}</legend>
          <label>Ad <input class="girdi" value={sec.ad} maxLength={120} onInput={(e) => duzenle({ ...sec, ad: e.currentTarget.value })} /></label>
          {'a' in sec ? <div class="satir">{sayi('İlk ucun yatay oranı', sec.a.x, (x) => duzenle({ ...sec, a: { ...sec.a, x } }), 0, 1)}{sayi('İlk ucun düşey oranı', sec.a.y, (v) => duzenle({ ...sec, a: { ...sec.a, y: v } }), 0, 1)}{sayi('İkinci ucun yatay oranı', sec.b.x, (x) => duzenle({ ...sec, b: { ...sec.b, x } }), 0, 1)}{sayi('İkinci ucun düşey oranı', sec.b.y, (v) => duzenle({ ...sec, b: { ...sec.b, y: v } }), 0, 1)}</div> : <div class="satir">{sayi('Yatay oran', sec.konum.x, (x) => duzenle({ ...sec, konum: { ...sec.konum, x } }), 0, 1)}{sayi('Düşey oran', sec.konum.y, (v) => duzenle({ ...sec, konum: { ...sec.konum, y: v } }), 0, 1)}</div>}
          {sec.tur === 'kapi' && <label><input type="checkbox" checked={sec.acik} onChange={(e) => duzenle({ ...sec, acik: e.currentTarget.checked })} /> Kapı açık</label>}
          {sec.tur === 'karakter' && <>
            <div class="satir">{sayi('Bakış yönü (derece)', sec.yon, (yon) => duzenle({ ...sec, yon }), 0, 360)}{sayi('Görüş açısı (derece)', sec.aci, (aci) => duzenle({ ...sec, aci }), 0, 360)}{sayi('Görüş uzaklığı', sec.uzaklik, (uzaklik) => duzenle({ ...sec, uzaklik }))}</div>
            <button class="dugme" onClick={() => duzenle({ ...sec, adimlar: [...sec.adimlar, { ...sec.konum }] })}>Bulunduğu yerden hareket adımı ekle</button>
            <ol>{sec.adimlar.map((p, i) => <li><div class="satir">{sayi(`${i + 1}. adımın yatay oranı`, p.x, (x) => duzenle({ ...sec, adimlar: sec.adimlar.map((q, j) => j === i ? { ...q, x } : q) }), 0, 1)}{sayi(`${i + 1}. adımın düşey oranı`, p.y, (v) => duzenle({ ...sec, adimlar: sec.adimlar.map((q, j) => j === i ? { ...q, y: v } : q) }), 0, 1)}<button class="dugme" onClick={() => duzenle({ ...sec, konum: p })}>Bu adımdaki konumdan incele</button><button class="dugme" onClick={() => duzenle({ ...sec, adimlar: sec.adimlar.filter((_, j) => j !== i) })}>Adımı sil</button></div></li>)}</ol>
          </>}
          {sec.tur === 'isik' && sayi('Işığın yarıçapı', sec.yaricap, (yaricap) => duzenle({ ...sec, yaricap }))}
          {sec.tur === 'ses' && <>
            <label>Ses düzeyi <input class="girdi" maxLength={300} value={sec.duzey} onInput={(e) => duzenle({ ...sec, duzey: e.currentTarget.value })} /></label>
            <label>Arka plan gürültüsü varsayımı <input class="girdi" maxLength={300} value={sec.gurultu} onInput={(e) => duzenle({ ...sec, gurultu: e.currentTarget.value })} /></label>
            <label>Duyulma uzaklığı (boşsa hesaplanmaz) <input class="girdi" type="number" min="0" max="1000" step="any" value={sec.uzaklik ?? ''} onInput={(e) => duzenle({ ...sec, uzaklik: e.currentTarget.value === '' ? null : e.currentTarget.valueAsNumber })} /></label>
            {sayi('Her engelde uzaklıktan düşülecek miktar', sec.azaltma, (azaltma) => duzenle({ ...sec, azaltma }))}
          </>}
          <button class="dugme" onClick={() => { degistir({ ...y, ogeler: y.ogeler.filter((o) => o.kod !== sec.kod) }); setSecili(''); }}>Öğeyi sil</button>
        </fieldset>}
        {sec?.tur === 'karakter' && !eski && !okuma?.catismali && <div aria-label="Görüş ve ses sonuçları">
          <h3>Bu varsayımlara dayanan tahmin · {kirli ? 'kaydedilmemiş yerleşim' : 'kaydedilmiş yerleşim'} · güncel</h3>
          <p>Kapsam: bu sahne, seçilen plan sürümü ve {sec.ad} adlı karakterin konumu. Dayanak: yukarıdaki açı, uzaklık ve çizgiler. Yalnızca bu yerleşimdeki öğeler incelenir, liste evrenin tamamını kapsamaz.</p>
          <ul>{y.ogeler.filter((o) => o.kod !== sec.kod).map((o) => <li>{o.ad}: {gorusHatti(y, sec, konum(o)) ? 'görüş hattında' : 'görüş hattı kapalı'}{'a' in o ? ' (çizginin orta noktası)' : ''}{o.tur === 'ses' && (() => { const s = sesUlasir(y, o, sec.konum); return ` · ${s === null ? 'ses hesabı için duyulma uzaklığını ve arka plan gürültüsünü yazın' : s ? 'ses ulaşabilir' : 'ses ulaşamaz (bu varsayımlarla)'}`; })()}</li>)}</ul>
        </div>}
      </>}
    </details>
  </section>;
}
